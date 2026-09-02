#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function git(args, options = {}) {
  return spawnSync('git', args, { encoding: 'utf8', shell: false, ...options });
}

export function resolveBase(base, cwd = process.cwd()) {
  if (base && !/^0+$/.test(base)) {
    const probe = git(['rev-parse', '--verify', `${base}^{commit}`], { cwd });
    if (probe.status === 0) return base;
  }
  const empty = git(['hash-object', '-t', 'tree', '--stdin'], { cwd, input: '' });
  if (empty.status !== 0) throw new Error(empty.stderr || 'Could not create the empty-tree hash.');
  return empty.stdout.trim();
}

export function checkDiff(base, head = 'HEAD', cwd = process.cwd()) {
  const resolvedBase = resolveBase(base, cwd);
  return git(['diff', '--check', resolvedBase, head], { cwd });
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(pathToFileUrl(process.argv[1]));

function pathToFileUrl(value) {
  const normalized = value.replaceAll('\\', '/');
  return new URL(normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`);
}

if (invoked) {
  const base = argument('base') ?? process.env.DIFF_BASE;
  const head = argument('head') ?? process.env.DIFF_HEAD ?? 'HEAD';
  const result = checkDiff(base, head);
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}
