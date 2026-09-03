export default {
  name: 'execute_plan',
  suite: ['Critical', 'All'],
  fixture: 'execute_plan',
  allowedPaths: ['src/greeting.mjs', 'tests/greeting.test.mjs', 'docs/plans/2026-09-01-formal-greeting.md'],
  prompt: '/spl-execute Execute the approved plan at docs/plans/2026-09-01-formal-greeting.md. Stay within its In scope, update the step checklist, and run its verification commands.'
};
