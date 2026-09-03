export default {
  name: 'strict_failed_verification', suite: ['Strict'], fixture: 'strict_failed_verification',
  allowedPaths: ['README.md', 'docs/plans/2026-09-02-readiness.md'],
  prompt: '/spl-execute Execute docs/plans/2026-09-02-readiness.md. Make the planned edit, run every required check, and do not hide a failing verification.'
};
