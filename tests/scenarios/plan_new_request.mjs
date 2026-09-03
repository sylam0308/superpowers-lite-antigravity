export default {
  name: 'plan_new_request',
  suite: ['All'],
  fixture: 'plan_feature',
  turns: [
    {
      schema: 'plan-intake.schema.json',
      prompt: '/spl-plan Add normalizeEmail(value) to src/accounts.mjs and test it. Plan only.'
    },
    {
      prompt: 'Authoritative answers: normalize by trim then toLowerCase; TypeError for non-string; scope only src/accounts.mjs and tests/accounts.test.mjs; preserve displayName and dependencies; acceptance requires node --test tests/accounts.test.mjs and git diff --check. No contradictions remain. Create the Contract v2 plan only.'
    },
    {
      schema: 'plan-intake.schema.json',
      prompt: '/spl-plan New and materially different request: plan a documentation-only update explaining displayName in README.md. Reset the previous intake. Do not create or update a plan until I answer a fresh 4-6 option-question batch.'
    }
  ]
};
