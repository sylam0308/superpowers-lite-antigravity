# Normalize email

## Goal
Normalize account email input.

## Risk
medium

## Acceptance criteria
- [ ] AC-1: Email values are trimmed and lowercased.

## Steps
- [ ] 1. Implement normalization.
- [ ] 2. Add tests.
- [ ] 3. Verify the change.

<!-- superpowers-lite-contract
{
  "schemaVersion": 2,
  "planId": "2026-09-02-normalize-email",
  "risk": "medium",
  "scope": { "allow": ["src/account.mjs", "tests/account.test.mjs"], "deny": [".env*", "secrets/**"] },
  "acceptance": [{ "id": "AC-1", "text": "Email is trimmed and lowercased", "evidence": ["V-1"] }],
  "steps": [
    { "id": "S-1", "files": ["src/account.mjs"], "acceptance": ["AC-1"], "checks": ["V-1"] },
    { "id": "S-2", "files": ["tests/account.test.mjs"], "acceptance": ["AC-1"], "checks": ["V-1"] },
    { "id": "S-3", "files": ["src/account.mjs", "tests/account.test.mjs"], "acceptance": ["AC-1"], "checks": ["V-1"] }
  ],
  "verification": [{ "id": "V-1", "command": "node --test tests/account.test.mjs", "expected": "exit 0 and normalization test passes", "required": true }]
}
-->
