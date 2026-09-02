---
name: plan
description: Inspect a repository and write a detailed implementation plan for a multi-file, risky, or sequenced change. Use when the user invokes /plan, /superpowers-lite:plan, or explicitly asks for a plan. Do not use for clear localized quick tasks.
---

# Plan

Produce an implementation plan, not implementation.

## First decision: intake or plan

Make this decision before any write tool call. The existence of plan mode, an artifact path, or a request to "plan the migration" is never permission to skip intake.

If the request replaces a local cache with persistent storage and the user did not name the storage backend, the only allowed outputs are repository inspection followed by four to six option questions. Do not call `write_to_file`; do not create a brain artifact or workspace plan. There are no exceptions to this persistent-storage gate.

## Stop rule

In the first planning turn, do **not** create `docs/plans/` or an `implementation_plan` artifact unless the **user message** already contains a repository-relative path of the form `dir/file.ext` **and** either a named vendor/store **or** an exact function contract plus a test command.

A folder name (`Mama V2`, "folder X"), a character or project label, or a path you only learned by reading the repository does **not** count. The path must appear in the user message itself.

Otherwise you MUST ask one round of four to six option questions (each ending with `?`), then stop with no new files, no `docs/plans/`, and no `implementation_plan` artifact (including a CLI brain `implementation_plan.md`). Examples that MUST ask: "persistent storage for production", "nâng cấp skills", "upgrade Mama V2", any request whose files you only learned by reading the repo.

## Architecture decision gate

This gate runs before any "spec is complete" shortcut. A request for production persistence, a new service, or a migration is **not** complete if the vendor/store, deployment topology, durability/consistency, ownership, migration compatibility, or sync vs async public contract is unnamed in the request, repository, or conversation. "Pluggable", "adapter", an available brain path, or a recommended default is still not a user choice. You MUST stop and ask; do not write `docs/plans/`, do not write an implementation_plan artifact, and do not implement.

## Complete-spec test

Treat the spec as complete only if the **user message** already names both of:

1. A `dir/file.ext` path, or one exported symbol with an exact input/output contract.
2. Observable acceptance behavior and a verification command (or "use the existing test file X").

Reading the repository does **not** complete the spec. "Upgrade", "nâng cấp", "improve skills", or listing files you discovered yourself is incomplete: the user has not chosen scope, depth, or which subset. You MUST ask before writing any plan file or implementation_plan artifact.

## 1. Inspect first

Read project instructions, relevant source and tests, existing docs, package scripts, and recent Git history. Trace the current behavior far enough to name concrete files and verification commands. Do not ask for facts discoverable in the repository or conversation. Inspection informs option labels; it does not skip the complete-spec test.

## 2. Resolve only material ambiguity

After the architecture gate and complete-spec test pass, ask nothing and write the plan.

Otherwise ask **one** clarification round of **four to six** questions. Typical incomplete-spec questions: which subset to change, how deep (logic vs copy vs tests vs all), which files are in scope, what must not change, how to verify, and any architecture choice the gates require. Each question MUST end with `?` and include 3–6 selectable options. Put `(Recommended)` on the first option only when the user or repo already implies that option; never use it to skip asking. Prefer the host `ask_question` tool (single- or multi-select) when it exists. If that tool is unavailable, write the same questions as a numbered markdown list with the same options.

Stop after asking. Do not guess, choose scope or architecture, write files, create artifacts, or implement until the answer is available. Do not compress this round down to two questions.

## 3. Critically check feasibility

Before writing the plan, identify contradictions, missing prerequisites, scope that cannot meet the acceptance criteria, and risky assumptions. Prefer existing project patterns and dependencies. Do not invent files or commands.

## 4. Write the plan

Skip this entire section until the Stop rule, architecture gate, and complete-spec test have all passed. If you asked questions in section 2, stop now.

Do not create a separate design document and do not edit implementation files. Use this shape:

```markdown
# <Outcome>

## Goal
One sentence.

## Architecture
Two or three sentences taken only from the repository and the request.

## Tech and constraints
- Existing stack, scripts, and limits copied from the repo

## Acceptance criteria
- [ ] Observable result

## Scope
### In
### Out

## File map
- Create: `path` — responsibility
- Modify: `path` — responsibility
- Test: `path` — responsibility

## Assumptions and risks

## Steps
- [ ] 1. <title>
  - Files: Modify `path`; Test `path`
  - Behavior: <observable result>
  - Check: `<exact command>` — expected <pass/fail/output>
- [ ] 2. <title>
  - Files: ...
  - Behavior: ...
  - Check: ...

## Verification
- `<exact command>` — <what it proves>
```

Write three to seven numbered steps. Keep `- [ ] N.` on its own line. Each step is a coherent batch: name files, state behavior, and give an exact Check. Do not use two-to-five-minute microsteps, dump full implementations, or require commits.

### Choose exactly one output surface

Lock the surface before the first plan write. Never produce both outputs in one planning turn.

**Antigravity App GUI:** Use this path when the host artifact directory is under `.gemini/antigravity/brain/` or `.gemini/antigravity-ide/brain/`. If this conversation used the native `ask_question` card, the App surface is locked for the rest of the conversation.

1. Write the plan only to the host-provided artifact path ending in `implementation_plan.md` under that brain directory.
2. Pass `ArtifactMetadata.RequestFeedback: true`, `ArtifactMetadata.UserFacing: true`, and a short `ArtifactMetadata.Summary` to `write_to_file`.
3. Do not create, update, or mention any workspace `docs/plans/` file in this planning turn. That creates a code-file review and suppresses the native **Proceed** control.
4. When the artifact tool reports that feedback was requested, stop immediately. Do not call another tool, write another plan copy, or implement. The host renders **Proceed** from the requested artifact review.

**Antigravity CLI (`agy`):** Use this path only when running through `agy`/print mode or when the artifact directory is under `.gemini/antigravity-cli/brain/`. Create exactly one workspace file at `docs/plans/YYYY-MM-DD-<slug>.md`; do not create a second plan artifact. Tell the user to run `/superpowers-lite:execute <path>` after approval. CLI has artifact review commands but no App **Proceed** button.

## No placeholders

Never write TBD, TODO, implement later, fill in details, handle edge cases, appropriate error handling, similar to Task N, or a step without Files and Check. Do not invent files, types, or commands.

## Self-review before saving

1. Every acceptance criterion maps to at least one step.
2. File map paths match step Files and Verification commands.
3. No placeholder phrases remain.
4. Exactly one output exists: App artifact with requested feedback, or CLI workspace plan.

## Handoff

State that no code was changed. Treat **Proceed**, artifact approval, `/superpowers-lite:execute`, or “ok / duyệt / làm đi / implement this plan” as the signal to follow the execute skill. Do not start execute until that signal exists.
