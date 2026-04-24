const test = require('node:test');
const assert = require('node:assert/strict');

const { extractIssueHints, truncateDiffAtBoundary } = require('../src/git');

test('extractIssueHints finds ticket-style issue keys', () => {
  assert.deepEqual(extractIssueHints('feature/ABC-123-login-validation'), ['ABC-123']);
});

test('extractIssueHints finds hash issue keys from numeric branches', () => {
  assert.deepEqual(extractIssueHints('bugfix/123-login-flow'), ['#123']);
});

test('extractIssueHints preserves multiple unique patterns', () => {
  assert.deepEqual(extractIssueHints('feature/ABC-123-issue-77-#42'), ['ABC-123', '#42', 'issue-77']);
});

test('truncateDiffAtBoundary keeps full file sections when possible', () => {
  const diffText = [
    'diff --git a/a.js b/a.js\n+one\n',
    'diff --git a/b.js b/b.js\n+two\n',
  ].join('');

  const result = truncateDiffAtBoundary(diffText, 31);
  assert.equal(result.truncated, true);
  assert.equal(result.diff, 'diff --git a/a.js b/a.js\n+one');
});

test('truncateDiffAtBoundary slices the first section when it alone exceeds the limit', () => {
  const diffText = 'diff --git a/a.js b/a.js\n+1234567890\n';
  const result = truncateDiffAtBoundary(diffText, 20);

  assert.equal(result.truncated, true);
  assert.equal(result.diff.length, 20);
});
