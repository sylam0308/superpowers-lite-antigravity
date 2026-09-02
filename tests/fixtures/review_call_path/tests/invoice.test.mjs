import test from 'node:test'; import assert from 'node:assert/strict'; import { invoiceTotal } from '../src/invoice.mjs'; test('invoice dollars',()=>assert.equal(invoiceTotal(100),110));
