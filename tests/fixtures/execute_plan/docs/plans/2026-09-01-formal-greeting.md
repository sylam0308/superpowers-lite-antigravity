# Optional formal greeting

## Goal

Add an optional formal greeting without changing the default output.

## Acceptance criteria

- [ ] `greet('Ana')` returns `Hi, Ana!`.
- [ ] `greet('Ana', true)` returns `Hello, Ana.`.

## Scope

### In

- `src/greeting.mjs`
- `tests/greeting.test.mjs`
- This plan checklist

### Out

- Dependencies, package scripts, and other source files

## Steps

- [ ] 1. Add a failing formal-mode test in `tests/greeting.test.mjs`.
- [ ] 2. Implement the optional boolean argument in `src/greeting.mjs`.
- [ ] 3. Run the targeted test and inspect the diff.

## Verification

- `node --test tests/greeting.test.mjs`
- `git diff --check`
