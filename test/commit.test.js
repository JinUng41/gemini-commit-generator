const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  buildEditorLaunch,
  cleanupTempWorkspace,
  createTempWorkspace,
  parseEditorCommand,
} = require('../src/commit');

test('parseEditorCommand supports editor arguments without a shell', () => {
  assert.deepEqual(parseEditorCommand('code --wait'), {
    command: 'code',
    args: ['--wait'],
  });
});

test('parseEditorCommand supports quoted executable paths', () => {
  assert.deepEqual(parseEditorCommand('"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --wait'), {
    command: '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
    args: ['--wait'],
  });
});

test('parseEditorCommand preserves backslashes in quoted Windows paths', () => {
  assert.deepEqual(parseEditorCommand('"C:\\Program Files\\Neovim\\bin\\nvim.exe" --wait'), {
    command: 'C:\\Program Files\\Neovim\\bin\\nvim.exe',
    args: ['--wait'],
  });
});

test('parseEditorCommand preserves empty quoted arguments', () => {
  assert.deepEqual(parseEditorCommand('emacsclient -c -a ""'), {
    command: 'emacsclient',
    args: ['-c', '-a', ''],
  });
});

test('parseEditorCommand rejects shell metacharacters', () => {
  assert.throws(() => parseEditorCommand('vim; rm -rf /tmp/test'), /Unsafe EDITOR value/);
  assert.throws(() => parseEditorCommand('vim && echo hacked'), /Unsafe EDITOR value/);
  assert.throws(() => parseEditorCommand('"" --wait'), /EDITOR must include an executable name/);
});

test('createTempWorkspace uses a unique temp directory and cleans it up', () => {
  const workspace = createTempWorkspace('gcg-test-', 'message body');

  try {
    assert.equal(fs.existsSync(workspace.dirPath), true);
    assert.equal(fs.existsSync(workspace.filePath), true);
    assert.equal(fs.readFileSync(workspace.filePath, 'utf8'), 'message body');
    assert.equal(path.dirname(workspace.filePath), workspace.dirPath);
  } finally {
    cleanupTempWorkspace(workspace);
  }

  assert.equal(fs.existsSync(workspace.filePath), false);
  assert.equal(fs.existsSync(workspace.dirPath), false);
});

test('buildEditorLaunch uses cmd.exe for .cmd editors on Windows', () => {
  const launch = buildEditorLaunch('code.cmd --wait', 'C:\\Temp\\message.txt', {
    platform: 'win32',
    env: { ComSpec: 'C:\\Windows\\System32\\cmd.exe' },
  });

  assert.equal(launch.command, 'C:\\Windows\\System32\\cmd.exe');
  assert.deepEqual(launch.args.slice(0, 3), ['/d', '/s', '/c']);
  assert.match(launch.args[3], /code\.cmd/);
  assert.match(launch.args[3], /message\.txt/);
  assert.equal(launch.options.shell, false);
  assert.equal(launch.options.windowsVerbatimArguments, true);
});

test('buildEditorLaunch also uses cmd.exe for extensionless Windows editor commands', () => {
  const launch = buildEditorLaunch('code --wait', 'C:\\Temp\\message.txt', {
    platform: 'win32',
    env: { ComSpec: 'C:\\Windows\\System32\\cmd.exe' },
  });

  assert.equal(launch.command, 'C:\\Windows\\System32\\cmd.exe');
  assert.deepEqual(launch.args.slice(0, 3), ['/d', '/s', '/c']);
  assert.match(launch.args[3], /code/);
  assert.match(launch.args[3], /message\.txt/);
});
