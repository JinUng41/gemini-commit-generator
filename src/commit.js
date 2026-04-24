const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

function parseEditorCommand(editorCommand) {
  const rawCommand = (editorCommand || '').trim();
  if (!rawCommand) {
    throw new Error('EDITOR is empty.');
  }

  if (/[;&|`$><\n\r]/.test(rawCommand)) {
    throw new Error('Unsafe EDITOR value. Use only an executable path and direct arguments.');
  }

  const tokens = [];
  let current = '';
  let quote = null;
  let tokenStarted = false;

  for (let index = 0; index < rawCommand.length; index += 1) {
    const char = rawCommand[index];

    if (quote) {
      if (char === quote) {
        quote = null;
        continue;
      }

      current += char;
      tokenStarted = true;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      tokenStarted = true;
      continue;
    }

    if (/\s/.test(char)) {
      if (tokenStarted) {
        tokens.push(current);
        current = '';
        tokenStarted = false;
      }
      continue;
    }

    current += char;
    tokenStarted = true;
  }

  if (quote) {
    throw new Error('Invalid EDITOR value. Quotes must be closed.');
  }

  if (tokenStarted) {
    tokens.push(current);
  }

  if (tokens.length === 0 || !tokens[0]) {
    throw new Error('EDITOR must include an executable name.');
  }

  return {
    command: tokens[0],
    args: tokens.slice(1),
  };
}

function quoteForCmd(arg) {
  const value = String(arg);
  if (!value) {
    return '""';
  }

  const escaped = value.replace(/(["^&|<>()%!])/g, '^$1');
  if (/[\s"^&|<>()%!]/.test(value)) {
    return `"${escaped}"`;
  }

  return escaped;
}

function buildEditorLaunch(editorCommand, filePath, options = {}) {
  const parsedEditor = parseEditorCommand(editorCommand);
  const platform = options.platform || process.platform;
  const env = options.env || process.env;
  const editorArgs = [...parsedEditor.args, filePath];

  if (platform === 'win32') {
    const comSpec = env.ComSpec || env.COMSPEC || 'cmd.exe';
    const commandLine = [parsedEditor.command, ...editorArgs].map(quoteForCmd).join(' ');

    return {
      command: comSpec,
      args: ['/d', '/s', '/c', commandLine],
      options: {
        stdio: 'inherit',
        shell: false,
        windowsVerbatimArguments: true,
      },
    };
  }

  return {
    command: parsedEditor.command,
    args: editorArgs,
    options: {
      stdio: 'inherit',
      shell: false,
    },
  };
}

function createTempWorkspace(prefix, initialContent) {
  const dirPath = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const filePath = path.join(dirPath, 'content.txt');
  fs.writeFileSync(filePath, initialContent, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  });

  return {
    dirPath,
    filePath,
  };
}

function cleanupTempWorkspace(workspace) {
  if (!workspace || !workspace.dirPath) {
    return;
  }

  if (fs.existsSync(workspace.dirPath)) {
    fs.rmSync(workspace.dirPath, { recursive: true, force: true });
  }
}

async function editInEditor(initialContent, promptControl) {
  const workspace = createTempWorkspace('gcg-edit-', initialContent);
  const editorCommand = process.env.EDITOR || (os.platform() === 'win32' ? 'notepad' : 'vi');
  let editorLaunch;

  try {
    editorLaunch = buildEditorLaunch(editorCommand, workspace.filePath);
  } catch (error) {
    cleanupTempWorkspace(workspace);
    return {
      status: 'editor-failed',
      error: error.message,
    };
  }

  promptControl.pause();

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result) => {
      if (settled) {
        return;
      }

      settled = true;
      promptControl.resume();
      cleanupTempWorkspace(workspace);

      resolve(result);
    };

    let child;
    try {
      child = spawn(editorLaunch.command, editorLaunch.args, editorLaunch.options);
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
        editedContent = fs.readFileSync(workspace.filePath, 'utf8').trim();
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
  const workspace = createTempWorkspace('gcg-msg-', message);

  try {
    const result = spawnSync('git', ['commit', '-F', workspace.filePath], {
      cwd,
      stdio: 'inherit',
    });

    if (result.status !== 0) {
      throw new Error('git commit failed');
    }
  } finally {
    cleanupTempWorkspace(workspace);
  }
}

module.exports = {
  buildEditorLaunch,
  cleanupTempWorkspace,
  commitWithMessage,
  createTempWorkspace,
  editInEditor,
  parseEditorCommand,
};
