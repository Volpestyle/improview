#!/usr/bin/env node

const {
  SecretsManagerClient,
  GetSecretValueCommand,
  PutSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value =
      argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "true";
    options[key] = value;
    if (value !== "true") {
      i += 1;
    }
  }
  return options;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const envName = args.env || process.env.IMPROVIEW_ENV || "dev";
  const region =
    args.region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  if (!region) {
    console.error(
      "AWS region is required. Pass with --region or set AWS_REGION.",
    );
    process.exit(1);
  }

  const secretId = args["secret-id"] || `improview/${envName}/providers`;
  const openaiApiKey = args.openai || process.env.OPENAI_API_KEY;
  const grokApiKey = args.grok || process.env.GROK_API_KEY;

  const client = new SecretsManagerClient({ region });

  let existing = {};
  try {
    const current = await client.send(
      new GetSecretValueCommand({ SecretId: secretId }),
    );
    if (current.SecretString) {
      existing = JSON.parse(current.SecretString);
    }
  } catch (err) {
    if (err.name !== "ResourceNotFoundException") {
      throw err;
    }
    console.warn(
      `Secret ${secretId} was not found. It will be created implicitly.`,
    );
  }

  const nextSecret = {
    ...existing,
  };

  if (openaiApiKey) {
    nextSecret.openaiApiKey = openaiApiKey;
  }

  if (grokApiKey) {
    nextSecret.grokApiKey = grokApiKey;
  }

  nextSecret.updatedAt = new Date().toISOString();

  await client.send(
    new PutSecretValueCommand({
      SecretId: secretId,
      SecretString: JSON.stringify(nextSecret, null, 2),
    }),
  );

  console.log(`Secret ${secretId} updated in ${region}.`);
}

main().catch((err) => {
  console.error("Failed to update secret:", err);
  process.exit(1);
});
