#!/usr/bin/env bash

set -euo pipefail

COLOR_RESET=""
COLOR_INFO=""
COLOR_WARN=""
COLOR_ERROR=""
COLOR_SUCCESS=""
COLOR_REQUEST=""
COLOR_REQUEST_BODY=""
COLOR_RESPONSE=""
COLOR_RESPONSE_BODY=""

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  COLOR_RESET=$'\033[0m'
  COLOR_INFO=$'\033[36m'
  COLOR_WARN=$'\033[33m'
  COLOR_ERROR=$'\033[31m'
  COLOR_SUCCESS=$'\033[32m'
  COLOR_REQUEST=$'\033[38;5;39m'
  COLOR_REQUEST_BODY=$'\033[38;5;81m'
  COLOR_RESPONSE=$'\033[38;5;70m'
  COLOR_RESPONSE_BODY=$'\033[38;5;114m'
fi

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

usage() {
  cat <<'EOF'
Usage: run-smoke.sh [options] [-- [go test args]]

Options:
  --env <name>                 Environment suffix (default: dev). Used for stack/secret lookup.
  --mode <static|llm>          Generator mode for the backend (default: static).
  --base-url <url>             Override the API Gateway base URL. Defaults to CloudFormation stack output.
  --llm-base-url <url>         Override IMPROVIEW_OPENAI_BASE_URL when mode=llm.
  --llm-model <model>          Override IMPROVIEW_OPENAI_MODEL when mode=llm.
  --llm-provider <name>        Override IMPROVIEW_OPENAI_PROVIDER when mode=llm.
  --llm-api-key <key>          Provide an OpenAI-compatible API key when mode=llm.
  --client-id <id>             Cognito App Client ID (defaults to IMPROVIEW_COGNITO_CLIENT_ID or IMPROVIEW_AUTH_COGNITO_APP_CLIENT_ID env).
  --client-secret <secret>     Cognito App Client secret. When provided the script calculates SECRET_HASH automatically.
  --secret-id <arn|name>       Secrets Manager identifier for smoke credentials (default: improview/<env>/smoke-credentials).
  --region <aws-region>        AWS region (default: AWS_REGION env or us-east-1).
  --run <pattern>              go test -run pattern (default: Live).
  --debug                      Enable CI_SMOKE_DEBUG logging (default: off).
  --no-dotenv                  Skip loading .env.local before running tests.
  --local                      Skip AWS credential/token steps and target a locally running backend.
  -h, --help                   Show this help message.

All remaining arguments after "--" are passed directly to go test.
EOF
}

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACKEND_DIR=$(cd "${SCRIPT_DIR}/.." && pwd)
REPO_ROOT=$(cd "${BACKEND_DIR}/.." && pwd)

ENV_NAME="${IMPROVIEW_ENV:-dev}"
MODE="static"
ENV_BASE_URL=""
BASE_URL=""
LLM_BASE_URL="${IMPROVIEW_OPENAI_BASE_URL:-}"
LLM_MODEL="${IMPROVIEW_OPENAI_MODEL:-}"
LLM_PROVIDER="${IMPROVIEW_OPENAI_PROVIDER:-}"
LLM_API_KEY="${IMPROVIEW_OPENAI_API_KEY:-}"
CLIENT_ID="${IMPROVIEW_COGNITO_CLIENT_ID:-${IMPROVIEW_AUTH_COGNITO_APP_CLIENT_ID:-${USER_POOL_CLIENT_ID:-}}}"
CLIENT_SECRET="${IMPROVIEW_COGNITO_CLIENT_SECRET:-}"  # optional
SECRET_ID=""
REGION="${AWS_REGION:-us-east-1}"
RUN_PATTERN="Live"
DEBUG=0
LOAD_DOTENV=1
EXTRA_GO_ARGS=()
LOCAL_RUN=0
ENV_SET=0
MODE_SET=0
BASE_URL_SET=0
LLM_BASE_URL_SET=0
LLM_MODEL_SET=0
LLM_PROVIDER_SET=0
LLM_API_KEY_SET=0
CLIENT_ID_SET=0
CLIENT_SECRET_SET=0
SECRET_ID_SET=0
REGION_SET=0
RUN_PATTERN_SET=0
DEBUG_SET=0
LOCAL_SET=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENV_NAME="$2"
      ENV_SET=1
      shift 2
      ;;
    --mode)
      MODE="$2"
      MODE_SET=1
      shift 2
      ;;
    --base-url)
      BASE_URL="$2"
      BASE_URL_SET=1
      shift 2
      ;;
    --llm-base-url)
      LLM_BASE_URL="$2"
      LLM_BASE_URL_SET=1
      shift 2
      ;;
    --llm-model)
      LLM_MODEL="$2"
      LLM_MODEL_SET=1
      shift 2
      ;;
    --llm-provider)
      LLM_PROVIDER="$2"
      LLM_PROVIDER_SET=1
      shift 2
      ;;
    --llm-api-key)
      LLM_API_KEY="$2"
      LLM_API_KEY_SET=1
      shift 2
      ;;
    --client-id)
      CLIENT_ID="$2"
      CLIENT_ID_SET=1
      shift 2
      ;;
    --client-secret)
      CLIENT_SECRET="$2"
      CLIENT_SECRET_SET=1
      shift 2
      ;;
    --secret-id)
      SECRET_ID="$2"
      SECRET_ID_SET=1
      shift 2
      ;;
    --region)
      REGION="$2"
      REGION_SET=1
      shift 2
      ;;
    --run)
      RUN_PATTERN="$2"
      RUN_PATTERN_SET=1
      shift 2
      ;;
    --debug)
      DEBUG=1
      DEBUG_SET=1
      shift
      ;;
    --no-dotenv)
      LOAD_DOTENV=0
      shift
      ;;
    --local)
      LOCAL_RUN=1
      LOCAL_SET=1
      shift
      ;;
    --)
      shift
      EXTRA_GO_ARGS=("$@")
      break
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      log_error "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ "${LOCAL_RUN}" -eq 0 ]]; then
  if ! command -v aws >/dev/null 2>&1; then
    log_error "aws CLI is required but not installed."
    exit 1
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    log_error "python3 is required but not installed."
    exit 1
  fi
fi

if [[ "${MODE}" != "static" && "${MODE}" != "llm" ]]; then
  log_error "Invalid mode: ${MODE} (expected static or llm)"
  exit 1
fi

if [[ "${ENV_SET}" -eq 0 && -n "${npm_config_env:-}" ]]; then
  ENV_NAME="${npm_config_env}"
  ENV_SET=1
fi

if [[ "${MODE_SET}" -eq 0 && -n "${npm_config_mode:-}" ]]; then
  MODE="${npm_config_mode}"
  MODE_SET=1
fi

if [[ "${BASE_URL_SET}" -eq 0 && -n "${npm_config_base_url:-}" ]]; then
  BASE_URL="${npm_config_base_url}"
  BASE_URL_SET=1
fi

if [[ "${LLM_BASE_URL_SET}" -eq 0 && -n "${npm_config_llm_base_url:-}" ]]; then
  LLM_BASE_URL="${npm_config_llm_base_url}"
  LLM_BASE_URL_SET=1
fi

if [[ "${LLM_MODEL_SET}" -eq 0 && -n "${npm_config_llm_model:-}" ]]; then
  LLM_MODEL="${npm_config_llm_model}"
  LLM_MODEL_SET=1
fi

if [[ "${LLM_PROVIDER_SET}" -eq 0 && -n "${npm_config_llm_provider:-}" ]]; then
  LLM_PROVIDER="${npm_config_llm_provider}"
  LLM_PROVIDER_SET=1
fi

if [[ "${LLM_API_KEY_SET}" -eq 0 && -n "${npm_config_llm_api_key:-}" ]]; then
  LLM_API_KEY="${npm_config_llm_api_key}"
  LLM_API_KEY_SET=1
fi

if [[ "${CLIENT_ID_SET}" -eq 0 && -n "${npm_config_client_id:-}" ]]; then
  CLIENT_ID="${npm_config_client_id}"
  CLIENT_ID_SET=1
fi

if [[ "${CLIENT_SECRET_SET}" -eq 0 && -n "${npm_config_client_secret:-}" ]]; then
  CLIENT_SECRET="${npm_config_client_secret}"
  CLIENT_SECRET_SET=1
fi

if [[ "${SECRET_ID_SET}" -eq 0 && -n "${npm_config_secret_id:-}" ]]; then
  SECRET_ID="${npm_config_secret_id}"
  SECRET_ID_SET=1
fi

if [[ "${REGION_SET}" -eq 0 && -n "${npm_config_region:-}" ]]; then
  REGION="${npm_config_region}"
  REGION_SET=1
fi

if [[ "${RUN_PATTERN_SET}" -eq 0 && -n "${npm_config_run:-}" ]]; then
  RUN_PATTERN="${npm_config_run}"
  RUN_PATTERN_SET=1
fi

if [[ "${DEBUG_SET}" -eq 0 && -n "${npm_config_debug:-}" ]]; then
  case "${npm_config_debug}" in
    true|1|on|yes)
      DEBUG=1
      ;;
    false|0|off|no)
      DEBUG=0
      ;;
  esac
fi

if [[ "${LOCAL_SET}" -eq 0 && -n "${npm_config_local:-}" ]]; then
  case "${npm_config_local}" in
    true|1|on|yes)
      LOCAL_RUN=1
      ;;
    false|0|off|no)
      LOCAL_RUN=0
      ;;
  esac
fi

if [[ -z "${SECRET_ID}" ]]; then
  SECRET_ID="improview/${ENV_NAME}/smoke-credentials"
fi

if [[ "${LOAD_DOTENV}" -eq 1 && -f "${REPO_ROOT}/backend/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${REPO_ROOT}/backend/.env.local"
  set +a
fi
ENV_BASE_URL="${BASE_URL:-}"

if [[ -z "${CLIENT_ID}" ]]; then
  CLIENT_ID="${IMPROVIEW_COGNITO_CLIENT_ID:-${IMPROVIEW_AUTH_COGNITO_APP_CLIENT_ID:-${USER_POOL_CLIENT_ID:-}}}"
fi

if [[ -z "${CLIENT_SECRET}" ]]; then
  CLIENT_SECRET="${IMPROVIEW_COGNITO_CLIENT_SECRET:-}"  # optional
fi

if [[ -z "${BASE_URL}" && "${LOCAL_RUN}" -eq 1 ]]; then
  BASE_URL="${ENV_BASE_URL:-}"
fi

if [[ -z "${BASE_URL}" && "${LOCAL_RUN}" -eq 1 ]]; then
  BASE_URL="http://localhost:8080"
fi

if [[ -z "${LLM_BASE_URL}" ]]; then
  LLM_BASE_URL="${IMPROVIEW_OPENAI_BASE_URL:-}"
fi

if [[ -z "${LLM_MODEL}" ]]; then
  LLM_MODEL="${IMPROVIEW_OPENAI_MODEL:-}"
fi

if [[ -z "${LLM_PROVIDER}" ]]; then
  LLM_PROVIDER="${IMPROVIEW_OPENAI_PROVIDER:-}"
fi

if [[ -z "${LLM_API_KEY}" ]]; then
  LLM_API_KEY="${IMPROVIEW_OPENAI_API_KEY:-}"
fi

if [[ -z "${REGION}" || "${REGION}" == "us-east-1" ]]; then
  REGION="${AWS_REGION:-${REGION}}"
fi

if [[ -z "${CLIENT_ID}" && "${LOCAL_RUN}" -eq 0 ]]; then
  log_error "Cognito client ID is required (set via --client-id or IMPROVIEW_COGNITO_CLIENT_ID env)."
  exit 1
fi

if [[ -z "${BASE_URL}" && "${LOCAL_RUN}" -eq 0 ]]; then
  STACK_NAME="Improview-${ENV_NAME}-Backend"
  log_info "Fetching API endpoint from CloudFormation stack ${STACK_NAME}..."
  BASE_URL=$(aws cloudformation describe-stacks \
    --region "${REGION}" \
    --stack-name "${STACK_NAME}" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text)
fi

if [[ -z "${BASE_URL}" || "${BASE_URL}" == "None" ]]; then
  log_error "Unable to resolve API base URL; provide --base-url (remote runs auto-resolve from CloudFormation, local default is http://localhost:8080)."
  exit 1
fi

if [[ "${LOCAL_RUN}" -eq 0 ]]; then
  log_info "Retrieving smoke credentials from ${SECRET_ID}..."
  SMOKE_SECRET=$(aws secretsmanager get-secret-value \
    --region "${REGION}" \
    --secret-id "${SECRET_ID}" \
    --query 'SecretString' \
    --output text)

  if [[ -z "${SMOKE_SECRET}" || "${SMOKE_SECRET}" == "None" ]]; then
    log_error "Secret ${SECRET_ID} is empty."
    exit 1
  fi

  export SMOKE_SECRET
  SMOKE_USER=$(python3 -c 'import json, os; print(json.loads(os.environ["SMOKE_SECRET"]).get("username",""))')
  SMOKE_PASSWORD=$(python3 -c 'import json, os; print(json.loads(os.environ["SMOKE_SECRET"]).get("password",""))')
  unset SMOKE_SECRET

  if [[ -z "${SMOKE_USER}" || -z "${SMOKE_PASSWORD}" ]]; then
    log_error "Smoke secret does not contain username/password fields."
    exit 1
  fi

  export SMOKE_USER SMOKE_PASSWORD CLIENT_ID CLIENT_SECRET

  AUTH_PARAMS="USERNAME=${SMOKE_USER},PASSWORD=${SMOKE_PASSWORD}"
  if [[ -n "${CLIENT_SECRET}" ]]; then
    SECRET_HASH=$(python3 - <<'PY'
import base64, hmac, hashlib, os
username = os.environ['SMOKE_USER']
client_id = os.environ['CLIENT_ID']
client_secret = os.environ['CLIENT_SECRET']
digest = hmac.new(client_secret.encode('utf-8'), (username + client_id).encode('utf-8'), hashlib.sha256).digest()
print(base64.b64encode(digest).decode('utf-8'))
PY
)
    AUTH_PARAMS+="/SECRET_HASH=${SECRET_HASH}"
  fi

  export AUTH_PARAMS

  AUTH_PARAMS_CSV=$(python3 - <<'PY'
import os
params = os.environ['AUTH_PARAMS'].split('/')
print(','.join(params))
PY
)

  log_info "Exchanging credentials for Cognito access token..."
  AUTH_RESPONSE=$(aws cognito-idp initiate-auth \
    --region "${REGION}" \
    --client-id "${CLIENT_ID}" \
    --auth-flow USER_PASSWORD_AUTH \
    --auth-parameters "${AUTH_PARAMS_CSV}" \
    --output json)

  export AUTH_RESPONSE

  ACCESS_TOKEN=$(python3 - <<'PY'
import json, os
data = json.loads(os.environ['AUTH_RESPONSE'])
result = data.get('AuthenticationResult') or {}
print(result.get('AccessToken', ''))
PY
)

  CHALLENGE=$(python3 - <<'PY'
import json, os
data = json.loads(os.environ['AUTH_RESPONSE'])
print(data.get('ChallengeName', ''))
PY
)

  if [[ -z "${ACCESS_TOKEN}" ]]; then
    if [[ -n "${CHALLENGE}" ]]; then
      log_warn "Cognito responded with challenge '${CHALLENGE}'."
    else
      log_error "Failed to obtain access token from Cognito."
    fi
    log_warn "Full response:"
    printf '%s\n' "${AUTH_RESPONSE}" >&2
    exit 1
  fi

  export IMPROVIEW_LIVE_ACCESS_TOKEN="${ACCESS_TOKEN}"
else
  unset IMPROVIEW_LIVE_ACCESS_TOKEN 2>/dev/null || true
fi

export IMPROVIEW_ENV="${ENV_NAME}"
export BASE_URL="${BASE_URL}"
if [[ "${MODE}" == "llm" ]]; then
  export IMPROVIEW_FORCE_GENERATE_MODE="llm"
else
  unset IMPROVIEW_FORCE_GENERATE_MODE 2>/dev/null || true
fi

if [[ "${MODE}" == "llm" ]]; then
  if [[ -n "${LLM_API_KEY}" ]]; then
    export IMPROVIEW_OPENAI_API_KEY="${LLM_API_KEY}"
  fi
  if [[ -n "${LLM_BASE_URL}" ]]; then
    export IMPROVIEW_OPENAI_BASE_URL="${LLM_BASE_URL}"
  fi
  if [[ -n "${LLM_MODEL}" ]]; then
    export IMPROVIEW_OPENAI_MODEL="${LLM_MODEL}"
  fi
  if [[ -n "${LLM_PROVIDER}" ]]; then
    export IMPROVIEW_OPENAI_PROVIDER="${LLM_PROVIDER}"
  fi
fi

GO_TEST_CMD=(go test)
if [[ "${DEBUG}" -eq 1 ]]; then
  export CI_SMOKE_DEBUG=1
  GO_TEST_CMD+=(-v)
fi
GO_TEST_CMD+=(-run "${RUN_PATTERN}" -count=1 ./internal/api)
if (( ${#EXTRA_GO_ARGS[@]} > 0 )); then
  GO_TEST_CMD+=("${EXTRA_GO_ARGS[@]}")
fi

log_info "Running smoke tests against ${BASE_URL} (mode=${MODE})..."
pushd "${BACKEND_DIR}" >/dev/null
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

if [[ $GO_EXIT -ne 0 ]]; then
  log_error "Smoke tests failed."
  exit $GO_EXIT
fi

log_success "Smoke tests completed successfully."
