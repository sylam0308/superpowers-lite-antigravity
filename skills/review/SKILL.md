---
name: review
description: Review an in-scope diff against acceptance criteria and existing repository conventions, with evidence-ranked findings. Use when the user invokes /superpowers-lite:review or asks for a code review.
---

# Review

Review the requested diff; do not redesign the project or edit files.

When the host requires a structured `outcome`, use `reviewed` for every completed review, including reviews with blocking findings. Never use `completed` to describe a review result.

## Establish scope

Read the request or approved plan, Contract v2 acceptance/scope when present, optional `.agents/superpowers-lite.json`, project instructions, current diff, and directly relevant surrounding code and tests. Identify the intended base and baseline dirty paths. Ignore unrelated pre-existing work except where it creates a concrete interaction with the reviewed change.

## Examine evidence

Trace changed behavior through callers, state transitions, boundaries, error paths, and tests; do not limit review to edited lines. Check correctness, regressions, security, data loss, compatibility, error handling, and missing coverage. Compare with existing conventions rather than personal preference. Run focused read-only checks when they materially confirm a finding. Never edit the candidate.

## Findings

Report findings first, ordered by severity:

- **Critical:** likely severe data loss, security compromise, or unusable core behavior; blocks completion.
- **High:** likely functional defect or major regression in normal use; blocks completion.
- **Medium:** real issue with limited impact or a meaningful missing test; should be fixed soon.
- **Low:** small maintainability or edge-case concern; non-blocking.

Each finding must include a concise title, severity, file and line or symbol, concrete evidence, user impact, and the smallest reasonable correction. When the defect manifests through another module, name the affected caller/state transition and observable wrong result, not only the edited helper. Do not report style preferences without project evidence. Do not inflate hypothetical risks.

If there are no findings, say so explicitly and state residual risks or untested areas. Never infer that tests passed unless fresh output is available. Severities listed in project policy block completion; otherwise critical and high block by default.
