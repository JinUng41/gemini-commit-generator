const readline = require('readline');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  red: '\x1b[31m',
  clearLine: '\x1b[K',
};

const STRINGS = {
  en: {
    starting: '\n🚀 Starting AI Commit Generator...',
    step2: 'Checking setup...',
    step2Sync: 'Checking branch status...',
    step2AutoStage: 'Staging changes...',
    step2UsingStaged: 'Reading staged changes...',
    noChanges: '✨ No staged changes found. Run git add first or enable autoStage in .gcgrc.json.',
    stagedOnlyNotice: 'Using staged changes only.',
    autoStageNotice: 'autoStage is enabled, so changes were staged with git add -A.',
    summary: '\n📊 Change Summary:',
    filesAdded: 'new files',
    filesModified: 'modified files',
    filesDeleted: 'deleted files',
    step3: '\n📝 Add context (optional, press Enter to skip)',
    step4: 'Generating commit message...',
    analysisDone: 'Message generated in',
    menuTitle: '\nWhat would you like to do?',
    menuCommit: '✅ Commit',
    menuRegen: '🔄 Regenerate',
    menuEdit: '✏️  Edit',
    menuCancel: '❌ Cancel',
    selection: 'Selection [1-4] > ',
    success: '\n🎉 Successfully committed!',
    regenerating: '\n🔄 Regenerating...',
    successEdited: '\n🎉 Committed with edited message!',
    cancelled: '\nCommit cancelled.',
    editAborted: '\nNo changes saved. Commit aborted.',
    editFailed: '\nEditor failed before the message could be reused.',
    invalid: 'Invalid selection.',
    error: '\nAn unexpected error occurred:',
    promptLang: 'English',
    promptExample: '- index.js: Refactor AI prompt and optimize performance',
    errNotInstalled: '❌ Gemini CLI is not installed. Please install it using: npm install -g @google/gemini-cli',
    errNotAuthenticated: '🔑 Gemini CLI authentication required. Please run the "gemini" command in your terminal, complete login, and then try again.',
    errGeminiFailed: '❌ Gemini CLI failed to generate a commit message.',
    errNotGit: '📁 This is not a git repository. Please run this command inside a git project.',
    syncOk: '🔒 Branch safety check passed.',
    syncAhead: '📌 Local branch is ahead of remote by',
    syncAheadSuffix: 'commit(s).',
    syncNoUpstream: '⚠ No upstream branch is configured. Remote pointer comparison was skipped.',
    syncFetchWarn: '⚠ Could not refresh remote refs (git fetch failed). Comparison may be stale.',
    syncBehind: '❌ Remote branch is ahead of local branch. Commit blocked for safety.',
    syncDiverged: '❌ Local and remote branches have diverged. Commit blocked for safety.',
    syncDetached: '❌ Detached HEAD detected. Commit blocked for safety.',
    syncHint: 'Please run git pull --rebase (or sync manually) and try again.',
    syncPointers: 'Branch pointer status:',
    syncLocal: 'local',
    syncRemote: 'remote',
    syncAheadBehind: 'ahead/behind',
    syncBlockedAtCommit: '❌ Branch safety check failed right before commit.',
    syncBlockedAtRegenerate: '❌ Branch safety check failed before regenerating the message.',
    syncCheckDisabled: '⚠ Branch safety checks are disabled by configuration.',
    stagedChangedAtCommit: '❌ Staged changes changed after message generation. Commit blocked.',
    stagedChangedHint: 'Regenerate the message so it matches the current staged state.',
    stagedChangedNeedsRegenerate: 'Commit is blocked until you regenerate the message for the current staged state.',
    configWarningsTitle: '⚠ Config warnings:',
    configInvalidJson: (filePath) => `Could not parse ${filePath}. Falling back to default config.`,
    configNotObject: (filePath) => `${filePath} must contain a JSON object. Falling back to default config.`,
    configUnknownKey: (key) => `Ignoring unknown config key: ${key}`,
    configInvalidValue: (key, fallback) => `Invalid value for ${key}. Using ${fallback}.`,
    configHistoryClamp: (min) => `historyCount must be at least ${min}. Falling back to ${min}.`,
    validationRetrying: 'The first AI response failed minimal validation, so it was regenerated once automatically.',
    validationFailed: 'The generated message is still not usable as a commit message.',
    validationNeedsAction: 'Commit is disabled until you regenerate or edit the message.',
    validationWarnings: 'Validation warnings:',
    validationIssue: {
      'empty-message': 'The response was empty.',
      'missing-title': 'Missing title line.',
      'code-fence': 'Remove markdown code fences from the output.',
      'meta-prefix': 'Remove AI explanatory prefixes like "Here is your commit message:".',
    },
    validationWarning: {
      'title-too-long': 'Title is longer than 50 characters.',
    },
  },
  ko: {
    starting: '\n🚀 AI 커밋 생성기를 시작합니다...',
    step2: '설정 확인 중...',
    step2Sync: '브랜치 상태 확인 중...',
    step2AutoStage: '변경 사항 스테이징 중...',
    step2UsingStaged: '스테이징된 변경 사항 확인 중...',
    noChanges: '✨ 스테이징된 변경 사항이 없습니다. 먼저 git add를 실행하거나 .gcgrc.json에서 autoStage를 켜주세요.',
    stagedOnlyNotice: '현재 스테이징된 변경 사항만 사용합니다.',
    autoStageNotice: 'autoStage가 활성화되어 있어 git add -A로 변경 사항을 스테이징했습니다.',
    summary: '\n📊 변경 요약:',
    filesAdded: '개의 새 파일',
    filesModified: '개의 수정된 파일',
    filesDeleted: '개의 삭제된 파일',
    step3: '\n📝 추가 설명 입력 (선택, 건너뛰려면 Enter)',
    step4: '커밋 메시지 생성 중...',
    analysisDone: '메시지 생성 완료:',
    menuTitle: '\n어떻게 하시겠습니까?',
    menuCommit: '✅ 커밋하기',
    menuRegen: '🔄 다시 생성',
    menuEdit: '✏️  수정하기',
    menuCancel: '❌ 취소',
    selection: '선택 [1-4] > ',
    success: '\n🎉 성공적으로 커밋되었습니다!',
    regenerating: '\n🔄 다시 생성 중...',
    successEdited: '\n🎉 수정된 메시지로 커밋되었습니다!',
    cancelled: '\n커밋이 취소되었습니다.',
    editAborted: '\n저장된 변경 사항이 없습니다. 커밋이 중단되었습니다.',
    editFailed: '\n편집기가 정상적으로 종료되지 않아 메시지를 다시 사용할 수 없습니다.',
    invalid: '잘못된 선택입니다.',
    error: '\n예상치 못한 오류가 발생했습니다:',
    promptLang: 'KOREAN (한국어)',
    promptExample: '- index.js: AI 프롬프트 수정 및 성능 최적화',
    errNotInstalled: '❌ Gemini CLI가 설치되어 있지 않습니다. 다음 명령어로 설치해주세요: npm install -g @google/gemini-cli',
    errNotAuthenticated: '🔑 Gemini CLI 인증이 필요합니다. 터미널에서 "gemini" 명령어를 실행해 로그인한 뒤 다시 시도해주세요.',
    errGeminiFailed: '❌ Gemini CLI가 커밋 메시지를 생성하지 못했습니다.',
    errNotGit: '📁 이곳은 Git 저장소가 아닙니다. Git 프로젝트 내부에서 실행해주세요.',
    syncOk: '🔒 브랜치 안전성 확인을 통과했습니다.',
    syncAhead: '📌 로컬 브랜치가 원격보다',
    syncAheadSuffix: '커밋 앞서 있습니다.',
    syncNoUpstream: '⚠ 업스트림 브랜치가 설정되지 않아 원격 포인터 비교를 건너뜁니다.',
    syncFetchWarn: '⚠ 원격 참조 갱신(git fetch)에 실패했습니다. 비교 결과가 오래되었을 수 있습니다.',
    syncBehind: '❌ 원격 브랜치가 로컬보다 앞서 있습니다. 안전을 위해 커밋을 차단합니다.',
    syncDiverged: '❌ 로컬/원격 브랜치가 갈라졌습니다(diverged). 안전을 위해 커밋을 차단합니다.',
    syncDetached: '❌ Detached HEAD 상태입니다. 안전을 위해 커밋을 차단합니다.',
    syncHint: 'git pull --rebase(또는 수동 동기화) 후 다시 시도해주세요.',
    syncPointers: '브랜치 포인터 상태:',
    syncLocal: '로컬',
    syncRemote: '원격',
    syncAheadBehind: 'ahead/behind',
    syncBlockedAtCommit: '❌ 커밋 직전 브랜치 안전성 검사에 실패했습니다.',
    syncBlockedAtRegenerate: '❌ 메시지 재생성 직전 브랜치 안전성 검사에 실패했습니다.',
    syncCheckDisabled: '⚠ 설정에 의해 브랜치 안전성 검사가 비활성화되었습니다.',
    stagedChangedAtCommit: '❌ 메시지 생성 이후 스테이징된 변경 사항이 바뀌어 커밋을 차단합니다.',
    stagedChangedHint: '현재 스테이징 상태에 맞게 메시지를 다시 생성해주세요.',
    stagedChangedNeedsRegenerate: '현재 스테이징 상태에 맞게 메시지를 다시 생성할 때까지 커밋할 수 없습니다.',
    configWarningsTitle: '⚠ 설정 경고:',
    configInvalidJson: (filePath) => `${filePath}를 파싱하지 못했습니다. 기본 설정으로 진행합니다.`,
    configNotObject: (filePath) => `${filePath}는 JSON 객체여야 합니다. 기본 설정으로 진행합니다.`,
    configUnknownKey: (key) => `알 수 없는 설정 키를 무시합니다: ${key}`,
    configInvalidValue: (key, fallback) => `${key} 값이 올바르지 않습니다. ${fallback} 값을 사용합니다.`,
    configHistoryClamp: (min) => `historyCount는 최소 ${min}여야 합니다. ${min}으로 보정하여 사용합니다.`,
    validationRetrying: '첫 번째 AI 응답이 최소 검증에 실패하여 한 번 자동 재생성했습니다.',
    validationFailed: '생성된 메시지가 여전히 커밋 메시지로 사용하기 어렵습니다.',
    validationNeedsAction: '메시지를 다시 생성하거나 직접 수정할 때까지 커밋할 수 없습니다.',
    validationWarnings: '검증 경고:',
    validationIssue: {
      'empty-message': '응답이 비어 있습니다.',
      'missing-title': '제목 줄이 없습니다.',
      'code-fence': '출력에 포함된 마크다운 코드 펜스를 제거해야 합니다.',
      'meta-prefix': '"다음은 커밋 메시지입니다" 같은 설명 문구를 제거해야 합니다.',
    },
    validationWarning: {
      'title-too-long': '제목이 50자를 넘었습니다.',
    },
  },
};

function createPrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return {
    question: (query) => new Promise((resolve) => rl.question(query, resolve)),
    pause: () => rl.pause(),
    resume: () => rl.resume(),
    close: () => rl.close(),
  };
}

function startSpinner(message) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frameIndex = 0;
  let currentMessage = message;
  const interval = setInterval(() => {
    process.stdout.write(`\r${COLORS.cyan}${frames[frameIndex]} ${currentMessage}${COLORS.reset}${COLORS.clearLine}`);
    frameIndex = (frameIndex + 1) % frames.length;
  }, 80);

  return {
    update(newMessage) {
      currentMessage = newMessage;
    },
    stop(symbol = '✔', color = COLORS.green) {
      clearInterval(interval);
      process.stdout.write(`\r${color}${symbol} ${currentMessage}${COLORS.reset}${COLORS.clearLine}\n`);
    },
  };
}

async function selectLanguage(question, options = {}) {
  const consoleRef = options.consoleRef || console;
  const showConfigHint = Boolean(options.showConfigHint);
  let shouldShowConfigHint = showConfigHint;

  while (true) {
    if (shouldShowConfigHint) {
      consoleRef.log('Tip: save a default language with `gcg config`');
      shouldShowConfigHint = false;
    }

    consoleRef.log(`${COLORS.cyan}\n🌐 Select Language / 언어 선택${COLORS.reset}`);
    consoleRef.log('1) English');
    consoleRef.log('2) 한국어');
    const langChoice = await question('Selection [1-2] > ');

    if (langChoice === '1') {
      return 'en';
    }

    if (langChoice === '2') {
      return 'ko';
    }

    consoleRef.log(`${COLORS.red}Invalid selection. Please choose 1 or 2. / 잘못된 선택입니다. 1 또는 2를 선택해주세요.${COLORS.reset}`);
  }
}

function printHelp(consoleRef = console) {
  consoleRef.log('Usage');
  consoleRef.log('  gcg');
  consoleRef.log('  gcg config');
  consoleRef.log('  gcg help');
  consoleRef.log('');
  consoleRef.log('What it does');
  consoleRef.log('  gcg writes a commit message with Gemini');
  consoleRef.log('');
  consoleRef.log('Commands');
  consoleRef.log('  config   open settings');
  consoleRef.log('  help     show help');
  consoleRef.log('');
  consoleRef.log('Tip');
  consoleRef.log('  Save a default language with `gcg config`');
}

async function runConfigMenu({ question, onSetLanguage, onResetLanguage, consoleRef = console }) {
  while (true) {
    consoleRef.log('Settings');
    consoleRef.log('');
    consoleRef.log('Choose an option');
    consoleRef.log('1) Default language');
    consoleRef.log('2) Exit');

    const choice = await question('Selection [1-2] > ');
    if (choice === '1') {
      while (true) {
        consoleRef.log('');
        consoleRef.log('Default language');
        consoleRef.log('');
        consoleRef.log('Choose a language');
        consoleRef.log('1) English');
        consoleRef.log('2) Korean');
        consoleRef.log('3) Reset');
        consoleRef.log('4) Back');

        const languageChoice = await question('Selection [1-4] > ');
        if (languageChoice === '1') {
          await onSetLanguage('en');
          consoleRef.log('Saved: default language is English');
          break;
        }

        if (languageChoice === '2') {
          await onSetLanguage('ko');
          consoleRef.log('Saved: default language is Korean');
          break;
        }

        if (languageChoice === '3') {
          await onResetLanguage();
          consoleRef.log('Reset: no default language');
          break;
        }

        if (languageChoice === '4') {
          break;
        }

        consoleRef.log('Invalid selection. Please choose 1, 2, 3, or 4.');
      }

      consoleRef.log('');
      continue;
    }

    if (choice === '2') {
      return;
    }

    consoleRef.log('Invalid selection. Please choose 1 or 2.');
  }
}

function printConfigWarnings(warnings, t) {
  if (!warnings || warnings.length === 0) {
    return;
  }

  console.log(`${COLORS.yellow}${t.configWarningsTitle}${COLORS.reset}`);
  for (const warning of warnings) {
    console.log(`${COLORS.yellow}- ${warning}${COLORS.reset}`);
  }
}

function printSummary(summary, t) {
  console.log(`${COLORS.magenta}${t.summary}${COLORS.reset}`);
  if (summary.added > 0) {
    console.log(`  ${COLORS.green}+ ${summary.added} ${t.filesAdded}${COLORS.reset}`);
  }
  if (summary.modified > 0) {
    console.log(`  ${COLORS.yellow}~ ${summary.modified} ${t.filesModified}${COLORS.reset}`);
  }
  if (summary.deleted > 0) {
    console.log(`  ${COLORS.red}- ${summary.deleted} ${t.filesDeleted}${COLORS.reset}`);
  }
}

function printPointerDetails(sync, t, color = COLORS.yellow) {
  if (!sync || !sync.localHead || !sync.remoteHead || !sync.upstream) {
    return;
  }

  console.log(`${color}${t.syncPointers}${COLORS.reset}`);
  console.log(`  ${t.syncLocal} (${sync.branch}): ${sync.localHead}`);
  console.log(`  ${t.syncRemote} (${sync.upstream}): ${sync.remoteHead}`);
  console.log(`  ${t.syncAheadBehind}: ${sync.ahead}/${sync.behind}`);
}

function printValidationIssues(issues, t) {
  for (const issue of issues) {
    const message = t.validationIssue[issue.code] || issue.code;
    console.log(`${COLORS.yellow}- ${message}${COLORS.reset}`);
  }
}

function printValidationWarnings(warnings, t) {
  for (const warning of warnings) {
    const message = t.validationWarning[warning.code] || warning.code;
    console.log(`${COLORS.yellow}- ${message}${COLORS.reset}`);
  }
}

function printCommitMessage(message) {
  console.log(`${COLORS.white}\n--------------------------------------------${COLORS.reset}`);
  console.log(`${COLORS.green}${message}${COLORS.reset}`);
  console.log(`${COLORS.white}--------------------------------------------${COLORS.reset}`);
}

module.exports = {
  COLORS,
  STRINGS,
  createPrompt,
  printCommitMessage,
  printConfigWarnings,
  printHelp,
  printPointerDetails,
  printSummary,
  printValidationIssues,
  printValidationWarnings,
  runConfigMenu,
  selectLanguage,
  startSpinner,
};
