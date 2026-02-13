#!/usr/bin/env node

const { execSync, exec, spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Helper for asynchronous shell commands
const execPromise = (command) => new Promise((resolve, reject) => {
  exec(command, (error, stdout, stderr) => {
    if (error) reject(error);
    else resolve(stdout);
  });
});

// Loading spinner function
function startSpinner(message) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r\x1b[36m${frames[i]} ${message}\x1b[0m`);
    i = (i + 1) % frames.length;
  }, 80);

  return () => {
    clearInterval(interval);
    process.stdout.write('\r\x1b[K'); // Clear the line
  };
}

// Function to get change summary
function getChangeSummary() {
  const status = execSync('git status --porcelain').toString();
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

// Function to edit message in system editor
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

async function run() {
  const tmpFilePath = path.join(os.tmpdir(), `gcg-prompt-${Date.now()}.txt`);

  try {
    // 1. Check for required tools
    try {
      execSync('gemini --version', { stdio: 'ignore' });
    } catch (e) {
      console.error('\x1b[31m❌ Error: "gemini" CLI is not installed.\x1b[0m');
      process.exit(1);
    }

    // 2. Check for git repository
    try {
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    } catch (e) {
      console.error('\x1b[31m❌ Error: Not a git repository.\x1b[0m');
      process.exit(1);
    }

    // 3. Stage changes and get diff
    execSync('git add .');
    
    // Show change summary
    const summary = getChangeSummary();
    if (summary.added === 0 && summary.modified === 0 && summary.deleted === 0) {
      console.log('\x1b[33m✨ No changes staged. Please make some changes first.\x1b[0m');
      process.exit(0);
    }

    console.log('\n\x1b[35m📊 Change Summary:\x1b[0m');
    if (summary.added > 0) console.log(`  \x1b[32m+ ${summary.added} new files\x1b[0m`);
    if (summary.modified > 0) console.log(`  \x1b[33m~ ${summary.modified} modified files\x1b[0m`);
    if (summary.deleted > 0) console.log(`  \x1b[31m- ${summary.deleted} deleted files\x1b[0m`);

    let diff = execSync('git diff --cached -- . ":(exclude)*.lock" ":(exclude)package-lock.json"').toString();

    // Performance: Truncate diff to 3000 chars
    if (diff.length > 3000) {
      diff = diff.substring(0, 3000) + '\n\n...(diff truncated for performance)';
    }

    // 4. Analyze project style
    const history = execSync('git log -n 3 --pretty=format:"%s"').toString();

    // 5. Get user context
    console.log('\n\x1b[36m📝 Any specific context for this commit? (Optional, press Enter to skip)\x1b[0m');
    const userContext = await question('> ');

    // 6. Construct Prompt
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
2. BODY: Detailed explanation of changes. List important changes by file or logical group.
3. Use a blank line between TITLE and BODY.
4. Output ONLY the commit message without any markdown backticks or quotes.`;

    async function generateAndSelect() {
      fs.writeFileSync(tmpFilePath, prompt);

      const stopSpinner = startSpinner('AI is analyzing changes and generating a detailed message...');
      
      const startTime = Date.now();
      let aiMsg;
      try {
        const rawOutput = await execPromise(`gemini -p "$(cat "${tmpFilePath}")" -m flash -e ""`);
        aiMsg = rawOutput.trim();
      } catch (e) {
        stopSpinner();
        console.error('\x1b[31m\n❌ Failed to generate message.\x1b[0m');
        return;
      }
      
      stopSpinner();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`\r\x1b[32m✔ Analysis completed in ${duration}s\x1b[0m`);
      console.log('\x1b[37m\n--------------------------------------------\x1b[0m');
      console.log(`\x1b[32m${aiMsg}\x1b[0m`);
      console.log('\x1b[37m--------------------------------------------\x1b[0m');

      while (true) {
        console.log('\x1b[36m\nWhat would you like to do?\x1b[0m');
        console.log('1) ✅ Commit');
        console.log('2) 🔄 Regenerate');
        console.log('3) ✏️  Edit');
        console.log('4) ❌ Cancel');
        
        const choice = await question('Selection [1-4] > ');

        switch (choice) {
          case '1':
            const escapedMsg = aiMsg.replace(/"/g, '\\"');
            execSync(`git commit -m "${escapedMsg}"`);
            console.log('\x1b[32m\n🎉 Successfully committed with detailed message!\x1b[0m');
            cleanupAndExit(0);
          case '2':
            return generateAndSelect();
          case '3':
            const editedMsg = await editInEditor(aiMsg);
            if (editedMsg) {
              const escapedEditedMsg = editedMsg.replace(/"/g, '\\"');
              execSync(`git commit -m "${escapedEditedMsg}"`);
              console.log('\x1b[32m\n🎉 Committed with edited message!\x1b[0m');
              cleanupAndExit(0);
            }
            break;
          case '4':
            console.log('\x1b[31m\nCommit cancelled.\x1b[0m');
            cleanupAndExit(0);
          default:
            console.log('\x1b[31mInvalid selection.\x1b[0m');
        }
      }
    }

    function cleanupAndExit(code) {
      if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath);
      process.exit(code);
    }

    await generateAndSelect();

  } catch (error) {
    if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath);
    console.error('\x1b[31m\nAn unexpected error occurred:\x1b[0m', error.message);
    process.exit(1);
  }
}

run();
