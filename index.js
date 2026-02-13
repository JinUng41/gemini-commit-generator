#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function run() {
  try {
    // 1. Check for required tools
    try {
      execSync('gemini --version', { stdio: 'ignore' });
    } catch (e) {
      console.error('\x1b[31m❌ Error: "gemini" CLI is not installed.\x1b[0m');
      console.log('Please install it first: https://github.com/google/gemini-cli');
      process.exit(1);
    }

    // 2. Check for git repository
    try {
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    } catch (e) {
      console.error('\x1b[31m❌ Error: Not a git repository.\x1b[0m');
      process.exit(1);
    }

    // 3. Stage changes and check for diff
    execSync('git add .');
    const diff = execSync('git diff --cached').toString();

    if (!diff.trim()) {
      console.log('\x1b[33m✨ No changes staged. Please make some changes first.\x1b[0m');
      process.exit(0);
    }

    // 4. Analyze project style
    const history = execSync('git log -n 15 --pretty=format:"%s"').toString();

    // 5. Get user context
    console.log('\n\x1b[36m📝 Any specific context for this commit? (Optional, press Enter to skip)\x1b[0m');
    const userContext = await question('> ');

    // 6. Construct Prompt
    const prompt = `You are an expert software engineer. Generate a concise, high-quality commit message based on the provided diff.

[CRITICAL RULES]
1. STYLE MATCHING: Analyze the 'Recent Commit History' and strictly follow its language, format, and tone.
2. ONE LINE: Output ONLY the commit message itself in a single line.
3. ACCURACY: Focus on the 'why' and 'what' of the changes.

[Context]
- User's Intent: ${userContext || 'Analyze the diff and generate the most appropriate message.'}
- Recent Commit History:
${history}

[Code Changes (diff)]
${diff}`;

    async function generateAndSelect() {
      console.log('\n\x1b[33m🤖 AI is analyzing project style and generating message...\x1b[0m');
      
      let aiMsg;
      try {
        // Escape double quotes for shell command
        const escapedPrompt = prompt.replace(/"/g, '\\"');
        aiMsg = execSync(`gemini "${escapedPrompt}"`).toString().trim();
      } catch (e) {
        console.error('\x1b[31m❌ Failed to generate message.\x1b[0m');
        return;
      }

      console.log('\x1b[37m\n--------------------------------------------\x1b[0m');
      console.log(`Proposed Message: \x1b[32m${aiMsg}\x1b[0m`);
      console.log('\x1b[37m--------------------------------------------\x1b[0m');

      while (true) {
        console.log('\x1b[36m\nWhat would you like to do?\x1b[0m');
        console.log('1) ✅ Commit (Accept this message)');
        console.log('2) 🔄 Regenerate (Try another version)');
        console.log('3) ✏️  Edit (Modify and commit)');
        console.log('4) ❌ Cancel');
        
        const choice = await question('Selection [1-4] > ');

        switch (choice) {
          case '1':
            const escapedMsg = aiMsg.replace(/"/g, '\\"');
            execSync(`git commit -m "${escapedMsg}"`);
            console.log('\x1b[32m\n🎉 Successfully committed!\x1b[0m');
            process.exit(0);
          case '2':
            return generateAndSelect();
          case '3':
            const editedMsg = await question('\nEnter custom message: ');
            if (editedMsg) {
              const escapedEditedMsg = editedMsg.replace(/"/g, '\\"');
              execSync(`git commit -m "${escapedEditedMsg}"`);
              console.log('\x1b[32m\n🎉 Committed with custom message!\x1b[0m');
              process.exit(0);
            }
            break;
          case '4':
            console.log('\x1b[31m\nCommit cancelled.\x1b[0m');
            process.exit(0);
          default:
            console.log('\x1b[31mInvalid selection.\x1b[0m');
        }
      }
    }

    await generateAndSelect();

  } catch (error) {
    console.error('\x1b[31m\nAn unexpected error occurred:\x1b[0m', error.message);
    process.exit(1);
  }
}

run();
