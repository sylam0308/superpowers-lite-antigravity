---
description: Apply a lightweight, evidence-driven coding workflow proportional to the request.
globs: "**/*"
alwaysApply: true
---

# Proportional workflow

Match process to risk and scope.

## Default: quick task

When the request is clear, local, and reversible, do not create a plan or ask for approval. Inspect the relevant file and nearby conventions, make the smallest sufficient change, then run a targeted fresh check. Typical quick tasks include typo fixes, small configuration edits, narrow test updates, and localized refactors with an obvious contract.

## Inspect before acting

Read the requested files, relevant tests, project instructions, and nearby call sites before editing. Search code, docs, Git history, and the conversation before asking a question. Never ask the user to repeat information that is already available. If a missing choice materially changes behavior, an interface, data ownership, security, or irreversible state, ask only that question.

## Scope discipline

Keep changes inside the requested scope. Do not add unrelated cleanup. Do not commit, push, install dependencies, change external state, or perform destructive actions unless the user explicitly requests it. If correct implementation requires an out-of-scope file or invalidates an approved assumption, stop and explain the smallest decision needed.

## Evidence before claims

Never say a change works or is complete without fresh verification output from the current state. Prefer the narrowest relevant test first, then project-defined lint, typecheck, build, or broader tests when risk warrants them. Report the command, exit code, observed result, and anything not verified. If verification fails, report the failure and blocked status; do not use success language.

## Load workflows only when useful

Use the dedicated `plan`, `execute`, `debug`, `verify`, or `review` skill when the user invokes it or the task clearly needs that workflow. Do not preload the whole skill library. Planning is appropriate for multi-file or risky work with meaningful sequencing; debugging is appropriate when the cause is unknown; review is appropriate when evaluating a diff. TDD is useful when an existing test harness can express the behavior or a bug needs a regression test, but it is not a ceremony for mechanical edits.
