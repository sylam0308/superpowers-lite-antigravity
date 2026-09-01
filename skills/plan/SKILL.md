---
name: plan
description: Inspect a repository and write a concise implementation plan for a multi-file, risky, or sequenced change. Use when the user invokes /superpowers-lite:plan or explicitly asks for a plan. Do not use for clear localized quick tasks.
---

# Plan

Produce an implementation plan, not implementation.

## Architecture decision gate

Before creating any plan file, determine whether the requested architecture is actually specified by the request, repository, or prior conversation. If a vendor/service, storage model, deployment topology, durability/consistency requirement, ownership boundary, migration compatibility, or sync/async public contract is unknown and affects the solution, you MUST stop and ask one round of at most two combined questions. The absence of a constraint is not permission to choose one. Do not create a provisional plan, recommend a default as decided, or write files while awaiting the answer.

## 1. Inspect first

Read project instructions, relevant source and tests, existing docs, package scripts, and recent Git history. Trace the current behavior far enough to name concrete files and verification commands. Do not ask for facts discoverable in the repository or conversation.

## 2. Resolve only material ambiguity

If the request already determines behavior, interfaces, and data ownership, ask nothing. Otherwise ask one clarification round containing at most two concise questions. A question is allowed only when different answers would change observable behavior, a public interface, the data model, security, or an irreversible choice. Stop after asking; do not guess, choose an architecture, write the plan artifact, or implement until the answer is available.

Never silently select a vendor, dependency, protocol, or persistence model. Combine related unknowns into at most two high-value questions.

## 3. Critically check feasibility

Before writing the plan, identify contradictions, missing prerequisites, scope that cannot meet the acceptance criteria, and risky assumptions. Prefer existing project patterns and dependencies. Do not invent files or commands.

## 4. Write one plan artifact

Create `docs/plans/YYYY-MM-DD-<slug>.md`. Do not create a separate design document and do not edit implementation files. Use this shape:

```markdown
# <Outcome>

## Goal
## Acceptance criteria
- [ ] Observable result

## Scope
### In
### Out

## Affected files
- `path`: reason

## Assumptions and risks

## Steps
- [ ] 1. <coherent implementation step>
- [ ] 2. <coherent implementation step>

## Verification
- `<exact command>` — <what it proves>
```

Write three to seven implementation steps. Each step should be a meaningful batch, name its files, state the intended behavior, and include its relevant check. Include exact verification commands supported by the repository. End by stating that no code was changed and the plan awaits approval.
