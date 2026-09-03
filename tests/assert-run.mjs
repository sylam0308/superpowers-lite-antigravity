#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseStreamFile } from './lib/parse-stream.mjs';
import { assertTrajectory } from './lib/assertions.mjs';
import { getScenario } from './scenarios/index.mjs';

const [name, caseRoot, resultDirectory, exitsText] = process.argv.slice(2);
const definition = getScenario(name);
if (!definition) throw new Error(`Unknown scenario: ${name}`);
const exits = JSON.parse(exitsText);
const turnDirectories = fs.readdirSync(resultDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^turn-\d+$/.test(entry.name))
  .sort((a, b) => Number(a.name.slice(5)) - Number(b.name.slice(5)));
const parsedTurns = turnDirectories.length
  ? turnDirectories.map((entry) => parseStreamFile(path.join(resultDirectory, entry.name, 'raw.ndjson')))
  : [parseStreamFile(path.join(resultDirectory, 'raw.ndjson'))];
const parsed = parsedTurns.at(-1);
const asserted = assertTrajectory(definition, parsed, caseRoot, exits.at(-1), parsedTurns, exits);
fs.mkdirSync(resultDirectory, { recursive: true });
fs.writeFileSync(path.join(resultDirectory, 'trajectory.json'), `${JSON.stringify({ turns: parsedTurns }, null, 2)}\n`);
fs.writeFileSync(path.join(resultDirectory, 'final-result.json'), `${JSON.stringify(parsed.result, null, 2)}\n`);
fs.writeFileSync(path.join(resultDirectory, 'usage.json'), `${JSON.stringify({ turns: parsedTurns.map((turn) => turn.usage) }, null, 2)}\n`);
fs.writeFileSync(path.join(resultDirectory, 'filesystem.patch'), asserted.worktree.patch);
fs.writeFileSync(path.join(resultDirectory, 'assertions.json'), `${JSON.stringify({ scenario: name, passed: asserted.passed, checks: asserted.checks }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ scenario: name, passed: asserted.passed, checks: asserted.checks })}\n`);
if (!asserted.passed) process.exitCode = 1;
