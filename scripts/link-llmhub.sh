#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LLMHUB_DIR="${LLMHUB_PATH:-$ROOT_DIR/../llmhub}"
LLMHUB_NODE_DIR="$LLMHUB_DIR/packages/node"

if [[ ! -d "$LLMHUB_NODE_DIR" ]]; then
  echo "link-llmhub: local llmhub not found at $LLMHUB_NODE_DIR; using registry package."
  exit 0
fi

echo "link-llmhub: linking @volpestyle/llmhub-node from $LLMHUB_NODE_DIR"
(cd "$LLMHUB_NODE_DIR" && pnpm link --global)
(cd "$ROOT_DIR" && pnpm --filter improview-web link --global @volpestyle/llmhub-node)
