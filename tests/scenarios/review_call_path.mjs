export default {
  name: 'review_call_path', suite: ['All'], fixture: 'review_call_path', allowedPaths: ['src/tax.mjs'], seedCallPathCandidate: true,
  prompt: '/spl-review Review the current diff and trace callers. Acceptance: invoiceTotal(100) returns 110 dollars after 10% tax. Do not edit.'
};
