---
name: execute
description: Implement an approved plan in order, verify each step, and claim done only with fresh evidence. Use when the user clicks Proceed, approves an Implementation Plan artifact, invokes /superpowers-lite:execute, or asks to implement it with ok, duyệt, làm đi, or implement this plan.
---

# Execute

Implement only an approved plan. Follow its numbered steps in order. Do not skip, reorder, or add work outside it.

## Preflight

1. Locate and read the approved plan completely. Prefer the host Implementation Plan artifact when present; otherwise use `docs/plans/YYYY-MM-DD-<slug>.md`. If the artifact exists and no `docs/plans/*.md` file exists yet, copy the artifact markdown to `docs/plans/YYYY-MM-DD-<slug>.md` before changing implementation files.
2. Inspect every named file and the current Git diff.
3. Check the plan against current code. Confirm its acceptance criteria are testable, paths exist or are intentional additions, and commands are valid.
4. If the plan is stale, contradictory, unsafe, or cannot meet its own acceptance criteria, stop with concrete evidence and propose the smallest correction. Do not silently reinterpret it.

## Work one step at a time

For the next unchecked numbered step (`- [ ] N.`):

1. Implement only that step's Files.
2. Run that step's Check command (or the nearest listed verification if the step has no Check).
3. Inspect the diff for accidental edits.
4. Change `- [ ] N.` to `- [x] N.` only after the Check passes, on both the repo plan file and the Implementation Plan artifact when both exist. Note the command and exit code under the step when useful.
5. Then proceed to the next numbered step.

Optionally keep a host task artifact (`ArtifactType: "task"`) in sync for progress UI. It does not replace the plan checklist.

Follow current project conventions and keep the diff minimal. Use an existing test harness for behavior changes. For a bug, add a regression test that fails for the reproduced behavior before applying the fix when the harness can express it. Mechanical changes do not require ceremonial tests.

## Stop conditions

Stop and request a decision when:

- a file outside the plan's in-scope list must change;
- an interface, data model, dependency, or behavioral assumption changes;
- a destructive or external action becomes necessary;
- the same verification direction fails three times without new evidence.

Report the evidence, affected step, and smallest decision needed. Do not expand scope, install dependencies, commit, or push unless requested.

## Finish gate

Before any completion claim:

1. Every numbered step checkbox is `[x]`.
2. Run every command in Verification plus `git diff --check`.
3. If those results prove the acceptance criteria, mark those checkboxes `[x]` as well. Leave no `- [ ]` in the plan.
4. Report an evidence table:

| Command or interaction | Exit/status | Observed result | Proves |
|---|---:|---|---|

Then list **Verified**, **Not verified**, and **Failures/blockers**.

Do not say the work is done, complete, or fixed while any `- [ ]` remains, a required check failed, or a critical/high review finding remains. Fresh command output from this turn is the only evidence.
