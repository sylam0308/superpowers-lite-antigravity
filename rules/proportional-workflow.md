---
description: Apply a lightweight, evidence-driven coding workflow proportional to the request.
globs: "**/*"
alwaysApply: true
---

# Proportional workflow

Match process to risk and scope.

## Quick task by default

When a request is clear, local, and reversible, do not plan or ask for approval. Inspect the relevant file, project instructions, nearby conventions, and targeted check; make the smallest sufficient change; run fresh verification after the edit. Typos, narrow configuration changes, focused tests, and obvious local refactors usually use this path.

## Inspect before acting

Search the request, conversation, code, tests, docs, Git history, and current diff before asking. Never ask the user to repeat a discoverable fact. Do not treat a plausible default as a user decision. Build a decision ledger for behavior, public interfaces, external stores/services/queues, data ownership/migration, dependency/vendor, deployment, security, compatibility, destructive state, and scope. If an applicable item lacks an explicit source, stop and ask; never select the boundary or hide it behind a conditional plan.

## Scope and user work

Record the initial worktree state before substantive edits. Preserve pre-existing user changes and avoid unrelated cleanup. Follow an approved plan's in/out scope; Contract v2 allowlists are authoritative. Read optional `.agents/superpowers-lite.json` for required checks, protected paths, and review gates. Do not commit, push, install dependencies, change external state, or perform destructive operations unless explicitly requested. Stop if correct work requires a new file, interface, dependency, or decision outside approval.

## Evidence before claims

Never claim success from expectation, old output, or model confidence. Fresh evidence must run after the last relevant mutation. Prefer targeted behavior checks first, then every required Contract/project-policy check and broader project-defined checks proportional to risk. Exit code 0 is not proof unless the expected behavior was observed. Report command/interaction, status, observation, what it proves, and what remains unverified. A required failure or unavailable check means blocked/failed, never completed.

## Load only the needed workflow

Use `spl-plan`, `spl-execute`, `spl-debug`, `spl-verify`, or `spl-review` when explicitly invoked or requested; do not preload the library. Planning is for meaningful sequencing/risk. Debugging begins with reproduction and a falsifiable hypothesis. Review traces the diff through callers and state transitions. TDD is useful for behavior changes and regressions when a harness exists, not as ceremony for mechanical edits. Worktrees, subagents, commits, and brainstorming are optional, never mandatory.

## Planning isolation

Do not infer or preload a plugin planning workflow from a generic planning request. A planning skill controls its own intake, artifact, and execution handoff only when that skill is explicitly invoked.

## Completion gate

Before completion, confirm no open plan step, out-of-scope path, stale plan, required verification gap, or configured blocking review finding remains. For medium/high risk inspect the whole diff; high risk requires review. If the same approach fails three times without new evidence, stop and report the blocker rather than adding a fourth speculative patch.
