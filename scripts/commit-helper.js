#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

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

function parseArgs(argv) {
  const options = {
    preview: false,
    planFile: null,
    skipPush: false,
    dryRun: false,
    remote: 'origin',
    help: false,
  };

  const args = argv.slice(2);
  let helpRequested = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--preview' || arg === '-p') {
      options.preview = true;
    } else if (arg.startsWith('--plan-file=')) {
      options.planFile = arg.slice('--plan-file='.length);
    } else if (arg === '--plan-file') {
      i += 1;
      if (i >= args.length) {
        throw new Error('--plan-file requires a value.');
      }
      options.planFile = args[i];
    } else if (arg === '--skip-push') {
      options.skipPush = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--remote=')) {
      options.remote = arg.slice('--remote='.length);
    } else if (arg === '--remote') {
      i += 1;
      if (i >= args.length) {
        throw new Error('--remote requires a value.');
      }
      options.remote = args[i];
    } else if (arg === '--help' || arg === '-h') {
      helpRequested = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (helpRequested) {
    options.help = true;
    return options;
  }

  if (!options.preview && !options.planFile) {
    options.preview = true;
  }

  if (options.preview && options.planFile) {
    throw new Error('Cannot use --preview with --plan-file.');
  }

  if (options.preview && (options.skipPush || options.dryRun || options.remote !== 'origin')) {
    throw new Error('--skip-push, --dry-run, and --remote require --plan-file.');
  }

  if (options.planFile && options.planFile.trim() === '') {
    throw new Error('--plan-file requires a non-empty path.');
  }

  if (options.remote.trim() === '') {
    throw new Error('--remote requires a non-empty name.');
  }

  return options;
}

let currentOptions = null;

function runGit(args, config = {}) {
  const { allowEmptyOutput = false, dryAction = false } = config;

  if (!currentOptions) {
    throw new Error('Internal error: options context not initialized.');
  }

  if (currentOptions.dryRun && dryAction) {
    console.log(`[DRY-RUN] git ${args.join(' ')}`);
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
  console.log('');
  console.log(`=== ${title} ===`);
  let result;
  try {
    result = producer();
  } catch (error) {
    throw error;
  }

  if (result === undefined || result === null) {
    console.log('(no output)');
    return;
  }

  if (Array.isArray(result)) {
    if (result.length === 0) {
      console.log('(no output)');
    } else {
      console.log(result.join('\n'));
    }
    return;
  }

  if (typeof result === 'string') {
    if (result.trim() === '') {
      console.log('(no output)');
    } else {
      console.log(result);
    }
    return;
  }

  console.log(String(result));
}

function getCurrentBranch() {
  const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], { allowEmptyOutput: true });
  return branch.trim();
}

function showPreview() {
  const branch = getCurrentBranch();
  console.log(`Current branch: ${branch}`);

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
    console.log('Working tree is clean. Nothing to commit.');
    return;
  }

  ensureNoStagedChanges();

  const initialBranch = getCurrentBranch();
  console.log(`Applying plan with ${plan.length} commit(s) on branch ${initialBranch}`);

  for (const entry of plan) {
    console.log('');
    console.log(`>> Preparing commit: ${entry.title}`);

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
      console.log(`Staged files (simulated):\n${stagedDescription}`);
    } else {
      const stagedFiles = runGit(['diff', '--cached', '--name-status'], { allowEmptyOutput: true });
      if (stagedFiles.trim() === '') {
        throw new Error(`No files staged for commit "${entry.title}". Ensure the paths are correct.`);
      }
      console.log(`Staged files:\n${stagedFiles}`);
    }

    const messageLines = [entry.title];
    if (entry.body.length > 0) {
      messageLines.push('');
      for (const line of entry.body) {
        messageLines.push(String(line));
      }
    }

    if (currentOptions.dryRun) {
      console.log(`[DRY-RUN] git commit --file <temporary-message>`);
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
    console.log('Skipping push as requested.');
  } else if (currentOptions.dryRun) {
    console.log(`[DRY-RUN] git push ${currentOptions.remote} ${getCurrentBranch()}`);
  } else {
    const branch = getCurrentBranch();
    console.log('');
    console.log(`Pushing branch ${branch} to ${currentOptions.remote}`);
    runGit(['push', currentOptions.remote, branch]);
  }

  if (currentOptions.dryRun) {
    console.log('Dry run complete. Working tree state not changed.');
    return;
  }

  const remaining = runGit(['status', '--short'], { allowEmptyOutput: true }).trim();
  if (remaining !== '') {
    console.warn(`Working tree is not clean after applying the plan:\n${remaining}`);
  } else {
    console.log('All done. Working tree is clean.');
  }
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv);
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }

  if (options.help) {
    printUsage();
    return;
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
    console.error(error.message || error);
    process.exit(1);
  }
}

main();
