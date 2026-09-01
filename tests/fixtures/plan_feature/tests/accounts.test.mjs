import assert from 'node:assert/strict';
import test from 'node:test';
import { displayName } from '../src/accounts.mjs';

test('returns an existing display name', () => {
  assert.equal(displayName({ displayName: 'Ada' }), 'Ada');
});
