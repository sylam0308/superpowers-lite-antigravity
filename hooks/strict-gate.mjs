#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { extractContract, loadPolicy, pathDecision } from '../lib/contract.mjs';

const writeTools = new Set(['write_to_file', 'replace_file_content', 'multi_replace_file_content']);
const destructiveCommand = /(git\s+(commit|push|reset|clean)|npm\s+(install|uninstall)|pnpm\s+(add|remove)|yarn\s+(add|remove)|remove-item\b.*-recurse|\brm\s+-r|drop\s+(table|database)|migrat(e|ion).*apply)/i;
const mutationCommand = /(set-content|add-content|out-file|copy-item|move-item|remove-item|git\s+(add|checkout|switch)|\brm\b|\bmv\b|\bcp\b)/i;
const verificationCommand = /(node\s+--test|npm\s+test|pnpm\s+test|yarn\s+test|\blint\b|typecheck|\bbuild\b|git\s+diff\s+--check|check\.mjs)/i;

function safeJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function inside(target, root) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function toolTarget(toolCall, workspace) {
  const args = toolCall?.args ?? {};
  const value = args.TargetFile ?? args.AbsolutePath ?? args.FilePath ?? args.path ?? args.Path;
  if (!value) return null;
  return path.isAbsolute(String(value)) ? path.resolve(String(value)) : path.resolve(workspace, String(value));
}

function findPlan(input) {
  const candidates = [];
  if (input.artifactDirectoryPath) candidates.push(path.join(input.artifactDirectoryPath, 'implementation_plan.md'));
  for (const workspace of input.workspacePaths ?? []) {
    const directory = path.join(workspace, 'docs', 'plans');
    if (fs.existsSync(directory)) {
      for (const name of fs.readdirSync(directory).filter((item) => item.endsWith('.md'))) candidates.push(path.join(directory, name));
    }
  }
  return candidates.filter((file) => fs.existsSync(file)).map((file) => ({ file, mtime: fs.statSync(file).mtimeMs })).sort((a, b) => b.mtime - a.mtime)[0]?.file ?? null;
}

function preToolUse(input) {
  const tool = input.toolCall?.name ?? '';
  const command = String(input.toolCall?.args?.CommandLine ?? '');
  const workspaces = input.workspacePaths ?? [];
  const workspace = workspaces[0];
  if (!workspace) return { decision: writeTools.has(tool) || tool === 'run_command' ? 'force_ask' : 'allow', reason: 'Strict profile could not resolve a workspace.' };

  if (tool === 'run_command') {
    if (destructiveCommand.test(command)) return { decision: 'force_ask', reason: 'Strict profile requires explicit approval for destructive, dependency, migration, commit, or push commands.' };
    return { decision: 'allow' };
  }
  if (!writeTools.has(tool)) return { decision: 'allow' };

  const target = toolTarget(input.toolCall, workspace);
  if (!target) return { decision: 'force_ask', reason: 'Strict profile could not resolve the proposed write target.' };
  const artifactAllowed = input.artifactDirectoryPath && inside(target, input.artifactDirectoryPath);
  const owningWorkspace = workspaces.find((root) => inside(target, root));
  if (!owningWorkspace && !artifactAllowed) return { decision: 'deny', reason: 'Strict profile blocks writes outside workspace and artifact directories.' };
  if (artifactAllowed) return { decision: 'allow' };

  let policy;
  try { policy = loadPolicy(owningWorkspace); }
  catch (error) { return { decision: 'force_ask', reason: `Strict profile could not parse project policy: ${error.message}` }; }
  const relative = path.relative(owningWorkspace, target).replaceAll('\\', '/');
  const planFile = findPlan(input);
  if (!planFile) {
    const decision = pathDecision(relative, null, policy);
    return decision.protected ? { decision: 'force_ask', reason: `Protected path requires explicit approval: ${relative}` } : { decision: 'allow' };
  }
  const parsed = extractContract(fs.readFileSync(planFile, 'utf8'));
  if (parsed.legacy) return { decision: 'allow', reason: 'Legacy plan detected; exact scope enforcement is unavailable.' };
  if (parsed.errors.length) return { decision: 'force_ask', reason: `Invalid Contract v2: ${parsed.errors.join(' ')}` };
  const decision = pathDecision(relative, parsed.contract, policy);
  if (decision.protected) return { decision: 'force_ask', reason: `Protected path requires explicit approval: ${relative}` };
  // deny (not force_ask): --dangerously-skip-permissions auto-approves permission
  // prompts, including force_ask. Out-of-scope writes must remain blocked.
  if (decision.denied || !decision.allowed) return { decision: 'deny', reason: `Strict profile denies write outside approved Contract v2 scope: ${relative}` };
  return { decision: 'allow' };
}

function transcriptSignals(file) {
  if (!file || !fs.existsSync(file)) return { mutation: -1, verification: -1, failedVerification: false, blockingFinding: false };
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  let mutation = -1; let verification = -1; let failedVerification = false; let blockingFinding = false;
  lines.forEach((line, index) => {
    const lower = line.toLowerCase();
    if (/write_to_file|replace_file_content|multi_replace_file_content/.test(lower) || (lower.includes('run_command') && mutationCommand.test(line))) mutation = index;
    if (verificationCommand.test(line)) {
      verification = index;
      if (/"error"\s*:\s*(?!""|null)|exit (code|status)\s*[1-9]|\bfailed\b/i.test(line)) failedVerification = true;
      else failedVerification = false;
    }
    if (/"severity"\s*:\s*"(critical|high)"|\b(critical|high)\s+finding\b/i.test(line)) blockingFinding = true;
  });
  return { mutation, verification, failedVerification, blockingFinding };
}

function stop(input) {
  const stateDirectory = path.join(input.artifactDirectoryPath ?? path.dirname(input.transcriptPath ?? '.'), '.superpowers-lite');
  const stateFile = path.join(stateDirectory, 'strict-state.json');
  const previous = safeJson(stateFile, { continuations: 0, fingerprint: '' });
  try {
    const signals = transcriptSignals(input.transcriptPath);
    const planFile = findPlan(input);
    const planText = planFile ? fs.readFileSync(planFile, 'utf8') : '';
    const openSteps = [...planText.matchAll(/^- \[ \] \d+\./gm)].length;
    const reasons = [];
    if (signals.mutation >= 0 && signals.verification <= signals.mutation) reasons.push('implementation changed after the latest successful verification');
    if (signals.failedVerification) reasons.push('the latest required verification failed');
    if (openSteps > 0) reasons.push(`${openSteps} approved plan step(s) remain unchecked`);
    if (signals.blockingFinding) reasons.push('a critical/high review finding remains');
    if (!reasons.length) {
      if (fs.existsSync(stateFile)) fs.rmSync(stateFile, { force: true });
      return { decision: 'allow' };
    }
    const fingerprint = JSON.stringify({ ...signals, openSteps, reasons });
    const continuations = previous.fingerprint === fingerprint ? Number(previous.continuations ?? 0) : 0;
    fs.mkdirSync(stateDirectory, { recursive: true });
    fs.writeFileSync(stateFile, `${JSON.stringify({ fingerprint, continuations: continuations + 1 }, null, 2)}\n`);
    if (continuations >= 2) return { decision: 'allow', reason: `Strict profile stopped continuing after two no-progress retries. Report blocked: ${reasons.join('; ')}.` };
    const prefix = continuations === 1 ? 'One no-progress retry remains. If evidence cannot be produced, report blocked.' : 'Completion gate is not satisfied.';
    return { decision: 'continue', reason: `${prefix} ${reasons.join('; ')}. Run fresh required verification after the final edit and close only proven steps.` };
  } catch (error) {
    const continuations = Number(previous.continuations ?? 0);
    if (continuations >= 1) return { decision: 'allow', reason: `Strict gate could not evaluate completion; report unverified: ${error.message}` };
    fs.mkdirSync(stateDirectory, { recursive: true });
    fs.writeFileSync(stateFile, `${JSON.stringify({ fingerprint: 'parse-error', continuations: continuations + 1 }, null, 2)}\n`);
    return { decision: 'continue', reason: `Strict gate could not evaluate evidence. Report unverified and do not claim completion: ${error.message}` };
  }
}

export function handleHook(input) {
  if (input?.toolCall) return preToolUse(input);
  if (Object.hasOwn(input ?? {}, 'terminationReason')) return stop(input);
  return { decision: 'allow' };
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { raw += chunk; });
  process.stdin.on('end', () => {
    try { process.stdout.write(`${JSON.stringify(handleHook(JSON.parse(raw)))}\n`); }
    catch (error) { process.stdout.write(`${JSON.stringify({ decision: 'force_ask', reason: `Strict hook input error: ${error.message}` })}\n`); }
  });
}
