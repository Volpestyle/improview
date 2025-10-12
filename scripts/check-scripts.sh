#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# shellcheck source=lib/bash/common.sh
source "${REPO_ROOT}/scripts/lib/bash/common.sh"

BASH_SCRIPTS=()
while IFS= read -r -d '' script; do
  BASH_SCRIPTS+=("${script}")
done < <(find "${REPO_ROOT}" -type f -name '*.sh' ! -path '*/node_modules/*' -print0)

log_step "Scanning for bash scripts"

if (( ${#BASH_SCRIPTS[@]} == 0 )); then
  log_info "No bash scripts detected."
else
  for script in "${BASH_SCRIPTS[@]}"; do
    log_info "bash -n ${script}"
    bash -n "${script}"
  done

  if command -v shellcheck >/dev/null 2>&1; then
    log_step "Running shellcheck"
    for script in "${BASH_SCRIPTS[@]}"; do
      log_info "shellcheck ${script}"
      shellcheck "${script}"
    done
  else
    log_warn "shellcheck not found; skipping lint."
  fi
fi

NODE_SCRIPTS=()
while IFS= read -r -d '' script; do
  NODE_SCRIPTS+=("${script}")
done < <(
  find "${REPO_ROOT}/scripts" "${REPO_ROOT}/infra/cdk/scripts" -type f -name '*.js' -print0 2>/dev/null
)

log_step "Scanning for Node scripts"

if (( ${#NODE_SCRIPTS[@]} == 0 )); then
  log_info "No Node scripts detected."
else
  for script in "${NODE_SCRIPTS[@]}"; do
    log_info "node --check ${script}"
    node --check "${script}"
  done
fi

log_success "Script verification completed."
