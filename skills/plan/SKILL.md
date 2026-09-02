---
name: plan
description: Inspect a repository, resolve material decisions, and produce a reviewable Contract v2 implementation plan. Use for /plan, /superpowers-lite:plan, or an explicit planning request; not for clear localized quick tasks.
---

# Plan

Produce a plan only. Do not edit implementation files.

## Non-negotiable gates before any write

1. **External-boundary gate:** If the request adds or replaces storage, cache persistence, a database, queue, remote service, auth/payment/AI provider, or another external dependency, a plan is forbidden until the concrete backend/provider, deployment topology, public sync/async or delivery contract, ownership/durability, and migration/compatibility choices that apply are evidenced by the request, conversation, or repository contract. Inspect, ask option questions, and stop. Never choose Redis or another reasonable default.
2. **CLI surface gate:** In `agy`, print/headless mode, or `.gemini/antigravity-cli/brain/`, a brain `implementation_plan.md` is forbidden. CLI writes only `docs/plans/` after decisions are complete. When decisions are incomplete, CLI writes nothing and returns the questions with outcome `needs_input`.
3. **App surface gate:** Native `ask_question` or an App brain path locks the App surface. After answers, write only the brain artifact with requested feedback; workspace `docs/plans/` is forbidden in that turn.

These gates run before an artifact path, convenient default, conditional architecture, or desire to be helpful can influence the output.

## 1. Inspect first

Before asking or writing, read project instructions, relevant source and tests, package scripts, existing plans, the current diff, and recent Git history. Trace current behavior far enough to name real files and exact verification commands. Repository evidence may answer facts; it cannot make a product choice for the user.

## 2. Decision-completeness gate

List the decisions that materially affect any of these boundaries:

- observable behavior or public interface;
- data ownership, persistence, migration, durability, or compatibility;
- dependency, vendor, deployment topology, or operating cost;
- security, permissions, destructive state, or irreversible rollout;
- files intentionally in or out of scope.

A decision is resolved only when the request, conversation, or an established repository contract provides it. A plausible default is not evidence. Build a decision ledger and mark each boundary `resolved` with its source or `unresolved`. When a request introduces or replaces an external store/service/queue, dependency, deployment topology, public contract, migration, or security boundary, every applicable choice must have explicit evidence; the agent must not select Redis, a cloud vendor, delivery semantics, sync/async behavior, rollout, or another boundary itself. A conditional plan does not resolve the choice.

If any ledger item is unresolved, ask one native `ask_question` round in the App when available. In CLI print/headless mode, do not call an interactive question tool: return the option questions in the final structured `questions` field with outcome `needs_input`. Otherwise use one equivalent option list. Architecture work normally needs four to six questions; never invent filler questions. Group related dimensions in one question, give 3-6 mutually exclusive options, and mark a recommendation only when evidence supports it. Then stop: no plan, artifact, workspace write, or implementation until answers arrive. There is no exception for a convenient default or an available artifact path.

If no material decision remains, do not ask for confirmation or repeat facts already discovered.

## 3. Feasibility and policy

Read optional `.agents/superpowers-lite.json` when present. Merge its required verification commands and protected paths into the plan. Critically check prerequisites, current code, scope, commands, and acceptance testability. Stop for a decision if the requested result cannot be achieved inside scope.

## 4. Write Plan Contract v2

Use this human-readable structure:

```markdown
# <Outcome>

## Goal
## Risk
low | medium | high, with one-sentence reason
## Decision record
| Decision | Source | Evidence |
## Tech and constraints
## Acceptance criteria
- [ ] AC-1: <observable result>
## Scope
### In
### Out
## File map
- Modify: `path` — responsibility
## Steps
- [ ] 1. <title>
  - Files: ...
  - Acceptance: AC-1
  - Behavior: ...
  - Check: V-1 — `<exact command>` — expected <observable result>
## Verification matrix
| ID | Criterion | Command | Expected | Required |
```

Write 3-7 numbered checkbox steps. Each step must name Files, Acceptance, Behavior, and Check. Use repository-relative forward-slash paths. Do not use `**/*` unless the request explicitly authorizes whole-repository scope. Do not include implementations, microsteps, commits, or placeholders.

Append exactly one machine-readable comment containing the same plan:

```html
<!-- superpowers-lite-contract
{
  "schemaVersion": 2,
  "planId": "YYYY-MM-DD-slug",
  "risk": "medium",
  "scope": { "allow": ["src/file.ext"], "deny": [".env*", "secrets/**"] },
  "acceptance": [{ "id": "AC-1", "text": "Observable result", "evidence": ["V-1"] }],
  "steps": [{ "id": "S-1", "files": ["src/file.ext"], "acceptance": ["AC-1"], "checks": ["V-1"] }],
  "verification": [{ "id": "V-1", "command": "exact command", "expected": "observable result", "required": true }]
}
-->
```

Every acceptance ID must map to at least one step and verification ID. Every step ID is `S-1` through `S-7`. Use `scope.allowAll: true` only when `**/*` is explicitly authorized. Required project-policy commands must appear in verification.

## 5. Critique before saving

Check that decisions have evidence, paths and commands exist or are intentional additions, all acceptance criteria are mapped, risk is honest, scope is sufficient, and no placeholder remains. Correct the plan before writing it.

## 6. Choose exactly one output surface

Lock the surface before the first write. Never produce both outputs.

**Antigravity App:** Use when the artifact directory is under `.gemini/antigravity/brain/` or `.gemini/antigravity-ide/brain/`, or native `ask_question` was used. Write only the host `implementation_plan.md` brain artifact. Set `ArtifactMetadata.RequestFeedback: true`, `ArtifactMetadata.UserFacing: true`, and a concise Summary. Do not create or mention workspace `docs/plans/`. Stop immediately after feedback is requested so the host renders **Proceed**.

**Antigravity CLI:** Use only for `agy`/print mode or a CLI brain path. Write exactly one `docs/plans/YYYY-MM-DD-slug.md`; do not create a brain artifact. Tell the user to approve it with `/superpowers-lite:execute <path>`.

## Handoff

State that no implementation code changed. Proceed, artifact approval, `/superpowers-lite:execute`, or an explicit approval starts execution. Never implement in the planning turn.
