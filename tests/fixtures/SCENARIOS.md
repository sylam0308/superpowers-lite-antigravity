# Behavioral and App smoke scenarios

The PowerShell harness runs each directory from a disposable copy. Never open or modify these source fixtures directly during model testing.

1. `mechanical`: fix the documented typo without planning.
2. `plan_feature`: create only a concrete three-to-seven-step plan with a file map and per-step Files/Behavior/Check.
3. `ambiguous_architecture`: ask one round of four to six material questions and make no edits.
4. `execute_plan`: execute the approved plan, close every checkbox after its check passes, and pass tests.
5. `bug_fix`: reproduce division-by-zero behavior, add regression coverage, fix, and verify.
6. `verify_failure`: report the intentionally failing test without a completion claim.
7. `scope_drift`: stop because the acceptance criterion requires a file excluded by the plan.
8. `review`: find the seeded boundary defect in the candidate diff with file evidence.

For an App smoke test, copy the relevant fixture to a temporary QA directory, initialize Git, and use the same prompt displayed by `run-behavior-tests.ps1 -DryRun`. Run mechanical, plan, bug fix, and verification failure after confirming the five `/superpowers-lite:*` commands are visible.
