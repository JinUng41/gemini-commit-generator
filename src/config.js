const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = {
  autoStage: false,
  historyCount: 5,
  notifyOnComplete: true,
  strictBranchCheck: true,
  fetchBeforeSyncCheck: false,
};

const KNOWN_KEYS = new Set(Object.keys(DEFAULT_CONFIG));

function normalizeConfigValue(key, value, t) {
  if (key === 'historyCount') {
    if (!Number.isInteger(value)) {
      return {
        value: DEFAULT_CONFIG.historyCount,
        warning: t.configInvalidValue(key, JSON.stringify(DEFAULT_CONFIG.historyCount)),
      };
    }

    if (value < 5) {
      return {
        value: 5,
        warning: t.configHistoryClamp(5),
      };
    }

    return { value };
  }

  if (typeof DEFAULT_CONFIG[key] === 'boolean') {
    if (typeof value !== 'boolean') {
      return {
        value: DEFAULT_CONFIG[key],
        warning: t.configInvalidValue(key, JSON.stringify(DEFAULT_CONFIG[key])),
      };
    }

    return { value };
  }

  return { value: DEFAULT_CONFIG[key] };
}

function normalizeConfigObject(rawConfig, t) {
  const warnings = [];
  const config = { ...DEFAULT_CONFIG };

  if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
    warnings.push(t.configNotObject('.gcgrc.json'));
    return { config, warnings };
  }

  for (const key of Object.keys(rawConfig)) {
    if (!KNOWN_KEYS.has(key)) {
      warnings.push(t.configUnknownKey(key));
      continue;
    }

    const normalized = normalizeConfigValue(key, rawConfig[key], t);
    config[key] = normalized.value;
    if (normalized.warning) {
      warnings.push(normalized.warning);
    }
  }

  return { config, warnings };
}

function loadConfig(gitRoot, t) {
  const configPath = path.join(gitRoot, '.gcgrc.json');

  if (!fs.existsSync(configPath)) {
    return {
      config: { ...DEFAULT_CONFIG },
      warnings: [],
      configPath,
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const normalized = normalizeConfigObject(parsed, t);
    return {
      config: normalized.config,
      warnings: normalized.warnings,
      configPath,
    };
  } catch (error) {
    return {
      config: { ...DEFAULT_CONFIG },
      warnings: [t.configInvalidJson(configPath)],
      configPath,
    };
  }
}

module.exports = {
  DEFAULT_CONFIG,
  normalizeConfigObject,
  loadConfig,
};
