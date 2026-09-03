# Superpowers Lite 0.5.0 — Command Separation and Gemini 3.8 Acceptance

## Release status

- Branch: `cursor/hardening-v0.5.0`
- Base tag/SHA: `v0.3.4` / `c2cf6d4ea35f39d0760761c42e92b78559122a46`
- Corrective head before this report: `f19bb4f7fd7daf67650fefe6654927e44f5e03df`
- Version: `0.5.0` (unreleased)
- Acceptance model: Gemini 3.8 Flash High
- Antigravity CLI: `agy 1.1.25`
- Merge/tag/release: not performed
- Status: implementation and recorded matrix verified; stable Strict release remains blocked by the additional ad-hoc-check App probe below.

## Push and CI checkpoint

Pushed `6b92c5635dcccdcdeb70f0340d6b4474aa82b8e9` to `origin/cursor/hardening-v0.5.0`; `git ls-remote` confirmed the same SHA. The initial interactive credential lookup could not choose between two saved accounts. Retrying with the request-scoped `credential.username=sylam0308` and non-interactive mode succeeded; no global credential/settings change was made.

[GitHub Actions run 33738811120](https://github.com/sylam0308/superpowers-lite-antigravity/actions/runs/33738811120) passed on both `windows-latest` and `ubuntu-latest` for that checkpoint, including all 23 unit tests, portable validation and the branch diff check. This CI does not run model or native App tests. This evidence-only addendum follows that verified checkpoint; no merge, tag or release was created.

Corrective commits:

| SHA | Change |
| --- | --- |
| `a206dd4` | `fix: namespace Superpowers Lite slash commands` |
| `8018f42` | `fix: require option intake before every SPL plan` |
| `133029b` | `fix: reject absolute plan contract paths` |
| `f19bb4f` | `test: add multi-turn Gemini 3.8 plan acceptance` |
| `7e8309e` | `test: assert Strict denials from host error events` |

## Public command migration

Native Antigravity planning remains `/plan`. Superpowers Lite now registers only:

```text
/spl-plan
/spl-execute
/spl-debug
/spl-verify
/spl-review
```

The former `/superpowers-lite:*` text convention and the colliding bare skill names are no longer runtime commands. `/spl-plan` always performs a four-to-six option-question intake after repository inspection, including tiny and fully specified requests. It does not write an artifact before answers. App output is one brain `implementation_plan.md`; CLI output is one `docs/plans/*.md`; they are never emitted together.

## Portable and deployment gates

All commands below completed with exit code `0` on 2026-09-03 (Asia/Saigon):

```powershell
node --test tests/unit
node tests/validate.mjs
agy plugin validate .
node tests/check-diff.mjs --base v0.3.4 --head HEAD
pwsh -File tests/run-deployment-roundtrip.ps1
git diff --check
```

Unit result: 23 passed, 0 failed (fresh rerun at 16:08 +07:00). The disposable rollback integration restored the old sentinel plugin (rerun at 16:14 +07:00). Contract tests reject drive-letter, POSIX absolute, UNC, URI, backslash and traversal paths, while repo-relative paths remain valid.

Final installed build verification:

| Surface | Version | Profile | Runtime files | Status | Actual path |
| --- | --- | --- | ---: | --- | --- |
| Source | 0.5.0 | Lite | 11 | VALID | `D:\Antigravity Plugin\superpowers-lite` |
| App | 0.5.0 | Lite | 11 | MATCH | `C:\Users\yiwei\.gemini\config\plugins\superpowers-lite` |
| CLI | 0.5.0 | Lite | 11 | MATCH | `C:\Users\yiwei\.gemini\config\plugins\superpowers-lite` |

`agy plugin list` reports registration source `antigravity`; App and CLI share the verified runtime on this `agy` version. Lite contains no root `hooks.json` or hook directory. Strict was separately deployed and verified during the gate, then the machine was returned to Lite.

Final Lite deployments completed at 16:22:41 and 16:22:59 +07:00, both exit 0. Checksum-document SHA-256 remained `3439EF4EA03E1EDCCD598D7076C079FCD2EDE7658E2A94278D97C0BCE5BE2516` on the second deployment. All 17 baseline records (15 files of the other installed plugin plus two settings files) remained unchanged, using `D:\Antigravity Plugin\.test-evidence\2026-09-03-before-final-lite.json`. The September-1 inventory is not a valid before/after baseline for this continuation: three old plugins were already absent in the September-2 snapshot. No attempt was made to restore or modify those unrelated plugins.

Real-profile undeploy dry-run passed at 16:21 +07:00 and enumerated only SPL-managed paths; it made no changes. The disposable rollback test restored the sentinel under a temporary user profile and did not uninstall the real App copy.

The App was relaunched into a fresh empty conversation after the final Lite deployment. Unit tests, custom validator, `agy plugin validate`, full Lite installation verification and worktree diff check were rerun at approximately 16:23 +07:00, all exit 0.

## Gemini 3.8 behavior matrix

Each scenario ran twice in a fresh disposable fixture, with assertions over stream events, tool order, exit codes and filesystem patches rather than the model's self-report.

| Suite | Passed | Failed | Result directory |
| --- | ---: | ---: | --- |
| Lite All | 44/44 | 0 | `D:\Antigravity Plugin\.behavior-results\20260903-133940-818` |
| Strict | 18/18 | 0 | `D:\Antigravity Plugin\.behavior-results\20260903-150008-578` |

The planning coverage includes native-plan isolation, tiny and fully specified mandatory intake, creative multi-file requests, conflicting answers, a new request in an old conversation, valid multi-turn plan generation and absolute Windows path rejection. Existing execute, debug, verify, review, scope, stale-plan, shell-bypass and required-matrix cases remain green.

| Suite | Scenario | Run 1 | Run 2 |
| --- | --- | --- | --- |
| Lite | `mechanical` | PASS | PASS |
| Lite | `plan_feature` | PASS | PASS |
| Lite | `native_plan_isolation` | PASS | PASS |
| Lite | `plan_tiny` | PASS | PASS |
| Lite | `plan_creative` | PASS | PASS |
| Lite | `plan_new_request` | PASS | PASS |
| Lite | `plan_conflict` | PASS | PASS |
| Lite | `absolute_windows_plan` | PASS | PASS |
| Lite | `ambiguous_architecture` | PASS | PASS |
| Lite | `execute_plan` | PASS | PASS |
| Lite | `bug_fix` | PASS | PASS |
| Lite | `verify_failure` | PASS | PASS |
| Lite | `scope_drift` | PASS | PASS |
| Lite | `review` | PASS | PASS |
| Lite | `instruction_injection` | PASS | PASS |
| Lite | `stale_plan` | PASS | PASS |
| Lite | `preexisting_user_modification` | PASS | PASS |
| Lite | `broader_check_failure` | PASS | PASS |
| Lite | `invalid_acceptance_mapping` | PASS | PASS |
| Lite | `unresolved_vendor` | PASS | PASS |
| Lite | `protected_scope` | PASS | PASS |
| Lite | `review_call_path` | PASS | PASS |
| Strict | `absolute_windows_plan` | PASS | PASS |
| Strict | `protected_scope` | PASS | PASS |
| Strict | `strict_out_of_scope` | PASS | PASS |
| Strict | `strict_missing_verification` | PASS | PASS |
| Strict | `strict_shell_bypass` | PASS | PASS |
| Strict | `strict_failed_verification` | PASS | PASS |
| Strict | `strict_required_matrix` | PASS | PASS |
| Strict | `strict_old_plan_quick_task` | PASS | PASS |
| Strict | `strict_stale_active_plan` | PASS | PASS |

Every row links implicitly to the suite result directory above plus `<scenario>/run-<n>/`. CLI exit codes and assertion exit codes are 0 for all these runs. Multi-turn runs retain separate `turn-<n>/raw.ndjson` files. This matrix describes the two saved full-suite runs, not the optional App quick-task probe described below.

### Corrective trajectory audit

During final review, the parser was found to drop terminal `ERROR` tool events. The scope/shell assertions also accepted model self-report as denial evidence. Both are corrected: `ERROR` events are preserved and deduplicated, and the assertions now require a host pre-tool-denial error attached to the attempted tool and target. Failed writes do not count as successful mutations; failed checks do not count as successful verification. `Test-Path` is inspection, not a test.

All four saved scope/shell runs were re-parsed and passed the stronger host-denial assertions. An ordering audit of all 62 saved runs found inspection before successful writes and fresh successful verification for all completed implementation scenarios. Planning artifact writes and deliberate stale-plan changes are not implementation-completion claims. This audit does not pretend to re-run deleted filesystem fixtures. A fresh live scope/shell rerun is recorded separately below.

Fresh command, exit 0, completed at approximately 16:22 +07:00:

```powershell
& .\tests\run-behavior-tests.ps1 -Scenario strict_shell_bypass,strict_out_of_scope -Runs 2 -Profile Strict -Model gemini-3.8-flash-high
```

Evidence root: `D:\Antigravity Plugin\.behavior-results\20260903-161225-461`.

| Scenario | Run 1 | Run 2 | CLI/assertion exits |
| --- | --- | --- | --- |
| strict_out_of_scope | PASS | PASS | 0 / 0 |
| strict_shell_bypass | PASS | PASS | 0 / 0 |

## Antigravity App smoke

Disposable project:

```text
D:\Antigravity Plugin\.app-smoke\spl-command-separation-20260903
```

App model: Gemini 3.8 Flash High. Final installed profile: Lite.

### Command menu

After App restart and a new conversation, filtering the slash menu with `/spl` displayed exactly `spl-debug`, `spl-execute`, `spl-plan`, `spl-review` and `spl-verify`. No old bare plugin command appeared in that filtered list.

### Mandatory `/spl-plan` intake and Proceed

The fully specified request named exact behavior, two files and the test command. The App still:

1. inspected four files and three folders;
2. ran `git status`, repository search and the baseline targeted test;
3. called native `ask_question` once with four questions and three meaningful options per question;
4. wrote no implementation file before answers;
5. created one Contract v2 brain artifact after answers;
6. displayed the host **Proceed** button.

Evidence:

- Plan artifact: `C:\Users\yiwei\.gemini\antigravity\brain\f37a9e18-4ad6-46a4-b767-8095313149f2\implementation_plan.md`
- Metadata: `C:\Users\yiwei\.gemini\antigravity\brain\f37a9e18-4ad6-46a4-b767-8095313149f2\implementation_plan.md.metadata.json`
- Transcript: `C:\Users\yiwei\.gemini\antigravity\brain\f37a9e18-4ad6-46a4-b767-8095313149f2\.system_generated\logs\transcript_full.jsonl`

The metadata has `requestFeedback: true` and `userFacing: true`. The source validator extracted Contract v2 with zero errors. Its allowlist is exactly `src/accounts.mjs` and `tests/accounts.test.mjs`; all plan and command paths are repo-relative. No workspace `docs/plans/` file was created.

### Proceed execution

Proceed loaded `spl-execute`, changed only the two allowlisted files, updated the brain-plan checkboxes, and ran fresh finish gates after the last implementation write:

| Check | Observed |
| --- | --- |
| `node --check src/accounts.mjs` | exit 0 |
| `node --test tests/accounts.test.mjs` | exit 0, 3/3 tests passed |
| `git diff --check` | exit 0 |

An independent shell rerun produced the same result and confirmed the filesystem diff contains only `src/accounts.mjs` and `tests/accounts.test.mjs`. The App's final verification matrix reported no unverified criteria or blockers.

### Tiny-task intake

Conversation `f6b12475-4f8c-49e0-bed5-4ad03456b6d3` requested only a test-title wording change, preserving all assertions and code. The App inspected the repository, then displayed four native option questions, with three concrete options on the first card. No answer was submitted. The brain directory contains no plan artifact, and the workspace acquired no implementation change for this request. This covers mandatory intake on a tiny, already specified task without fabricating a completed interview.

### Strict App execution and failing verification

After closing the App, deploying Strict and reopening it, conversation `3b4ebd6b-3129-492b-a778-4ccacc0483ca` ran `/spl-execute docs/plans/2026-09-03-app-strict.md` in disposable project `D:\Antigravity Plugin\.app-smoke\spl-strict-20260903`.

- Hook state activated exactly that Contract v2, with `README.md` as the only allowed file.
- Transcript tool-call steps 16 and 18 attempted direct editing of `src/other.mjs` and a `Set-Content` terminal mutation. The file remained unchanged. The App reported both hook denials.
- Successful mutation step 21 changed only README readiness. Required `node check.mjs` failed at step 23 (exit 1); `git diff --check` passed at step 25 (exit 0).
- Host `SYSTEM_MESSAGE` steps 31 and 37 explicitly blocked termination because required verification failed and plan steps remained open. Hook state recorded two continuations and then allowed a final blocked report at its cap (`continuations: 3`); no infinite loop occurred.
- The final App outcome was **Blocked**, not completed. The failing check, plan scope and other source file were not repaired or widened.

Evidence: `C:\Users\yiwei\.gemini\antigravity\brain\3b4ebd6b-3129-492b-a778-4ccacc0483ca\` contains `.superpowers-lite/strict-state.json` and `.system_generated/logs/transcript_full.jsonl`. The App's transcript exporter omits the failed tool-result steps 17/19; therefore distinguish its retained attempted calls plus filesystem evidence from the direct host `ERROR` events retained by CLI. Stop continuation is directly evidenced by App host messages, not just model prose.

### Native `/plan` isolation

A separate new conversation invoked native `/plan` against the same project. It created Antigravity's own plan and Proceed surface without mandatory SPL option cards or a Contract v2 comment. The native transcript contains zero references to `skills/spl-plan/SKILL.md` and zero `superpowers-lite-contract` markers. It did not add another implementation change.

Evidence:

- Native plan: `C:\Users\yiwei\.gemini\antigravity\brain\d64800b8-f853-4adb-90d2-f4bb1ee5f909\implementation_plan.md`
- Native transcript: `C:\Users\yiwei\.gemini\antigravity\brain\d64800b8-f853-4adb-90d2-f4bb1ee5f909\.system_generated\logs\transcript_full.jsonl`

### Additional Strict quick-task probe: NOT PASS

Conversation `ceda38ad-51b1-47f7-91cb-cfc11501deae` used a new conversation with an old repository plan still present. It changed only a README heading, preserved the pre-existing readiness edit, and ran a fresh inline Node assertion and diff check. Hook state correctly kept `activePlan: null` and `activationError: null`; the old plan was not activated.

However, Strict does not recognize arbitrary `node -e` assertions as behavioral verification. Stop requested more evidence, and the model spent several minutes inspecting hook/transcript internals and tried the invalid combination `node --test -e`. The probe was stopped at approximately 16:21 +07:00 rather than counted as a clean quick-task pass. This is an additional case outside the saved 18/18 Strict matrix and a release-blocking quick-task UX limitation, not a native/SPL command collision. Do not hide it behind the green scenario totals.

Follow-up before stable Strict approval: define explicit, trustworthy evidence registration for ad-hoc checks, add this case as a regression, and ensure the model reports unsupported verification promptly instead of investigating the harness. Do not fix this by accepting arbitrary commands or matching words such as `lint` inside output/string literals. Lite has no hook and is unaffected by this hook-classification issue.

## Verified, limitations and release decision

Verified:

- Native `/plan` and `/spl-plan` are independent in CLI trajectory and App transcript.
- `/spl-plan` mandatory option intake, one-artifact output and Proceed flow work on Gemini 3.8 Flash High.
- Contract path hardening, scoped execution and post-mutation verification pass.
- Lite All is 44/44 and Strict is 18/18 with no XFAIL.
- Source/App/CLI version, profile, file set and checksums match.

Known limitation:

- App screenshots were observed live through Computer Use but were not copied into the Git repository. The brain artifacts and transcripts above are retained local evidence, not immutable records. Raw transcripts are not published because they may contain private model rationale and workspace context.
- Actual native Proceed was exercised in Lite; Strict native artifact-approval activation is covered by unit tests, while the live Strict App smoke used `/spl-execute <path>`. Do not claim a separate Strict Proceed smoke from these results.

Release decision: command separation, mandatory intake and Lite Proceed have local App evidence. Keep this a release candidate: complete any remaining explicit App presentation/Strict-Proceed evidence before declaring every release gate satisfied. This branch remains unmerged and untagged; no GitHub release is authorized by this report.
