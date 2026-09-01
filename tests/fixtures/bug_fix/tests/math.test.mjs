import assert from 'node:assert/strict';
import test from 'node:test';
import { divide } from '../src/math.mjs';

test('divides ordinary numbers', () => {
  assert.equal(divide(8, 2), 4);
});
