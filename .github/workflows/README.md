# GitHub Workflows

This directory contains the CI/CD automation for Improview. Before enabling the `ci-cd.yml` workflow, configure repository-level values under **Settings → Secrets and variables → Actions**.

## Secrets
- `AWS_ROLE_TO_ASSUME` (preferred): IAM role ARN used with GitHub OIDC for deployments.
  - If OIDC is not available, instead supply:
    - `AWS_ACCESS_KEY_ID`
    - `AWS_SECRET_ACCESS_KEY`

## Variables
- `AWS_REGION`: AWS deployment region (e.g. `us-east-1`).
- `AWS_S3_BUCKET`: Bucket that receives the built frontend assets.
- `AWS_CLOUDFRONT_DISTRIBUTION_ID` (optional): Distribution to invalidate after uploads.
- `FRONTEND_BUILD_DIR` (optional): Directory containing the built site (defaults to `apps/web/dist` with a `dist` fallback).

Review and rotate these values as needed to keep the workflow operational and secure.
