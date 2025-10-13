#!/usr/bin/env node

const { spawnSync } = require("child_process");
const path = require("path");

function resolveDefaultEnv() {
  const fromScriptArg = process.env.npm_config_env;
  const fromProcess = process.env.IMPROVIEW_ENV;
  if (fromProcess && fromProcess.trim() !== "") {
    return fromProcess.trim();
  }
  if (fromScriptArg && fromScriptArg.trim() !== "") {
    return fromScriptArg.trim();
  }
  return "dev";
}

function parseArgs(argv) {
  let envName = resolveDefaultEnv();
  const cdkArgs = [];
  let passthrough = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") {
      passthrough = argv.slice(i + 1);
      break;
    }
    if (arg === "--env" && i + 1 < argv.length) {
      envName = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--env=")) {
      envName = arg.split("=", 2)[1];
      continue;
    }
    cdkArgs.push(arg);
  }

  return { envName, cdkArgs: [...cdkArgs, ...passthrough] };
}

function main() {
  const { envName, cdkArgs } = parseArgs(process.argv.slice(2));

  const stacks = [
    `Improview-${envName}-Auth`,
    `Improview-${envName}-Backend`,
    `Improview-${envName}-Frontend`,
  ];

  const args = [
    "cdk",
    "deploy",
    "--require-approval",
    "never",
    "-c",
    `env=${envName}`,
    ...cdkArgs,
    ...stacks,
  ];

  const cwd = path.resolve(__dirname, "..");
  const result = spawnSync(
    "pnpm",
    args,
    {
      stdio: "inherit",
      cwd,
      env: { ...process.env, IMPROVIEW_ENV: envName },
    },
  );

  if (result.error) {
    console.error(result.error);
    process.exit(result.status ?? 1);
  }
  process.exit(result.status ?? 0);
}

main();
