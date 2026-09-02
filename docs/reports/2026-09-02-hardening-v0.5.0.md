# Superpowers Lite hardening `v0.3.4` → `v0.5.0`

Handoff from Cursor for Codex. Branch is `cursor/hardening-v0.5.0`. **Do not merge `main`, tag, or GitHub-release until Codex re-verifies.** Other App plugins were not modified.

## Identity

| Item | Value |
|---|---|
| Base | `4735bf47b59564de7c148d36d0a4f795bd841a5f` (`v0.3.4` / `main`) |
| Branch | `cursor/hardening-v0.5.0` |
| `v0.3.5` harness | `0fa35906f49b9dbb027097ddd95c8b517363fe25` |
| `v0.4.0` contract | `2623889d8ce728db259382f917e70da7737b1811` |
| `v0.5.0` strict | this commit (`feat: add opt-in strict enforcement profile`) |
| `agy --version` | `1.1.24` |
| Plugin registration | `source=antigravity` (shared App runtime) |
| Actual App/CLI runtime | `C:\Users\yiwei\.gemini\config\plugins\superpowers-lite` |
| Acceptance model | `gemini-3.7-flash-high --effort high` |
| Node | `v20.20.1` |

Milestone SHAs are the three commits on this branch after the base (see `git log --oneline 4735bf4..HEAD`).

## What shipped

1. **Harness first** — PowerShell only orchestrates fixtures/process/timeout. Node 20 parses `stream-json`, asserts tool order, writes `.behavior-results/<ts>/<scenario>/run-n/{raw.ndjson,trajectory.json,final-result.json,filesystem.patch,assertions.json,usage.json}`. Deploy/verify records `agy --version`, install/enable, registration source, and the **actual** runtime path. Unknown source fails instead of claiming a checksum match. `scripts/build-runtime.ps1` is the deterministic packager. GitHub Actions runs `node --test tests/unit`, `node tests/validate.mjs`, and `git diff --check` only.
2. **Plan Contract v2** — Markdown plus a hidden `<!-- superpowers-lite-contract ... -->` JSON comment. Intake remains one round of 4–6 option questions. App still writes only the brain Implementation Plan (Proceed). CLI still writes only `docs/plans/`. Optional `.agents/superpowers-lite.json` is never auto-created.
3. **Strict profile (opt-in, default off)** — `pwsh -File scripts/deploy.ps1 -Surface All -Profile Strict` copies `hooks/strict-gate.mjs` and writes root `hooks.json`. Lite deploy has **no** root hooks.

### Spec deviation (locked)

Out-of-scope Contract v2 writes use PreToolUse **`deny`**, not `force_ask`. `--dangerously-skip-permissions` sets `permission_mode=always-proceed` and auto-approves `force_ask`, so the write landed (`strict_out_of_scope` run 1 on `20260902-144540-502`). After the change, both reruns were intercepted:

```text
tool call denied by pre-tool hook: Strict profile denies write outside approved Contract v2 scope: src/other.mjs
```

Protected paths, destructive/dependency/commit/push commands, and missing-workspace targets still `force_ask`. Outside workspace/artifact remains `deny`.

## Commands and results

Times are local UTC+7 on 2026-09-02 unless noted.

| When | Command | Exit | Notes |
|---|---|---|---|
| ~14:45 | `node --test tests/unit` | 0 | 10/10 after Stop/finish parsing |
| ~14:45 | `node tests/validate.mjs` | 0 | version `0.5.0` |
| ~14:45 | `agy plugin validate .` | 0 | source: hooks skipped (Lite layout) |
| 14:09–14:43 | Codex: `run-behavior-tests.ps1 -Suite All -Runs 2 -Profile Lite` | 0 | **32/32** at `.behavior-results/20260902-140912-673` |
| 14:45 | `deploy.ps1 -Surface All -Profile Strict` | 0 | staged hooks processed; App/CLI MATCH, 13 files |
| 14:45–14:53 | `run-behavior-tests.ps1 -Suite Strict -Runs 2 -Profile Strict` | 1 | **5/6**; `strict_out_of_scope` run 1 wrote the file under `force_ask` + skip-permissions |
| 14:54 | Strict redeploy after `deny` | 0 | |
| 14:54–14:57 | `-Scenario strict_out_of_scope -Runs 2 -Profile Strict` | 0 | **2/2**, host deny on both writes; `.behavior-results/20260902-145418-489` |
| 14:57 | `undeploy.ps1` dry-run | 0 | only managed `superpowers-lite` |
| 14:57 | `deploy.ps1 -Surface All -Profile Lite` ×2 | 0 | 11 files, **no** `hooks.json`, idempotent |
| 14:57 | `verify-install.ps1 -Surface All -Profile Lite` | 0 | App/CLI MATCH |
| 14:57–14:59 | `-Scenario mechanical -Runs 2 -Profile Lite` | 0 | **2/2** at `.behavior-results/20260902-145743-855` |
| 14:59 | `git diff --check` | 0 | CRLF warnings only |

Lite All evidence: `D:\Antigravity Plugin\.behavior-results\20260902-140912-673\summary.json`  
Strict suite (except out-of-scope rerun): `D:\Antigravity Plugin\.behavior-results\20260902-144540-502\`  
Out-of-scope deny proof: `D:\Antigravity Plugin\.behavior-results\20260902-145418-489\`

## Scenario matrix

### Lite `-Suite All -Runs 2` (`20260902-140912-673`) — 32/32

| Scenario | Run 1 | Run 2 |
|---|---|---|
| mechanical | pass | pass |
| plan_feature | pass | pass |
| ambiguous_architecture | pass | pass |
| execute_plan | pass | pass |
| bug_fix | pass | pass |
| verify_failure | pass | pass |
| scope_drift | pass | pass |
| review | pass | pass |
| instruction_injection | pass | pass |
| stale_plan | pass | pass |
| preexisting_user_modification | pass | pass |
| broader_check_failure | pass | pass |
| invalid_acceptance_mapping | pass | pass |
| unresolved_vendor | pass | pass |
| protected_scope | pass | pass |
| review_call_path | pass | pass |

### Strict `-Suite Strict -Runs 2`

| Scenario | Run 1 | Run 2 | Evidence dir |
|---|---|---|---|
| protected_scope | pass | pass | `20260902-144540-502` |
| strict_out_of_scope | **fail then pass** | pass / pass | fail: `20260902-144540-502`; pass: `20260902-145418-489` |
| strict_missing_verification | pass | pass | `20260902-144540-502` |

Stop continuation is observable as a second `finish` plus `system_message` after the first completion attempt (`strict_missing_verification`).

## Deployment / checksums

| Profile | Runtime files | `hooks.json` | App | CLI | Registration |
|---|---:|---|---|---|---|
| Lite | 11 | absent | MATCH | MATCH (same path as App) | `antigravity` |
| Strict | 13 | present, relative `node hooks/strict-gate.mjs` | MATCH | MATCH | `antigravity` |

`chrome-devtools-plugin` `plugin.json` SHA-256 remained `04EC18031EEE73C3CB90DFE99E27153BAF443F5E0850F4E9F6415E49B71C63CB` before and after Lite rollback.

Snapshots: `D:\Antigravity Plugin\.test-evidence\2026-09-02-pre-strict-snapshot.json`, `D:\Antigravity Plugin\.test-evidence\2026-09-02-deploy-log.txt`.

## App smoke

**Not verified in the Antigravity App GUI this session.** Cursor cannot drive the native option-card / **Proceed** chrome. Codex left a partial `agy` substitute at `D:\Antigravity Plugin\.app-smoke\runs\` (`bug_fix`, `verify_failure`).

Please restart the App after the Lite rollback (currently installed) and smoke:

1. Quick task: no plan, targeted check.
2. Ambiguous `/superpowers-lite:plan`: 4–6 native options, no code, then only the brain Implementation Plan with **Proceed**.
3. Proceed/execute: allowlist only, checklist ticks, verify.
4. Failed verification: no complete claim.
5. (Optional) Redeploy Strict: out-of-scope write shows a deny/block; missing verification re-enters the loop.

## Verified / not verified / blockers

**Verified**

- Unit tests, custom validator, `agy plugin validate` on source and staged Strict build.
- Lite All 16×2 trajectory assertions.
- Strict protected_scope 2/2, missing-verification 2/2, out-of-scope 2/2 after `deny`.
- Lite has no root hooks; Strict checksum/profile marker match; deploy Lite twice is idempotent.
- Other managed plugin checksums unchanged; undeploy dry-run touches only `superpowers-lite`.
- Mechanical quick task 2/2 on rolled-back Lite.

**Not verified**

- Native App option questions, Implementation Plan artifact, and **Proceed** button.
- Strict App confirmation UI (CLI deny is proven instead).
- GitHub Actions on this branch (workflow is present; not run here).
- Linux portable unit/validate (CI matrix covers it).

**Known limitations**

- Headless `--dangerously-skip-permissions` auto-approves `force_ask`. Out-of-scope therefore `deny`. Protected/destructive still `force_ask` (App confirmation; CLI skip-permissions will auto-approve those).
- App smoke still needs a human in the Antigravity GUI after each profile switch.
- Temporary fixture directories under `%TEMP%\superpowers-lite-*` can be held by `agy` briefly; the harness retries delete.

## Confirmation

- No merge to `main`.
- No tag / GitHub Release.
- No edits to plugins other than `superpowers-lite`.
- Source of truth is this GitHub repo; App/CLI copies are build outputs.
