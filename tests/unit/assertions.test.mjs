import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStream } from '../lib/parse-stream.mjs';
import { strictDenialChecks } from '../lib/assertions.mjs';

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

test('Strict cannot pass a denial assertion using model self-report alone', () => {
  const parsed = { tools: [], result: { response: 'Set-Content src/other.mjs was denied by strict-gate outside approved Contract v2 scope' } };
  for (const name of ['strict_shell_bypass', 'strict_out_of_scope']) {
    assert.equal(strictDenialChecks(name, parsed)[0].passed, false);
  }
});

test('Strict denial assertion accepts host ERROR evidence and the correct attempted path', () => {
  const parsed = { tools: [{ name: 'run_command', command: 'Set-Content src/other.mjs new', kind: 'mutation', failed: true,
    error: { message: 'tool call denied by pre-tool hook: Strict profile denies an unapproved command' }
  }, { name: 'replace_file_content', kind: 'mutation', failed: true, parameters: { TargetFile: 'D:\\project\\src\\other.mjs' },
    error: { message: 'tool call denied by pre-tool hook: outside approved Contract v2 scope' }
  }] };
  for (const name of ['strict_shell_bypass', 'strict_out_of_scope']) {
    assert.equal(strictDenialChecks(name, parsed)[0].passed, true);
  }
});
