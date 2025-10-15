#!/usr/bin/env bash
#
# Shared logging and utility helpers for Improview bash scripts.
#
# Usage:
#   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
#   # shellcheck source=../../scripts/lib/bash/common.sh
#   source "${REPO_ROOT}/scripts/lib/bash/common.sh"
#

if [[ -n "${IMPROVIEW_BASH_COMMON:-}" ]]; then
  return 0
fi
IMPROVIEW_BASH_COMMON=1

_improview_supports_color() {
  [[ -t 1 && -z "${NO_COLOR:-}" ]]
}

if _improview_supports_color; then
  COLOR_RESET=$'\033[0m'
  COLOR_INFO=$'\033[36m'
  COLOR_WARN=$'\033[33m'
  COLOR_ERROR=$'\033[31m'
  COLOR_SUCCESS=$'\033[32m'
  COLOR_HIGHLIGHT=$'\033[35m'
  COLOR_DEBUG=$'\033[90m'
else
  COLOR_RESET=""
  COLOR_INFO=""
  COLOR_WARN=""
  COLOR_ERROR=""
  COLOR_SUCCESS=""
  COLOR_HIGHLIGHT=""
  COLOR_DEBUG=""
fi

log_step() {
  printf '%b\n' "${COLOR_INFO}==>${COLOR_RESET} ${COLOR_HIGHLIGHT}$*${COLOR_RESET}"
}

log_info() {
  printf '%b\n' "${COLOR_INFO}$*${COLOR_RESET}"
}

log_warn() {
  printf '%b\n' "${COLOR_WARN}$*${COLOR_RESET}"
}

log_error() {
  printf '%b\n' "${COLOR_ERROR}$*${COLOR_RESET}" >&2
}

log_success() {
  printf '%b\n' "${COLOR_SUCCESS}$*${COLOR_RESET}"
}

log_debug() {
  if [[ -n "${IMPROVIEW_DEBUG:-}" ]]; then
    printf '%b\n' "${COLOR_DEBUG}$*${COLOR_RESET}"
  fi
}

fatal() {
  log_error "$*"
  exit 1
}

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    fatal "Missing required command: ${cmd}. Please install it and retry."
  fi
}

IMPROVIEW_CLI_FLAGS=()
IMPROVIEW_CLI_TYPES=()
IMPROVIEW_CLI_TARGETS=()
IMPROVIEW_CLI_SEEN=()
IMPROVIEW_CLI_POSITIONAL=()

improview_cli_reset() {
  IMPROVIEW_CLI_FLAGS=()
  IMPROVIEW_CLI_TYPES=()
  IMPROVIEW_CLI_TARGETS=()
  IMPROVIEW_CLI_SEEN=()
  IMPROVIEW_CLI_POSITIONAL=()
}

improview_cli_register() {
  local flag="$1"
  local type="$2"
  local target="$3"
  if [[ "${flag}" != -* ]]; then
    fatal "Invalid CLI flag '${flag}'. Flags must start with '-' or '--'."
  fi
  case "${type}" in
    bool|string)
      ;;
    *)
      fatal "Unsupported CLI flag type '${type}' for ${flag}."
      ;;
  esac
  IMPROVIEW_CLI_FLAGS+=("${flag}")
  IMPROVIEW_CLI_TYPES+=("${type}")
  IMPROVIEW_CLI_TARGETS+=("${target}")
  IMPROVIEW_CLI_SEEN+=("0")
}

_improview_cli_find_index() {
  local flag="$1"
  local i=0
  local total=${#IMPROVIEW_CLI_FLAGS[@]}
  while [[ $i -lt $total ]]; do
    if [[ "${IMPROVIEW_CLI_FLAGS[$i]}" == "${flag}" ]]; then
      printf '%s' "$i"
      return
    fi
    i=$((i + 1))
  done
  printf '%s' "-1"
}

_improview_cli_assign() {
  local flag="$1"
  local index="$2"
  local value="$3"
  local has_value="$4"
  local type="${IMPROVIEW_CLI_TYPES[$index]}"
  local target="${IMPROVIEW_CLI_TARGETS[$index]}"

  case "${type}" in
    bool)
      if [[ "${has_value}" -eq 0 ]]; then
        printf -v "${target}" '%s' "1"
        IMPROVIEW_CLI_SEEN[$index]=1
        return
      fi
      if [[ -z "${value}" ]]; then
        fatal "Invalid value for ${flag}; expected true or false."
      fi
      local normalized
      normalized=$(printf '%s' "${value}" | tr '[:upper:]' '[:lower:]')
      case "${normalized}" in
        1|true|yes|on)
          printf -v "${target}" '%s' "1"
          IMPROVIEW_CLI_SEEN[$index]=1
          ;;
        0|false|no|off)
          printf -v "${target}" '%s' "0"
          IMPROVIEW_CLI_SEEN[$index]=1
          ;;
        *)
          fatal "Invalid value for ${flag}: ${value} (expected true/false)."
          ;;
      esac
      ;;
    string)
      if [[ "${has_value}" -eq 0 ]]; then
        fatal "Missing value for ${flag}"
      fi
      printf -v "${target}" '%s' "${value}"
      IMPROVIEW_CLI_SEEN[$index]=1
      ;;
    *)
      fatal "Unhandled CLI flag type '${type}' for ${flag}."
      ;;
  esac
}

improview_cli_parse() {
  IMPROVIEW_CLI_POSITIONAL=()
  while [[ $# -gt 0 ]]; do
    local arg="$1"
    if [[ "${arg}" == "--" ]]; then
      shift
      IMPROVIEW_CLI_POSITIONAL=("$@")
      return 0
    fi
    if [[ "${arg}" != -* ]]; then
      fatal "Unexpected argument: ${arg}"
    fi

    local flag="${arg}"
    local value=""
    local has_value=0

    if [[ "${arg}" == *=* ]]; then
      flag="${arg%%=*}"
      value="${arg#*=}"
      has_value=1
    fi

    local index
    index=$(_improview_cli_find_index "${flag}")
    if [[ "${index}" -lt 0 ]]; then
      fatal "Unknown argument: ${flag}"
    fi

    local type="${IMPROVIEW_CLI_TYPES[$index]}"
    if [[ "${has_value}" -eq 1 ]]; then
      _improview_cli_assign "${flag}" "${index}" "${value}" 1
    else
      if [[ "${type}" == "bool" ]]; then
        _improview_cli_assign "${flag}" "${index}" "" 0
      else
        if [[ $# -lt 2 ]]; then
          fatal "Missing value for ${flag}"
        fi
        _improview_cli_assign "${flag}" "${index}" "$2" 1
        shift
      fi
    fi
    shift
  done
}

improview_cli_flag_provided() {
  local flag="$1"
  local index
  index=$(_improview_cli_find_index "${flag}")
  if [[ "${index}" -lt 0 ]]; then
    fatal "Unknown CLI flag queried: ${flag}"
  fi
  printf '%s' "${IMPROVIEW_CLI_SEEN[$index]}"
}

