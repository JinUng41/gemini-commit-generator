const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPrompt,
  classifyGeminiError,
  generateCommitMessage,
  normalizeCommitMessage,
  validateCommitMessage,
} = require('../src/ai');
const { STRINGS } = require('../src/ui');

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

test('buildPrompt uses relative paths when basenames collide', () => {
  const prompt = buildPrompt({
    t: STRINGS.en,
    history: '[Docs] update workflow',
    userContext: 'sync docs with runtime',
    diff: 'diff --git a/src/index.js b/src/index.js',
    diffTruncated: false,
    branchContext: {
      branch: 'feature/ABC-123-runtime-check',
      issueHints: ['ABC-123'],
    },
    files: ['src/index.js', 'test/index.js', 'src/config.js'],
  });

  assert.match(prompt, /- src\/index\.js/);
  assert.match(prompt, /- test\/index\.js/);
  assert.match(prompt, /- config\.js/);
});

test('generateCommitMessage retries once after invalid output', async () => {
  const prompts = [];
  const responses = [
    'Here is your commit message:\n\nfeat: broken',
    'feat: add retry coverage',
  ];

  const result = await generateCommitMessage({
    cwd: process.cwd(),
    prompt: 'base prompt',
    maxAttempts: 2,
    runGeminiImpl: async (prompt) => {
      prompts.push(prompt);
      return responses.shift();
    },
  });

  assert.equal(result.valid, true);
  assert.equal(result.attempts, 2);
  assert.equal(result.message, 'feat: add retry coverage');
  assert.equal(prompts.length, 2);
  assert.match(prompts[1], /VALIDATION FEEDBACK/);
  assert.match(prompts[1], /meta-prefix/);
});

test('classifyGeminiError detects authentication failures', () => {
  assert.equal(classifyGeminiError(new Error('Unauthorized: please login')), 'auth');
  assert.equal(classifyGeminiError({ message: 'Permission denied', stderr: '' }), 'auth');
  assert.equal(classifyGeminiError({ message: 'network timeout', stderr: 'socket hang up' }), 'generic');
});
