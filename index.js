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
async function run() {
  console.log(`${COLORS.magenta}\n🚀 Starting AI Commit Generator...${COLORS.reset}`);
  
  const step1 = startSpinner('Checking environment and repository...');
  
  try {
    // 1. Validate Environment
    await Promise.all([
      execAsync('gemini --version').catch(() => { throw new Error('gemini CLI not installed'); }),
      execAsync('git rev-parse --is-inside-work-tree').catch(() => { throw new Error('Not a git repository'); })
    ]);

    step1.update('Staging changes and gathering data...');
    execSync('git add .');
    
    const [summary, diffRaw, history] = await Promise.all([
      getChangeSummary(),
      execAsync('git diff --cached -- . ":(exclude)*.lock" ":(exclude)package-lock.json"'),
      execAsync('git log -n 3 --pretty=format:"%s"')
    ]);

    if (summary.added === 0 && summary.modified === 0 && summary.deleted === 0) {
      step1.stop('⚠', COLORS.yellow);
      console.log(`${COLORS.yellow}✨ No changes staged. Please make some changes first.${COLORS.reset}`);
      rl.close();
      return;
    }

    step1.stop();

    // 2. Show Summary
    console.log(`${COLORS.magenta}\n📊 Change Summary:${COLORS.reset}`);
    if (summary.added > 0) console.log(`  ${COLORS.green}+ ${summary.added} new files${COLORS.reset}`);
    if (summary.modified > 0) console.log(`  ${COLORS.yellow}~ ${summary.modified} modified files${COLORS.reset}`);
    if (summary.deleted > 0) console.log(`  ${COLORS.red}- ${summary.deleted} deleted files${COLORS.reset}`);

    let diff = diffRaw;
    if (diff.length > 3000) {
      diff = diff.substring(0, 3000) + '\n\n...(diff truncated for performance)';
    }

    // 3. User Context
    console.log(`${COLORS.cyan}\n📝 Step 2: Provide context (Optional, press Enter to skip)${COLORS.reset}`);
    const userContext = await question('> ');

    // 4. AI Analysis
    console.log('');
    const step3 = startSpinner('AI is analyzing changes and drafting message...');
    
    const prompt = `Generate a detailed git commit message in KOREAN (한국어) based on the diff.
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
   - Example: "- index.js: AI 프롬프트 수정 및 성능 최적화"
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
    step3.update(`AI Analysis completed in ${duration}s`);
    step3.stop();

    console.log(`${COLORS.white}\n--------------------------------------------${COLORS.reset}`);
    console.log(`${COLORS.green}${aiMsg}${COLORS.reset}`);
    console.log(`${COLORS.white}--------------------------------------------${COLORS.reset}`);

    // 5. Interactive Selection
    while (true) {
      console.log(`${COLORS.cyan}\nWhat would you like to do?${COLORS.reset}`);
      console.log('1) ✅ Commit');
      console.log('2) 🔄 Regenerate');
      console.log('3) ✏️  Edit');
      console.log('4) ❌ Cancel');
      
      const choice = await question('Selection [1-4] > ');

      switch (choice) {
        case '1':
          const escapedMsg = aiMsg.replace(/"/g, '\\"');
          execSync(`git commit -m "${escapedMsg}"`);
          console.log(`${COLORS.green}\n🎉 Successfully committed!${COLORS.reset}`);
          rl.close();
          return;
        case '2':
          console.log(`${COLORS.yellow}\n🔄 Regenerating...${COLORS.reset}`);
          rl.close(); // Close current interface before recursion
          return run(); 
        case '3':
          const editedMsg = await editInEditor(aiMsg);
          if (editedMsg) {
            const escapedEditedMsg = editedMsg.replace(/"/g, '\\"');
            execSync(`git commit -m "${escapedEditedMsg}"`);
            console.log(`${COLORS.green}\n🎉 Committed with edited message!${COLORS.reset}`);
            rl.close();
            return;
          }
          break;
        case '4':
          console.log(`${COLORS.red}\nCommit cancelled.${COLORS.reset}`);
          rl.close();
          return;
        default:
          console.log(`${COLORS.red}Invalid selection.${COLORS.reset}`);
      }
    }

  } catch (error) {
    console.error(`${COLORS.red}\nAn unexpected error occurred:${COLORS.reset}`, error.message);
    rl.close();
    process.exit(1);
  }
}

run();
