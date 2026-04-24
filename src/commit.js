const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

async function editInEditor(initialContent, promptControl) {
  const tmpEditPath = path.join(os.tmpdir(), `gcg-edit-${Date.now()}.txt`);
  fs.writeFileSync(tmpEditPath, initialContent);

  const initialStat = fs.statSync(tmpEditPath);
  const editorCommand = process.env.EDITOR || (os.platform() === 'win32' ? 'notepad' : 'vi');

  promptControl.pause();

  return new Promise((resolve) => {
    const child = spawn(editorCommand, [tmpEditPath], {
      stdio: 'inherit',
      shell: true,
    });

    child.on('exit', () => {
      promptControl.resume();
      const finalStat = fs.statSync(tmpEditPath);
      const editedContent = fs.readFileSync(tmpEditPath, 'utf8').trim();
      let result = null;

      if (finalStat.mtimeMs > initialStat.mtimeMs && editedContent) {
        result = editedContent;
      }

      if (fs.existsSync(tmpEditPath)) {
        fs.unlinkSync(tmpEditPath);
      }

      resolve(result);
    });
  });
}

async function commitWithMessage(cwd, message) {
  const tmpMessagePath = path.join(os.tmpdir(), `gcg-msg-${Date.now()}.txt`);
  fs.writeFileSync(tmpMessagePath, message);

  try {
    const result = spawnSync('git', ['commit', '-F', tmpMessagePath], {
      cwd,
      stdio: 'inherit',
    });

    if (result.status !== 0) {
      throw new Error('git commit failed');
    }
  } finally {
    if (fs.existsSync(tmpMessagePath)) {
      fs.unlinkSync(tmpMessagePath);
    }
  }
}

module.exports = {
  commitWithMessage,
  editInEditor,
};
