#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

// Configuration
const GITHUB_REPO = 'volpestyle/improview'; // Your actual repo
const DRY_RUN = false; // Set to false for actual syncing

const EXCLUDED_KEYS = new Set();

const EXCLUDED_PREFIXES = ['VITE_'];
const EXCLUDED_SUFFIXES = ['_API_KEY'];

function shouldSyncSecret(name, value) {
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
  if (trimmed.length === 0) {
    return false;
  }
  return true;
}

// Function to find all .env files recursively
function findEnvFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      findEnvFiles(fullPath, files);
    } else if (item.match(/^\.env/)) {
      files.push(fullPath);
    }
  }
  return files;
}

// Function to set a GitHub secret in a specific environment
function setGitHubSecret(name, value, environment = null) {
  if (DRY_RUN) {
    const target = environment ? `in '${environment}'` : 'at repo level';
    console.log(`[DRY RUN] Would set secret ${target}: ${name} = ${value.slice(0, 10)}...`);
    return;
  }
  try {
    const envFlag = environment ? `-e ${environment}` : '';
    execSync(
      `gh secret set ${name} -R ${GITHUB_REPO} ${envFlag} --body "${value.replace(/"/g, '\\"')}"`,
      {
        stdio: 'inherit',
      },
    );
    const target = environment ? `in '${environment}'` : 'at repo level';
    console.log(`✓ Set secret ${target}: ${name}`);
  } catch (error) {
    console.error(`✗ Failed to set secret ${name}: ${error.message}`);
  }
}

// Function to wipe secrets in a specific environment or repo level
function wipeSecrets(environment = null) {
  if (DRY_RUN) {
    const target = environment ? `in '${environment}' environment` : 'at repo level';
    console.log(`[DRY RUN] Would wipe secrets ${target}`);
    return;
  }
  try {
    const envFlag = environment ? `-e ${environment}` : '';
    const output = execSync(`gh secret list -R ${GITHUB_REPO} ${envFlag}`, { encoding: 'utf8' });
    const lines = output.trim().split('\n');
    if (lines.length > 1) {
      // Skip header if present
      lines.shift(); // Remove header
    }
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length > 0) {
        const secretName = parts[0].trim();
        if (secretName && secretName !== '') {
          execSync(`gh secret remove "${secretName}" -R ${GITHUB_REPO} ${envFlag}`, {
            stdio: 'inherit',
          });
          const target = environment ? `from '${environment}'` : 'from repo';
          console.log(`✓ Deleted secret ${target}: ${secretName}`);
        }
      }
    }
  } catch (error) {
    console.error(`Failed to wipe secrets: ${error.message}`);
  }
}

// Function to parse .env file with sections based on headers
function parseEnvWithSections(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const sections = { repo: {}, env: {} };
  let currentSection = 'env'; // Default to env
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '# REPO') {
      currentSection = 'repo';
    } else if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      sections[currentSection][key.trim()] = value;
    }
  }
  return sections;
}

// Main function
function main() {
  const projectRoot = path.resolve(__dirname, '..'); // Assuming script is in scripts/
  const envFiles = findEnvFiles(projectRoot);

  if (envFiles.length === 0) {
    console.log('No .env files found.');
    return;
  }

  console.log(`Found .env files: ${envFiles.join(', ')}`);

  console.log('Wiping existing secrets at repo level...');
  wipeSecrets(); // Wipe repo

  console.log("Wiping existing secrets in 'dev' environment...");
  wipeSecrets('dev'); // Wipe dev

  console.log('Setting new secrets...');

  const processedSecrets = new Set();

  for (const file of envFiles) {
    const sections = parseEnvWithSections(file);

    // Set env vars to 'dev' environment
    for (const [key, value] of Object.entries(sections.env)) {
      if (processedSecrets.has(key)) {
        console.log(`Skipping duplicate secret: ${key}`);
        continue;
      }
      if (!shouldSyncSecret(key, value)) {
        console.log(`Skipping excluded secret: ${key}`);
        continue;
      }
      setGitHubSecret(key, value, 'dev');
      processedSecrets.add(key);
    }

    // Set repo vars to repo level
    for (const [key, value] of Object.entries(sections.repo)) {
      if (processedSecrets.has(key)) {
        console.log(`Skipping duplicate secret: ${key}`);
        continue;
      }
      if (!shouldSyncSecret(key, value)) {
        console.log(`Skipping excluded secret: ${key}`);
        continue;
      }
      setGitHubSecret(key, value); // repo level
      processedSecrets.add(key);
    }
  }

  console.log('Sync complete!');
}

main();
