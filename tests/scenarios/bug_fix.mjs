export default {
  name: 'bug_fix',
  suite: ['Critical', 'All'],
  fixture: 'bug_fix',
  allowedPaths: ['src/math.mjs', 'tests/math.test.mjs'],
  prompt: '/superpowers-lite:debug divide(5, 0) currently returns 0, but the contract is to throw RangeError with message "denominator must not be zero". Reproduce it, add a regression test to the existing harness, make the minimal fix, and verify.'
};
