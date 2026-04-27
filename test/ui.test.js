const test = require('node:test');
const assert = require('node:assert/strict');

const { STRINGS, selectLanguage } = require('../src/ui');

function createConsoleSpy() {
  const lines = [];

  return {
    lines,
    log: (...args) => {
      lines.push(args.join(' '));
    },
  };
}

function collectStringValues(value, values = []) {
  if (typeof value === 'string') {
    values.push(value);
    return values;
  }

  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) {
      collectStringValues(child, values);
    }
  }

  return values;
}

test('selectLanguage does not show numbered step labels', async () => {
  const consoleRef = createConsoleSpy();
  const answers = ['invalid', '2'];
  const question = async () => answers.shift();

  const selected = await selectLanguage(question, { consoleRef, showConfigHint: true });
  const output = consoleRef.lines.join('\n');

  assert.equal(selected, 'ko');
  assert.match(output, /Select Language \/ 언어 선택/);
  assert.doesNotMatch(output, /\bStep [1-4]\b/);
});

test('localized UI strings do not contain numbered step labels', () => {
  const strings = collectStringValues(STRINGS);

  for (const value of strings) {
    assert.doesNotMatch(value, /\bStep [1-4]\b/);
  }
});
