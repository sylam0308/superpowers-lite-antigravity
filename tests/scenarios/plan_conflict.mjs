export default {
  name: 'plan_conflict',
  suite: ['All'],
  fixture: 'plan_feature',
  turns: [
    {
      schema: 'plan-intake.schema.json',
      prompt: '/spl-plan Add normalizeEmail(value) to src/accounts.mjs and test it. Plan only.'
    },
    {
      schema: 'plan-intake.schema.json',
      prompt: 'My answers conflict: keep all existing exports unchanged, but also rename displayName to formatDisplayName everywhere; modify only src/accounts.mjs, but also add the required regression test in tests/accounts.test.mjs. Do not choose for me. Ask only the 1-2 option questions needed to resolve these contradictions.'
    }
  ]
};
