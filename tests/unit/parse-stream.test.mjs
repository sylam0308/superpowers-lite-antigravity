import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStream } from '../lib/parse-stream.mjs';

test('parses and classifies an Antigravity NDJSON trajectory', () => {
  const raw = [
    JSON.stringify({ event: 'init', init: { model: 'gemini-3.7-flash-high' } }),
    JSON.stringify({ event: 'step_update', step_update: { conversation_id: 'c1', step_index: 1, state: 'DONE', step_type: 'tool', tool_name: 'view_file', tool_info: { name: 'view_file', parameters: { AbsolutePath: 'README.md' } } } }),
    JSON.stringify({ event: 'step_update', step_update: { conversation_id: 'c1', step_index: 2, state: 'DONE', step_type: 'tool', tool_name: 'write_to_file', tool_info: { name: 'write_to_file', parameters: { TargetFile: 'README.md' } } } }),
    JSON.stringify({ event: 'step_update', step_update: { conversation_id: 'c1', step_index: 3, state: 'DONE', step_type: 'tool', tool_name: 'run_command', tool_info: { name: 'run_command', parameters: { CommandLine: 'node --test' }, output: 'pass' } } }),
    JSON.stringify({ event: 'step_update', step_update: { conversation_id: 'c1', step_index: 4, state: 'DONE', step_type: 'finish' } }),
    JSON.stringify({ event: 'step_update', step_update: { conversation_id: 'c1', step_index: 5, state: 'DONE', step_type: 'system_message' } }),
    JSON.stringify({ event: 'step_update', step_update: { conversation_id: 'c1', step_index: 6, state: 'DONE', step_type: 'finish' } }),
    JSON.stringify({ event: 'result', result: { conversation_id: 'c1', status: 'SUCCESS', structured_output: { outcome: 'completed' }, usage: { thinking_tokens: 10 } } })
  ].join('\n');
  const parsed = parseStream(raw);
  assert.deepEqual(parsed.tools.map((item) => item.kind), ['inspection', 'mutation', 'verification']);
  assert.equal(parsed.structured.outcome, 'completed');
  assert.equal(parsed.usage.thinking_tokens, 10);
  assert.deepEqual(parsed.finishes, [4, 6]);
  assert.equal(parsed.systemMessages.length, 1);
});

test('records malformed non-JSON lines without losing the terminal result', () => {
  const parsed = parseStream('warning\n{"event":"result","result":{"status":"ERROR"}}\n');
  assert.equal(parsed.invalidLines.length, 1);
  assert.equal(parsed.result.status, 'ERROR');
});
