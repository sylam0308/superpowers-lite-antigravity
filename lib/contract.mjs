import fs from 'node:fs';
import path from 'node:path';

const marker = /<!--\s*superpowers-lite-contract\s*([\s\S]*?)-->/m;
const placeholder = /\b(TBD|TODO|implement later|fill in details|appropriate error handling)\b/i;

function isSafeRelativePath(value) {
  if (typeof value !== 'string' || !value.length || value.trim() !== value) return false;
  if (value.includes('\\') || value.includes(':') || value.includes('\0')) return false;
  if (path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) return false;
  const segments = value.split('/');
  return !segments.some((segment) => !segment || segment === '.' || segment === '..');
}

function hasAbsoluteReference(value) {
  const text = String(value ?? '');
  return /(?:^|[\s`"'(])(?:[A-Za-z]:[\\/]|file:\/\/|\\\\)/i.test(text)
    || /(?:^|[\s`"'(])\/(?:[^/\s]+\/)+[^/\s`"')]+/.test(text);
}

export function validateContract(contract, markdown = '') {
  const errors = [];
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) return ['Contract must be a JSON object.'];
  if (contract.schemaVersion !== 2) errors.push('schemaVersion must be 2.');
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9][a-z0-9-]*$/.test(contract.planId ?? '')) errors.push('planId must be YYYY-MM-DD-slug.');
  if (!['low', 'medium', 'high'].includes(contract.risk)) errors.push('risk must be low, medium, or high.');
  const allow = contract.scope?.allow;
  const deny = contract.scope?.deny;
  if (!Array.isArray(allow) || !Array.isArray(deny)) errors.push('scope.allow and scope.deny must be arrays.');
  for (const item of [...(allow ?? []), ...(deny ?? [])]) {
    if (!isSafeRelativePath(item)) errors.push(`Unsafe or non-portable scope path: ${item}`);
    if (item === '**/*' && contract.scope?.allowAll !== true) errors.push('**/* requires scope.allowAll=true.');
  }
  const acceptance = Array.isArray(contract.acceptance) ? contract.acceptance : [];
  const steps = Array.isArray(contract.steps) ? contract.steps : [];
  const verification = Array.isArray(contract.verification) ? contract.verification : [];
  if (!acceptance.length) errors.push('At least one acceptance criterion is required.');
  if (steps.length < 3 || steps.length > 7) errors.push('Contract must contain 3-7 steps.');
  if (!verification.length) errors.push('At least one verification item is required.');
  const acceptanceIds = new Set(acceptance.map((item) => item.id));
  const verificationIds = new Set(verification.map((item) => item.id));
  const stepIds = new Set(steps.map((item) => item.id));
  if (acceptanceIds.size !== acceptance.length || verificationIds.size !== verification.length || stepIds.size !== steps.length) errors.push('Contract IDs must be unique within their sections.');
  for (const item of acceptance) {
    if (!/^AC-[1-9][0-9]*$/.test(item.id ?? '') || !item.text || !Array.isArray(item.evidence) || !item.evidence.length) errors.push(`Invalid acceptance item: ${item.id ?? '<missing>'}`);
    for (const id of item.evidence ?? []) if (!verificationIds.has(id)) errors.push(`${item.id} references unknown verification ${id}.`);
    if (!steps.some((step) => step.acceptance?.includes(item.id))) errors.push(`${item.id} is not mapped to a step.`);
  }
  for (const item of steps) {
    if (!/^S-[1-7]$/.test(item.id ?? '') || !Array.isArray(item.files) || !item.files.length || !Array.isArray(item.acceptance) || !Array.isArray(item.checks)) errors.push(`Invalid step: ${item.id ?? '<missing>'}`);
    for (const file of item.files ?? []) if (!isSafeRelativePath(file)) errors.push(`${item.id} has unsafe file path ${file}.`);
    for (const id of item.acceptance ?? []) if (!acceptanceIds.has(id)) errors.push(`${item.id} references unknown acceptance ${id}.`);
    for (const id of item.checks ?? []) if (!verificationIds.has(id)) errors.push(`${item.id} references unknown verification ${id}.`);
  }
  for (const item of verification) {
    if (!/^V-[1-9][0-9]*$/.test(item.id ?? '') || !item.command || !item.expected || typeof item.required !== 'boolean') errors.push(`Invalid verification item: ${item.id ?? '<missing>'}`);
    if (item.command && hasAbsoluteReference(item.command)) errors.push(`${item.id ?? '<missing>'} command contains an absolute path or file URI.`);
  }
  if (hasAbsoluteReference(markdown)) errors.push('Plan markdown contains an absolute path or file URI.');
  if (placeholder.test(markdown)) errors.push('Plan contains a placeholder phrase.');
  return errors;
}

export function extractContract(markdown) {
  const match = markdown.match(marker);
  if (!match) return { legacy: true, contract: null, errors: [] };
  try {
    const contract = JSON.parse(match[1]);
    return { legacy: false, contract, errors: validateContract(contract, markdown) };
  } catch (error) {
    return { legacy: false, contract: null, errors: [`Contract JSON is invalid: ${error.message}`] };
  }
}

function globRegex(pattern) {
  const source = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('**', '\u0000').replaceAll('*', '[^/]*').replaceAll('\u0000', '.*');
  return new RegExp(`^${source}$`, 'i');
}

export function matchesGlob(relativePath, pattern) {
  return globRegex(pattern).test(relativePath.replaceAll('\\', '/'));
}

export function pathDecision(relativePath, contract, policy = {}) {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\.\//, '');
  const protectedPath = (policy.protectedPaths ?? []).some((item) => matchesGlob(normalized, item));
  const denied = (contract?.scope?.deny ?? []).some((item) => matchesGlob(normalized, item));
  const allowed = !contract || (contract.scope?.allow ?? []).some((item) => matchesGlob(normalized, item));
  return { normalized, protected: protectedPath, denied, allowed };
}

export function loadPolicy(workspaceRoot) {
  const file = path.join(workspaceRoot, '.agents', 'superpowers-lite.json');
  if (!fs.existsSync(file)) return { schemaVersion: 1, verification: { required: [], optional: [] }, protectedPaths: [], reviewBlockSeverities: ['critical', 'high'] };
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (value.schemaVersion !== 1) throw new Error('Unsupported .agents/superpowers-lite.json schemaVersion.');
  return {
    schemaVersion: 1,
    verification: { required: value.verification?.required ?? [], optional: value.verification?.optional ?? [] },
    protectedPaths: value.protectedPaths ?? [],
    reviewBlockSeverities: value.reviewBlockSeverities ?? ['critical', 'high']
  };
}
