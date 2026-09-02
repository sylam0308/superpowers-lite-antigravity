import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { extractContract, pathDecision } from '../../lib/contract.mjs';

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
