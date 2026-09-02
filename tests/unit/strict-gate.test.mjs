import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { handleHook } from '../../hooks/strict-gate.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'superpowers-lite-hook-'));
  const workspace = path.join(root, 'workspace');
  const artifacts = path.join(root, 'artifacts');
  fs.mkdirSync(path.join(workspace, '.agents'), { recursive: true });
  fs.mkdirSync(artifacts, { recursive: true });
  return { root, workspace, artifacts, transcript: path.join(artifacts, 'transcript.jsonl') };
}

function writePlan(ctx) {
  fs.writeFileSync(path.join(ctx.artifacts, 'implementation_plan.md'), `# Plan
- [x] 1. Inspect
- [x] 2. Edit
- [x] 3. Verify
<!-- superpowers-lite-contract
{"schemaVersion":2,"planId":"2026-09-02-hook","risk":"medium","scope":{"allow":["src/allowed.mjs"],"deny":["secrets/**"]},"acceptance":[{"id":"AC-1","text":"Works","evidence":["V-1"]}],"steps":[{"id":"S-1","files":["src/allowed.mjs"],"acceptance":["AC-1"],"checks":["V-1"]},{"id":"S-2","files":["src/allowed.mjs"],"acceptance":["AC-1"],"checks":["V-1"]},{"id":"S-3","files":["src/allowed.mjs"],"acceptance":["AC-1"],"checks":["V-1"]}],"verification":[{"id":"V-1","command":"node --test","expected":"pass","required":true}]}
-->`);
}

test('allows quick in-workspace writes and denies outside writes', (t) => {
  const ctx = fixture(); t.after(() => fs.rmSync(ctx.root, { recursive: true, force: true }));
  const base = { workspacePaths: [ctx.workspace], artifactDirectoryPath: ctx.artifacts };
  assert.equal(handleHook({ ...base, toolCall: { name: 'write_to_file', args: { TargetFile: path.join(ctx.workspace, 'src/a.mjs') } } }).decision, 'allow');
  assert.equal(handleHook({ ...base, toolCall: { name: 'write_to_file', args: { TargetFile: path.join(ctx.root, 'outside.txt') } } }).decision, 'deny');
});

test('denies Contract scope violations and force-asks protected paths', (t) => {
  const ctx = fixture(); t.after(() => fs.rmSync(ctx.root, { recursive: true, force: true }));
  writePlan(ctx);
  fs.writeFileSync(path.join(ctx.workspace, '.agents', 'superpowers-lite.json'), JSON.stringify({ schemaVersion: 1, protectedPaths: ['src/protected.mjs'] }));
  const base = { workspacePaths: [ctx.workspace], artifactDirectoryPath: ctx.artifacts };
  assert.equal(handleHook({ ...base, toolCall: { name: 'write_to_file', args: { TargetFile: path.join(ctx.workspace, 'src/other.mjs') } } }).decision, 'deny');
  assert.equal(handleHook({ ...base, toolCall: { name: 'write_to_file', args: { TargetFile: path.join(ctx.workspace, 'src/protected.mjs') } } }).decision, 'force_ask');
  assert.equal(handleHook({ ...base, toolCall: { name: 'write_to_file', args: { TargetFile: path.join(ctx.workspace, 'src/allowed.mjs') } } }).decision, 'allow');
});

test('requires verification after mutation and caps no-progress continuation', (t) => {
  const ctx = fixture(); t.after(() => fs.rmSync(ctx.root, { recursive: true, force: true }));
  fs.writeFileSync(ctx.transcript, '{"tool":"write_to_file","target":"src/a.mjs"}\n');
  const input = { terminationReason: 'model_stop', workspacePaths: [ctx.workspace], artifactDirectoryPath: ctx.artifacts, transcriptPath: ctx.transcript };
  assert.equal(handleHook(input).decision, 'continue');
  assert.equal(handleHook(input).decision, 'continue');
  assert.equal(handleHook(input).decision, 'allow');
});

test('allows stop when verification follows the final mutation', (t) => {
  const ctx = fixture(); t.after(() => fs.rmSync(ctx.root, { recursive: true, force: true }));
  fs.writeFileSync(ctx.transcript, '{"tool":"write_to_file"}\n{"tool":"run_command","CommandLine":"node --test","output":"pass"}\n');
  const result = handleHook({ terminationReason: 'model_stop', workspacePaths: [ctx.workspace], artifactDirectoryPath: ctx.artifacts, transcriptPath: ctx.transcript });
  assert.equal(result.decision, 'allow');
});
