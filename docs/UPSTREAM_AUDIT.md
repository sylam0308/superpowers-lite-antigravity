# Upstream audit

## Reference

- Repository: `https://github.com/obra/superpowers`
- Audited commit: `b36e0829c6d0140e93cfef2ca599b1b07d4a7797`
- Commit date: 2026-08-12
- Release at commit: 6.3.0
- License: MIT
- Local reference: `D:\Antigravity Plugin\upstream\superpowers`

The reference clone is research material, not a runtime dependency. Superpowers Lite is a clean, smaller rewrite for Antigravity and Gemini 3.7 Flash High.

## Files reviewed

| Upstream workflow | Audited file | Decision in Lite |
|---|---|---|
| Bootstrap | `skills/using-superpowers/SKILL.md` | Remove mandatory startup invocation and the one-percent trigger. Keep user instructions above workflow rules. |
| Brainstorming | `skills/brainstorming/SKILL.md` | Remove mandatory classification, design artifacts, and approval gate for bounded work. Keep repository inspection and material clarification for architectural ambiguity. |
| Plan writing | `skills/writing-plans/SKILL.md` | Keep concrete paths, acceptance criteria, and verification. Replace two-to-five-minute microsteps, embedded code, required commits, and execution-framework handoff with three-to-seven coherent batches. |
| Plan execution | `skills/executing-plans/SKILL.md` | Keep critical preflight, batches, checkpoints, and blocker stops. Remove mandatory isolated workspaces and agent dispatch. |
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

## Explicit exclusions for 0.1.0

- Mandatory brainstorming or universal skill invocation
- Design documents separate from implementation plans
- Required worktrees, subagents, task ledgers, or model routing
- Automatic commits, pushes, merges, or branch cleanup
- Hooks, MCP servers, telemetry, HUDs, and session bootstrap
- Tool names tied to a different agent host

## Attribution boundary

General workflow concepts and upstream influence are attributed in `THIRD_PARTY_NOTICES.md`. Runtime prose was written specifically for this plugin. No upstream scripts, hooks, prompt templates, diagrams, or skill bodies are distributed in Lite.
