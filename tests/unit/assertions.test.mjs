import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStream } from '../lib/parse-stream.mjs';

test('mutation ordering is represented deterministically', () => {
  const parsed = parseStream([
    '{"event":"step_update","step_update":{"conversation_id":"x","step_index":0,"state":"DONE","step_type":"tool","tool_name":"view_file","tool_info":{"name":"view_file"}}}',
    '{"event":"step_update","step_update":{"conversation_id":"x","step_index":1,"state":"DONE","step_type":"tool","tool_name":"write_to_file","tool_info":{"name":"write_to_file"}}}',
    '{"event":"step_update","step_update":{"conversation_id":"x","step_index":2,"state":"DONE","step_type":"tool","tool_name":"run_command","tool_info":{"name":"run_command","parameters":{"CommandLine":"npm test"}}}}'
  ].join('\n'));
  assert.equal(parsed.tools.findIndex((item) => item.kind === 'inspection'), 0);
  assert.equal(parsed.tools.findIndex((item) => item.kind === 'mutation'), 1);
  assert.equal(parsed.tools.findLastIndex((item) => item.kind === 'verification'), 2);
});
