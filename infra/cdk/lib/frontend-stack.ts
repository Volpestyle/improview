import { Stack, StackProps, CfnOutput, Fn, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

interface FrontendStackProps extends StackProps {
  envName: string;
  apiEndpoint?: string;
}

export class FrontendStack extends Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const isDev = props.envName === 'dev';
    const removalPolicy = isDev ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN;

    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      autoDeleteObjects: isDev,
      removalPolicy,
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'SiteOAI');
    siteBucket.grantRead(originAccessIdentity.grantPrincipal);

    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      defaultBehavior: {
        origin: new origins.S3BucketOrigin(siteBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    if (props?.apiEndpoint) {
      const apiDomain = Fn.select(2, Fn.split('/', props.apiEndpoint));
      distribution.addBehavior('/api/*', new origins.HttpOrigin(apiDomain), {
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      });
    }

    new CfnOutput(this, 'SiteBucketName', {
      value: siteBucket.bucketName,
      description: 'Bucket for uploaded frontend assets',
    });

    new CfnOutput(this, 'DistributionDomain', {
      value: distribution.domainName,
      description: 'CloudFront domain serving the frontend',
    });

    new CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID for cache invalidations',
    });
  }
}
