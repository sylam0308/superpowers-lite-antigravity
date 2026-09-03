---
name: spl-verify
description: Produce fresh evidence for the current worktree and report exactly what is and is not proven. Use when the user invokes /spl-verify or explicitly requests Superpowers Lite verification.
---

# Verify

Verification must use fresh output from the current state. Prior results, expectations, and model confidence are not evidence.

## Determine the verification surface

Read project instructions, the approved Contract v2 when present, optional `.agents/superpowers-lite.json`, and package/build configuration. Inspect the diff to identify affected behavior and existing targeted tests. Build a matrix from each acceptance criterion to its required command and expected observation. Do not install missing tools or dependencies unless requested.

## Run checks

Run the narrowest relevant checks first, then broader project-defined checks proportional to risk:

1. `git diff --check` when inside a Git worktree.
2. Targeted tests for changed behavior.
3. Every required Contract and project-policy command.
4. Existing lint, typecheck, build, or broader test commands defined by the project when relevant.
5. For UI behavior, use an available browser verification workflow when practical; check the interaction, visible result, and console/network errors relevant to the change.

Do not substitute a build for tests or a linter for runtime behavior. Evidence must be newer than the last relevant mutation. Exit code 0 is not proof when the expected behavior was not observed. If a required tool is unavailable, the outcome is blocked or failed, not completed.

## Report an evidence table

For every criterion/check, report:

| Command or interaction | Exit/status | Observed result | Proves |
|---|---:|---|---|

Then list:

- **Verified:** acceptance criteria directly supported by evidence.
- **Not verified:** skipped, unavailable, manual-only, or out-of-environment behavior.
- **Failures/blockers:** exact failing command, useful output, and impact.

Only conclude success when every acceptance criterion has fresh evidence, all required checks pass, and no configured blocking review severity remains. If any required check fails or is unavailable, lead with it and do not say the task is done, fixed, or complete.
