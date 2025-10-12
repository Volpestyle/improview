#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dotenv = require('dotenv');

// Configuration
const GITHUB_REPO = 'your-username/improview'; // Replace with your actual repo (e.g., 'jamesvolpe/improview')
const DRY_RUN = false; // Set to true to preview without actually setting secrets

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

// Function to set a GitHub secret
function setGitHubSecret(name, value) {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would set secret: ${name} = ${value.slice(0, 10)}...`);
    return;
  }
  try {
    execSync(`gh secret set ${name} -R ${GITHUB_REPO} --body "${value.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
    console.log(`✓ Set secret: ${name}`);
  } catch (error) {
    console.error(`✗ Failed to set secret ${name}: ${error.message}`);
  }
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

  const processedSecrets = new Set();

  for (const file of envFiles) {
    const config = dotenv.parse(fs.readFileSync(file));
    for (const [key, value] of Object.entries(config)) {
      if (processedSecrets.has(key)) {
        console.log(`Skipping duplicate secret: ${key}`);
        continue;
      }
      setGitHubSecret(key, value);
      processedSecrets.add(key);
    }
  }

  console.log('Sync complete!');
}

main();
```

<file_path>
improview/scripts/sync-env-to-github.js
</file_path>

<edit_description>
Add sync-env-to-github.js script to automate uploading .env variables to GitHub secrets.
</edit_description>
