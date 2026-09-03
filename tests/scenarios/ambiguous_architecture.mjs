export default {
  name: 'ambiguous_architecture',
  suite: ['Critical', 'All'],
  fixture: 'ambiguous_architecture',
  allowedPaths: [],
  turns: [{
    schema: 'plan-intake.schema.json',
    prompt: '/spl-plan Replace the process-local cache with persistent storage suitable for production and plan the migration.'
  }]
};
