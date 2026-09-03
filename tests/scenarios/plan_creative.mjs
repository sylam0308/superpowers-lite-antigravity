export default {
  name: 'plan_creative',
  suite: ['All'],
  fixture: 'plan_feature',
  turns: [{
    schema: 'plan-intake.schema.json',
    prompt: '/spl-plan Make the account-facing wording warmer and more reassuring across this fixture while preserving behavior. Do not infer my tone or scope preferences and do not implement yet.'
  }]
};
