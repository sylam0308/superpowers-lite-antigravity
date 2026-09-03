#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { extractContract } from '../lib/contract.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testDir, '..');
const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function read(relative) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    fail(`Missing required file: ${relative}`);
    return '';
  }
  return fs.readFileSync(absolute, 'utf8');
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      fail(`Symbolic links are not allowed in the plugin: ${path.relative(root, absolute)}`);
    } else if (entry.isDirectory()) {
      files.push(...walk(absolute));
    } else if (entry.isFile()) {
      files.push(absolute);
    }
  }
  return files;
}

function parseFrontmatter(relative, expectedName) {
  const content = read(relative);
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    fail(`${relative}: missing YAML frontmatter`);
    return content;
  }
  const fields = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (field) fields.set(field[1], field[2].replace(/^['"]|['"]$/g, '').trim());
  }
  if (fields.get('name') !== expectedName) {
    fail(`${relative}: frontmatter name must be "${expectedName}"`);
  }
  const description = fields.get('description') ?? '';
  if (description.length < 40 || description.length > 500) {
    fail(`${relative}: description must be 40-500 characters`);
  }
  return content;
}

function checkMarkdownLinks(relative, content) {
  const sourceDirectory = path.dirname(path.join(root, relative));
  const links = content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g);
  for (const [, rawTarget] of links) {
    const target = rawTarget.trim().split('#')[0];
    if (!target || /^(https?:|mailto:)/i.test(target)) continue;
    const resolved = path.resolve(sourceDirectory, decodeURIComponent(target));
    if (!resolved.startsWith(root + path.sep) && resolved !== root) {
      fail(`${relative}: link escapes plugin root: ${rawTarget}`);
    } else if (!fs.existsSync(resolved)) {
      fail(`${relative}: broken internal link: ${rawTarget}`);
    }
  }
}

const required = [
  'AGENTS.md',
  'README.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'plugin.json',
  'docs/UPSTREAM_AUDIT.md',
  'rules/proportional-workflow.md',
  'scripts/deploy.ps1',
  'scripts/build-runtime.ps1',
  'scripts/verify-install.ps1',
  'scripts/undeploy.ps1',
  'tests/validate.mjs',
  'tests/run-behavior-tests.ps1',
  'tests/lib/parse-stream.mjs',
  'tests/lib/assertions.mjs',
  'tests/lib/inspect-worktree.mjs',
  'tests/schemas/final-report.schema.json',
  'tests/schemas/plan-intake.schema.json',
  'lib/contract.mjs',
  'tests/fixtures/contracts/valid-plan.md',
  'hooks/strict-gate.mjs',
  'profiles/strict/hooks.template.json',
  'docs/STRICT_PROFILE.md',
  'tests/unit/strict-gate.test.mjs',
];
for (const relative of required) read(relative);

const manifestText = read('plugin.json');
let manifest;
try {
  manifest = JSON.parse(manifestText);
} catch (error) {
  fail(`plugin.json: invalid JSON (${error.message})`);
}

if (manifest) {
  if (manifest.name !== 'superpowers-lite') fail('plugin.json: name must be superpowers-lite');
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version ?? '')) {
    fail('plugin.json: version must be semantic version syntax');
  }
  if (typeof manifest.description !== 'string' || manifest.description.length < 40) {
    fail('plugin.json: description is missing or too short');
  }
  if (manifest.repository !== 'https://github.com/sylam0308/superpowers-lite-antigravity.git') {
    fail('plugin.json: repository must point to the public GitHub source');
  }
  for (const forbiddenKey of ['hooks', 'mcpServers', 'commands', 'telemetry']) {
    if (Object.hasOwn(manifest, forbiddenKey)) fail(`plugin.json: ${forbiddenKey} is excluded from this plugin`);
  }
}

if (/D:\\Antigravity Plugin/i.test(read('scripts/deploy.ps1'))) {
  fail('scripts/deploy.ps1: source path must remain portable');
}

const skillNames = ['spl-plan', 'spl-execute', 'spl-debug', 'spl-verify', 'spl-review'];
const runtimeFiles = [];
for (const skillName of skillNames) {
  const relative = `skills/${skillName}/SKILL.md`;
  const content = parseFrontmatter(relative, skillName);
  runtimeFiles.push({ relative, content });
}

const contractFixture = read('tests/fixtures/contracts/valid-plan.md');
const parsedContract = extractContract(contractFixture);
if (parsedContract.legacy || parsedContract.errors.length) {
  fail(`tests/fixtures/contracts/valid-plan.md: invalid Contract v2 (${parsedContract.errors.join('; ')})`);
}

try {
  const hooksTemplate = JSON.parse(read('profiles/strict/hooks.template.json'));
  const strict = hooksTemplate['superpowers-lite-strict'];
  if (!strict || strict.enabled !== true || !Array.isArray(strict.PreToolUse) || !Array.isArray(strict.PostToolUse) || !Array.isArray(strict.Stop)) {
    fail('profiles/strict/hooks.template.json: missing enabled PreToolUse/PostToolUse/Stop strict hook');
  }
  const commands = [strict.PreToolUse?.[0]?.hooks?.[0]?.command, strict.PostToolUse?.[0]?.hooks?.[0]?.command, strict.Stop?.[0]?.command];
  if (commands.some((command) => command !== 'node hooks/strict-gate.mjs')) {
    fail('profiles/strict/hooks.template.json: hooks must use the plugin-runtime relative command');
  }
} catch (error) {
  fail(`profiles/strict/hooks.template.json: invalid JSON (${error.message})`);
}

const skillDirectories = fs.existsSync(path.join(root, 'skills'))
  ? fs.readdirSync(path.join(root, 'skills'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  : [];
if (JSON.stringify(skillDirectories) !== JSON.stringify([...skillNames].sort())) {
  fail(`skills: expected exactly ${skillNames.sort().join(', ')}; found ${skillDirectories.join(', ')}`);
}

const rule = parseFrontmatter('rules/proportional-workflow.md', undefined);
runtimeFiles.push({ relative: 'rules/proportional-workflow.md', content: rule });
if (Buffer.byteLength(rule, 'utf8') > 7200) {
  fail('rules/proportional-workflow.md exceeds the approximate 1,200-token budget (7,200 UTF-8 bytes)');
}

for (const { relative, content } of runtimeFiles) {
  if (Buffer.byteLength(content, 'utf8') > 9000) {
    fail(`${relative}: runtime instruction exceeds 9,000 UTF-8 bytes`);
  }
  for (const [label, pattern] of [
    ['upstream namespace', /superpowers:/i],
    ['retired slash command namespace', /\/superpowers-lite:/i],
    ['foreign instruction file', /CLAUDE\.md/i],
    ['foreign task tool', /TodoWrite/i],
  ]) {
    if (pattern.test(content)) fail(`${relative}: banned ${label} reference`);
  }
  checkMarkdownLinks(relative, content);
}

for (const absolute of walk(root)) {
  const relative = path.relative(root, absolute).replaceAll('\\', '/');
  if (relative.startsWith('.git/')) continue;
  if (fs.statSync(absolute).size > 512_000) {
    fail(`${relative}: file exceeds 512 KB`);
  }
  if (/\.(md|json|mjs|ps1)$/i.test(relative)) {
    checkMarkdownLinks(relative, fs.readFileSync(absolute, 'utf8'));
  }
}

const commandNames = skillNames.map((name) => `/${name}`);
const summary = {
  plugin: manifest?.name ?? null,
  version: manifest?.version ?? null,
  commands: commandNames,
  runtimeInstructionFiles: runtimeFiles.length,
  warnings,
  errors,
};

if (errors.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(summary, null, 2));
