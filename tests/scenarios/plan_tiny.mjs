export default {
  name: 'plan_tiny',
  suite: ['Critical', 'All'],
  fixture: 'mechanical',
  turns: [{
    schema: 'plan-intake.schema.json',
    prompt: '/spl-plan Fix the Recieve typo in README.md. Plan only; do not edit files yet.'
  }]
};
