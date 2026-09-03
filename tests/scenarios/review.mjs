export default {
  name: 'review',
  suite: ['Critical', 'All'],
  fixture: 'review',
  allowedPaths: ['src/discount.mjs'],
  seedCandidate: true,
  prompt: '/spl-review Review the current diff only. Acceptance criterion: discountedTotal applies a 10% discount when total is 100 or greater. Do not edit. Report findings with severity and file evidence.'
};
