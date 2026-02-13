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
    step2: 'Step 2: Checking environment and repository...',
    step2Staging: 'Step 2: Staging changes and gathering data...',
    noChanges: '✨ No changes staged. Please make some changes first.',
    summary: '\n📊 Change Summary:',
    filesAdded: 'new files',
    filesModified: 'modified files',
    filesDeleted: 'deleted files',
    step3: '\n📝 Step 3: Provide context (Optional, press Enter to skip)',
    step4: 'Step 4: AI is analyzing changes and drafting message...',
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
    editAborted: '\nNo changes saved. Commit aborted.',
    invalid: 'Invalid selection.',
    error: '\nAn unexpected error occurred:',
    promptLang: 'English',
    promptExample: '- index.js: Refactor AI prompt and optimize performance',
    errNotInstalled: '❌ Gemini CLI is not installed. Please install it using: npm install -g @google/gemini-cli',
    errNotAuthenticated: '🔑 Gemini CLI authentication required. Please run the "gemini" command in your terminal, follow the instructions to log in (e.g., Google login), and then try this program again.',
    errNotGit: '📁 This is not a git repository. Please run this command inside a git project.'
  },
  ko: {
    starting: '\n🚀 AI 커밋 생성기를 시작합니다...',
    step2: 'Step 2: 환경 및 저장소 확인 중...',
    step2Staging: 'Step 2: 변경 사항 스테이징 및 데이터 수집 중...',
    noChanges: '✨ 스테이징된 변경 사항이 없습니다. 먼저 파일을 수정해주세요.',
    summary: '\n📊 변경 요약:',
    filesAdded: '개의 새 파일',
    filesModified: '개의 수정된 파일',
    filesDeleted: '개의 삭제된 파일',
    step3: '\n📝 Step 3: 추가 맥락 제공 (선택 사항, 건너뛰려면 Enter)',
    step4: 'Step 4: AI가 변경 사항을 분석하고 메시지를 작성 중입니다...',
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
    editAborted: '\n저장된 변경 사항이 없습니다. 커밋이 중단되었습니다.',
    invalid: '잘못된 선택입니다.',
    error: '\n예상치 못한 오류가 발생했습니다:',
    promptLang: 'KOREAN (한국어)',
    promptExample: '- index.js: AI 프롬프트 수정 및 성능 최적화',
    errNotInstalled: '❌ Gemini CLI가 설치되어 있지 않습니다. 다음 명령어로 설치해주세요: npm install -g @google/gemini-cli',
    errNotAuthenticated: '🔑 Gemini CLI 인증이 필요합니다. 터미널에서 "gemini" 명령어를 입력하여 안내에 따라 구글 로그인 등을 마친 뒤 다시 실행해주세요.',
    errNotGit: '📁 이곳은 Git 저장소가 아닙니다. Git 프로젝트 내부에서 실행해주세요.'
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
  
  const initialStat = fs.statSync(tmpEditPath);

  const editorCommand = process.env.EDITOR || (os.platform() === 'win32' ? 'notepad' : 'vi');
  
  // Pause readline to give control to the editor
  rl.pause();

  return new Promise((resolve) => {
    // Use shell: true to handle editor commands with arguments (e.g., "code --wait")
    const child = spawn(editorCommand, [tmpEditPath], { 
      stdio: 'inherit',
      shell: true 
    });
    
    child.on('exit', () => {
      // Resume readline after editor closes
      rl.resume();
      
      const finalStat = fs.statSync(tmpEditPath);
      const editedContent = fs.readFileSync(tmpEditPath, 'utf8').trim();
      
      let result = null;
      // Check if the file was actually saved (mtime changed) and is not empty
      if (finalStat.mtimeMs > initialStat.mtimeMs && editedContent) {
        result = editedContent;
      }

      if (fs.existsSync(tmpEditPath)) fs.unlinkSync(tmpEditPath);
      resolve(result);
    });
  });
}

/**
 * Helper to commit using a message from a string, handling special characters safely
 */
async function commitWithMessage(message) {
  const tmpMsgPath = path.join(os.tmpdir(), `gcg-msg-${Date.now()}.txt`);
  fs.writeFileSync(tmpMsgPath, message);
  try {
    execSync(`git commit -F "${tmpMsgPath}"`);
  } finally {
    if (fs.existsSync(tmpMsgPath)) fs.unlinkSync(tmpMsgPath);
  }
}

/**
 * Main Logic
 */
async function run(selectedLang = null) {
  let lang = selectedLang;
  
  if (!lang) {
    while (true) {
      console.log(`${COLORS.cyan}\n🌐 Step 1: Select Language / Step 1: 언어 선택${COLORS.reset}`);
      console.log(`1) English`);
      console.log(`2) 한국어`);
      const langChoice = await question('Selection [1-2] > ');
      if (langChoice === '1') {
        lang = 'en';
        break;
      } else if (langChoice === '2') {
        lang = 'ko';
        break;
      }
      console.log(`${COLORS.red}Invalid selection. Please choose 1 or 2. / 잘못된 선택입니다. 1 또는 2를 선택해주세요.${COLORS.reset}`);
    }
  }
  
  const t = STRINGS[lang];
  console.log(`${COLORS.magenta}${t.starting}${COLORS.reset}`);
  
  const step2 = startSpinner(t.step2);
  
  try {
    // 1. Validate Environment
    try {
      await execAsync('gemini --version');
    } catch (e) {
      step2.stop('❌', COLORS.red);
      console.error(`${COLORS.red}${t.errNotInstalled}${COLORS.reset}`);
      rl.close();
      process.exit(1);
    }

    try {
      await execAsync('git rev-parse --is-inside-work-tree');
    } catch (e) {
      step2.stop('❌', COLORS.red);
      console.error(`${COLORS.red}${t.errNotGit}${COLORS.reset}`);
      rl.close();
      process.exit(1);
    }

    step2.update(t.step2Staging);
    execSync('git add .');
    
    const [summary, diffRaw, history] = await Promise.all([
      getChangeSummary(),
      execAsync('git diff --cached -- . ":(exclude)*.lock" ":(exclude)package-lock.json"'),
      execAsync('git log -n 3 --pretty=format:"%s"')
    ]);

    if (summary.added === 0 && summary.modified === 0 && summary.deleted === 0) {
      step2.stop('⚠', COLORS.yellow);
      console.log(`${COLORS.yellow}${t.noChanges}${COLORS.reset}`);
      rl.close();
      return;
    }

    step2.stop();

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
    console.log(`${COLORS.cyan}${t.step3}${COLORS.reset}`);
    const userContext = await question('> ');

    // 4. AI Analysis
    console.log('');
    const step4 = startSpinner(t.step4);
    
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
      step4.stop('❌', COLORS.red);
      console.error(`\n${COLORS.red}${t.errNotAuthenticated}${COLORS.reset}`);
      console.error(`${COLORS.red}${t.error} ${e.message}${COLORS.reset}`);
      rl.close();
      process.exit(1);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    step4.update(`${t.analysisDone} ${duration}s`);
    step4.stop();

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
          await commitWithMessage(aiMsg);
          console.log(`${COLORS.green}${t.success}${COLORS.reset}`);
          rl.close();
          return;
        case '2':
          console.log(`${COLORS.yellow}${t.regenerating}${COLORS.reset}`);
          return run(lang); 
        case '3':
          const editedMsg = await editInEditor(aiMsg);
          if (editedMsg) {
            await commitWithMessage(editedMsg);
            console.log(`${COLORS.green}${t.successEdited}${COLORS.reset}`);
            rl.close();
            return;
          } else {
            console.log(`${COLORS.yellow}${t.editAborted}${COLORS.reset}`);
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
