function parseCliArgs(argv = []) {
  if (!argv || argv.length === 0) {
    return { command: 'run' };
  }

  if (argv.length === 1 && (argv[0] === 'help' || argv[0] === '-h' || argv[0] === '--help')) {
    return { command: 'help' };
  }

  if (argv.length === 1 && (argv[0] === 'version' || argv[0] === '-v' || argv[0] === '--version')) {
    return { command: 'version' };
  }

  if (argv.length === 1 && argv[0] === 'config') {
    return { command: 'config' };
  }

  return {
    command: 'invalid',
    error: `Unknown command: ${argv.join(' ')}`,
  };
}

module.exports = {
  parseCliArgs,
};
