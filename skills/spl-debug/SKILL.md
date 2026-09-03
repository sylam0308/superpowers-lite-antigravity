---
name: debug
description: Diagnose an unknown defect from reproducible evidence and apply the smallest verified fix. Use when the user invokes /superpowers-lite:debug or asks to investigate and fix a bug whose cause is not established.
---

# Debug

Do not patch symptoms before establishing evidence.

Read optional `.agents/superpowers-lite.json` and preserve its protected paths and required checks. Record the initial worktree diff so pre-existing user changes are never overwritten.

## Loop

1. **Reproduce.** Write the shortest reliable command or interaction that demonstrates the defect. Record actual and expected behavior. If it cannot be reproduced, collect diagnostics and say what remains uncertain.
2. **Trace evidence.** Inspect relevant logs, tests, inputs, state transitions, recent changes, and call sites. At system boundaries, capture what enters and leaves.
3. **State one hypothesis.** Name one falsifiable root-cause hypothesis and the evidence supporting it. Distinguish observation from inference. Do not edit implementation source before the reproduction and this hypothesis evidence exist.
4. **Test the hypothesis.** Use the smallest diagnostic change or command that can disprove it. Change one variable at a time.
5. **Apply a minimal fix.** Fix the cause at the narrowest correct layer; avoid unrelated refactors and speculative hardening.
6. **Add regression coverage.** When the project has a suitable test harness, first make a test fail for the reproduced defect, then make it pass with the fix. If automated coverage is impractical, document the repeatable manual check.
7. **Verify after the final mutation.** Re-run the original reproduction, regression check, nearby targeted tests, project-policy required checks, and `git diff --check`. Evidence from before the last edit is stale.

## Failure breaker

Count failed attempts in the same causal direction. After three failed fixes or hypothesis tests without materially new evidence, stop. Summarize each attempt, its result, the strongest remaining hypotheses, and the next decision or access needed. Do not stack a fourth speculative patch.

Report commands, exit codes, observed results, and any unverified behavior in a criterion-to-evidence matrix. Exit code 0 without observation of the expected behavior is unverified. A non-reproduction or failing/required-missing check is not completion.
