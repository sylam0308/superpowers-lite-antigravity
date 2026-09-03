export default {
  name: 'plan_feature',
  suite: ['Critical', 'All'],
  fixture: 'plan_feature',
  turns: [
    {
      schema: 'plan-intake.schema.json',
      prompt: '/spl-plan Add and test an exported normalizeEmail(value) function in src/accounts.mjs. It must trim surrounding whitespace and lowercase using JavaScript toLowerCase; non-string input must throw TypeError. Keep displayName unchanged, add coverage in tests/accounts.test.mjs, use no dependencies, and verify with node --test tests/accounts.test.mjs. Write the plan only; do not implement.'
    },
    {
      prompt: 'Here are my authoritative intake answers: keep the requested behavior exactly as written; limit scope to src/accounts.mjs, tests/accounts.test.mjs, and the one generated plan; preserve displayName, public exports, compatibility, and dependency-free operation; require the named Node test plus git diff --check. These answers supersede option wording. There are no conflicting decisions. Create the SPL Contract v2 plan now, but do not implement it.'
    }
  ]
};
