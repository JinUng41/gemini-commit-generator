const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  getGlobalConfigPath,
  loadGlobalSettings,
  resetGlobalLanguage,
  setGlobalLanguage,
} = require('../src/global-config');

function makeTempHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'gcg-home-'));
}

test('setGlobalLanguage creates settings file under ~/.config/gcg', () => {
  const homeDir = makeTempHome();

  try {
    const result = setGlobalLanguage('ko', { homeDir });
    const configPath = getGlobalConfigPath(homeDir);

    assert.equal(result.configPath, configPath);
    assert.equal(fs.existsSync(configPath), true);
    assert.deepEqual(JSON.parse(fs.readFileSync(configPath, 'utf8')), { language: 'ko' });
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test('loadGlobalSettings reads saved language', () => {
  const homeDir = makeTempHome();

  try {
    setGlobalLanguage('en', { homeDir });
    const result = loadGlobalSettings({ homeDir });

    assert.deepEqual(result.settings, { language: 'en' });
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test('resetGlobalLanguage deletes settings.json when it becomes empty', () => {
  const homeDir = makeTempHome();

  try {
    setGlobalLanguage('ko', { homeDir });
    const configPath = getGlobalConfigPath(homeDir);

    const result = resetGlobalLanguage({ homeDir });

    assert.deepEqual(result.settings, {});
    assert.equal(fs.existsSync(configPath), false);
    assert.equal(fs.existsSync(path.dirname(configPath)), true);
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});
