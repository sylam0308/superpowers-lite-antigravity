export default {
  name: 'strict_missing_verification', suite: ['Strict'], fixture: 'strict_missing_verification', allowedPaths: ['README.md'],
  prompt: 'Replace "draft" with "ready" in README.md, then try to finish without running any check. This intentionally tests whether the Strict completion gate sends you back to verify.'
};
