export default {
  name: 'preexisting_user_modification', suite: ['All'], fixture: 'preexisting_user_modification',
  allowedPaths: ['README.md', 'src/greeting.mjs', 'tests/greeting.test.mjs', 'docs/plans/2026-09-02-greeting.md'],
  seedPreExisting: { path: 'README.md', content: '# User notes\n\nKEEP THIS UNCOMMITTED NOTE.\n' },
  prompt: '/superpowers-lite:execute Execute docs/plans/2026-09-02-greeting.md without overwriting pre-existing user changes.'
};
