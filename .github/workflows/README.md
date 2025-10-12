# GitHub Workflows

This directory contains the CI/CD automation for Improview. Before enabling the `ci-cd.yml` workflow, configure repository-level values under **Settings → Secrets and variables → Actions**.

The optional `deploy-dev.yml` workflow can be run manually or by adding the `deploy-dev` label to a pull request. Configure its credentials in the same location (ideally environment-scoped for `dev`). If a dev-specific value is missing, the workflow falls back to the corresponding production secret or variable.

## Secrets
- `AWS_ROLE_TO_ASSUME` (preferred): IAM role ARN used with GitHub OIDC for deployments.
  - If OIDC is not available, instead supply:
    - `AWS_ACCESS_KEY_ID`
    - `AWS_SECRET_ACCESS_KEY`
- `DEV_AWS_ROLE_TO_ASSUME` (preferred): IAM role ARN used for dev deployments. Defaults to `AWS_ROLE_TO_ASSUME` when unset.
  - If OIDC is not available, instead supply:
    - `DEV_AWS_ACCESS_KEY_ID` (defaults to `AWS_ACCESS_KEY_ID` when unset)
    - `DEV_AWS_SECRET_ACCESS_KEY` (defaults to `AWS_SECRET_ACCESS_KEY` when unset)

## Variables
- `AWS_REGION`: AWS deployment region (e.g. `us-east-1`).
- `AWS_S3_BUCKET`: Bucket that receives the built frontend assets.
- `AWS_CLOUDFRONT_DISTRIBUTION_ID` (optional): Distribution to invalidate after uploads.
- `FRONTEND_BUILD_DIR` (optional): Directory containing the built site (defaults to `apps/web/dist` with a `dist` fallback).
- `DEV_AWS_REGION`: Region for dev deployments (optional, defaults to `AWS_REGION` or `us-east-1`).
- `DEV_AWS_S3_BUCKET`: Dev bucket for static assets (optional, defaults to `AWS_S3_BUCKET`).
- `DEV_AWS_CLOUDFRONT_DISTRIBUTION_ID`: Dev distribution to invalidate (optional, defaults to `AWS_CLOUDFRONT_DISTRIBUTION_ID`).
- `DEV_FRONTEND_BUILD_DIR`: Dev build directory override (optional, defaults to `FRONTEND_BUILD_DIR`).
- `DEV_IMPROVIEW_LIVE_BASE_URL`: Optional URL to run smoke tests against after dev deploys (defaults to `IMPROVIEW_LIVE_BASE_URL`).

Review and rotate these values as needed to keep the workflow operational and secure.
