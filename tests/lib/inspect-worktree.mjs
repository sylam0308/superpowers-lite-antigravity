import { execFileSync } from 'node:child_process';

function git(root, args) {
  try { return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }); }
  catch (error) { return String(error.stdout ?? ''); }
}

export function inspectWorktree(root) {
  const porcelain = git(root, ['status', '--porcelain=v1', '-uall']);
  const changedPaths = porcelain.split(/\r?\n/).filter(Boolean).map((line) => line.slice(3).trim().replace(/^"|"$/g, '').replaceAll('\\', '/'));
  return {
    changedPaths,
    patch: git(root, ['diff', '--binary', '--no-ext-diff']),
    status: porcelain
  };
}

if (process.argv[1] && process.argv[2]) {
  process.stdout.write(`${JSON.stringify(inspectWorktree(process.argv[2]), null, 2)}\n`);
}
