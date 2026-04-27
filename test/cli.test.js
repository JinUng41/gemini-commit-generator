const test = require('node:test');
const assert = require('node:assert/strict');

const { parseCliArgs } = require('../src/cli');

test('parseCliArgs supports help forms', () => {
  assert.deepEqual(parseCliArgs([]), { command: 'run' });
  assert.deepEqual(parseCliArgs(['help']), { command: 'help' });
  assert.deepEqual(parseCliArgs(['-h']), { command: 'help' });
  assert.deepEqual(parseCliArgs(['--help']), { command: 'help' });
});

test('parseCliArgs supports config command', () => {
  assert.deepEqual(parseCliArgs(['config']), { command: 'config' });
});

test('parseCliArgs supports version forms', () => {
  assert.deepEqual(parseCliArgs(['version']), { command: 'version' });
  assert.deepEqual(parseCliArgs(['-v']), { command: 'version' });
  assert.deepEqual(parseCliArgs(['--version']), { command: 'version' });
});

test('parseCliArgs rejects unknown arguments', () => {
  const result = parseCliArgs(['unknown']);

  assert.equal(result.command, 'invalid');
  assert.match(result.error, /Unknown command/);
});
