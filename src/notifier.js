function notifyComplete(config) {
  if (!config.notifyOnComplete) {
    return;
  }

  process.stdout.write('\x07');
}

module.exports = {
  notifyComplete,
};
