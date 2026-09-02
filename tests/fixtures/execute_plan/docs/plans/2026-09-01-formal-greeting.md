# Optional formal greeting

## Goal
Add an optional formal greeting without changing the default output.

## Architecture
`greet(name)` in `src/greeting.mjs` currently returns a casual `Hi, ${name}!` string. Keep that default and add an optional boolean argument that switches only the template. Tests already cover the casual path in `tests/greeting.test.mjs`.

## Tech and constraints
- Node built-in `node:test` / `node:assert/strict`
- No new dependencies or package scripts

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

## File map
- Modify: `src/greeting.mjs` — optional formal flag on `greet`
- Test: `tests/greeting.test.mjs` — failing formal-mode coverage then passing suite

## Assumptions and risks
- A trailing boolean is enough; no options object or i18n.

## Steps
- [ ] 1. Add a failing formal-mode test in `tests/greeting.test.mjs`.
  - Files: Test `tests/greeting.test.mjs`
  - Behavior: `greet('Ana', true)` is asserted to equal `Hello, Ana.` and fails until the implementation exists.
  - Check: `node --test tests/greeting.test.mjs` — expected fail on the new assertion
- [ ] 2. Implement the optional boolean argument in `src/greeting.mjs`.
  - Files: Modify `src/greeting.mjs`
  - Behavior: `greet('Ana')` stays `Hi, Ana!`; `greet('Ana', true)` returns `Hello, Ana.`
  - Check: `node --test tests/greeting.test.mjs` — expected pass
- [ ] 3. Run the targeted test and inspect the diff.
  - Files: Modify `docs/plans/2026-09-01-formal-greeting.md` after checks pass
  - Behavior: Suite still passes; diff stays inside In scope.
  - Check: `git diff --check` — expected exit 0

## Verification
- `node --test tests/greeting.test.mjs` — proves casual and formal greetings
- `git diff --check` — proves the diff has no whitespace errors
