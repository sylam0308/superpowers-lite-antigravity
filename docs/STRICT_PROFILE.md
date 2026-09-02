# Strict Profile / Chế độ Strict

Strict is an opt-in enforcement profile for higher-risk Antigravity work. Lite remains the default.

```powershell
pwsh -File scripts/deploy.ps1 -Surface All -Profile Strict
pwsh -File scripts/verify-install.ps1 -Surface All -Profile Strict
```

Strict uses Antigravity `PreToolUse`, `PostToolUse`, and `Stop` hooks. An App plan becomes active only after the transcript contains the native approval signal and the matching `implementation_plan.md` artifact URI. A CLI plan becomes active only for `/superpowers-lite:execute <one docs/plans/*.md path>`. Merely having an old plan in the repository does not activate Strict execution.

While a valid Contract v2 plan is active, writes outside `scope.allow` are **denied**. Protected paths still `force_ask`. Shell commands are deny-by-default: Strict allows only a single read-only inspection command without shell metacharacters, an exact required verification command, or `git diff --check`. Dependency changes, destructive commands, commits, and pushes require approval outside active Contract execution and are denied unless explicitly represented by an approved executable contract.

`PreToolUse` records pending actions and `PostToolUse` confirms actual success or failure. `agy` 1.1.24 headless runs do not currently deliver `PostToolUse`; for compatibility, Stop can reconcile a pending action only with a matching completed transcript event at the same step. A failed command, unfinished background task, missing broader required check, or verification performed before the last successful mutation does not count. Stop re-enters the execution loop when required evidence is missing. Two no-progress continuations are the maximum; the next stop must report blocked/unverified rather than claim completion.

Contract-less quick tasks inside the workspace retain Lite behavior. An explicit execute signal with a missing, invalid, outside-workspace, or hash-stale plan blocks implementation writes. Hook state schema v2 is stored under the conversation artifact directory, never in the project.

To return to the default behavior:

```powershell
pwsh -File scripts/deploy.ps1 -Surface All -Profile Lite
```

Restart Antigravity and create a new conversation after switching profiles.
