const test = require('node:test');
const assert = require('node:assert/strict');

const { DEFAULT_CONFIG, normalizeConfigObject } = require('../src/config');
const { STRINGS } = require('../src/ui');

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
