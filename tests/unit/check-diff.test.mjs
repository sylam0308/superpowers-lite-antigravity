import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkDiff } from '../check-diff.mjs';

function git(root, ...args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', shell: false });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test('checks the introduced range instead of the clean worktree', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'superpowers-lite-diff-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q');
  git(root, 'config', 'user.email', 'fixture@superpowers-lite.local');
  git(root, 'config', 'user.name', 'Superpowers Lite Fixture');
  fs.writeFileSync(path.join(root, 'file.md'), 'clean\n');
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'clean');
  const base = git(root, 'rev-parse', 'HEAD');
  fs.writeFileSync(path.join(root, 'file.md'), 'bad trailing space \n');
  git(root, 'add', '.'); git(root, 'commit', '-q', '-m', 'bad');
  const failed = checkDiff(base, 'HEAD', root);
  assert.notEqual(failed.status, 0);
  assert.match(failed.stdout, /trailing whitespace/i);
});
