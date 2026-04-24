const test = require('node:test');
const assert = require('node:assert/strict');

const { execute, run } = require('../index');

function createPromptControl(answers) {
  const queue = [...answers];

  return {
    question: async () => (queue.length > 0 ? queue.shift() : '4'),
    pause: () => {},
    resume: () => {},
    close: () => {},
  };
}

function createConsoleSpy() {
  const lines = [];

  return {
    lines,
    log: (...args) => {
      lines.push(args.join(' '));
    },
    error: (...args) => {
      lines.push(args.join(' '));
    },
  };
}

function createSpinner() {
  return {
    update: () => {},
    stop: () => {},
  };
}

function createOverrides(custom = {}) {
  const consoleSpy = createConsoleSpy();
  const processRef = {
    exitCode: 0,
    cwd: () => '/repo',
  };

  return {
    console: consoleSpy,
    process: processRef,
    createPrompt: () => createPromptControl(custom.answers || ['', '4']),
    selectLanguage: custom.selectLanguage,
    startSpinner: () => createSpinner(),
    printHelp: custom.printHelp,
    printConfigWarnings: () => {},
    printSummary: () => {},
    printPointerDetails: () => {},
    printValidationIssues: () => {},
    printValidationWarnings: () => {},
    printCommitMessage: () => {},
    runConfigMenu: custom.runConfigMenu,
    parseCliArgs: custom.parseCliArgs,
    loadConfig: () => ({
      config: {
        autoStage: false,
        historyCount: 5,
        notifyOnComplete: false,
        strictBranchCheck: true,
        fetchBeforeSyncCheck: false,
      },
      warnings: [],
    }),
    getGitRoot: async () => '/repo',
    ensureGeminiInstalled: async () => {},
    getBranchPointerStatus: custom.getBranchPointerStatus || (async () => ({ status: 'up-to-date' })),
    isSyncBlocked: (status) => status === 'behind' || status === 'diverged' || status === 'detached',
    getStagedSummary: custom.getStagedSummary || (async () => ({ added: 1, modified: 0, deleted: 0, total: 1 })),
    collectStagedDiffContext: custom.collectStagedDiffContext || (async () => ({ files: ['src/a.js'], diff: 'first diff', truncated: false })),
    getRecentHistory: custom.getRecentHistory || (async () => ''),
    getBranchContext: custom.getBranchContext || (async () => ({ branch: 'feature/ABC-1-test', issueHints: ['ABC-1'] })),
    getStagedSnapshot: custom.getStagedSnapshot || (async () => 'snap-1'),
    buildPrompt: custom.buildPrompt || (({ files, diff }) => `${files.join(',')}:${diff}`),
    generateCommitMessage: custom.generateCommitMessage || (async ({ prompt }) => ({
      message: `message:${prompt}`,
      valid: true,
      blockingIssues: [],
      warnings: [],
      attempts: 1,
    })),
    editInEditor: custom.editInEditor || (async () => ({ status: 'unchanged', message: 'same message' })),
    commitWithMessage: custom.commitWithMessage || (async () => {}),
    loadGlobalSettings: custom.loadGlobalSettings || (() => ({ settings: {} })),
    setGlobalLanguage: custom.setGlobalLanguage || (async () => {}),
    resetGlobalLanguage: custom.resetGlobalLanguage || (async () => ({})),
    notifyComplete: () => {},
  };
}

test('execute prints help for help command', async () => {
  const overrides = createOverrides({
    parseCliArgs: () => ({ command: 'help' }),
  });

  await execute(['help'], overrides);

  assert.match(overrides.console.lines.join('\n'), /Usage/);
  assert.match(overrides.console.lines.join('\n'), /gcg config/);
});

test('execute uses saved default language without prompting', async () => {
  let seenPromptLang = null;
  const overrides = createOverrides({
    answers: ['4'],
    loadGlobalSettings: () => ({ settings: { language: 'ko' } }),
    selectLanguage: async () => {
      throw new Error('selectLanguage should not be called');
    },
    buildPrompt: ({ t }) => {
      seenPromptLang = t.promptLang;
      return 'prompt';
    },
  });

  await execute([], overrides);

  assert.equal(seenPromptLang, 'KOREAN (한국어)');
});

test('execute shows config hint when no default language is set', async () => {
  let showConfigHint = null;
  const overrides = createOverrides({
    answers: ['4'],
    selectLanguage: async (question, options = {}) => {
      showConfigHint = options.showConfigHint;
      return 'en';
    },
  });

  await execute([], overrides);

  assert.equal(showConfigHint, true);
});

test('execute runs config menu and saves selected language', async () => {
  const calls = [];
  const overrides = createOverrides({
    answers: ['1', '2', '2'],
    setGlobalLanguage: async (language) => {
      calls.push(language);
    },
  });

  await execute(['config'], overrides);

  assert.deepEqual(calls, ['ko']);
  assert.match(overrides.console.lines.join('\n'), /Default language/);
});

test('execute reports config save failures without throwing raw errors', async () => {
  const overrides = createOverrides({
    answers: ['1', '1'],
    setGlobalLanguage: async () => {
      throw new Error('permission denied');
    },
  });

  await execute(['config'], overrides);

  assert.equal(overrides.process.exitCode, 1);
  assert.match(overrides.console.lines.join('\n'), /permission denied/);
});

test('execute reports config reset failures without throwing raw errors', async () => {
  const overrides = createOverrides({
    answers: ['1', '3'],
    resetGlobalLanguage: async () => {
      throw new Error('reset failed');
    },
  });

  await execute(['config'], overrides);

  assert.equal(overrides.process.exitCode, 1);
  assert.match(overrides.console.lines.join('\n'), /reset failed/);
});

test('run blocks commit when staged changes changed after generation', async () => {
  const snapshots = ['snap-1', 'snap-2'];
  let commitCalls = 0;
  const overrides = createOverrides({
    answers: ['', '1', '4'],
    getStagedSnapshot: async () => snapshots.shift(),
    commitWithMessage: async () => {
      commitCalls += 1;
    },
  });

  await run('en', overrides);

  assert.equal(commitCalls, 0);
  assert.match(overrides.console.lines.join('\n'), /Staged changes changed after message generation/);
  assert.match(overrides.console.lines.join('\n'), /blocked until you regenerate/);
});

test('run regenerates from refreshed staged state', async () => {
  const diffStates = [
    { files: ['src/first.js'], diff: 'first diff', truncated: false },
    { files: ['src/second.js'], diff: 'second diff', truncated: false },
  ];
  const snapshots = ['snap-1', 'snap-2'];
  const prompts = [];
  const overrides = createOverrides({
    answers: ['', '2', '4'],
    collectStagedDiffContext: async () => diffStates.shift(),
    getStagedSnapshot: async () => snapshots.shift(),
    generateCommitMessage: async ({ prompt }) => {
      prompts.push(prompt);
      return {
        message: `message:${prompt}`,
        valid: true,
        blockingIssues: [],
        warnings: [],
        attempts: 1,
      };
    },
  });

  await run('en', overrides);

  assert.deepEqual(prompts, ['src/first.js:first diff', 'src/second.js:second diff']);
});

test('run treats empty edited message as validation failure', async () => {
  let commitCalls = 0;
  const overrides = createOverrides({
    answers: ['', '3', '4'],
    editInEditor: async () => ({ status: 'empty', message: '' }),
    commitWithMessage: async () => {
      commitCalls += 1;
    },
  });

  await run('en', overrides);

  assert.equal(commitCalls, 0);
  assert.match(overrides.console.lines.join('\n'), /still not usable as a commit message/);
});

test('run blocks commit if branch state becomes blocked before commit', async () => {
  const states = [{ status: 'up-to-date' }, { status: 'behind' }];
  let commitCalls = 0;
  const overrides = createOverrides({
    answers: ['', '1', '4'],
    getBranchPointerStatus: async () => states.shift(),
    commitWithMessage: async () => {
      commitCalls += 1;
    },
  });

  await run('en', overrides);

  assert.equal(commitCalls, 0);
  assert.match(overrides.console.lines.join('\n'), /Branch safety check failed right before commit/);
});

test('run surfaces commit failures after menu selection', async () => {
  const overrides = createOverrides({
    answers: ['', '1'],
    commitWithMessage: async () => {
      throw new Error('git commit failed');
    },
  });

  await run('en', overrides);

  assert.equal(overrides.process.exitCode, 1);
  assert.match(overrides.console.lines.join('\n'), /An unexpected error occurred/);
});
