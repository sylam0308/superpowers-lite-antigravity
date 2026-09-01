---
name: execute
description: Implement an approved plan in small verified batches while preserving its scope. Use when the user invokes /superpowers-lite:execute or explicitly asks to execute an approved plan.
---

# Execute

Implement only an approved plan.

## Preflight

1. Locate and read the approved plan completely.
2. Inspect every named file and the current Git diff.
3. Check the plan against current code. Confirm its acceptance criteria are testable, paths exist or are intentional additions, and commands are valid.
4. If the plan is stale, contradictory, unsafe, or cannot meet its own acceptance criteria, stop with concrete evidence and propose the smallest correction. Do not silently reinterpret it.

## Work in small batches

Implement one coherent plan step at a time. Follow current project conventions and keep the diff minimal. After a step:

- run the narrow check associated with that step;
- inspect the diff for accidental edits;
- update that step's checkbox in the plan only after the check passes;
- note the command and result briefly under the step when useful.

Use an existing test harness for behavior changes. For a bug, add a regression test that fails for the reproduced behavior before applying the fix when the harness can express it. Mechanical changes do not require ceremonial tests.

## Stop conditions

Stop and request a decision when:

- a file outside the plan's in-scope list must change;
- an interface, data model, dependency, or behavioral assumption changes;
- a destructive or external action becomes necessary;
- the same verification direction fails three times without new evidence.

Report the evidence, affected step, and smallest decision needed. Do not expand scope, install dependencies, commit, or push unless requested.

## Finish

Run the plan's verification commands plus `git diff --check`. Review the final diff against every acceptance criterion. Report commands, exit codes, observed results, remaining unverified areas, and any plan checkbox left open. Do not claim completion while a required check fails or a critical/high review finding remains.
