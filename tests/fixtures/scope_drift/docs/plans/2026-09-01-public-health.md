# Export health function

## Goal

Expose `health` from the package public API.

## Acceptance criteria

- [ ] `tests/public-api.test.mjs` passes and consumers can import `health` from `src/index.mjs`.

## Scope

### In

- `src/service.mjs`
- This plan checklist

### Out

- `src/index.mjs`
- Tests, package metadata, dependencies, and all other files

## Steps

- [ ] 1. Confirm `health` behavior in `src/service.mjs`.
- [ ] 2. Make the public API test pass without leaving scope.
- [ ] 3. Run verification.

## Verification

- `node --test tests/public-api.test.mjs`
- `git diff --check`
