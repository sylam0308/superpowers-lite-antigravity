# Upstream audit

## Reference

- Repository: `https://github.com/obra/superpowers`
- Audited commit: `b36e0829c6d0140e93cfef2ca599b1b07d4a7797`
- Commit date: 2026-08-12
- Release at commit: 6.3.0
- License: MIT
- Audit reference: a read-only clone of `obra/superpowers` at the commit above

The reference clone is research material, not a runtime dependency. Superpowers Lite is a clean, smaller rewrite for Antigravity and Gemini 3.7 Flash High.

## Files reviewed

| Upstream workflow | Audited file | Decision in Lite |
|---|---|---|
| Bootstrap | `skills/using-superpowers/SKILL.md` | Remove mandatory startup invocation and the one-percent trigger. Keep user instructions above workflow rules. |
| Brainstorming | `skills/brainstorming/SKILL.md` | Remove mandatory classification, design artifacts, and approval gate for bounded work. Keep repository inspection and material clarification for architectural ambiguity. |
| Plan writing | `skills/writing-plans/SKILL.md` | Keep concrete paths, file map, acceptance criteria, verification, and the no-placeholder bar. Replace two-to-five-minute microsteps, embedded code, required commits, and execution-framework handoff with three-to-seven Cursor/Codex-style batches (Files / Behavior / Check). |
| Plan execution | `skills/executing-plans/SKILL.md` | Keep critical preflight, follow-exactly, per-step verification, and blocker stops. Inline the completion evidence table so execute may not claim done with open checkboxes or failed checks. Remove mandatory isolated workspaces and agent dispatch. |
| Debugging | `skills/systematic-debugging/SKILL.md` | Keep reproduce/evidence/hypothesis/root-cause/minimal-fix sequence and a three-attempt breaker. Compress auxiliary techniques into one workflow. |
| Verification | `skills/verification-before-completion/SKILL.md` | Keep fresh evidence before success claims. Add an explicit evidence table and project-defined checks. |
| TDD | `skills/test-driven-development/SKILL.md` | Keep regression tests for bugs and behavior tests where a harness exists. Remove absolute red-green ceremony for mechanical work. |
| Review request/receipt | `skills/requesting-code-review/SKILL.md`, `skills/receiving-code-review/SKILL.md` | Keep technical evidence, severity, and acceptance-criteria comparison. Remove mandatory reviewer dispatch and platform-specific agent mechanics. |
| Worktrees | `skills/using-git-worktrees/SKILL.md` | Omit. Isolation is useful when requested or provided by the host, but is not a prerequisite for Lite execution. |
| Branch finish | `skills/finishing-a-development-branch/SKILL.md` | Omit. Lite never commits, pushes, merges, deletes branches, or removes worktrees automatically. |
| Agent development | `skills/subagent-driven-development/SKILL.md` | Omit. Lite stays effective in a single Flash conversation and does not orchestrate agents. |

## Size and complexity findings

The audited twelve workflow entry files total roughly 2,500 lines. Large components include brainstorming (250 lines), debugging (283), TDD (320), and agent-driven development (568). Their safeguards are valuable in high-risk work, but their mandatory routing and repeated gates impose unnecessary turns on a clear medium-project task.

Upstream 6.3.0 explicitly requires skill checks before any response, brainstorming before planning, plan microsteps, frequent commits, worktree setup, and agent-driven execution when available. Those are conscious upstream product choices, not defects. Lite instead uses proportional escalation: one short baseline rule, then one selected workflow.

## Retained invariants

1. Inspect the repository before proposing or editing.
2. Do not silently reinterpret scope or assumptions.
3. Debug from a reproduction and falsifiable evidence, not speculative patches.
4. Use the smallest fix that addresses the demonstrated cause.
5. Run fresh verification before any success claim.
6. Review against acceptance criteria and report blocking findings with evidence.

## 0.2.0 planning upgrade

Lite 0.2.0 still does not ship upstream skill text. It rewrites three upstream quality bars for Flash:

1. **No placeholders** — a plan step without real files and an exact Check is a plan failure.
2. **Follow exactly** — execute walks numbered steps in order and ticks a checkbox only after that step's Check passes.
3. **Evidence before done** — execute runs the plan Verification list plus `git diff --check` and reports an evidence table. Open checkboxes or a failed required check block a completion claim.

Still excluded: bite-sized TDD microsteps, code dumps inside the plan, automatic commits, worktrees, and subagent dispatch.

## 0.3.0 host UI

Lite 0.3.0 uses Antigravity host surfaces instead of Cursor widgets:

- Underspecified `/plan` asks at most two questions with selectable options via `ask_question` when present, otherwise numbered markdown.
- The same plan markdown is also written as an `implementation_plan` artifact so the App can show **Proceed**.
- `notify_user` requests review; Proceed, artifact approval, or `/execute` starts the execute skill, which ticks the same checkboxes and still cannot claim done without fresh verification.

CLI print mode has no Proceed button; it keeps the `docs/plans/` file plus `/execute`.

## 0.3.1 native /plan intake

Host `/plan` is Antigravity's built-in command and skips option questions. Lite 0.3.1 treats `/plan` and `/superpowers-lite:plan` the same in the always-on rule and complete-spec test: inferred repo files do not count as the user's chosen scope. Vague upgrades must ask option questions before any implementation_plan artifact.

## 0.3.2 intake depth and Proceed chrome

Lite 0.3.2 raises incomplete-spec intake to one round of four to six option questions. A folder name or a path discovered only by reading the repo is not a user-named `dir/file.ext`. On App, the planning turn writes only the `implementation_plan` artifact and must call `notify_user` so the host can show **Proceed**; it does not create `docs/plans/` in that turn (a workspace file steals the UI into file Review). On `agy`/CLI, after intake passes, write workspace `docs/plans/` even if a brain artifact exists. Execute copies the App artifact to `docs/plans/` when the file is missing. Cursor wrote a Codex handoff at `docs/2026-09-01-cursor-0.3.2-handoff.md` (workspace and plugin copies).

## 0.3.3 App surface lock

An App smoke test on 2026-09-02 proved that 0.3.2 successfully rendered five native option questions, but Flash then followed both output branches: it wrote `docs/plans/2026-09-02-user-profile-helpers.md` and the brain artifact. The App therefore showed `1 file changed → Review` instead of **Proceed** even though the artifact metadata contained `requestFeedback: true`.

Lite 0.3.3 makes the surface decision mutually exclusive. A native `ask_question` card or a brain path under `.gemini/antigravity/` locks the App path: write only `implementation_plan.md` with `RequestFeedback`, `UserFacing`, and `Summary`, then stop as soon as the host requests feedback. `agy`/print mode writes only the workspace plan. The validator now checks these invariants so the ambiguous dual-output wording cannot return unnoticed.

## 0.3.4 ambiguous architecture hard gate

The first CLI regression run after 0.3.3 passed `plan_feature` 2/2 but passed `ambiguous_architecture` only 1/2. In the failed run, Flash treated an available CLI brain path as permission to create an implementation plan even though the user had not selected a storage backend. Version 0.3.4 moves that decision to the first section: persistent storage without a named backend may inspect and ask four to six option questions only; `write_to_file`, brain artifacts, and workspace plans are explicitly forbidden until the answer exists.

## 0.5.0 observable contracts and opt-in enforcement

The hardening series replaces prompt-specific gates with general observable boundaries:

- NDJSON behavior tests inspect tool order, mutations, verification, filesystem changes, outcomes, and token diagnostics.
- Plan Contract v2 maps acceptance criteria, scope, steps, and exact verification while retaining human-readable Markdown and the native App Proceed flow.
- Optional project policy adds required checks, protected paths, and review severities without forcing configuration on projects.
- The default Lite build remains hook-free. An independently selected Strict build uses Antigravity's documented PreToolUse and Stop contracts to enforce scope and post-mutation evidence, with a bounded no-progress breaker.

This is an independent design for Antigravity. It does not copy upstream hook or skill implementations.

## Explicit exclusions

- Mandatory brainstorming or universal skill invocation
- Design documents separate from implementation plans
- Required worktrees, subagents, task ledgers, or model routing
- Automatic commits, pushes, merges, or branch cleanup
- Default-on hooks, MCP servers, telemetry, HUDs, and session bootstrap
- Tool names tied to a different agent host

## Attribution boundary

General workflow concepts and upstream influence are attributed in `THIRD_PARTY_NOTICES.md`. Runtime prose and the optional Strict hook were written specifically for this plugin. No upstream scripts, hooks, prompt templates, diagrams, or skill bodies are distributed.
