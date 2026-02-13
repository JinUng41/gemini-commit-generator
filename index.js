#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

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
    let diff = execSync('git diff --cached -- . ":(exclude)*.lock" ":(exclude)package-lock.json"').toString();

    if (!diff.trim()) {
      console.log('\x1b[33m✨ No changes staged. Please make some changes first.\x1b[0m');
      process.exit(0);
    }

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
    const prompt = `Generate a concise, ONE-LINE commit message in KOREAN (한국어). 
Match the project style from recent history. 
Output ONLY the message.

[STYLE HISTORY]
${history}

[USER CONTEXT]
${userContext || 'None'}

[DIFF]
${diff}`;

    async function generateAndSelect() {
      console.log('\n\x1b[33m🤖 AI is analyzing style and generating message...\x1b[0m');
      
      fs.writeFileSync(tmpFilePath, prompt);

      const startTime = Date.now();
      let aiMsg;
      try {
        // OPTIMIZED COMMAND:
        // -p: non-interactive
        // -m flash: fastest model
        // -e "": skip all extensions (IDE sync, hooks, etc.) for speed
        aiMsg = execSync(`gemini -p "$(cat "${tmpFilePath}")" -m flash -e ""`, {
          encoding: 'utf8'
        }).trim();
      } catch (e) {
        console.error('\x1b[31m❌ Failed to generate message.\x1b[0m');
        return;
      }
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`\x1b[37m(Analysis completed in ${duration}s)\x1b[0m`);
      console.log('\x1b[37m\n--------------------------------------------\x1b[0m');
      console.log(`Proposed Message: \x1b[32m${aiMsg}\x1b[0m`);
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
            console.log('\x1b[32m\n🎉 Successfully committed!\x1b[0m');
            cleanupAndExit(0);
          case '2':
            return generateAndSelect();
          case '3':
            const editedMsg = await question('\nEnter custom message: ');
            if (editedMsg) {
              const escapedEditedMsg = editedMsg.replace(/"/g, '\\"');
              execSync(`git commit -m "${escapedEditedMsg}"`);
              console.log('\x1b[32m\n🎉 Committed with custom message!\x1b[0m');
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
