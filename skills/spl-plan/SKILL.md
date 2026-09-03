---
name: spl-plan
description: Run the Superpowers Lite planning interview and produce a reviewable Contract v2 plan. Use only for /spl-plan or an explicit request to use Superpowers Lite planning; never replace Antigravity's native /plan.
---

# Plan

Produce a plan only. Do not edit implementation files.

## Non-negotiable gates before any write

1. **Mandatory intake:** Every new `/spl-plan` request requires one option-question round before any plan write, even when the request looks complete or small. Repository inspection can improve the options; it can never skip the round.
2. **External-boundary gate:** If the request adds or replaces storage, a database, queue, remote service, auth/payment/AI provider, dependency, migration, or another external boundary, do not choose the backend, topology, contract, ownership, durability, compatibility, security, or rollout for the user.
3. **CLI surface gate:** In `agy`, print/headless mode, or `.gemini/antigravity-cli/brain/`, never write a brain artifact. Before answers, return `needs_input`; after answers, write only `docs/plans/`.
4. **App surface gate:** Native `ask_question` or an App brain path locks the App surface. After answers, write only the brain artifact with requested feedback; workspace `docs/plans/` is forbidden in that turn.
5. **Native command isolation:** `/plan` belongs to Antigravity. Do not apply this skill to native `/plan` unless the user explicitly asks for Superpowers Lite or invokes `/spl-plan`.

These gates run before an artifact path, convenient default, conditional architecture, or desire to be helpful can influence the output.

## 1. Inspect first

Before asking or writing, read project instructions, relevant source and tests, package scripts, existing plans, the current diff, and recent Git history. Trace current behavior far enough to name real files and exact verification commands. Repository evidence may answer facts; it cannot make a product choice for the user.

## 2. Mandatory interview

For the first turn of every new planning request, ask one batch of four to six questions after inspection and stop. Do not write a plan, artifact, backup, or implementation file. This remains mandatory when the request already names files, behavior, and tests.

The batch always resolves: (1) desired behavior and breadth, (2) file/module scope, (3) invariants, compatibility, and exclusions, and (4) verification and acceptance depth. Add one or two questions when architecture, dependency/vendor, data ownership, migration, security, destructive state, or rollout decisions apply.

Each question must end with `?`, contain three to six mutually exclusive options, and be answerable as a choice. Ground options in the request and inspected repository. Do not ask discoverable facts. For a fully specified request, offer `Keep the request exactly as written` plus meaningful narrower or broader alternatives. Mark a recommendation only when evidence supports it; never invent a default to avoid asking.

Use native `ask_question` in the App. In CLI print/headless mode, return `outcome: needs_input` and encode every question with its options; write nothing. After answers, build a decision ledger from the request, answers, and repository evidence. If a contradiction or blocking choice remains, ask only one or two additional option questions and stop again. Otherwise proceed. A new `/spl-plan` or a material change to goal/scope starts a new mandatory round.

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

Write 3-7 numbered checkbox steps. Each step must name Files, Acceptance, Behavior, and Check. Use repository-relative forward-slash paths. Drive-letter paths, absolute paths, UNC paths, file URIs, backslashes, and `..` are forbidden in both the human plan and contract. Verification commands run from the repository root and use relative paths. Do not use `**/*` unless the request explicitly authorizes whole-repository scope. Do not include implementations, microsteps, commits, or placeholders.

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

**Antigravity CLI:** Use only for `agy`/print mode or a CLI brain path. Write exactly one `docs/plans/YYYY-MM-DD-slug.md`; do not create a brain artifact. Tell the user to approve it with `/spl-execute <path>`.

## Handoff

State that no implementation code changed. Proceed, artifact approval, `/spl-execute`, or an explicit approval starts execution. Never implement in the planning turn.
