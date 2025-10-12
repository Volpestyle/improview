#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# shellcheck source=../../scripts/lib/bash/common.sh
source "${REPO_ROOT}/scripts/lib/bash/common.sh"

usage() {
  cat <<'EOF'
Usage: run-smoke.sh [options] [-- <go test args>]

Options:
  --env <name>             Environment suffix to target (default: dev).
  --region <aws-region>    AWS region for stack lookups and Cognito (default: AWS_REGION/AWS_DEFAULT_REGION/us-east-1).
  --base-url <url>         Override the API base URL (skips CloudFormation lookup).
  --secret-id <id>         Secrets Manager ID for smoke credentials (default: improview/<env>/smoke-credentials).
  --client-id <id>         Cognito App Client ID (default: USER_POOL_CLIENT_ID or first entry in USER_POOL_CLIENT_IDS).
  --client-secret <value>  Cognito App Client secret (default: COGNITO_CLIENT_SECRET).
  --run <pattern>          go test -run pattern (default: Live).
  --debug                  Enable verbose test logging and CI_SMOKE_DEBUG.
  --local                  Target a locally running backend; skips CloudFormation endpoint lookup.
  --no-auth                Disable Cognito credential lookup and token exchange.
  -h, --help               Show this help message.

All remaining arguments after "--" are passed directly to go test.

Environment:
  SMOKE_ENV, SMOKE_REGION, SMOKE_BASE_URL, SMOKE_SECRET_ID,
  SMOKE_CLIENT_ID, SMOKE_CLIENT_SECRET, SMOKE_RUN_PATTERN,
  USER_POOL_CLIENT_ID, USER_POOL_CLIENT_IDS,
  COGNITO_CLIENT_SECRET,
  AWS_REGION, AWS_DEFAULT_REGION, NO_COLOR
EOF
}

ENV_NAME="${SMOKE_ENV:-dev}"
REGION="${SMOKE_REGION:-${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}}"
BASE_URL="${SMOKE_BASE_URL:-}"
SECRET_ID="${SMOKE_SECRET_ID:-}"
CLIENT_ID="${SMOKE_CLIENT_ID:-${USER_POOL_CLIENT_ID:-}}"
CLIENT_SECRET="${SMOKE_CLIENT_SECRET:-}"
RUN_PATTERN="${SMOKE_RUN_PATTERN:-Live}"
DEBUG=0
LOCAL_RUN=0
NO_AUTH=0
SHOW_HELP=0

improview_cli_reset
improview_cli_register "--env" "string" "ENV_NAME"
improview_cli_register "--region" "string" "REGION"
improview_cli_register "--base-url" "string" "BASE_URL"
improview_cli_register "--secret-id" "string" "SECRET_ID"
improview_cli_register "--client-id" "string" "CLIENT_ID"
improview_cli_register "--client-secret" "string" "CLIENT_SECRET"
improview_cli_register "--run" "string" "RUN_PATTERN"
improview_cli_register "--debug" "bool" "DEBUG"
improview_cli_register "--local" "bool" "LOCAL_RUN"
improview_cli_register "--no-auth" "bool" "NO_AUTH"
improview_cli_register "--help" "bool" "SHOW_HELP"
improview_cli_register "-h" "bool" "SHOW_HELP"

improview_cli_parse "$@"
if [[ -n "${IMPROVIEW_CLI_POSITIONAL+set}" ]]; then
  EXTRA_GO_ARGS=("${IMPROVIEW_CLI_POSITIONAL[@]}")
else
  EXTRA_GO_ARGS=()
fi

if [[ ${SHOW_HELP} -ne 0 ]]; then
  usage
  exit 0
fi

if [[ -z "${REGION}" ]]; then
  REGION="us-east-1"
fi

if [[ -z "${SECRET_ID}" ]]; then
  SECRET_ID="improview/${ENV_NAME}/smoke-credentials"
fi

if [[ -z "${CLIENT_ID}" && -n "${USER_POOL_CLIENT_IDS:-}" ]]; then
  IFS=',' read -r first_id _ <<<"${USER_POOL_CLIENT_IDS}"
  CLIENT_ID="$(echo "${first_id}" | xargs)"
fi

if [[ -z "${CLIENT_SECRET}" && -n "${COGNITO_CLIENT_SECRET:-}" ]]; then
  CLIENT_SECRET="${COGNITO_CLIENT_SECRET}"
fi

if [[ ${LOCAL_RUN} -eq 1 && -z "${BASE_URL}" ]]; then
  # Default to the local API gateway when running against a developer machine.
  BASE_URL="http://localhost:8080"
fi

if [[ ${DEBUG} -eq 1 ]]; then
  export IMPROVIEW_DEBUG=1
fi

COLOR_REQUEST="${COLOR_HIGHLIGHT}"
COLOR_REQUEST_BODY="${COLOR_INFO}"
COLOR_RESPONSE="${COLOR_SUCCESS}"
COLOR_RESPONSE_BODY="${COLOR_INFO}"

colorize_last_context=""

colorize_go_line() {
  local line="$1"
  if [[ -z "${COLOR_INFO}" ]]; then
    printf '%s\n' "$line"
    return
  fi

  local context="${colorize_last_context}"
  local colored="$line"

  if [[ -z "${line// }" ]]; then
    colorize_last_context=""
    printf '%s\n' "$line"
    return
  fi

  if [[ "$line" == "=== RUN "* ]]; then
    colorize_last_context=""
    colored="${COLOR_WARN}${line}${COLOR_RESET}"
    printf '%b\n' "$colored"
    return
  fi

  if [[ "$line" == ---\ PASS:* || "$line" == PASS || "$line" == ok\ \ \ * ]]; then
    colorize_last_context=""
    colored="${COLOR_SUCCESS}${line}${COLOR_RESET}"
    printf '%b\n' "$colored"
    return
  fi

  if [[ "$line" == ---\ FAIL:* || "$line" == FAIL* || "$line" == panic:\ * ]]; then
    colorize_last_context=""
    colored="${COLOR_ERROR}${line}${COLOR_RESET}"
    printf '%b\n' "$colored"
    return
  fi

  if [[ "$line" == *"[GET "* || "$line" == *"[POST "* || "$line" == *"[PUT "* || "$line" == *"[DELETE "* || "$line" == *"[PATCH "* ]]; then
    colorize_last_context="request"
    colored="${COLOR_REQUEST}${line}${COLOR_RESET}"
    printf '%b\n' "$colored"
    return
  fi

  if [[ "$line" == *"payload={"* ]]; then
    colorize_last_context="request"
    colored="${COLOR_REQUEST_BODY}${line}${COLOR_RESET}"
    printf '%b\n' "$colored"
    return
  fi

  if [[ "$line" == *"[RESP "* || "$line" == *"status="* ]]; then
    colorize_last_context="response"
    colored="${COLOR_RESPONSE}${line}${COLOR_RESET}"
    printf '%b\n' "$colored"
    return
  fi

  if [[ "$line" == *"body={"* ]]; then
    colorize_last_context="response"
    colored="${COLOR_RESPONSE_BODY}${line}${COLOR_RESET}"
    printf '%b\n' "$colored"
    return
  fi

  if [[ "$line" =~ ^[[:space:]]*\{ ]] || [[ "$line" =~ ^[[:space:]]*\[ ]] || [[ "$line" =~ ^[[:space:]]*\" ]]; then
    if [[ "$context" == "request" ]]; then
      colored="${COLOR_REQUEST_BODY}${line}${COLOR_RESET}"
    elif [[ "$context" == "response" ]]; then
      colored="${COLOR_RESPONSE_BODY}${line}${COLOR_RESET}"
    else
      colored="${COLOR_INFO}${line}${COLOR_RESET}"
    fi
    printf '%b\n' "$colored"
    return
  fi

  printf '%s\n' "$line"
}

require_command go

need_aws=0
if [[ ${NO_AUTH} -eq 0 ]]; then
  need_aws=1
fi
if [[ ${LOCAL_RUN} -eq 0 && -z "${BASE_URL}" ]]; then
  need_aws=1
fi
if [[ ${need_aws} -eq 1 ]]; then
  require_command aws
fi
if [[ ${NO_AUTH} -eq 0 ]]; then
  require_command python3
fi

log_step "Configuration"
log_info "Environment:        ${ENV_NAME}"
log_info "Region:             ${REGION}"
log_info "Local run:          ${LOCAL_RUN}"
log_info "Base URL override:  ${BASE_URL:-<auto>}"
if [[ ${NO_AUTH} -eq 1 ]]; then
  log_info "Auth mode:          disabled (--no-auth)"
else
  log_info "Secret ID:          ${SECRET_ID}"
  log_info "Cognito client ID:  ${CLIENT_ID:-<auto>}"
fi

if [[ ${LOCAL_RUN} -eq 1 ]]; then
  if [[ -z "${BASE_URL}" ]]; then
    fatal "Local run requires SMOKE_BASE_URL or --base-url."
  fi
else
  if [[ -z "${BASE_URL}" ]]; then
    STACK_NAME="Improview-${ENV_NAME}-Backend"
    log_step "Resolving API endpoint from ${STACK_NAME}"
    BASE_URL="$(aws cloudformation describe-stacks \
      --region "${REGION}" \
      --stack-name "${STACK_NAME}" \
      --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
      --output text 2>/tmp/run_smoke_stack_lookup.log || true)"
    if [[ -s /tmp/run_smoke_stack_lookup.log ]]; then
      log_debug "CloudFormation output:"
      while IFS= read -r line; do
        log_debug "  ${line}"
      done < /tmp/run_smoke_stack_lookup.log
    fi
    rm -f /tmp/run_smoke_stack_lookup.log
  fi

  if [[ -z "${BASE_URL}" || "${BASE_URL}" == "None" ]]; then
    fatal "Unable to resolve API base URL; provide --base-url or ensure CloudFormation stack has ApiEndpoint output."
  fi
fi

if [[ ${NO_AUTH} -eq 0 ]]; then
  if [[ -z "${CLIENT_ID}" ]]; then
    fatal "Cognito client ID is required (set --client-id or USER_POOL_CLIENT_ID/USER_POOL_CLIENT_IDS)."
  fi

  log_step "Fetching smoke credentials from ${SECRET_ID}"
  SMOKE_SECRET="$(aws secretsmanager get-secret-value \
    --region "${REGION}" \
    --secret-id "${SECRET_ID}" \
    --query 'SecretString' \
    --output text)"

  if [[ -z "${SMOKE_SECRET}" || "${SMOKE_SECRET}" == "None" ]]; then
    fatal "Secret ${SECRET_ID} is empty."
  fi

  export SMOKE_SECRET
  SMOKE_USER="$(python3 - <<'PY'
import json
import os
data = json.loads(os.environ["SMOKE_SECRET"])
print(data.get("username", ""))
PY
)"
  SMOKE_PASSWORD="$(python3 - <<'PY'
import json
import os
data = json.loads(os.environ["SMOKE_SECRET"])
print(data.get("password", ""))
PY
)"
  unset SMOKE_SECRET

  if [[ -z "${SMOKE_USER}" || -z "${SMOKE_PASSWORD}" ]]; then
    fatal "Smoke secret ${SECRET_ID} must contain username and password fields."
  fi

  export SMOKE_USER SMOKE_PASSWORD CLIENT_ID CLIENT_SECRET

  if [[ -n "${CLIENT_SECRET}" ]]; then
    SECRET_HASH="$(python3 - <<'PY'
import base64
import hashlib
import hmac
import os

username = os.environ["SMOKE_USER"]
client_id = os.environ["CLIENT_ID"]
client_secret = os.environ["CLIENT_SECRET"]

digest = hmac.new(
    client_secret.encode("utf-8"),
    (username + client_id).encode("utf-8"),
    hashlib.sha256,
).digest()
print(base64.b64encode(digest).decode("utf-8"))
PY
)"
    export SECRET_HASH
  fi

  AUTH_PARAMS_JSON="$(python3 - <<'PY'
import json
import os
params = {
    "USERNAME": os.environ["SMOKE_USER"],
    "PASSWORD": os.environ["SMOKE_PASSWORD"],
}
secret_hash = os.environ.get("SECRET_HASH", "")
if secret_hash:
    params["SECRET_HASH"] = secret_hash
print(json.dumps(params))
PY
)"

  unset SECRET_HASH 2>/dev/null || true

  log_step "Exchanging Cognito credentials for access token"
  AUTH_RESPONSE="$(aws cognito-idp initiate-auth \
    --region "${REGION}" \
    --client-id "${CLIENT_ID}" \
    --auth-flow USER_PASSWORD_AUTH \
    --auth-parameters "${AUTH_PARAMS_JSON}" \
    --output json)"

  export AUTH_RESPONSE

  ACCESS_TOKEN="$(python3 - <<'PY'
import json
import os
data = json.loads(os.environ["AUTH_RESPONSE"])
result = data.get("AuthenticationResult") or {}
print(result.get("AccessToken", ""))
PY
)"

  CHALLENGE="$(python3 - <<'PY'
import json
import os
data = json.loads(os.environ["AUTH_RESPONSE"])
print(data.get("ChallengeName", ""))
PY
)"

  if [[ -z "${ACCESS_TOKEN}" ]]; then
    if [[ -n "${CHALLENGE}" ]]; then
      log_warn "Cognito responded with challenge '${CHALLENGE}'."
    fi
    fatal "Failed to obtain access token from Cognito. Full response: ${AUTH_RESPONSE}"
  fi

  export IMPROVIEW_LIVE_ACCESS_TOKEN="${ACCESS_TOKEN}"
else
  unset IMPROVIEW_LIVE_ACCESS_TOKEN 2>/dev/null || true
fi

export BASE_URL

GO_TEST_CMD=(go test)
if [[ ${DEBUG} -eq 1 ]]; then
  export CI_SMOKE_DEBUG=1
  GO_TEST_CMD+=(-v)
fi
GO_TEST_CMD+=(-run "${RUN_PATTERN}" -count=1 ./internal/api)
if (( ${#EXTRA_GO_ARGS[@]} > 0 )); then
  GO_TEST_CMD+=("${EXTRA_GO_ARGS[@]}")
fi

log_step "Running smoke tests against ${BASE_URL}"
pushd "${SCRIPT_DIR}/.." >/dev/null
if [[ -n "${COLOR_INFO}" ]]; then
  set -o pipefail
  "${GO_TEST_CMD[@]}" 2>&1 | while IFS= read -r line; do
    colorize_go_line "$line"
  done
  GO_EXIT=${PIPESTATUS[0]}
  set +o pipefail
else
  "${GO_TEST_CMD[@]}"
  GO_EXIT=$?
fi
popd >/dev/null

if [[ ${GO_EXIT} -ne 0 ]]; then
  fatal "Smoke tests failed."
fi

log_success "Smoke tests completed successfully."
