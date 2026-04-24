const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

async function editInEditor(initialContent, promptControl) {
  const tmpEditPath = path.join(os.tmpdir(), `gcg-edit-${Date.now()}.txt`);
  fs.writeFileSync(tmpEditPath, initialContent);
  const editorCommand = process.env.EDITOR || (os.platform() === 'win32' ? 'notepad' : 'vi');

  promptControl.pause();

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result) => {
      if (settled) {
        return;
      }

      settled = true;
      promptControl.resume();
      if (fs.existsSync(tmpEditPath)) {
        fs.unlinkSync(tmpEditPath);
      }

      resolve(result);
    };

    let child;
    try {
      child = spawn(editorCommand, [tmpEditPath], {
        stdio: 'inherit',
        shell: true,
      });
    } catch (error) {
      finish({ status: 'editor-failed', error: error.message });
      return;
    }

    child.on('error', (error) => {
      finish({ status: 'editor-failed', error: error.message });
    });

    child.on('close', (code) => {
      let editedContent = '';

      try {
        editedContent = fs.readFileSync(tmpEditPath, 'utf8').trim();
      } catch (error) {
        finish({ status: 'editor-failed', error: error.message });
        return;
      }

      if (code !== 0) {
        finish({ status: 'editor-failed', error: `Editor exited with code ${code}.` });
        return;
      }

      if (!editedContent) {
        finish({ status: 'empty', message: '' });
        return;
      }

      if (editedContent === initialContent.trim()) {
        finish({ status: 'unchanged', message: editedContent });
        return;
      }

      finish({ status: 'saved', message: editedContent });
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
