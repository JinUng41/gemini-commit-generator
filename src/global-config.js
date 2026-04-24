const fs = require('fs');
const os = require('os');
const path = require('path');

const SUPPORTED_LANGUAGES = new Set(['en', 'ko']);

function getGlobalConfigDir(homeDir = os.homedir()) {
  return path.join(homeDir, '.config', 'gcg');
}

function getGlobalConfigPath(homeDir = os.homedir()) {
  return path.join(getGlobalConfigDir(homeDir), 'settings.json');
}

function normalizeGlobalSettings(rawSettings) {
  if (!rawSettings || typeof rawSettings !== 'object' || Array.isArray(rawSettings)) {
    return {};
  }

  const settings = {};
  if (typeof rawSettings.language === 'string' && SUPPORTED_LANGUAGES.has(rawSettings.language)) {
    settings.language = rawSettings.language;
  }

  return settings;
}

function loadGlobalSettings(options = {}) {
  const fsImpl = options.fsImpl || fs;
  const configPath = options.configPath || getGlobalConfigPath(options.homeDir);

  if (!fsImpl.existsSync(configPath)) {
    return {
      settings: {},
      configPath,
    };
  }

  try {
    const parsed = JSON.parse(fsImpl.readFileSync(configPath, 'utf8'));
    return {
      settings: normalizeGlobalSettings(parsed),
      configPath,
    };
  } catch (error) {
    return {
      settings: {},
      configPath,
    };
  }
}

function saveGlobalSettings(settings, options = {}) {
  const fsImpl = options.fsImpl || fs;
  const configPath = options.configPath || getGlobalConfigPath(options.homeDir);
  const configDir = path.dirname(configPath);
  const normalizedSettings = normalizeGlobalSettings(settings);

  fsImpl.mkdirSync(configDir, { recursive: true });
  fsImpl.writeFileSync(configPath, `${JSON.stringify(normalizedSettings, null, 2)}\n`);

  return {
    settings: normalizedSettings,
    configPath,
  };
}

function setGlobalLanguage(language, options = {}) {
  if (!SUPPORTED_LANGUAGES.has(language)) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const current = loadGlobalSettings(options);
  return saveGlobalSettings({
    ...current.settings,
    language,
  }, options);
}

function resetGlobalLanguage(options = {}) {
  const fsImpl = options.fsImpl || fs;
  const current = loadGlobalSettings(options);
  const nextSettings = { ...current.settings };
  delete nextSettings.language;

  if (Object.keys(nextSettings).length === 0) {
    if (fsImpl.existsSync(current.configPath)) {
      fsImpl.unlinkSync(current.configPath);
    }

    return {
      settings: {},
      configPath: current.configPath,
    };
  }

  return saveGlobalSettings(nextSettings, options);
}

module.exports = {
  getGlobalConfigDir,
  getGlobalConfigPath,
  loadGlobalSettings,
  normalizeGlobalSettings,
  resetGlobalLanguage,
  saveGlobalSettings,
  setGlobalLanguage,
  SUPPORTED_LANGUAGES,
};
