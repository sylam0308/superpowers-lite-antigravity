import assert from 'node:assert/strict';
import test from 'node:test';
import * as api from '../src/index.mjs';

test('public API exports health', () => {
  assert.equal(typeof api.health, 'function');
});
