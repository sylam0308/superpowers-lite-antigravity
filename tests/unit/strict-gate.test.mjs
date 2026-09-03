import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { handleHook } from '../../hooks/strict-gate.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'superpowers-lite-hook-'));
  const workspace = path.join(root, 'workspace');
  const artifacts = path.join(root, 'artifacts');
  const transcript = path.join(artifacts, 'transcript.jsonl');
  fs.mkdirSync(path.join(workspace, '.agents'), { recursive: true });
  fs.mkdirSync(artifacts, { recursive: true });
  return { root, workspace, artifacts, transcript };
}

function planText({ risk = 'medium', open = false } = {}) {
  const box = open ? ' ' : 'x';
  return `# Plan
- [${box}] 1. Inspect
- [${box}] 2. Edit
- [${box}] 3. Verify
<!-- superpowers-lite-contract
{"schemaVersion":2,"planId":"2026-09-02-hook","risk":"${risk}","scope":{"allow":["src/allowed.mjs"],"deny":["secrets/**"]},"acceptance":[{"id":"AC-1","text":"Works","evidence":["V-1"]}],"steps":[{"id":"S-1","files":["src/allowed.mjs"],"acceptance":["AC-1"],"checks":["V-1"]},{"id":"S-2","files":["src/allowed.mjs"],"acceptance":["AC-1"],"checks":["V-1"]},{"id":"S-3","files":["src/allowed.mjs"],"acceptance":["AC-1"],"checks":["V-1"]}],"verification":[{"id":"V-1","command":"node --test","expected":"pass","required":true}]}
-->`;
}

function writeWorkspacePlan(ctx, options) {
  const file = path.join(ctx.workspace, 'docs', 'plans', '2026-09-02-hook.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, planText(options));
  return file;
}

function writeCliExecute(ctx, relative = 'docs/plans/2026-09-02-hook.md') {
  fs.writeFileSync(ctx.transcript, `${JSON.stringify({
    step_index: 0,
    type: 'USER_INPUT',
    content: `<USER_REQUEST>\n/spl-execute Execute ${relative}.\n</USER_REQUEST>`
  })}\n`);
}

function writeAppApproval(ctx) {
  const file = path.join(ctx.artifacts, 'implementation_plan.md');
  fs.writeFileSync(file, planText());
  fs.writeFileSync(ctx.transcript, `${JSON.stringify({
    step_index: 12,
    type: 'USER_INPUT',
    content: `Comments on artifact URI: ${pathToFileURL(file).href}\n\nThe user has approved this document.\n\n<USER_REQUEST>\n\n</USER_REQUEST>`
  })}\n`);
  return file;
}

function base(ctx) {
  return {
    conversationId: '00000000-0000-0000-0000-000000000001',
    workspacePaths: [ctx.workspace],
    artifactDirectoryPath: ctx.artifacts,
    transcriptPath: ctx.transcript
  };
}

function pre(ctx, stepIdx, name, args) {
  return handleHook({ ...base(ctx), stepIdx, toolCall: { name, args } });
}

function post(ctx, stepIdx, error = '') {
  return handleHook({ ...base(ctx), stepIdx, error });
}

function stop(ctx) {
  return handleHook({ ...base(ctx), terminationReason: 'model_stop', fullyIdle: true });
}

test('keeps contract-less quick tasks free and ignores old plans', (t) => {
  const ctx = fixture(); t.after(() => fs.rmSync(ctx.root, { recursive: true, force: true }));
  writeWorkspacePlan(ctx);
  assert.equal(pre(ctx, 1, 'write_to_file', { TargetFile: path.join(ctx.workspace, 'src/a.mjs') }).decision, 'allow');
  assert.equal(pre(ctx, 2, 'write_to_file', { TargetFile: path.join(ctx.root, 'outside.txt') }).decision, 'deny');
});

test('activates CLI plan, enforces paths, and denies shell bypasses', (t) => {
  const ctx = fixture(); t.after(() => fs.rmSync(ctx.root, { recursive: true, force: true }));
  writeWorkspacePlan(ctx);
  writeCliExecute(ctx);
  fs.writeFileSync(path.join(ctx.workspace, '.agents', 'superpowers-lite.json'), JSON.stringify({ schemaVersion: 1, protectedPaths: ['src/protected.mjs'] }));
  assert.equal(pre(ctx, 1, 'write_to_file', { TargetFile: path.join(ctx.workspace, 'src/other.mjs') }).decision, 'deny');
  assert.equal(pre(ctx, 2, 'write_to_file', { TargetFile: path.join(ctx.workspace, 'src/protected.mjs') }).decision, 'force_ask');
  assert.equal(pre(ctx, 3, 'write_to_file', { TargetFile: path.join(ctx.workspace, 'src/allowed.mjs') }).decision, 'allow');
  assert.equal(pre(ctx, 4, 'run_command', { CommandLine: 'git status' }).decision, 'allow');
  assert.equal(pre(ctx, 5, 'run_command', { CommandLine: 'node --test' }).decision, 'allow');
  for (const command of [
    "Set-Content src/other.mjs 'bypass'",
    'Get-Content src/allowed.mjs | Set-Content src/other.mjs',
    `node -e "require('fs').writeFileSync('src/other.mjs','bypass')"`,
    `python -c "open('src/other.mjs','w').write('bypass')"`
  ]) assert.equal(pre(ctx, 6, 'run_command', { CommandLine: command }).decision, 'deny', command);
});

test('recognizes native App approval and exact artifact URI', (t) => {
  const ctx = fixture(); t.after(() => fs.rmSync(ctx.root, { recursive: true, force: true }));
  writeAppApproval(ctx);
  assert.equal(pre(ctx, 13, 'write_to_file', { TargetFile: path.join(ctx.workspace, 'src/other.mjs') }).decision, 'deny');
  assert.equal(pre(ctx, 14, 'write_to_file', { TargetFile: path.join(ctx.workspace, 'src/allowed.mjs') }).decision, 'allow');
});

test('pairs PostToolUse results and requires every fresh check', (t) => {
  const ctx = fixture(); t.after(() => fs.rmSync(ctx.root, { recursive: true, force: true }));
  writeWorkspacePlan(ctx);
  writeCliExecute(ctx);
  assert.equal(pre(ctx, 1, 'write_to_file', { TargetFile: path.join(ctx.workspace, 'src/allowed.mjs') }).decision, 'allow');
  assert.deepEqual(handleHook({ ...base(ctx), stepIdx: 1 }), {});
  assert.equal(pre(ctx, 2, 'run_command', { CommandLine: 'node --test' }).decision, 'allow');
  post(ctx, 2, 'exit status 1');
  assert.equal(pre(ctx, 3, 'run_command', { CommandLine: 'git diff --check' }).decision, 'allow');
  post(ctx, 3);
  assert.equal(stop(ctx).decision, 'continue');
  assert.equal(pre(ctx, 4, 'run_command', { CommandLine: 'node --test' }).decision, 'allow');
  post(ctx, 4);
  assert.equal(stop(ctx).decision, 'allow');
});

test('does not accept git diff as the only behavioral verification', (t) => {
  const ctx = fixture(); t.after(() => fs.rmSync(ctx.root, { recursive: true, force: true }));
  assert.equal(pre(ctx, 1, 'write_to_file', { TargetFile: path.join(ctx.workspace, 'README.md') }).decision, 'allow');
  post(ctx, 1);
  assert.equal(pre(ctx, 2, 'run_command', { CommandLine: 'git diff --check' }).decision, 'allow');
  post(ctx, 2);
  assert.match(stop(ctx).reason, /behavioral verification/i);
});

test('reconciles CLI results from matching transcript steps when PostToolUse is absent', (t) => {
  const ctx = fixture(); t.after(() => fs.rmSync(ctx.root, { recursive: true, force: true }));
  pre(ctx, 6, 'write_to_file', { TargetFile: path.join(ctx.workspace, 'README.md') });
  fs.writeFileSync(ctx.transcript, `${JSON.stringify({ step_index: 6, type: 'GENERIC', status: 'DONE', content: '[diff_block_start]\n+ready\n[diff_block_end]' })}\n`);
  assert.match(stop(ctx).reason, /behavioral verification/i);
  pre(ctx, 8, 'run_command', { CommandLine: 'node check.mjs' });
  fs.appendFileSync(ctx.transcript, `${JSON.stringify({ step_index: 8, type: 'GENERIC', status: 'DONE', content: 'The command exited with code 1.' })}\n`);
  assert.match(stop(ctx).reason, /failed without a later passing rerun/i);
});

test('allows checklist ticks but blocks approved-plan drift', (t) => {
  const ctx = fixture(); t.after(() => fs.rmSync(ctx.root, { recursive: true, force: true }));
  const plan = writeWorkspacePlan(ctx, { open: true });
  writeCliExecute(ctx);
  assert.equal(pre(ctx, 1, 'run_command', { CommandLine: 'git status' }).decision, 'allow');
  fs.writeFileSync(plan, planText({ open: false }));
  assert.equal(pre(ctx, 2, 'write_to_file', { TargetFile: plan }).decision, 'allow');
  post(ctx, 2);
  fs.appendFileSync(plan, '\nUnexpected architecture change.\n');
  assert.equal(pre(ctx, 3, 'write_to_file', { TargetFile: path.join(ctx.workspace, 'src/allowed.mjs') }).decision, 'deny');
});

test('caps two no-progress continuations', (t) => {
  const ctx = fixture(); t.after(() => fs.rmSync(ctx.root, { recursive: true, force: true }));
  pre(ctx, 1, 'write_to_file', { TargetFile: path.join(ctx.workspace, 'README.md') });
  post(ctx, 1);
  assert.equal(stop(ctx).decision, 'continue');
  assert.equal(stop(ctx).decision, 'continue');
  const final = stop(ctx);
  assert.equal(final.decision, 'allow');
  assert.match(final.reason, /blocked\/unverified/i);
});

test('fails safe on corrupt state without looping Stop forever', (t) => {
  const ctx = fixture(); t.after(() => fs.rmSync(ctx.root, { recursive: true, force: true }));
  const directory = path.join(ctx.artifacts, '.superpowers-lite');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'strict-state.json'), '{broken');
  assert.equal(pre(ctx, 1, 'write_to_file', { TargetFile: path.join(ctx.workspace, 'README.md') }).decision, 'deny');
  assert.equal(stop(ctx).decision, 'continue');
});
