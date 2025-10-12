import * as path from 'path';
import * as os from 'os';
import { Duration, Stack, StackProps, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { HttpApi, HttpMethod, CorsHttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

export interface BackendStackProps extends StackProps {
  envName: string;
  userPool?: cognito.IUserPool;
  userPoolClient?: cognito.IUserPoolClient;
  providerSecret?: secretsmanager.ISecret;
  allowedOrigins?: string[];
}

export class BackendStack extends Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    const envName = props.envName;
    const isDev = envName === 'dev';
    const removalPolicy = isDev ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN;

    const mainTable = new dynamodb.Table(this, 'MainTable', {
      tableName: `improview-${envName}-main`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    mainTable.addGlobalSecondaryIndex({
      indexName: 'gsi1',
      partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const artifactsBucket = new s3.Bucket(this, 'ArtifactsBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      autoDeleteObjects: isDev,
      removalPolicy,
    });

    const apiHandler = new lambda.Function(this, 'ApiHandler', {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      architecture: lambda.Architecture.ARM_64,
      handler: 'bootstrap',
      timeout: Duration.seconds(15),
      memorySize: 512,
      environment: {
        ENV_NAME: envName,
        TABLE_NAME: mainTable.tableName,
        ARTIFACT_BUCKET: artifactsBucket.bucketName,
        PROVIDER_SECRET_ARN: props.providerSecret?.secretArn ?? '',
        COGNITO_USER_POOL_ID: props.userPool?.userPoolId ?? '',
        COGNITO_APP_CLIENT_IDS: props.userPoolClient?.userPoolClientId ?? '',
      },
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', '..', 'backend'), {
        bundling: {
          image: lambda.Runtime.GO_1_X.bundlingImage,
          user: 'root',
          environment: {
            GOOS: 'linux',
            GOARCH: 'arm64',
            CGO_ENABLED: '0',
            GOCACHE: '/tmp/go-build-cache',
            GOMODCACHE: '/tmp/go-mod-cache',
          },
          volumes: [
            {
              hostPath: path.join(os.homedir(), '.cache', 'go', 'mod'),
              containerPath: '/tmp/go-mod-cache',
            },
            {
              hostPath: path.join(os.homedir(), '.cache', 'go', 'build'),
              containerPath: '/tmp/go-build-cache',
            },
          ],
          command: [
            'bash',
            '-c',
            'mkdir -p /tmp/go-build-cache /tmp/go-mod-cache && go build -tags lambda -o /asset-output/bootstrap ./cmd/lambda',
          ],
        },
      }),
    });

    mainTable.grantReadWriteData(apiHandler);
    artifactsBucket.grantReadWrite(apiHandler);
    props.providerSecret?.grantRead(apiHandler);

    const corsOrigins = props.allowedOrigins ?? [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://localhost:5173',
      'https://127.0.0.1:5173',
    ];

    const httpApi = new HttpApi(this, 'HttpApi', {
      apiName: `improview-${envName}-api`,
      corsPreflight: {
        allowHeaders: ['content-type', 'authorization'],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.PUT,
          CorsHttpMethod.DELETE,
          CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: corsOrigins,
        allowCredentials: true,
        maxAge: Duration.hours(1),
      },
    });

    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [HttpMethod.ANY],
      integration: new HttpLambdaIntegration('LambdaIntegration', apiHandler),
    });

    this.apiUrl = httpApi.apiEndpoint;

    new CfnOutput(this, 'ApiEndpoint', {
      value: this.apiUrl,
      description: 'Base URL for the Improview HTTP API',
    });

    new CfnOutput(this, 'DynamoTableName', {
      value: mainTable.tableName,
      description: 'Primary DynamoDB table backing Improview state',
    });

    new CfnOutput(this, 'ArtifactsBucketName', {
      value: artifactsBucket.bucketName,
      description: 'Bucket used to store grading artifacts and traces',
    });
  }
}
