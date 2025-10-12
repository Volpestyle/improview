#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { createLogger } = require('./lib/node/logging');
const { parseArgs } = require('./lib/node/cli');

const logger = createLogger();

const ARG_SPEC = {
  preview: { type: 'bool', alias: ['p'], default: false },
  planFile: { type: 'string', flag: 'plan-file' },
  skipPush: { type: 'bool', flag: 'skip-push', default: false },
  dryRun: { type: 'bool', flag: 'dry-run', default: false },
  remote: { type: 'string', default: 'origin' },
  help: { type: 'bool', alias: ['h'], default: false },
};

function printUsage() {
  console.log(`Usage: node ./scripts/commit-helper.js [options]

Options:
  --preview                Show repository status, staged diff, working diff, and untracked files.
  --plan-file <path>       Apply commits based on the provided JSON plan.
  --skip-push              Skip pushing the branch after applying the plan (plan mode only).
  --dry-run                Print the git commands that would run without executing them (plan mode only).
  --remote <name>          Git remote to push to (defaults to "origin", plan mode only).
  -h, --help               Show this help message.`);
}

let currentOptions = null;

function runGit(args, config = {}) {
  const { allowEmptyOutput = false, dryAction = false } = config;

  if (!currentOptions) {
    throw new Error('Internal error: options context not initialized.');
  }

  if (currentOptions.dryRun && dryAction) {
    logger.info(`[DRY-RUN] git ${args.join(' ')}`);
    return '';
  }

  const result = spawnSync('git', args, { cwd: process.cwd(), encoding: 'utf8' });
  if (result.error) {
    throw new Error(`git ${args.join(' ')} failed: ${result.error.message}`);
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    const combined = `${result.stdout || ''}${result.stderr || ''}`;
    throw new Error(`git ${args.join(' ')} failed with exit code ${result.status}\n${combined}`.trim());
  }

  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (!allowEmptyOutput && output.trim() === '') {
    return '';
  }

  return output.trimEnd();
}

function runSection(title, producer) {
  logger.raw('');
  logger.step(title);
  let result;
  try {
    result = producer();
  } catch (error) {
    throw error;
  }

  if (result === undefined || result === null) {
    logger.raw('(no output)');
    return;
  }

  if (Array.isArray(result)) {
    if (result.length === 0) {
      logger.raw('(no output)');
    } else {
      logger.raw(result.join('\n'));
    }
    return;
  }

  if (typeof result === 'string') {
    if (result.trim() === '') {
      logger.raw('(no output)');
    } else {
      logger.raw(result);
    }
    return;
  }

  logger.raw(String(result));
}

function getCurrentBranch() {
  const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], { allowEmptyOutput: true });
  return branch.trim();
}

function showPreview() {
  const branch = getCurrentBranch();
  logger.info(`Current branch: ${branch}`);

  runSection('git status --short --branch', () =>
    runGit(['status', '--short', '--branch'], { allowEmptyOutput: true })
  );

  runSection('Staged diff (git diff --cached)', () => {
    const diff = runGit(['diff', '--cached'], { allowEmptyOutput: true });
    return diff.trim() === '' ? '(no staged changes)' : diff;
  });

  runSection('Working diff (git diff)', () => {
    const diff = runGit(['diff'], { allowEmptyOutput: true });
    return diff.trim() === '' ? '(no working tree changes)' : diff;
  });

  runSection('Untracked files', () => {
    const untracked = runGit(['ls-files', '--others', '--exclude-standard'], { allowEmptyOutput: true });
    return untracked.trim() === '' ? '(none)' : untracked;
  });
}

function normalizePlan(planObject) {
  if (planObject === null || planObject === undefined) {
    throw new Error('Plan file is empty or could not be parsed.');
  }

  const entries = Array.isArray(planObject) ? planObject : [planObject];
  const normalized = [];

  for (const entry of entries) {
    const titleRaw = entry.title ?? entry.Title;
    if (typeof titleRaw !== 'string' || titleRaw.trim() === '') {
      throw new Error('Each plan entry must include a "title" property.');
    }
    const title = titleRaw.trim();

    const pathsRaw = entry.paths ?? entry.Paths;
    if (pathsRaw === undefined || pathsRaw === null) {
      throw new Error(`Plan entry "${title}" is missing a "paths" array.`);
    }

    let paths = [];
    if (Array.isArray(pathsRaw)) {
      paths = pathsRaw
        .map((item) => (item === null || item === undefined ? '' : String(item).trim()))
        .filter((item) => item !== '');
    } else if (typeof pathsRaw === 'string') {
      const trimmed = pathsRaw.trim();
      if (trimmed !== '') {
        paths = [trimmed];
      }
    } else {
      throw new Error(`Plan entry "${title}" has an unsupported "paths" value.`);
    }

    if (paths.length === 0) {
      throw new Error(`Plan entry "${title}" must specify at least one path.`);
    }

    const bodyRaw = entry.body ?? entry.Body;
    const body = [];
    if (bodyRaw !== undefined && bodyRaw !== null) {
      if (Array.isArray(bodyRaw)) {
        for (const line of bodyRaw) {
          body.push(String(line ?? ''));
        }
      } else if (typeof bodyRaw === 'string') {
        if (bodyRaw.trim() !== '') {
          body.push(bodyRaw);
        }
      } else {
        throw new Error(`Plan entry "${title}" has an unsupported "body" value.`);
      }
    }

    normalized.push({ title, paths, body });
  }

  return normalized;
}

function ensureNoStagedChanges() {
  const staged = runGit(['diff', '--cached', '--name-only'], { allowEmptyOutput: true }).trim();
  if (staged !== '') {
    throw new Error(
      "Staging area is not clean. Run 'git reset' or review staged files before using the plan mode.\nCurrently staged:\n" +
        staged
    );
  }
}

function createTempMessageFile(content) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'commit-helper-'));
  const tempFile = path.join(tempDir, 'message.txt');
  fs.writeFileSync(tempFile, `${content}\n`, 'utf8');
  return { tempDir, tempFile };
}

function removeTempDirectory(directory) {
  try {
    fs.rmSync(directory, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}

function applyPlan(planFilePath) {
  const resolvedPlanPath = path.resolve(process.cwd(), planFilePath);
  if (!fs.existsSync(resolvedPlanPath)) {
    throw new Error(`Plan file not found: ${planFilePath}`);
  }

  const planJson = fs.readFileSync(resolvedPlanPath, 'utf8');
  let parsedPlan;
  try {
    parsedPlan = JSON.parse(planJson);
  } catch (error) {
    throw new Error(`Failed to parse plan JSON: ${error.message}`);
  }

  const plan = normalizePlan(parsedPlan);
  if (plan.length === 0) {
    throw new Error('Plan file does not contain any entries.');
  }

  const status = runGit(['status', '--porcelain'], { allowEmptyOutput: true }).trim();
  if (status === '') {
    logger.success('Working tree is clean. Nothing to commit.');
    return;
  }

  ensureNoStagedChanges();

  const initialBranch = getCurrentBranch();
  logger.step(`Applying plan with ${plan.length} commit(s) on branch ${initialBranch}`);

  for (const entry of plan) {
    logger.raw('');
    logger.step(`Preparing commit: ${entry.title}`);

    runGit(['reset'], { dryAction: true });

    if (entry.paths.length === 1 && entry.paths[0].toLowerCase() === 'all') {
      runGit(['add', '--all'], { dryAction: true });
    } else {
      for (const rawPath of entry.paths) {
        const trimmed = rawPath.trim();
        if (trimmed === '') {
          continue;
        }
        runGit(['add', '--', trimmed], { dryAction: true });
      }
    }

    if (currentOptions.dryRun) {
      const stagedDescription =
        entry.paths.length === 1 && entry.paths[0].toLowerCase() === 'all'
          ? '(all changes in working tree)'
          : entry.paths.join('\n');
      logger.info(`Staged files (simulated):\n${stagedDescription}`);
    } else {
      const stagedFiles = runGit(['diff', '--cached', '--name-status'], { allowEmptyOutput: true });
      if (stagedFiles.trim() === '') {
        throw new Error(`No files staged for commit "${entry.title}". Ensure the paths are correct.`);
      }
      logger.info(`Staged files:\n${stagedFiles}`);
    }

    const messageLines = [entry.title];
    if (entry.body.length > 0) {
      messageLines.push('');
      for (const line of entry.body) {
        messageLines.push(String(line));
      }
    }

    if (currentOptions.dryRun) {
      logger.info('[DRY-RUN] git commit --file <temporary-message>');
      continue;
    }

    const { tempDir, tempFile } = createTempMessageFile(messageLines.join('\n'));
    try {
      runGit(['commit', '--file', tempFile]);
    } finally {
      removeTempDirectory(tempDir);
    }
  }

  if (currentOptions.skipPush) {
    logger.info('Skipping push as requested.');
  } else if (currentOptions.dryRun) {
    logger.info(`[DRY-RUN] git push ${currentOptions.remote} ${getCurrentBranch()}`);
  } else {
    const branch = getCurrentBranch();
    logger.raw('');
    logger.step(`Pushing branch ${branch} to ${currentOptions.remote}`);
    runGit(['push', currentOptions.remote, branch]);
  }

  if (currentOptions.dryRun) {
    logger.info('Dry run complete. Working tree state not changed.');
    return;
  }

  const remaining = runGit(['status', '--short'], { allowEmptyOutput: true }).trim();
  if (remaining !== '') {
    logger.warn(`Working tree is not clean after applying the plan:\n${remaining}`);
  } else {
    logger.success('All done. Working tree is clean.');
  }
}

function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2), ARG_SPEC, {
      allowPositionals: false,
      parserName: 'commit-helper',
    });
  } catch (error) {
    logger.error(error.message || error);
    process.exit(1);
  }

  const { values, seen } = parsed;

  const options = {
    preview: Boolean(values.preview),
    planFile: values.planFile,
    skipPush: Boolean(values.skipPush),
    dryRun: Boolean(values.dryRun),
    remote: values.remote,
    help: Boolean(values.help),
  };

  if (!seen.preview && !options.planFile) {
    options.preview = true;
  }

  if (options.help) {
    printUsage();
    return;
  }

  if (options.preview && options.planFile) {
    logger.error('Cannot use --preview with --plan-file.');
    process.exit(1);
  }

  if (options.preview && (options.skipPush || options.dryRun || options.remote !== 'origin')) {
    logger.error('--skip-push, --dry-run, and --remote require --plan-file.');
    process.exit(1);
  }

  if (options.planFile && options.planFile.trim() === '') {
    logger.error('--plan-file requires a non-empty path.');
    process.exit(1);
  }

  if (options.remote.trim() === '') {
    logger.error('--remote requires a non-empty name.');
    process.exit(1);
  }

  currentOptions = options;

  try {
    if (options.preview) {
      showPreview();
    } else if (options.planFile) {
      applyPlan(options.planFile);
    } else {
      throw new Error('No operation specified.');
    }
  } catch (error) {
    logger.error(error.message || error);
    process.exit(1);
  }
}

main();
