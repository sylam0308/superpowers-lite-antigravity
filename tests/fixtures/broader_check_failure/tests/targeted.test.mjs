import test from 'node:test'; import assert from 'node:assert/strict'; import { status } from '../src/status.mjs'; test('targeted',()=>assert.equal(status(),'ready'));
