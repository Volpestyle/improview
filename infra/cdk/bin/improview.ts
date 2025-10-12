#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { BackendStack } from '../lib/backend-stack';
import { FrontendStack } from '../lib/frontend-stack';
import { AuthStack } from '../lib/auth-stack';

const app = new App();

const envName = (app.node.tryGetContext('env') as string) ?? process.env.IMPROVIEW_ENV ?? 'dev';
const authDomainPrefix = app.node.tryGetContext('authDomainPrefix') as string | undefined;
const googleClientId =
  (app.node.tryGetContext('googleClientId') as string | undefined) ?? process.env.GOOGLE_CLIENT_ID;
const googleClientSecret =
  (app.node.tryGetContext('googleClientSecret') as string | undefined) ?? process.env.GOOGLE_CLIENT_SECRET;
const googleScopesContext =
  (app.node.tryGetContext('googleScopes') as string | string[] | undefined) ?? process.env.GOOGLE_CLIENT_SCOPES;
const googleScopes = Array.isArray(googleScopesContext)
  ? googleScopesContext
  : googleScopesContext?.split(/[\s,]+/).filter((scope) => scope.length > 0);

const authStack = new AuthStack(app, `Improview-${envName}-Auth`, {
  envName,
  domainPrefix: authDomainPrefix,
  googleClientId: googleClientId?.trim() || undefined,
  googleClientSecret: googleClientSecret?.trim() || undefined,
  googleScopes,
});

const backendStack = new BackendStack(app, `Improview-${envName}-Backend`, {
  envName,
  providerSecret: authStack.providerSecret,
  userPool: authStack.userPool,
  userPoolClient: authStack.userPoolClient,
});

new FrontendStack(app, `Improview-${envName}-Frontend`, {
  envName,
  apiEndpoint: backendStack.apiUrl,
});
