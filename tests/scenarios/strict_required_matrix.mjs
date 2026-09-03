export default {
  name: 'strict_required_matrix', suite: ['Strict'], fixture: 'strict_required_matrix',
  allowedPaths: ['src/status.mjs', 'docs/plans/2026-09-02-status.md'],
  prompt: '/spl-execute Execute docs/plans/2026-09-02-status.md. Run both required verification commands; a targeted pass must not replace the broader npm test.'
};
