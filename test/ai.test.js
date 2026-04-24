const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeCommitMessage, validateCommitMessage } = require('../src/ai');

test('normalizeCommitMessage strips code fences', () => {
  const raw = '```\nfeat: test\n\nfile.js: add coverage\n```';
  assert.equal(normalizeCommitMessage(raw), 'feat: test\n\nfile.js: add coverage');
});

test('validateCommitMessage accepts a valid commit message', () => {
  const result = validateCommitMessage('feat: add config support\n\nsrc/config.js: load repository config');
  assert.equal(result.valid, true);
  assert.deepEqual(result.blockingIssues, []);
  assert.deepEqual(result.warnings, []);
});

test('validateCommitMessage accepts custom single-line styles', () => {
  const result = validateCommitMessage('[Docs] LIVD-348 - AGENTS.md 파일 끝에 빈 줄 추가');
  assert.equal(result.valid, true);
  assert.deepEqual(result.blockingIssues, []);
  assert.deepEqual(result.warnings, []);
});

test('validateCommitMessage warns for long titles without blocking commit', () => {
  const result = validateCommitMessage('this title is intentionally longer than fifty characters for warning coverage');
  assert.equal(result.valid, true);
  assert.deepEqual(result.blockingIssues, []);
  assert.deepEqual(result.warnings.map((warning) => warning.code), ['title-too-long']);
});

test('validateCommitMessage reports code fences from raw output', () => {
  const result = validateCommitMessage('```\nfeat: add config\n\nconfig.js: load settings\n```');
  assert.equal(result.valid, true);
  assert.deepEqual(result.blockingIssues, []);
});

test('validateCommitMessage blocks code fences that remain in the normalized message', () => {
  const result = validateCommitMessage('feat: add config\n\n```diff\n+line\n```');
  assert.equal(result.valid, false);
  assert.deepEqual(result.blockingIssues.map((issue) => issue.code), ['code-fence']);
});

test('validateCommitMessage blocks AI explanatory prefixes', () => {
  const result = validateCommitMessage('Here is your commit message:\n\nfeat: add config support');
  assert.equal(result.valid, false);
  assert.deepEqual(result.blockingIssues.map((issue) => issue.code), ['meta-prefix']);
});

test('validateCommitMessage blocks empty messages', () => {
  const result = validateCommitMessage('   ');
  assert.equal(result.valid, false);
  assert.deepEqual(result.blockingIssues.map((issue) => issue.code), ['empty-message', 'missing-title']);
});
