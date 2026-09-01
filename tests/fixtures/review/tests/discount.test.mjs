import assert from 'node:assert/strict';
import test from 'node:test';
import { discountedTotal } from '../src/discount.mjs';

test('does not discount a small total', () => {
  assert.equal(discountedTotal(80), 80);
});

test('discounts a total above the threshold', () => {
  assert.equal(discountedTotal(110), 99);
});
