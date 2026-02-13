#!/usr/bin/env node

const { execSync, exec, spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Constants for UI Styling
 */
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

/**
 * UI Text Resources
 */
const STRINGS = {
  en: {
    starting: '\n🚀 Starting AI Commit Generator...',
    checking: 'Checking environment and repository...',
    staging: 'Staging changes and gathering data...',
    noChanges: '✨ No changes staged. Please make some changes first.',
    summary: '\n📊 Change Summary:',
    filesAdded: 'new files',
    filesModified: 'modified files',
    filesDeleted: 'deleted files',
    step2: '\n📝 Step 2: Provide context (Optional, press Enter to skip)',
    step3: 'AI is analyzing changes and drafting message...',
    analysisDone: 'AI Analysis completed in',
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
    invalid: 'Invalid selection.',
    error: '\nAn unexpected error occurred:',
    promptLang: 'English',
    promptExample: '- index.js: Refactor AI prompt and optimize performance'
  },
  ko: {
    starting: '\n🚀 AI 커밋 생성기를 시작합니다...',
    checking: '환경 및 저장소 확인 중...',
    staging: '변경 사항 스테이징 및 데이터 수집 중...',
    noChanges: '✨ 스테이징된 변경 사항이 없습니다. 먼저 파일을 수정해주세요.',
    summary: '\n📊 변경 요약:',
    filesAdded: '개의 새 파일',
    filesModified: '개의 수정된 파일',
    filesDeleted: '개의 삭제된 파일',
    step2: '\n📝 2단계: 추가 맥락 제공 (선택 사항, 건너뛰려면 Enter)',
    step3: 'AI가 변경 사항을 분석하고 메시지를 작성 중입니다...',
    analysisDone: 'AI 분석 완료:',
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
    invalid: '잘못된 선택입니다.',
    error: '\n예상치 못한 오류가 발생했습니다:',
    promptLang: 'KOREAN (한국어)',
    promptExample: '- index.js: AI 프롬프트 수정 및 성능 최적화'
  }
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * Helper for asynchronous shell commands with optional stdin
 */
const execAsync = (command, input = null) => new Promise((resolve, reject) => {
  const child = exec(command, (error, stdout) => {
    if (error) reject(error);
    else resolve(stdout);
  });
  if (input) {
    child.stdin.write(input);
    child.stdin.end();
  }
});

/**
 * Advanced loading spinner function
 */
function startSpinner(message) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  let currentMessage = message;
  const interval = setInterval(() => {
    process.stdout.write(`\r${COLORS.cyan}${frames[i]} ${currentMessage}${COLORS.reset}${COLORS.clearLine}`);
    i = (i + 1) % frames.length;
  }, 80);

  return {
    update: (newMessage) => {
      currentMessage = newMessage;
    },
    stop: (symbol = '✔', color = COLORS.green) => {
      clearInterval(interval);
      process.stdout.write(`\r${color}${symbol} ${currentMessage}${COLORS.reset}${COLORS.clearLine}\n`);
    }
  };
}

/**
 * Get a summary of staged changes
 */
async function getChangeSummary() {
  const status = await execAsync('git status --porcelain');
  const lines = status.split('\n').filter(line => line.trim());
  
  let added = 0, modified = 0, deleted = 0;
  lines.forEach(line => {
    const s = line.substring(0, 2);
    if (s.includes('?') || s.includes('A')) added++;
    else if (s.includes('M')) modified++;
    else if (s.includes('D')) deleted++;
  });

  return { added, modified, deleted };
}

/**
 * Open system editor to edit the message
 */
async function editInEditor(initialContent) {
  const tmpEditPath = path.join(os.tmpdir(), `gcg-edit-${Date.now()}.txt`);
  fs.writeFileSync(tmpEditPath, initialContent);

  const editor = process.env.EDITOR || (os.platform() === 'win32' ? 'notepad' : 'vi');
  
  return new Promise((resolve) => {
    const child = spawn(editor, [tmpEditPath], { stdio: 'inherit' });
    
    child.on('exit', () => {
      const editedContent = fs.readFileSync(tmpEditPath, 'utf8').trim();
      if (fs.existsSync(tmpEditPath)) fs.unlinkSync(tmpEditPath);
      resolve(editedContent);
    });
  });
}

/**
 * Main Logic
 */
async function run(selectedLang = null) {
  let lang = selectedLang;
  
  if (!lang) {
    console.log(`${COLORS.cyan}\n🌐 Select Language / 언어 선택:${COLORS.reset}`);
    console.log(`1) English`);
    console.log(`2) 한국어`);
    const langChoice = await question('Selection [1-2, default: 2] > ');
    lang = (langChoice === '1') ? 'en' : 'ko';
  }
  
  const t = STRINGS[lang];
  console.log(`${COLORS.magenta}${t.starting}${COLORS.reset}`);
  
  const step1 = startSpinner(t.checking);
  
  try {
    // 1. Validate Environment
    await Promise.all([
      execAsync('gemini --version').catch(() => { throw new Error('gemini CLI not installed'); }),
      execAsync('git rev-parse --is-inside-work-tree').catch(() => { throw new Error('Not a git repository'); })
    ]);

    step1.update(t.staging);
    execSync('git add .');
    
    const [summary, diffRaw, history] = await Promise.all([
      getChangeSummary(),
      execAsync('git diff --cached -- . ":(exclude)*.lock" ":(exclude)package-lock.json"'),
      execAsync('git log -n 3 --pretty=format:"%s"')
    ]);

    if (summary.added === 0 && summary.modified === 0 && summary.deleted === 0) {
      step1.stop('⚠', COLORS.yellow);
      console.log(`${COLORS.yellow}${t.noChanges}${COLORS.reset}`);
      rl.close();
      return;
    }

    step1.stop();

    // 2. Show Summary
    console.log(`${COLORS.magenta}${t.summary}${COLORS.reset}`);
    if (summary.added > 0) console.log(`  ${COLORS.green}+ ${summary.added} ${t.filesAdded}${COLORS.reset}`);
    if (summary.modified > 0) console.log(`  ${COLORS.yellow}~ ${summary.modified} ${t.filesModified}${COLORS.reset}`);
    if (summary.deleted > 0) console.log(`  ${COLORS.red}- ${summary.deleted} ${t.filesDeleted}${COLORS.reset}`);

    let diff = diffRaw;
    if (diff.length > 3000) {
      diff = diff.substring(0, 3000) + '\n\n...(diff truncated for performance)';
    }

    // 3. User Context
    console.log(`${COLORS.cyan}${t.step2}${COLORS.reset}`);
    const userContext = await question('> ');

    // 4. AI Analysis
    console.log('');
    const step3 = startSpinner(t.step3);
    
    const prompt = `Generate a detailed git commit message in ${t.promptLang} based on the diff.
Match the project style from recent history if possible.

[STYLE HISTORY]
${history}

[USER CONTEXT]
${userContext || 'None'}

[DIFF]
${diff}

[FORMAT]
1. TITLE: A concise summary (max 50 chars), starting with a type (feat, fix, refactor, style, docs, chore).
2. BODY: Detailed explanation of changes. 
   - For each changed file, use ONLY the FILENAME (exclude directory paths) followed by a description of what changed.
   - Example: "${t.promptExample}"
3. Use a blank line between TITLE and BODY.
4. Output ONLY the commit message without any markdown backticks or quotes.`;

    const startTime = Date.now();
    let aiMsg;
    try {
      aiMsg = await execAsync('gemini -p - -m flash -e ""', prompt);
      aiMsg = aiMsg.trim();
    } catch (e) {
      step3.stop('❌', COLORS.red);
      console.error(`${COLORS.red}\nFailed to generate message.${COLORS.reset}`);
      rl.close();
      process.exit(1);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    step3.update(`${t.analysisDone} ${duration}s`);
    step3.stop();

    console.log(`${COLORS.white}\n--------------------------------------------${COLORS.reset}`);
    console.log(`${COLORS.green}${aiMsg}${COLORS.reset}`);
    console.log(`${COLORS.white}--------------------------------------------${COLORS.reset}`);

    // 5. Interactive Selection
    while (true) {
      console.log(`${COLORS.cyan}${t.menuTitle}${COLORS.reset}`);
      console.log(`1) ${t.menuCommit}`);
      console.log(`2) ${t.menuRegen}`);
      console.log(`3) ${t.menuEdit}`);
      console.log(`4) ${t.menuCancel}`);
      
      const choice = await question(t.selection);

      switch (choice) {
        case '1':
          const escapedMsg = aiMsg.replace(/"/g, '\\"');
          execSync(`git commit -m "${escapedMsg}"`);
          console.log(`${COLORS.green}${t.success}${COLORS.reset}`);
          rl.close();
          return;
        case '2':
          console.log(`${COLORS.yellow}${t.regenerating}${COLORS.reset}`);
          return run(lang); 
        case '3':
          const editedMsg = await editInEditor(aiMsg);
          if (editedMsg) {
            const escapedEditedMsg = editedMsg.replace(/"/g, '\\"');
            execSync(`git commit -m "${escapedEditedMsg}"`);
            console.log(`${COLORS.green}${t.successEdited}${COLORS.reset}`);
            rl.close();
            return;
          }
          break;
        case '4':
          console.log(`${COLORS.red}${t.cancelled}${COLORS.reset}`);
          rl.close();
          return;
        default:
          console.log(`${COLORS.red}${t.invalid}${COLORS.reset}`);
      }
    }

  } catch (error) {
    console.error(`${COLORS.red}${t.error}${COLORS.reset}`, error.message);
    rl.close();
    process.exit(1);
  }
}

run();
