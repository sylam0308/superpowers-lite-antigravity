import assert from 'node:assert/strict';
import test from 'node:test';
import { greet } from '../src/greeting.mjs';

test('uses the casual greeting by default', () => {
  assert.equal(greet('Ana'), 'Hi, Ana!');
});
