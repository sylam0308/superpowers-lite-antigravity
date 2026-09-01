import assert from 'node:assert/strict';
import test from 'node:test';
import { status } from '../src/status.mjs';

test('intentional fixture failure', () => {
  assert.equal(status, 'healthy');
});
