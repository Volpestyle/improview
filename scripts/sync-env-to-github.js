#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createLogger } = require('./lib/node/logging');

const DEFAULT_REPO = 'volpestyle/improview';
const DEFAULT_ENV = process.env.GITHUB_DEFAULT_ENV || 'dev';

const EXCLUDED_KEYS = new Set();
const EXCLUDED_PREFIXES = [];
const EXCLUDED_SUFFIXES = ['_API_KEY'];

const VALID_SCOPES = new Set(['repo', 'env', 'all']);

let logger = createLogger();

function printUsage() {
  logger.raw(`Usage: node ./scripts/sync-env-to-github.js [options]

Options:
  --env <name>             GitHub environment to target (default: ${DEFAULT_ENV}).
  --scope <value>          Scope to manage: repo, env, or all (comma-separated). Default: all.
  --repo <owner/name>      GitHub repository (default: ${DEFAULT_REPO}).
  --dry-run[=true|false]   Preview changes (default: true). Pass --dry-run=false to apply.
  --apply                  Alias for --dry-run=false.
  --debug                  Enable verbose logging.
  -h, --help               Show this help message.

Examples:
  # Preview repo-level changes only
  node ./scripts/sync-env-to-github.js

  # Preview repo + dev environment changes
  node ./scripts/sync-env-to-github.js --env dev --scope all

  # Apply repo + dev updates after preview
  node ./scripts/sync-env-to-github.js --env dev --scope all --apply
`);
}

function parseArgs(argv) {
  const options = {
    env: DEFAULT_ENV,
    scopes: new Set(),
    apply: false,
    debug: false,
    repo: DEFAULT_REPO,
    help: false,
  };
  let scopesProvided = false;
  let dryRunOverride = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--env':
        i += 1;
        if (i >= argv.length) {
          throw new Error('--env requires a value.');
        }
        options.env = argv[i];
        break;
      case '--env=false':
      case '--env=':
        throw new Error('--env requires a non-empty value.');
      default:
        if (arg.startsWith('--env=')) {
          const value = arg.split('=', 2)[1];
          if (!value) {
            throw new Error('--env requires a non-empty value.');
          }
          options.env = value;
          break;
        }
    }

    if (arg === '--env' || arg.startsWith('--env=')) {
      continue;
    }

    switch (arg) {
      case '--scope': {
        i += 1;
        if (i >= argv.length) {
          throw new Error('--scope requires a value.');
        }
        const raw = argv[i].split(',');
        scopesProvided = true;
        raw.forEach((scope) => {
          const trimmed = scope.trim().toLowerCase();
          if (!VALID_SCOPES.has(trimmed)) {
            throw new Error(`Unsupported scope "${scope}". Expected repo, env, or all.`);
          }
          if (trimmed === 'all') {
            options.scopes.add('repo');
            options.scopes.add('env');
          } else {
            options.scopes.add(trimmed);
          }
        });
        break;
      }
      case '--scope=':
        throw new Error('--scope requires a value.');
      case '--scope=all':
        scopesProvided = true;
        options.scopes.add('repo');
        options.scopes.add('env');
        break;
      default:
        if (arg.startsWith('--scope=')) {
          const value = arg.split('=', 2)[1];
          if (!value) {
            throw new Error('--scope requires a value.');
          }
          scopesProvided = true;
          value.split(',').forEach((scope) => {
            const trimmed = scope.trim().toLowerCase();
            if (!VALID_SCOPES.has(trimmed)) {
              throw new Error(`Unsupported scope "${scope}". Expected repo, env, or all.`);
            }
            if (trimmed === 'all') {
              options.scopes.add('repo');
              options.scopes.add('env');
            } else {
              options.scopes.add(trimmed);
            }
          });
          break;
        }
    }

    if (arg === '--scope' || arg.startsWith('--scope=')) {
      continue;
    }

    switch (arg) {
      case '--repo':
        i += 1;
        if (i >= argv.length) {
          throw new Error('--repo requires a value.');
        }
        options.repo = argv[i];
        break;
      case '--repo=':
        throw new Error('--repo requires a value.');
      default:
        if (arg.startsWith('--repo=')) {
          const value = arg.split('=', 2)[1];
          if (!value) {
            throw new Error('--repo requires a value.');
          }
          options.repo = value;
          break;
        }
    }

    if (arg === '--repo' || arg.startsWith('--repo=')) {
      continue;
    }

    switch (arg) {
      case '--apply':
        options.apply = true;
        break;
      case '--dry-run': {
        let value = 'true';
        if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
          value = argv[i + 1];
          i += 1;
        }
        dryRunOverride = value;
        break;
      }
      default:
        if (arg.startsWith('--dry-run=')) {
          dryRunOverride = arg.split('=', 2)[1];
          break;
        }
    }

    if (arg === '--apply' || arg === '--dry-run' || arg.startsWith('--dry-run=')) {
      continue;
    }

    switch (arg) {
      case '--debug':
        options.debug = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!scopesProvided) {
    options.scopes.add('repo');
    options.scopes.add('env');
  }

  if (options.scopes.size === 0) {
    options.scopes.add('repo');
  }

  if (options.scopes.has('env') && !options.env) {
    throw new Error('--env is required when --scope includes env.');
  }

  if (dryRunOverride !== null) {
    const normalized = String(dryRunOverride).trim().toLowerCase();
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      options.apply = true;
    } else {
      options.apply = false;
    }
  }

  return options;
}

function ensureBinary(binary) {
  const result = spawnSync('which', [binary], { stdio: 'ignore' });
  if (result.status !== 0) {
    throw new Error(`Missing required command: ${binary}. Please install it and retry.`);
  }
}

function logDebug(...args) {
  logger.debug(args.join(' '));
}

function shouldSync(name, value) {
  if (EXCLUDED_KEYS.has(name)) {
    return false;
  }
  if (EXCLUDED_PREFIXES.some((prefix) => name.startsWith(prefix))) {
    return false;
  }
  if (EXCLUDED_SUFFIXES.some((suffix) => name.endsWith(suffix))) {
    return false;
  }
  const trimmed =
    typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
  return trimmed.length > 0;
}

function findEnvFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item === 'node_modules' || item === '.git') {
      continue;
    }
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !item.startsWith('.')) {
      findEnvFiles(fullPath, files);
    } else if (item.match(/^\.env/) && item !== '.env.example') {
      files.push(fullPath);
    }
  }
  return files;
}

function parseEnvWithSections(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const sections = { repoSecrets: {}, repoVars: {}, envSecrets: {}, envVars: {}, dontSync: {} };
  let currentSection = 'envSecrets';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '# REPO SECRETS') {
      currentSection = 'repoSecrets';
    } else if (trimmed === '# REPO') {
      currentSection = 'repoSecrets';
    } else if (trimmed === '# VARS') {
      currentSection = 'repoVars';
    } else if (trimmed === '# SECRETS') {
      currentSection = 'envSecrets';
    } else if (trimmed === '# ENV VARS') {
      currentSection = 'envVars';
    } else if (trimmed.toUpperCase().startsWith('# DONT SYNC')) {
      currentSection = 'dontSync';
    } else if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      if (sections[currentSection]) {
        sections[currentSection][key.trim()] = value;
      }
    }
  }
  logDebug(`Parsed sections from ${filePath}: ${JSON.stringify(sections, null, 2)}`);
  return sections;
}

function recordEntry(collection, key, value, filePath) {
  if (!collection.has(key)) {
    collection.set(key, { value, sources: new Set([filePath]) });
  } else {
    collection.get(key).sources.add(filePath);
  }
}

function collectPlan(envFiles) {
  const plan = {
    repoSecrets: new Map(),
    repoVars: new Map(),
    envSecrets: new Map(),
    envVars: new Map(),
    duplicates: [],
    excluded: [],
  };

  const processed = new Set();

  for (const file of envFiles) {
    const sections = parseEnvWithSections(file);

    const processSection = (entries, target) => {
      for (const [key, value] of Object.entries(entries)) {
        if (!shouldSync(key, value)) {
          plan.excluded.push({ key, file });
          continue;
        }
        const processedKey = `${target}:${key}`;
        if (processed.has(processedKey)) {
          plan.duplicates.push({ key, file, scope: target });
          continue;
        }
        processed.add(processedKey);
        recordEntry(plan[target], key, value, file);
      }
    };

    processSection(sections.repoSecrets, 'repoSecrets');
    processSection(sections.repoVars, 'repoVars');
    processSection(sections.envSecrets, 'envSecrets');
    processSection(sections.envVars, 'envVars');

    for (const key of Object.keys(sections.dontSync || {})) {
      plan.excluded.push({ key, file, reason: 'marked with # DONT SYNC' });
    }
  }

  return plan;
}

function runGhWithOutput(args, envName) {
  const result = spawnSync('gh', args, { encoding: 'utf8' });
  if (result.error) {
    throw new Error(`gh ${args.join(' ')} failed: ${result.error.message}`);
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(
      `gh ${args.join(' ')} failed with exit code ${result.status}\n${(result.stderr || '').trim()}`,
    );
  }
  logDebug(`gh ${args.join(' ')} ${envName ? `(env: ${envName})` : ''}\n${result.stdout}`);
  return (result.stdout || '').trim();
}

function listGhSecrets(repo, envName) {
  const args = ['secret', 'list', '-R', repo];
  if (envName) {
    args.push('-e', envName);
  }
  const output = runGhWithOutput(args, envName);
  if (!output) {
    return [];
  }
  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return [];
  }
  if (lines[0].startsWith('NAME')) {
    lines.shift();
  }
  return lines.map((line) => line.split(/\s+/)[0]);
}

function listGhVars(repo, envName) {
  const args = ['variable', 'list', '-R', repo];
  if (envName) {
    args.push('-e', envName);
  }
  const output = runGhWithOutput(args, envName);
  if (!output) {
    return [];
  }
  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return [];
  }
  if (lines[0].startsWith('NAME')) {
    lines.shift();
  }
  return lines.map((line) => line.split(/\s+/)[0]);
}

function runGh(args, options) {
  if (!options.apply) {
    logger.info(`[DRY-RUN] gh ${args.join(' ')}`);
    return;
  }
  const result = spawnSync('gh', args, { stdio: 'inherit' });
  if (result.error) {
    throw new Error(`gh ${args.join(' ')} failed: ${result.error.message}`);
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`gh ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function wipeCollection(type, names, options, envName) {
  if (names.length === 0) {
    logger.info(`No ${type} to delete ${envName ? `in ${envName}` : 'at repo level'}.`);
    return;
  }

  const target = envName ? `in '${envName}'` : 'at repo level';
  logger.step(`Deleting ${names.length} ${type} ${target}`);
  for (const name of names) {
    const args =
      type === 'secrets'
        ? ['secret', 'remove', name, '-R', options.repo]
        : ['variable', 'delete', name, '-R', options.repo];
    if (envName) {
      args.push('-e', envName);
    }
    runGh(args, options);
  }
}

function setCollection(type, entries, options, envName) {
  if (entries.size === 0) {
    logger.info(`No ${type} to set ${envName ? `in ${envName}` : 'at repo level'}.`);
    return;
  }

  const target = envName ? `in '${envName}'` : 'at repo level';
  logger.step(`Setting ${entries.size} ${type} ${target}`);

  for (const [key, data] of entries.entries()) {
    const args =
      type === 'secrets'
        ? ['secret', 'set', key, '-R', options.repo]
        : ['variable', 'set', key, '-R', options.repo];
    if (envName) {
      args.push('-e', envName);
    }
    args.push('--body', data.value);
    if (!options.apply) {
      logger.info(
        `[DRY-RUN] set ${type.slice(0, -1)} ${key} ${envName ? `in '${envName}'` : 'at repo level'} ` +
          `(sources: ${Array.from(data.sources).join(', ')}, value: ${maskValue(data.value)})`,
      );
      continue;
    }
    const result = spawnSync('gh', args, { stdio: 'inherit' });
    if (result.error) {
      throw new Error(`Failed to set ${type.slice(0, -1)} ${key}: ${result.error.message}`);
    }
    if (typeof result.status === 'number' && result.status !== 0) {
      throw new Error(
        `Failed to set ${type.slice(0, -1)} ${key}: ${(result.stderr || '').trim() || 'unknown error'}`,
      );
    }
  }
}

function maskValue(value) {
  if (!value) {
    return '(empty)';
  }
  if (value.length <= 6) {
    return `${value.slice(0, 2)}***`;
  }
  return `${value.slice(0, 3)}***${value.slice(-2)}`;
}

function formatPlanSection(title, entries) {
  if (entries.size === 0) {
    logger.info(`${title}: (none)`);
    return;
  }
  logger.info(title);
  for (const [key, data] of entries.entries()) {
    logger.info(
      `  ${key} ← ${maskValue(data.value)} (sources: ${Array.from(data.sources).join(', ')})`,
    );
  }
}

function printPlan(plan, state, options) {
  logger.step('Planned updates');
  if (options.scopes.has('repo')) {
    formatPlanSection('Repo secrets to set', plan.repoSecrets);
    formatPlanSection('Repo variables to set', plan.repoVars);
    logger.info(
      `Repo secrets currently present: ${state.repo.secrets.length ? state.repo.secrets.join(', ') : '(none)'}`,
    );
    logger.info(
      `Repo variables currently present: ${state.repo.vars.length ? state.repo.vars.join(', ') : '(none)'}`,
    );
  }

  if (options.scopes.has('env')) {
    formatPlanSection(`Environment '${options.env}' secrets to set`, plan.envSecrets);
    formatPlanSection(`Environment '${options.env}' variables to set`, plan.envVars);
    logger.info(
      `Environment '${options.env}' secrets currently present: ${
        state.env.secrets.length ? state.env.secrets.join(', ') : '(none)'
      }`,
    );
    logger.info(
      `Environment '${options.env}' variables currently present: ${
        state.env.vars.length ? state.env.vars.join(', ') : '(none)'
      }`,
    );
  }

  if (plan.duplicates.length > 0) {
    logger.warn(
      `Skipped ${plan.duplicates.length} duplicate entries: ${plan.duplicates
        .map((item) => `${item.key} (${item.scope}) from ${item.file}`)
        .join(', ')}`,
    );
  }

  if (plan.excluded.length > 0) {
    logger.warn(
      `Skipped ${plan.excluded.length} excluded/empty entries: ${plan.excluded
        .map((item) => `${item.key} from ${item.file}${item.reason ? ` (${item.reason})` : ''}`)
        .join(', ')}`,
    );
  }

  logger.info(
    options.apply
      ? 'Apply mode enabled: secrets and variables will be wiped then recreated.'
      : 'Dry run mode: no changes will be made.',
  );
}

function inspectCurrentState(options) {
  const state = {
    repo: { secrets: [], vars: [] },
    env: { secrets: [], vars: [] },
  };
  if (options.scopes.has('repo')) {
    state.repo.secrets = listGhSecrets(options.repo);
    state.repo.vars = listGhVars(options.repo);
  }
  if (options.scopes.has('env')) {
    state.env.secrets = listGhSecrets(options.repo, options.env);
    state.env.vars = listGhVars(options.repo, options.env);
  }
  return state;
}

function executePlan(plan, state, options) {
  if (options.scopes.has('repo')) {
    wipeCollection('secrets', state.repo.secrets, options);
    wipeCollection('variables', state.repo.vars, options);
    setCollection('secrets', plan.repoSecrets, options);
    setCollection('variables', plan.repoVars, options);
  }

  if (options.scopes.has('env')) {
    wipeCollection('secrets', state.env.secrets, options, options.env);
    wipeCollection('variables', state.env.vars, options, options.env);
    setCollection('secrets', plan.envSecrets, options, options.env);
    setCollection('variables', plan.envVars, options, options.env);
  }
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
      printUsage();
      return;
    }

    logger = createLogger({ debug: options.debug });
    ensureBinary('gh');

    const projectRoot = path.resolve(__dirname, '..');
    const envFiles = findEnvFiles(projectRoot);
    if (envFiles.length === 0) {
      logger.warn('No .env files found.');
      return;
    }

    logger.step(`Discovered ${envFiles.length} .env file(s)`);
    envFiles.forEach((file) => logger.debug(`  ${file}`));

    const plan = collectPlan(envFiles);
    const state = inspectCurrentState(options);

    printPlan(plan, state, options);

    if (!options.apply) {
      logger.warn('Dry run only. Re-run with --apply to push changes.');
      return;
    }

    executePlan(plan, state, options);
    logger.success('GitHub secrets and variables synced successfully.');
  } catch (error) {
    logger.error(error.message || error);
    process.exit(1);
  }
}

main();
