const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { DEFAULT_CONFIG, loadConfig, normalizeConfigObject } = require('../src/config');
const { STRINGS } = require('../src/ui');

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'gcg-config-'));
}

test('normalizeConfigObject clamps historyCount to 5', () => {
  const { config, warnings } = normalizeConfigObject({ historyCount: 3 }, STRINGS.en);
  assert.equal(config.historyCount, 5);
  assert.equal(warnings.length, 1);
});

test('normalizeConfigObject ignores unknown keys', () => {
  const { config, warnings } = normalizeConfigObject({ foo: true }, STRINGS.en);
  assert.deepEqual(config, DEFAULT_CONFIG);
  assert.equal(warnings.length, 1);
});

test('normalizeConfigObject keeps valid values', () => {
  const { config, warnings } = normalizeConfigObject({ autoStage: true }, STRINGS.en);
  assert.equal(config.autoStage, true);
  assert.deepEqual(warnings, []);
});

test('normalizeConfigObject warns for removed model key', () => {
  const { config, warnings } = normalizeConfigObject({ model: 'pro' }, STRINGS.en);
  assert.deepEqual(config, DEFAULT_CONFIG);
  assert.equal(warnings.length, 1);
});

test('loadConfig returns defaults when file is missing', () => {
  const gitRoot = makeTempRepo();

  try {
    const result = loadConfig(gitRoot, STRINGS.en);
    assert.deepEqual(result.config, DEFAULT_CONFIG);
    assert.deepEqual(result.warnings, []);
    assert.equal(result.configPath, path.join(gitRoot, '.gcgrc.json'));
  } finally {
    fs.rmSync(gitRoot, { recursive: true, force: true });
  }
});

test('loadConfig warns and falls back on invalid JSON', () => {
  const gitRoot = makeTempRepo();

  try {
    fs.writeFileSync(path.join(gitRoot, '.gcgrc.json'), '{ invalid json');
    const result = loadConfig(gitRoot, STRINGS.en);
    assert.deepEqual(result.config, DEFAULT_CONFIG);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /Could not parse/);
  } finally {
    fs.rmSync(gitRoot, { recursive: true, force: true });
  }
});

test('loadConfig warns and falls back when config is not an object', () => {
  const gitRoot = makeTempRepo();

  try {
    fs.writeFileSync(path.join(gitRoot, '.gcgrc.json'), JSON.stringify(['not', 'an', 'object']));
    const result = loadConfig(gitRoot, STRINGS.en);
    assert.deepEqual(result.config, DEFAULT_CONFIG);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0], /must contain a JSON object/);
  } finally {
    fs.rmSync(gitRoot, { recursive: true, force: true });
  }
});
