# Improview CDK

Straightforward CDK app that stands up the AWS resources needed for a working `dev` environment.

## Stacks
- `Improview-<env>-Auth` – Cognito user pool (+ app client/domain) and Secrets Manager placeholder for LLM keys.
- `Improview-<env>-Backend` – Go API Lambda behind an HTTP API, DynamoDB single-table storage, and an S3 bucket for attempt artifacts.
- `Improview-<env>-Frontend` – S3 static hosting bucket locked behind CloudFront with optional `/api/*` proxy to the backend.

## Usage
```bash
cd infra/cdk
pnpm install
pnpm build
pnpm cdk synth  # or pnpm synth
```

Context values in `cdk.json` default to `env=dev` and `authDomainPrefix=improview-dev`. Override them with `-c env=stage` (and `-c authDomainPrefix=<unique-prefix>`) when you add more environments.

Deploy each stack once AWS credentials, region, and the Go Lambda handler are configured:

```bash
# one-time bootstrap per account/region (if not already done)
pnpm cdk bootstrap aws://<account-id>/<region>

# deploy dev environment
pnpm cdk deploy Improview-dev-Auth
pnpm cdk deploy Improview-dev-Backend
pnpm cdk deploy Improview-dev-Frontend
```

Populate the generated Secrets Manager secret with real provider keys, hook the frontend build output to the bucket reported in the stack outputs, and update allowed callback/logout URLs on the user pool client as your app domains stabilize.

### Deploying to another environment

Supply a different environment name and domain prefix on deployment. For example, staging:

```bash
pnpm cdk deploy \
  -c env=stage \
  -c authDomainPrefix=improview-stage \
  Improview-stage-Auth Improview-stage-Backend Improview-stage-Frontend
```

The stack names include the environment, so you can deploy multiple environments side-by-side in the same account.

### Update provider credentials
Use the helper script to set or rotate the LLM provider secret:

```bash
pnpm --dir infra/cdk exec node scripts/set-provider-secret.js \
  --env dev \
  --region us-east-1 \
  --openai "$OPENAI_API_KEY" \
  --grok "$GROK_API_KEY"
```

Install the dependencies first (`pnpm --dir infra/cdk install`) so the script can load the AWS SDK helper.

You can rely on environment variables (`OPENAI_API_KEY`, `GROK_API_KEY`, `AWS_REGION`) instead of CLI flags if you prefer. The script merges with any existing secret payload and stamps an `updatedAt` timestamp.
