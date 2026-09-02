# Strict Profile / Chế độ Strict

Strict is an opt-in enforcement profile for higher-risk Antigravity work. Lite remains the default.

```powershell
pwsh -File scripts/deploy.ps1 -Surface All -Profile Strict
pwsh -File scripts/verify-install.ps1 -Surface All -Profile Strict
```

Strict uses Antigravity `PreToolUse` and `Stop` hooks. Out-of-scope Contract v2 writes are **denied** (a hard block: `force_ask` is auto-approved under CLI `--dangerously-skip-permissions`). Protected paths, dependency changes, destructive commands, commits, and pushes still `force_ask`. Writes outside workspace/artifact roots are denied. Stop re-enters the execution loop when implementation changed without fresh verification. Two no-progress continuations are the maximum.

Contract-less quick tasks inside the workspace remain allowed. Legacy plans execute without exact hook scope enforcement and are identified as such. Hook state is stored under the conversation artifact directory, never in the project.

To return to the default behavior:

```powershell
pwsh -File scripts/deploy.ps1 -Surface All -Profile Lite
```

Restart Antigravity and create a new conversation after switching profiles.
