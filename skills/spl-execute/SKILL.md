---
name: spl-execute
description: Execute an approved Superpowers Lite plan against a recorded baseline, enforce Contract v2 scope, verify every step, and claim completion only from fresh evidence. Use after a Lite Proceed, Lite plan approval, or /spl-execute.
---

# Execute

Implement only an approved plan, in its stated order.

## Preflight and baseline

1. Read the approved plan completely. Prefer the host Implementation Plan artifact; otherwise use the named workspace plan. Do not create a second plan copy merely to execute it.
2. If the plan has a `superpowers-lite-contract`, parse it and stop on invalid JSON, unmapped acceptance, unsafe paths, unknown IDs, placeholders, or fewer than 3/more than 7 steps. A plan without the comment is legacy mode: follow its written Scope but do not claim machine-enforced scope.
3. Read optional `.agents/superpowers-lite.json`; merge required checks, protected paths, and blocking severities.
4. Record baseline evidence before the first edit: `HEAD`, `git status --porcelain=v1 -uall`, current diff, plan SHA-256, risk, allowlist, and pre-existing changed paths. Never overwrite or reformat pre-existing user work.
5. Inspect every named file and validate paths, commands, prerequisites, and acceptance testability against current code. If the plan is stale, contradictory, unsafe, or insufficient, stop with evidence and the smallest decision required. Do not silently reinterpret it.

## Execute one step at a time

For the next unchecked step:

1. Implement only that step's files. Contract v2 paths must match `scope.allow`. Protected paths require explicit approval even when allowed.
2. Run the step's named check and capture command, exit code, and observed output.
3. Compare current changed paths with baseline plus allowlist. Stop immediately on a new out-of-scope path.
4. Inspect the step diff for accidental edits.
5. Tick the step only after its check passes and its acceptance mapping is still valid. Keep the host artifact checklist synchronized when it is the approved source.

Use the existing test harness for behavior changes. For a defect, add a failing regression when the harness can express it before applying the fix. Mechanical edits do not require ceremonial tests.

## Stop conditions

Stop and return `blocked` or request a decision when:

- an out-of-scope or protected path is required;
- a public interface, dependency, data model, architecture, or acceptance assumption changes;
- plan content/hash changed unexpectedly after execution began;
- destructive or external state is required but not authorized;
- the same direction fails three times without materially new evidence.

Never expand scope, install dependencies, commit, push, or discard user changes unless explicitly requested.

## Finish gate

After the final implementation mutation:

1. Confirm every step is checked.
2. Run every required Contract verification plus project-policy required checks and `git diff --check`.
3. For medium/high risk, inspect the complete diff. For high risk, run review and require no configured blocking severity.
4. Map each acceptance criterion to fresh observed evidence. Exit code 0 alone is insufficient when the expected behavior was not observed.
5. Report a verification matrix: criterion, command/interaction, exit/status, observed result, and proven/not proven.

Then list **Verified**, **Not verified**, and **Failures/blockers**. Do not use done/fixed/complete language while any checkbox is open, required check is missing or failed, evidence predates the final mutation, or a blocking review finding remains.
