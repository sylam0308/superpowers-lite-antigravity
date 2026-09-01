---
name: verify
description: Produce fresh evidence for the current worktree and report exactly what is and is not proven. Use when the user invokes /superpowers-lite:verify, asks whether work is done, or before a completion claim on a substantive change.
---

# Verify

Verification must use fresh output from the current state. Prior results, expectations, and model confidence are not evidence.

## Determine the verification surface

Read project instructions and package/build configuration. Inspect the diff to identify affected behavior and existing targeted tests. Do not install missing tools or dependencies unless requested.

## Run checks

Run the narrowest relevant checks first, then broader project-defined checks proportional to risk:

1. `git diff --check` when inside a Git worktree.
2. Targeted tests for changed behavior.
3. Existing lint, typecheck, build, or broader test commands defined by the project when relevant.
4. For UI behavior, use an available browser verification workflow when practical; check the interaction, visible result, and console/network errors relevant to the change.

Do not substitute a build for tests or a linter for runtime behavior. If a required tool is unavailable, record that as unverified instead of inventing a result.

## Report an evidence table

For every check, report:

| Command or interaction | Exit/status | Observed result | Proves |
|---|---:|---|---|

Then list:

- **Verified:** acceptance criteria directly supported by evidence.
- **Not verified:** skipped, unavailable, manual-only, or out-of-environment behavior.
- **Failures/blockers:** exact failing command, useful output, and impact.

Only conclude success when all required checks pass and no critical/high review finding remains. If any required check fails, lead with the failure and do not say the task is done, fixed, or complete.
