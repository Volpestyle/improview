#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { BackendStack } from '../lib/backend-stack';
import { FrontendStack } from '../lib/frontend-stack';
import { AuthStack } from '../lib/auth-stack';

const app = new App();

const envName = (app.node.tryGetContext('env') as string) ?? process.env.IMPROVIEW_ENV ?? 'dev';
const authDomainPrefix = app.node.tryGetContext('authDomainPrefix') as string | undefined;

const authStack = new AuthStack(app, `Improview-${envName}-Auth`, {
  envName,
  domainPrefix: authDomainPrefix,
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
