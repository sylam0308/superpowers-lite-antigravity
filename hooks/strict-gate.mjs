#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractContract, loadPolicy, pathDecision } from '../lib/contract.mjs';

const writeTools = new Set([
  'write_to_file', 'replace_file_content', 'multi_replace_file_content', 'sed_file', 'notebook_edit'
]);
const destructiveCommand = /(git\s+(commit|push|reset|clean)|npm\s+(install|uninstall)|pnpm\s+(add|remove)|yarn\s+(add|remove)|remove-item\b.*-recurse|\brm\s+-r|drop\s+(table|database)|migrat(e|ion).*apply)/i;
const verificationCommand = /(node\s+--test|npm\s+test|pnpm\s+test|yarn\s+test|\blint\b|typecheck|\bbuild\b|git\s+diff\s+--check|check\.mjs)/i;
const readOnlyCommand = /^(?:git\s+(?:status|diff|log|show|ls-files|rev-parse)\b|rg\b|grep\b|get-content\b|test-path\b|get-childitem\b|ls\b|dir\b|pwd\b)/i;
const shellMetacharacters = /[|;&><`\r\n]/;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizedPlanHash(markdown) {
  return sha256(markdown.replace(/\[(?:x|X| )\]/g, '[ ]'));
}

function normalizeCommand(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function inside(target, root) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function statePath(input) {
  const root = input.artifactDirectoryPath ?? path.dirname(input.transcriptPath ?? '.');
  return path.join(root, '.superpowers-lite', 'strict-state.json');
}

function emptyState(input) {
  return {
    schemaVersion: 2,
    conversationId: input.conversationId ?? null,
    activePlan: null,
    activationError: null,
    pendingTools: {},
    mutations: [],
    verifications: [],
    continuations: 0,
    continuationFingerprint: ''
  };
}

function loadState(input) {
  const file = statePath(input);
  if (!fs.existsSync(file)) return { file, state: emptyState(input), error: null };
  try {
    const state = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (state.schemaVersion !== 2) throw new Error(`unsupported state schemaVersion ${state.schemaVersion}`);
    return { file, state: { ...emptyState(input), ...state }, error: null };
  } catch (error) {
    return { file, state: emptyState(input), error };
  }
}

function saveState(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(temporary, file);
}

function transcriptEntries(file) {
  if (!file || !fs.existsSync(file)) return [];
  const entries = [];
  for (const source of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!source.trim()) continue;
    try { entries.push(JSON.parse(source)); } catch { /* Ignore malformed transcript lines. */ }
  }
  return entries;
}

function userRequest(content) {
  return String(content ?? '').match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/i)?.[1]?.trim() ?? '';
}

function activationSignal(input) {
  const entries = transcriptEntries(input.transcriptPath)
    .filter((entry) => entry.type === 'USER_INPUT')
    .sort((a, b) => Number(a.step_index ?? 0) - Number(b.step_index ?? 0));
  let signal = null;
  for (const entry of entries) {
    const content = String(entry.content ?? '');
    const request = userRequest(content);
    if (/\/superpowers-lite:execute\b/i.test(request)) {
      const paths = [...request.matchAll(/(?:^|[\s`"'(])((?:docs[\\/]plans[\\/])[A-Za-z0-9._\-/\\]+\.md)\b/gi)]
        .map((match) => match[1].replaceAll('\\', '/'));
      signal = { kind: 'cli', step: Number(entry.step_index ?? 0), paths: [...new Set(paths)] };
    }
    if (/The user has approved this document\./i.test(content)) {
      const uri = content.match(/Comments on artifact URI:\s*(file:\/\/\/\S+)/i)?.[1];
      signal = { kind: 'app', step: Number(entry.step_index ?? 0), uri };
    }
  }
  return signal;
}

function loadPlan(file, workspace, policy) {
  const markdown = fs.readFileSync(file, 'utf8');
  const parsed = extractContract(markdown);
  if (parsed.legacy) throw new Error('approved plan does not contain Contract v2');
  if (parsed.errors.length) throw new Error(`invalid Contract v2: ${parsed.errors.join(' ')}`);
  const contractChecks = parsed.contract.verification ?? [];
  const requiredCommands = contractChecks.filter((item) => item.required).map((item) => normalizeCommand(item.command));
  const approvedCommands = contractChecks.map((item) => normalizeCommand(item.command));
  for (const command of policy.verification?.required ?? []) {
    requiredCommands.push(normalizeCommand(command));
    approvedCommands.push(normalizeCommand(command));
  }
  for (const command of policy.verification?.optional ?? []) approvedCommands.push(normalizeCommand(command));
  requiredCommands.push('git diff --check');
  approvedCommands.push('git diff --check');
  return {
    planId: parsed.contract.planId,
    path: path.resolve(file),
    workspace: path.resolve(workspace),
    approvalHash: normalizedPlanHash(markdown),
    risk: parsed.contract.risk,
    scope: parsed.contract.scope,
    requiredCommands: [...new Set(requiredCommands.filter(Boolean))],
    approvedCommands: [...new Set(approvedCommands.filter(Boolean))],
    activatedAtStep: null
  };
}

function resolveActivation(input, state) {
  const signal = activationSignal(input);
  if (!signal) return { activePlan: state.activePlan, error: state.activationError };
  if (state.activePlan && Number(state.activePlan.activatedAtStep ?? -1) >= signal.step) {
    return { activePlan: state.activePlan, error: state.activationError };
  }
  try {
    let planFile;
    let workspace;
    if (signal.kind === 'app') {
      if (!signal.uri) throw new Error('App approval did not include an artifact URI');
      planFile = fileURLToPath(signal.uri);
      const expected = path.join(input.artifactDirectoryPath ?? '', 'implementation_plan.md');
      if (path.resolve(planFile) !== path.resolve(expected)) throw new Error('approved artifact does not match this conversation implementation plan');
      workspace = (input.workspacePaths ?? [])[0];
    } else {
      if (signal.paths.length !== 1) throw new Error('Strict CLI execute requires exactly one docs/plans/*.md path');
      const matches = (input.workspacePaths ?? [])
        .map((root) => ({ root, file: path.resolve(root, signal.paths[0]) }))
        .filter((candidate) => inside(candidate.file, path.join(candidate.root, 'docs', 'plans')) && fs.existsSync(candidate.file));
      if (matches.length !== 1) throw new Error('Strict CLI execute plan path is missing, ambiguous, or outside docs/plans');
      ({ root: workspace, file: planFile } = matches[0]);
    }
    if (!workspace) throw new Error('could not resolve the plan workspace');
    const policy = loadPolicy(workspace);
    const activePlan = loadPlan(planFile, workspace, policy);
    activePlan.activatedAtStep = signal.step;
    return { activePlan, error: null };
  } catch (error) {
    return { activePlan: null, error: error.message };
  }
}

function refreshPlan(input, loaded) {
  const resolved = resolveActivation(input, loaded.state);
  loaded.state.activePlan = resolved.activePlan;
  loaded.state.activationError = resolved.error;
  if (!resolved.activePlan) return;
  try {
    const markdown = fs.readFileSync(resolved.activePlan.path, 'utf8');
    if (normalizedPlanHash(markdown) !== resolved.activePlan.approvalHash) {
      loaded.state.activationError = 'approved plan changed after activation';
    }
  } catch (error) {
    loaded.state.activationError = `active plan is unreadable: ${error.message}`;
  }
}

function toolTarget(toolCall, workspace) {
  const args = toolCall?.args ?? {};
  const value = args.TargetFile ?? args.AbsolutePath ?? args.FilePath ?? args.path ?? args.Path;
  if (!value) return null;
  return path.isAbsolute(String(value)) ? path.resolve(String(value)) : path.resolve(workspace, String(value));
}

function pendingKey(input) {
  return String(input.stepIdx ?? 'missing');
}

function recordPending(loaded, input, pending) {
  loaded.state.pendingTools[pendingKey(input)] = {
    ...pending,
    stepIdx: Number.isInteger(input.stepIdx) ? input.stepIdx : null
  };
  saveState(loaded.file, loaded.state);
}

function preToolUse(input) {
  const tool = input.toolCall?.name ?? '';
  const command = normalizeCommand(input.toolCall?.args?.CommandLine);
  const workspaces = input.workspacePaths ?? [];
  const workspace = workspaces[0];
  const loaded = loadState(input);
  if (loaded.error) return { decision: 'deny', reason: `Strict state is unreadable: ${loaded.error.message}` };
  refreshPlan(input, loaded);

  if (!workspace) return { decision: 'deny', reason: 'Strict profile could not resolve a workspace.' };
  if (loaded.state.activationError) {
    saveState(loaded.file, loaded.state);
    return { decision: 'deny', reason: `Strict execution is blocked: ${loaded.state.activationError}.` };
  }

  if (tool === 'run_command') {
    if (destructiveCommand.test(command)) return { decision: 'force_ask', reason: 'Strict profile requires explicit approval for destructive, dependency, migration, commit, or push commands.' };
    const active = loaded.state.activePlan;
    if (active) {
      const approved = active.approvedCommands.includes(command);
      const readOnly = readOnlyCommand.test(command) && !shellMetacharacters.test(command);
      if (!approved && !readOnly) {
        saveState(loaded.file, loaded.state);
        return { decision: 'deny', reason: `Strict profile denies an unapproved command while Contract v2 is active: ${command || '<empty>'}` };
      }
      recordPending(loaded, input, { tool, kind: approved ? 'verification' : 'inspection', command });
      return { decision: 'allow' };
    }
    recordPending(loaded, input, { tool, kind: verificationCommand.test(command) ? 'verification' : 'command', command });
    return { decision: 'allow' };
  }

  if (!writeTools.has(tool)) return { decision: 'allow' };
  const target = toolTarget(input.toolCall, workspace);
  if (!target) return { decision: loaded.state.activePlan ? 'deny' : 'force_ask', reason: 'Strict profile could not resolve the proposed write target.' };
  const artifactAllowed = input.artifactDirectoryPath && inside(target, input.artifactDirectoryPath);
  const owningWorkspace = workspaces.find((root) => inside(target, root));
  if (!owningWorkspace && !artifactAllowed) return { decision: 'deny', reason: 'Strict profile blocks writes outside workspace and artifact directories.' };
  if (artifactAllowed) {
    recordPending(loaded, input, { tool, kind: 'control', target });
    return { decision: 'allow' };
  }

  let policy;
  try { policy = loadPolicy(owningWorkspace); }
  catch (error) { return { decision: 'force_ask', reason: `Strict profile could not parse project policy: ${error.message}` };
  }
  const relative = path.relative(owningWorkspace, target).replaceAll('\\', '/');
  const active = loaded.state.activePlan;
  if (active && path.resolve(target) === path.resolve(active.path)) {
    recordPending(loaded, input, { tool, kind: 'control', target });
    return { decision: 'allow' };
  }
  const decision = pathDecision(relative, active ? { scope: active.scope } : null, policy);
  if (decision.protected) return { decision: 'force_ask', reason: `Protected path requires explicit approval: ${relative}` };
  if (active && (decision.denied || !decision.allowed)) {
    saveState(loaded.file, loaded.state);
    return { decision: 'deny', reason: `Strict profile denies write outside approved Contract v2 scope: ${relative}` };
  }
  recordPending(loaded, input, { tool, kind: 'mutation', target, relative });
  return { decision: 'allow' };
}

function postToolUse(input) {
  const loaded = loadState(input);
  if (loaded.error) return {};
  const key = pendingKey(input);
  const pending = loaded.state.pendingTools[key];
  if (!pending) return {};
  delete loaded.state.pendingTools[key];
  const success = !String(input.error ?? '').trim();
  const event = { ...pending, stepIdx: input.stepIdx, success, error: String(input.error ?? '') };
  if (pending.kind === 'mutation' && success) loaded.state.mutations.push(event);
  if (pending.kind === 'verification') loaded.state.verifications.push(event);
  if (pending.kind === 'control' && success && loaded.state.activePlan) {
    try {
      const markdown = fs.readFileSync(loaded.state.activePlan.path, 'utf8');
      if (normalizedPlanHash(markdown) !== loaded.state.activePlan.approvalHash) loaded.state.activationError = 'approved plan changed after activation';
    } catch (error) { loaded.state.activationError = `active plan is unreadable: ${error.message}`; }
  }
  saveState(loaded.file, loaded.state);
  return {};
}

function reviewSignals(entries, afterStep) {
  let reviewed = false;
  let blocking = false;
  for (const entry of entries) {
    if (Number(entry.step_index ?? -1) <= afterStep || entry.source !== 'MODEL') continue;
    const text = JSON.stringify(entry);
    if (/"outcome"\s*:\s*"reviewed"/i.test(text)) reviewed = true;
    if (/"severity"\s*:\s*"(?:critical|high)"|\b(?:critical|high)\s+finding\b/i.test(text)) blocking = true;
  }
  return { reviewed, blocking };
}

function stop(input) {
  const loaded = loadState(input);
  if (loaded.error) return { decision: 'continue', reason: `Strict state could not be evaluated. Report unverified: ${loaded.error.message}` };
  refreshPlan(input, loaded);
  const active = loaded.state.activePlan;
  const lastMutation = loaded.state.mutations.at(-1)?.stepIdx ?? -1;
  const successfulAfterMutation = loaded.state.verifications.filter((item) => item.success && Number(item.stepIdx) > Number(lastMutation));
  const reasons = [];
  if (input.fullyIdle === false) reasons.push('background work is still running');
  if (loaded.state.activationError) reasons.push(loaded.state.activationError);
  if (lastMutation >= 0) {
    const behavioral = successfulAfterMutation.filter((item) => item.command !== 'git diff --check');
    if (!behavioral.length) reasons.push('no successful behavioral verification followed the final implementation mutation');
    const required = active?.requiredCommands ?? ['git diff --check'];
    for (const command of required) {
      if (!successfulAfterMutation.some((item) => item.command === command)) reasons.push(`required verification is missing or failed: ${command}`);
    }
    const unresolvedFailures = loaded.state.verifications
      .filter((item) => !item.success && Number(item.stepIdx) > Number(lastMutation))
      .filter((failed) => !loaded.state.verifications.some((item) => item.success && item.command === failed.command && Number(item.stepIdx) > Number(failed.stepIdx)));
    for (const failed of unresolvedFailures) reasons.push(`verification failed without a later passing rerun: ${failed.command}`);
  }
  if (active) {
    try {
      const planText = fs.readFileSync(active.path, 'utf8');
      const openSteps = [...planText.matchAll(/^- \[ \] \d+\./gm)].length;
      if (openSteps) reasons.push(`${openSteps} approved plan step(s) remain unchecked`);
    } catch (error) { reasons.push(`active plan is unreadable: ${error.message}`); }
    const review = reviewSignals(transcriptEntries(input.transcriptPath), lastMutation);
    if (review.blocking) reasons.push('a critical/high review finding remains');
    if (active.risk === 'high' && lastMutation >= 0 && !review.reviewed) reasons.push('high-risk execution lacks review evidence after the final mutation');
  }

  if (!reasons.length) {
    loaded.state.continuations = 0;
    loaded.state.continuationFingerprint = '';
    saveState(loaded.file, loaded.state);
    return { decision: 'allow' };
  }
  const progress = JSON.stringify({ lastMutation, successfulAfterMutation, reasons });
  const same = loaded.state.continuationFingerprint === progress;
  loaded.state.continuations = same ? Number(loaded.state.continuations ?? 0) + 1 : 1;
  loaded.state.continuationFingerprint = progress;
  saveState(loaded.file, loaded.state);
  if (loaded.state.continuations > 2) {
    return { decision: 'allow', reason: `Strict profile reached the no-progress limit. Report blocked/unverified: ${reasons.join('; ')}.` };
  }
  const prefix = loaded.state.continuations === 2 ? 'One no-progress retry remains.' : 'Completion gate is not satisfied.';
  return { decision: 'continue', reason: `${prefix} ${reasons.join('; ')}. Produce fresh evidence or report blocked.` };
}

export function handleHook(input) {
  if (input?.toolCall) return preToolUse(input);
  if (Object.hasOwn(input ?? {}, 'terminationReason')) return stop(input);
  if (Number.isInteger(input?.stepIdx) && Object.hasOwn(input, 'error')) return postToolUse(input);
  return {};
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { raw += chunk; });
  process.stdin.on('end', () => {
    try { process.stdout.write(`${JSON.stringify(handleHook(JSON.parse(raw)))}\n`); }
    catch (error) { process.stdout.write(`${JSON.stringify({ decision: 'deny', reason: `Strict hook input error: ${error.message}` })}\n`); }
  });
}
