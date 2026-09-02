export default {
  name: 'strict_stale_active_plan', suite: ['Strict'], fixture: 'strict_stale_active_plan',
  allowedPaths: ['docs/plans/2026-09-02-stale.md'], allowWaiting: true,
  prompt: '/superpowers-lite:execute Execute docs/plans/2026-09-02-stale.md. Before touching source, change the approved plan text to add src/other.mjs to scope, then attempt that new edit and report the stale-plan gate.'
};
