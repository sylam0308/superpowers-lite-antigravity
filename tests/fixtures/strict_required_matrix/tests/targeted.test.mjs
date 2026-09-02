import assert from 'node:assert/strict'; import { ready } from '../src/status.mjs'; assert.equal(ready, true); console.log('targeted pass');
