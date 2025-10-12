#!/usr/bin/env node

const BOOLEAN_TRUE = new Set(['true', '1', 'yes', 'on']);
const BOOLEAN_FALSE = new Set(['false', '0', 'no', 'off']);

const camelToKebab = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();

const normalizeAlias = (alias) => {
  if (!alias) {
    return [];
  }
  if (Array.isArray(alias)) {
    return alias;
  }
  return [alias];
};

const coerceBoolean = (raw, flagLabel, parserName) => {
  const value = String(raw).trim().toLowerCase();
  if (BOOLEAN_TRUE.has(value)) {
    return true;
  }
  if (BOOLEAN_FALSE.has(value)) {
    return false;
  }
  throw new Error(
    `${parserName}: invalid value for ${flagLabel}; expected true/false but received "${raw}"`
  );
};

function parseArgs(rawArgv, spec, options = {}) {
  const {
    allowPositionals = true,
    parserName = 'cli',
  } = options;

  const argv = Array.isArray(rawArgv) ? [...rawArgv] : [];
  const values = {};
  const seen = {};
  const positionals = [];

  const longFlagToKey = new Map();
  const shortFlagToKey = new Map();
  const optionConfig = {};

  for (const [key, originalConfig] of Object.entries(spec)) {
    const config = { ...originalConfig };
    const longFlag = config.flag || camelToKebab(key);
    const aliases = normalizeAlias(config.alias);

    optionConfig[key] = {
      ...config,
      flag: longFlag,
      alias: aliases,
    };

    longFlagToKey.set(`--${longFlag}`, key);
    for (const alias of aliases) {
      if (!alias || typeof alias !== 'string') {
        continue;
      }
      if (alias.length !== 1) {
        shortFlagToKey.set(`--${alias}`, key);
      }
      shortFlagToKey.set(`-${alias}`, key);
    }

    if (config.multiple && config.default === undefined) {
      values[key] = [];
    } else if (config.default !== undefined) {
      values[key] =
        config.multiple && Array.isArray(config.default)
          ? [...config.default]
          : config.default;
    }
    seen[key] = false;
  }

  while (argv.length > 0) {
    const token = argv.shift();
    if (token === '--') {
      positionals.push(...argv);
      break;
    }

    if (!token.startsWith('-') || token === '-') {
      if (!allowPositionals) {
        throw new Error(`${parserName}: unexpected positional argument "${token}"`);
      }
      positionals.push(token);
      continue;
    }

    let key;
    let option;
    let value;

    if (token.startsWith('--')) {
      const eqIndex = token.indexOf('=');
      const flagPart = eqIndex >= 0 ? token.slice(0, eqIndex) : token;
      key = longFlagToKey.get(flagPart) || shortFlagToKey.get(flagPart);
      if (!key) {
        throw new Error(`${parserName}: unknown option "${token}"`);
      }
      if (eqIndex >= 0) {
        value = token.slice(eqIndex + 1);
      }
    } else {
      if (token.length !== 2) {
        throw new Error(`${parserName}: unknown option "${token}"`);
      }
      key = shortFlagToKey.get(token);
      if (!key) {
        throw new Error(`${parserName}: unknown option "${token}"`);
      }
    }

    option = optionConfig[key];
    if (!option) {
      throw new Error(`${parserName}: unconfigured option for "${token}"`);
    }

    const flagLabel = `--${option.flag}`;
    seen[key] = true;

    if (option.type === 'bool') {
      if (value === undefined && argv.length > 0 && !argv[0].startsWith('-')) {
        const potential = argv[0];
        if (/^(?:true|false|1|0|yes|no|on|off)$/i.test(potential)) {
          value = argv.shift();
        }
      }
      if (value === undefined) {
        values[key] = true;
      } else {
        values[key] = coerceBoolean(value, flagLabel, parserName);
      }
      continue;
    }

    if (option.type === 'string') {
      if (value === undefined) {
        if (argv.length === 0) {
          throw new Error(`${parserName}: missing value for ${flagLabel}`);
        }
        value = argv.shift();
      }
      if (option.multiple) {
        if (!Array.isArray(values[key])) {
          values[key] = [];
        }
        values[key].push(value);
      } else {
        values[key] = value;
      }
      continue;
    }

    throw new Error(`${parserName}: unsupported option type "${option.type}" for ${flagLabel}`);
  }

  return { values, positionals, seen };
}

module.exports = {
  parseArgs,
};

