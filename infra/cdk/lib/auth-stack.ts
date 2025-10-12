import { Stack, StackProps, RemovalPolicy, CfnOutput, Fn, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export interface AuthStackProps extends StackProps {
  envName: string;
  domainPrefix?: string;
  webCallbackUrls?: string[];
  webLogoutUrls?: string[];
}

export class AuthStack extends Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly providerSecret: secretsmanager.Secret;
  public readonly userPoolDomain?: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const { envName } = props;
    const defaultCallbackUrls = props.webCallbackUrls ?? [
      'http://localhost:5173/auth/callback',
      'http://127.0.0.1:5173/auth/callback',
    ];
    const defaultLogoutUrls = props.webLogoutUrls ?? [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ];

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `improview-${envName}-users`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        tempPasswordValidity: Duration.days(3),
        minLength: 12,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      mfa: cognito.Mfa.OFF,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.userPoolClient = this.userPool.addClient('WebClient', {
      userPoolClientName: `improview-${envName}-web`,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true,
      },
      preventUserExistenceErrors: true,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: defaultCallbackUrls,
        logoutUrls: defaultLogoutUrls,
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
        cognito.UserPoolClientIdentityProvider.GOOGLE,
      ],
    });

    if (props.domainPrefix) {
      const sanitizedPrefix = props.domainPrefix
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .substring(0, 63);

      this.userPoolDomain = this.userPool.addDomain('UserPoolDomain', {
        cognitoDomain: {
          domainPrefix: sanitizedPrefix,
        },
      });
    }

    this.providerSecret = new secretsmanager.Secret(this, 'ProviderSecret', {
      secretName: `improview/${envName}/providers`,
      description: 'Holds API credentials for LLM providers used in Improview.',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          openaiApiKey: 'replace-with-your-key',
        }),
        generateStringKey: 'placeholder',
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID for Improview users',
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'App client ID used by the frontend to authenticate users',
    });

    if (this.userPoolDomain) {
      new CfnOutput(this, 'UserPoolDomain', {
        value: Fn.sub('https://${Domain}.auth.${AWS::Region}.amazoncognito.com', {
          Domain: this.userPoolDomain.domainName,
        }),
        description: 'Hosted Cognito domain for the improvisation app',
      });
    }

    new CfnOutput(this, 'ProviderSecretArn', {
      value: this.providerSecret.secretArn,
      description: 'Secrets Manager ARN for LLM provider credentials',
    });
  }
}
