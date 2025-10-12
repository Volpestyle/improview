#!/usr/bin/env bash

set -euo pipefail

COLOR_RESET=""
COLOR_INFO=""
COLOR_WARN=""
COLOR_ERROR=""
COLOR_SUCCESS=""
COLOR_HIGHLIGHT=""
SHOW_PASSWORD="false"

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  COLOR_RESET=$'\033[0m'
  COLOR_INFO=$'\033[36m'
  COLOR_WARN=$'\033[33m'
  COLOR_ERROR=$'\033[31m'
  COLOR_SUCCESS=$'\033[32m'
  COLOR_HIGHLIGHT=$'\033[35m'
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

fatal() {
  log_error "$*"
  exit 1
}

usage() {
  cat <<'EOF'
Usage: setup-smoke-user.sh [options]

Options:
  --env <name>             Environment name used in the secret path (default: dev).
  --region <aws-region>    AWS region for Cognito and Secrets Manager (default: AWS_REGION/AWS_DEFAULT_REGION/us-east-1).
  --user <email>           Email/username for the smoke tester (can also use SMOKE_USER env). Prompted when omitted.
  --password <value>       Password for the smoke tester (can also use SMOKE_PASSWORD env). Generated when omitted.
  --user-pool-id <id>      Cognito User Pool ID (defaults to COGNITO_USER_POOL_ID env). Prompted when omitted.
  --secret-name <name>     Override the Secrets Manager secret name (default: improview/<env>/smoke-credentials).
  --description <text>     Secret description (default: Cognito smoke-test credentials).
  --show-password          Display the generated/provided password in logs (default: hidden). Alias: --showPassword.
  -h, --help               Show this help message.

Environment:
  SMOKE_USER, SMOKE_PASSWORD, COGNITO_USER_POOL_ID, AWS_REGION, AWS_DEFAULT_REGION, NO_COLOR
EOF
}

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    fatal "Missing required command: ${cmd}. Please install it and retry."
  fi
}

ENV_NAME="${SMOKE_ENV:-dev}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
SMOKE_USER="${SMOKE_USER:-}"
SMOKE_PASSWORD="${SMOKE_PASSWORD:-}"
USER_POOL_ID="${COGNITO_USER_POOL_ID:-}"
SECRET_NAME=""
SECRET_DESCRIPTION="Cognito smoke-test credentials"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      [[ $# -ge 2 ]] || fatal "Missing value for --env"
      ENV_NAME="$2"
      shift 2
      ;;
    --region)
      [[ $# -ge 2 ]] || fatal "Missing value for --region"
      REGION="$2"
      shift 2
      ;;
    --user)
      [[ $# -ge 2 ]] || fatal "Missing value for --user"
      SMOKE_USER="$2"
      shift 2
      ;;
    --password)
      [[ $# -ge 2 ]] || fatal "Missing value for --password"
      SMOKE_PASSWORD="$2"
      shift 2
      ;;
    --user-pool-id)
      [[ $# -ge 2 ]] || fatal "Missing value for --user-pool-id"
      USER_POOL_ID="$2"
      shift 2
      ;;
    --secret-name)
      [[ $# -ge 2 ]] || fatal "Missing value for --secret-name"
      SECRET_NAME="$2"
      shift 2
      ;;
    --description)
      [[ $# -ge 2 ]] || fatal "Missing value for --description"
      SECRET_DESCRIPTION="$2"
      shift 2
      ;;
    --show-password|--showPassword)
      SHOW_PASSWORD="true"
      shift
      ;;
    --)
      shift
      break
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fatal "Unknown argument: $1"
      ;;
  esac
done

if [[ $# -gt 0 ]]; then
  fatal "Unexpected argument(s): $*"
fi

if [[ -z "$SMOKE_USER" ]]; then
  read -rp "Enter smoke user email: " SMOKE_USER
fi

[[ -n "$SMOKE_USER" ]] || fatal "Smoke user email is required (pass --user or set SMOKE_USER)."

if [[ -z "$USER_POOL_ID" ]]; then
  read -rp "Enter Cognito User Pool ID: " USER_POOL_ID
fi

[[ -n "$USER_POOL_ID" ]] || fatal "Cognito User Pool ID is required (pass --user-pool-id or set COGNITO_USER_POOL_ID)."

if [[ -z "$SECRET_NAME" ]]; then
  SECRET_NAME="improview/${ENV_NAME}/smoke-credentials"
fi

require_command aws
require_command python3

if [[ -z "$SMOKE_PASSWORD" ]]; then
  require_command openssl
  log_step "Generating secure password"
  SMOKE_PASSWORD="$(openssl rand -base64 24)"
  log_success "Generated random password."
else
  log_step "Using provided password"
  log_info "Password supplied via flag/environment; will be stored as-is."
fi

log_step "Configuration summary"
log_info "Environment:        ${ENV_NAME}"
log_info "AWS Region:         ${REGION}"
log_info "Cognito Pool ID:    ${USER_POOL_ID}"
log_info "Smoke User Email:   ${SMOKE_USER}"
log_info "Secrets Manager ID: ${SECRET_NAME}"

log_step "Creating or updating Cognito user"
if ! create_output="$(aws cognito-idp admin-create-user \
  --region "$REGION" \
  --user-pool-id "$USER_POOL_ID" \
  --username "$SMOKE_USER" \
  --user-attributes Name=email,Value="$SMOKE_USER" Name=email_verified,Value=true \
  --message-action SUPPRESS 2>&1)"; then
  if [[ "$create_output" == *"UsernameExistsException"* ]]; then
    log_warn "Cognito user already exists; continuing with password update."
  else
    log_error "Failed to create smoke user:"
    log_error "$create_output"
    exit 1
  fi
else
  log_success "Created Cognito user."
fi

log_step "Setting permanent password"
if ! aws cognito-idp admin-set-user-password \
  --region "$REGION" \
  --user-pool-id "$USER_POOL_ID" \
  --username "$SMOKE_USER" \
  --password "$SMOKE_PASSWORD" \
  --permanent >/dev/null; then
  fatal "Failed to set permanent password for ${SMOKE_USER}."
fi
log_success "Password set and marked permanent."

export SMOKE_USER SMOKE_PASSWORD
SECRET_PAYLOAD="$(python3 - <<'PY'
import json
import os

print(json.dumps({
    "username": os.environ["SMOKE_USER"],
    "password": os.environ["SMOKE_PASSWORD"],
}))
PY
)"

log_step "Storing credentials in Secrets Manager"
if aws secretsmanager describe-secret \
  --region "$REGION" \
  --secret-id "$SECRET_NAME" >/dev/null 2>&1; then
  log_warn "Secret already exists; storing new version with put-secret-value."
  if ! aws secretsmanager put-secret-value \
    --region "$REGION" \
    --secret-id "$SECRET_NAME" \
    --secret-string "$SECRET_PAYLOAD" >/dev/null; then
    fatal "Failed to update existing secret ${SECRET_NAME}."
  fi
  log_success "Updated secret ${SECRET_NAME}."
else
  if ! aws secretsmanager create-secret \
    --region "$REGION" \
    --name "$SECRET_NAME" \
    --description "$SECRET_DESCRIPTION" \
    --secret-string "$SECRET_PAYLOAD" >/dev/null; then
    fatal "Failed to create secret ${SECRET_NAME}."
  fi
  log_success "Created secret ${SECRET_NAME}."
fi

log_step "Verifying Cognito user status"
if ! aws cognito-idp admin-get-user \
  --region "$REGION" \
  --user-pool-id "$USER_POOL_ID" \
  --username "$SMOKE_USER" >/dev/null; then
  log_warn "Unable to verify user with admin-get-user. Please check AWS credentials and permissions."
else
  log_success "Verified user exists and is retrievable."
fi

log_success "Smoke user setup complete."
printf '\n'
log_info "Stored credentials:"
log_info "  Username: ${SMOKE_USER}"
if [[ "${SHOW_PASSWORD}" == "true" ]]; then
  log_info "  Password: ${SMOKE_PASSWORD}"
else
  log_info "  Password: (hidden; pass --show-password to reveal)"
fi
log_info "  Secret:   ${SECRET_NAME} (region ${REGION})"
printf '\n'
log_warn "Reminder: share the password securely and rotate it regularly."
