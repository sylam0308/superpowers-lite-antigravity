#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseStreamFile } from './lib/parse-stream.mjs';
import { assertTrajectory } from './lib/assertions.mjs';
import { getScenario } from './scenarios/index.mjs';

const [name, caseRoot, rawFile, resultDirectory, exitText] = process.argv.slice(2);
const definition = getScenario(name);
if (!definition) throw new Error(`Unknown scenario: ${name}`);
const parsed = parseStreamFile(rawFile);
const asserted = assertTrajectory(definition, parsed, caseRoot, Number(exitText));
fs.mkdirSync(resultDirectory, { recursive: true });
fs.writeFileSync(path.join(resultDirectory, 'trajectory.json'), `${JSON.stringify(parsed, null, 2)}\n`);
fs.writeFileSync(path.join(resultDirectory, 'final-result.json'), `${JSON.stringify(parsed.result, null, 2)}\n`);
fs.writeFileSync(path.join(resultDirectory, 'usage.json'), `${JSON.stringify(parsed.usage, null, 2)}\n`);
fs.writeFileSync(path.join(resultDirectory, 'filesystem.patch'), asserted.worktree.patch);
fs.writeFileSync(path.join(resultDirectory, 'assertions.json'), `${JSON.stringify({ scenario: name, passed: asserted.passed, checks: asserted.checks }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ scenario: name, passed: asserted.passed, checks: asserted.checks })}\n`);
if (!asserted.passed) process.exitCode = 1;
