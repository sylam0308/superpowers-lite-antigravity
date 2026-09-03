import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { extractContract, pathDecision, validateContract } from '../../lib/contract.mjs';

function validContract() {
  return {
    schemaVersion: 2,
    planId: '2026-09-02-path-test',
    risk: 'low',
    scope: { allow: ['src/account.mjs'], deny: ['secrets/**'] },
    acceptance: [{ id: 'AC-1', text: 'Observable result', evidence: ['V-1'] }],
    steps: [
      { id: 'S-1', files: ['src/account.mjs'], acceptance: ['AC-1'], checks: ['V-1'] },
      { id: 'S-2', files: ['tests/account.test.mjs'], acceptance: ['AC-1'], checks: ['V-1'] },
      { id: 'S-3', files: ['README.md'], acceptance: ['AC-1'], checks: ['V-1'] }
    ],
    verification: [{ id: 'V-1', command: 'node --test tests/account.test.mjs', expected: 'exit 0', required: true }]
  };
}

test('valid Contract v2 maps acceptance, steps, scope, and verification', () => {
  const markdown = fs.readFileSync(new URL('../fixtures/contracts/valid-plan.md', import.meta.url), 'utf8');
  const result = extractContract(markdown);
  assert.equal(result.legacy, false);
  assert.deepEqual(result.errors, []);
  assert.equal(pathDecision('src/account.mjs', result.contract).allowed, true);
  assert.equal(pathDecision('src/other.mjs', result.contract).allowed, false);
});

test('legacy plans remain accepted without strict scope enforcement', () => {
  assert.equal(extractContract('# Old plan').legacy, true);
});

test('rejects missing evidence mappings and unsafe paths', () => {
  const markdown = '<!-- superpowers-lite-contract {"schemaVersion":2,"planId":"2026-09-02-bad","risk":"low","scope":{"allow":["../bad"],"deny":[]},"acceptance":[],"steps":[],"verification":[]} -->';
  const result = extractContract(markdown);
  assert.ok(result.errors.length >= 4);
});

test('rejects absolute, URI, backslash, traversal, and empty contract paths', () => {
  for (const unsafe of ['C:/repo/src/account.mjs', 'D:\\repo\\src\\account.mjs', '/repo/src/account.mjs', '\\\\server\\share\\file.mjs', 'file://C:/repo/file.mjs', '../outside.mjs', 'src//account.mjs', '']) {
    const contract = validContract();
    contract.scope.allow = [unsafe];
    assert.ok(validateContract(contract).some((error) => /unsafe|non-portable/i.test(error)), unsafe);
  }
});

test('rejects absolute paths in verification commands and human-readable Markdown', () => {
  const commandContract = validContract();
  commandContract.verification[0].command = 'node --test C:/repo/tests/account.test.mjs';
  assert.ok(validateContract(commandContract).some((error) => /command contains an absolute path/i.test(error)));

  const markdownContract = validContract();
  assert.ok(validateContract(markdownContract, '# Plan\n\nEdit `D:/repo/src/account.mjs`.').some((error) => /markdown contains an absolute path/i.test(error)));
  assert.ok(validateContract(markdownContract, '# Plan\n\nEdit `/repo/src/account.mjs`.').some((error) => /markdown contains an absolute path/i.test(error)));
});

test('accepts repo-relative forward-slash paths for Strict decisions', () => {
  const contract = validContract();
  assert.deepEqual(validateContract(contract, '# Plan\n\nEdit `src/account.mjs` and run `node --test tests/account.test.mjs`.'), []);
  assert.equal(pathDecision('src/account.mjs', contract).allowed, true);
});
