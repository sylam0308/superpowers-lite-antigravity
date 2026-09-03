import fs from 'node:fs';

const inspectTools = new Set([
  'view_file', 'list_dir', 'find_by_name', 'grep_search', 'search_web',
  'read_url_content', 'list_permissions'
]);
const writeTools = new Set(['write_to_file', 'replace_file_content', 'multi_replace_file_content']);

function commandLine(info = {}) {
  const parameters = info.parameters ?? {};
  return String(parameters.CommandLine ?? parameters.command ?? parameters.cmd ?? '');
}

function classifyTool(step) {
  const name = step.tool_name ?? step.tool_info?.name ?? '';
  const info = step.tool_info ?? {};
  const command = commandLine(info);
  const lower = command.toLowerCase();
  const isInspectionCommand = name === 'run_command' && /(^|[;&|]\s*)(git\s+(status|diff|log|show|ls-files)|rg\b|grep\b|get-content\b|test-path\b|ls\b|dir\b)/i.test(command);
  const isVerificationCommand = name === 'run_command' && /(\btest\b|node\s+--test|check\.mjs|lint|typecheck|build|git\s+diff\s+--check)/i.test(command);
  const isMutationCommand = name === 'run_command' && /(set-content|add-content|out-file|copy-item|move-item|remove-item|npm\s+(install|uninstall)|pnpm\s+(add|remove)|yarn\s+(add|remove)|git\s+(add|commit|push|checkout|switch|reset|clean)|\brm\b|\bmv\b|\bcp\b)/i.test(command);
  return {
    name,
    command,
    parameters: info.parameters ?? {},
    kind: writeTools.has(name) || isMutationCommand
      ? 'mutation'
      : isVerificationCommand
        ? 'verification'
        : inspectTools.has(name) || isInspectionCommand
          ? 'inspection'
          : 'other',
    failed: Boolean(info.error) || /exit (code|status)\s*[1-9]|\bnot ok\b|\bfailed\b/i.test(String(info.output ?? '')),
    output: String(info.output ?? ''),
    error: info.error ?? null,
    lowerCommand: lower
  };
}

export function parseStream(raw) {
  const events = [];
  const invalidLines = [];
  for (const [index, source] of raw.split(/\r?\n/).entries()) {
    const line = source.trim();
    if (!line) continue;
    try { events.push(JSON.parse(line)); }
    catch { invalidLines.push({ line: index + 1, text: source }); }
  }

  const init = events.find((item) => item.event === 'init')?.init ?? null;
  const result = [...events].reverse().find((item) => item.event === 'result')?.result ?? null;
  const seen = new Set();
  const tools = [];
  const finishes = [];
  const systemMessages = [];
  for (const event of events) {
    if (event.event !== 'step_update') continue;
    const step = event.step_update ?? {};
    if (step.state !== 'DONE') continue;
    if (step.step_type === 'finish') finishes.push(step.step_index ?? finishes.length);
    if (step.step_type === 'system_message') {
      systemMessages.push({
        index: step.step_index ?? systemMessages.length,
        text: String(step.text ?? step.text_delta ?? step.message ?? '')
      });
    }
    if (step.step_type !== 'tool') continue;
    const key = `${step.conversation_id ?? ''}:${step.step_index ?? tools.length}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tools.push({ index: step.step_index ?? tools.length, ...classifyTool(step) });
  }

  const structured = result?.structured_output ?? (() => {
    try { return JSON.parse(result?.response ?? ''); }
    catch { return null; }
  })();

  return {
    init,
    result,
    structured,
    tools,
    finishes,
    systemMessages,
    invalidLines,
    usage: result?.usage ?? {},
    conversationId: result?.conversation_id ?? events.find((item) => item.conversation_id)?.conversation_id ?? null,
    litePlanSkillObserved: /skills[\\/]spl-plan[\\/]SKILL\.md/i.test(raw)
  };
}

export function parseStreamFile(file) {
  return parseStream(fs.readFileSync(file, 'utf8'));
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).href) {
  process.stdout.write(`${JSON.stringify(parseStreamFile(process.argv[2]), null, 2)}\n`);
}
