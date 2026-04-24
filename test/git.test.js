const test = require('node:test');
const assert = require('node:assert/strict');

const { extractIssueHints } = require('../src/git');

test('extractIssueHints finds ticket-style issue keys', () => {
  assert.deepEqual(extractIssueHints('feature/ABC-123-login-validation'), ['ABC-123']);
});

test('extractIssueHints finds hash issue keys from numeric branches', () => {
  assert.deepEqual(extractIssueHints('bugfix/123-login-flow'), ['#123']);
});

test('extractIssueHints preserves multiple unique patterns', () => {
  assert.deepEqual(extractIssueHints('feature/ABC-123-issue-77-#42'), ['ABC-123', '#42', 'issue-77']);
});
