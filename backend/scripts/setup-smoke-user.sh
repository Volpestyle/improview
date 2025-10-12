#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# shellcheck source=../../scripts/lib/bash/common.sh
source "${REPO_ROOT}/scripts/lib/bash/common.sh"

usage() {
  cat <<'EOF'
Usage: setup-smoke-user.sh [options]

Options:
  --env <name>             Environment suffix to target (default: dev).
  --region <aws-region>    AWS region for Cognito and Secrets Manager (default: AWS_REGION/AWS_DEFAULT_REGION/us-east-1).
  --user <email>           Email/username for the smoke tester (default: smoke.<env>@improview.dev or SMOKE_USER env).
  --password <value>       Password for the smoke tester; generated when omitted.
  --user-pool-id <id>      Cognito User Pool ID (default: USER_POOL_ID).
  --secret-name <name>     Secrets Manager name for credentials (default: improview/<env>/smoke-credentials).
  --description <text>     Secret description (default: Cognito smoke-test credentials).
  --show-password          Display the password in logs.
  -h, --help               Show this help message.

Environment:
  SMOKE_ENV, SMOKE_USER, SMOKE_PASSWORD, USER_POOL_ID,
  AWS_REGION, AWS_DEFAULT_REGION, NO_COLOR
EOF
}

ENV_NAME="${SMOKE_ENV:-dev}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
SMOKE_USER="${SMOKE_USER:-}"
SMOKE_PASSWORD="${SMOKE_PASSWORD:-}"
USER_POOL_ID="${USER_POOL_ID:-}"
SECRET_NAME=""
SECRET_DESCRIPTION="Cognito smoke-test credentials"
SHOW_PASSWORD=0
SHOW_HELP=0

improview_cli_reset
improview_cli_register "--env" "string" "ENV_NAME"
improview_cli_register "--region" "string" "REGION"
improview_cli_register "--user" "string" "SMOKE_USER"
improview_cli_register "--password" "string" "SMOKE_PASSWORD"
improview_cli_register "--user-pool-id" "string" "USER_POOL_ID"
improview_cli_register "--secret-name" "string" "SECRET_NAME"
improview_cli_register "--description" "string" "SECRET_DESCRIPTION"
improview_cli_register "--show-password" "bool" "SHOW_PASSWORD"
improview_cli_register "--help" "bool" "SHOW_HELP"
improview_cli_register "-h" "bool" "SHOW_HELP"

improview_cli_parse "$@"

if [[ ${SHOW_HELP} -ne 0 ]]; then
  usage
  exit 0
fi

if [[ -z "${SMOKE_USER}" ]]; then
  if [[ $(improview_cli_flag_provided "--user") -eq 0 ]]; then
    SMOKE_USER="smoke.${ENV_NAME}@improview.dev"
  fi
fi

if [[ -z "${SMOKE_USER}" ]]; then
  if [[ -t 0 ]]; then
    read -rp "Enter smoke user email: " SMOKE_USER
  else
    fatal "Smoke user email is required (pass --user or set SMOKE_USER)."
  fi
fi

if [[ -z "${SMOKE_USER}" ]]; then
  fatal "Smoke user email is required."
fi

if [[ -z "${USER_POOL_ID}" ]]; then
  if [[ -t 0 ]]; then
    read -rp "Enter Cognito User Pool ID: " USER_POOL_ID
  else
    fatal "Cognito User Pool ID is required (pass --user-pool-id or set USER_POOL_ID)."
  fi
fi

if [[ -z "${SECRET_NAME}" ]]; then
  SECRET_NAME="improview/${ENV_NAME}/smoke-credentials"
fi

require_command aws
require_command python3
require_command openssl

if [[ -z "${SMOKE_PASSWORD}" ]]; then
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

log_step "Ensuring Cognito user exists"
if ! create_output="$(
  aws cognito-idp admin-create-user \
    --region "${REGION}" \
    --user-pool-id "${USER_POOL_ID}" \
    --username "${SMOKE_USER}" \
    --user-attributes Name=email,Value="${SMOKE_USER}" Name=email_verified,Value=true \
    --message-action SUPPRESS 2>&1
)"; then
  if [[ "${create_output}" == *"UsernameExistsException"* ]]; then
    log_warn "Cognito user already exists; continuing with password update."
  else
    log_error "Failed to create smoke user:"
    log_error "${create_output}"
    exit 1
  fi
else
  log_success "Created Cognito user."
fi

log_step "Setting permanent password"
if ! aws cognito-idp admin-set-user-password \
  --region "${REGION}" \
  --user-pool-id "${USER_POOL_ID}" \
  --username "${SMOKE_USER}" \
  --password "${SMOKE_PASSWORD}" \
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
  --region "${REGION}" \
  --secret-id "${SECRET_NAME}" >/dev/null 2>&1; then
  log_warn "Secret already exists; storing new version with put-secret-value."
  if ! aws secretsmanager put-secret-value \
    --region "${REGION}" \
    --secret-id "${SECRET_NAME}" \
    --secret-string "${SECRET_PAYLOAD}" >/dev/null; then
    fatal "Failed to update existing secret ${SECRET_NAME}."
  fi
  log_success "Updated secret ${SECRET_NAME}."
else
  if ! aws secretsmanager create-secret \
    --region "${REGION}" \
    --name "${SECRET_NAME}" \
    --description "${SECRET_DESCRIPTION}" \
    --secret-string "${SECRET_PAYLOAD}" >/dev/null; then
    fatal "Failed to create secret ${SECRET_NAME}."
  fi
  log_success "Created secret ${SECRET_NAME}."
fi

log_step "Verifying Cognito user status"
if ! aws cognito-idp admin-get-user \
  --region "${REGION}" \
  --user-pool-id "${USER_POOL_ID}" \
  --username "${SMOKE_USER}" >/dev/null; then
  log_warn "Unable to verify user with admin-get-user. Please check AWS credentials and permissions."
else
  log_success "Verified user exists and is retrievable."
fi

log_success "Smoke user setup complete."
printf '\n'
log_info "Stored credentials:"
log_info "  Username: ${SMOKE_USER}"
if [[ ${SHOW_PASSWORD} -eq 1 ]]; then
  log_info "  Password: ${SMOKE_PASSWORD}"
else
  log_info "  Password: (hidden; pass --show-password to reveal)"
fi
log_info "  Secret:   ${SECRET_NAME} (region ${REGION})"
printf '\n'
log_warn "Reminder: share the password securely and rotate it regularly."
