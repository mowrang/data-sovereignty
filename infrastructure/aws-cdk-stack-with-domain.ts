/**
 * AWS CDK Stack for Abirad.com Domain Deployment
 *
 * Deploys the resume agent application on AWS with abirad.com domain support
 */

import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as rds from "aws-cdk-lib/aws-rds";
import * as elasticache from "aws-cdk-lib/aws-elasticache";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as logs from "aws-cdk-lib/aws-logs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export class ResumeAgentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domainName = process.env.DOMAIN || "abirad.com";
    const useDomain = process.env.USE_DOMAIN === "true";

    // VPC for isolated network
    const vpc = new ec2.Vpc(this, "ResumeAgentVPC", {
      maxAzs: 1, // Single AZ for cost savings
      natGateways: 0, // Use Fargate with public IPs to save on NAT Gateway
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // Security Groups
    const dbSecurityGroup = new ec2.SecurityGroup(this, "DBSecurityGroup", {
      vpc,
      description: "Security group for RDS PostgreSQL",
      allowAllOutbound: false,
    });

    const redisSecurityGroup = new ec2.SecurityGroup(
      this,
      "RedisSecurityGroup",
      {
        vpc,
        description: "Security group for ElastiCache Redis",
        allowAllOutbound: false,
      },
    );

    const ecsSecurityGroup = new ec2.SecurityGroup(this, "ECSSecurityGroup", {
      vpc,
      description: "Security group for ECS tasks",
      allowAllOutbound: true,
    });

    const albSecurityGroup = new ec2.SecurityGroup(this, "ALBSecurityGroup", {
      vpc,
      description: "Security group for Application Load Balancer",
      allowAllOutbound: true,
    });

    // Allow ALB to access ECS
    ecsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(3001),
      "Allow ALB to access Web UI",
    );

    ecsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(3000),
      "Allow ALB to access Auth Server",
    );

    // Allow ECS to access RDS
    dbSecurityGroup.addIngressRule(
      ecsSecurityGroup,
      ec2.Port.tcp(5432),
      "Allow ECS to access PostgreSQL",
    );

    // Allow ECS to access Redis
    redisSecurityGroup.addIngressRule(
      ecsSecurityGroup,
      ec2.Port.tcp(6379),
      "Allow ECS to access Redis",
    );

    // Allow HTTPS from internet to ALB
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow HTTPS from internet",
    );

    // Allow HTTP from internet to ALB (for redirect)
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "Allow HTTP from internet",
    );

    // RDS PostgreSQL (db.t3.micro - cost optimized)
    const dbInstance = new rds.DatabaseInstance(this, "ResumeAgentDB", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO,
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      securityGroups: [dbSecurityGroup],
      allocatedStorage: 20, // GB
      storageType: rds.StorageType.GP3,
      databaseName: "langgraph",
      credentials: rds.Credentials.fromGeneratedSecret("langgraph"),
      backupRetention: cdk.Duration.days(7),
      deletionProtection: false, // Set to true in production
      multiAz: false, // Single AZ for cost savings
      publiclyAccessible: false,
    });

    // ElastiCache Redis (cache.t3.micro - cost optimized)
    const redisSubnetGroup = new elasticache.CfnSubnetGroup(
      this,
      "RedisSubnetGroup",
      {
        description: "Subnet group for Redis",
        subnetIds: vpc.publicSubnets.map((s) => s.subnetId),
      },
    );

    const redisCluster = new elasticache.CfnCacheCluster(
      this,
      "ResumeAgentRedis",
      {
        cacheNodeType: "cache.t3.micro",
        engine: "redis",
        numCacheNodes: 1,
        vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
        cacheSubnetGroupName: redisSubnetGroup.ref,
        engineVersion: "7.0",
      },
    );

    // ECS Cluster
    const cluster = new ecs.Cluster(this, "ResumeAgentCluster", {
      vpc,
      containerInsights: false, // Disable for cost savings
    });

    // ECR Repository
    const repository = new ecr.Repository(this, "ResumeAgentRepository", {
      repositoryName: "resume-agent",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      "ResumeAgentTask",
      {
        memoryLimitMiB: 512, // 0.5GB - minimal for cost
        cpu: 256, // 0.25 vCPU - minimal for cost
      },
    );

    // Container Definition
    const container = taskDefinition.addContainer("ResumeAgentContainer", {
      image: ecs.ContainerImage.fromEcrRepository(repository, "latest"),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "resume-agent",
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
      environment: {
        NODE_ENV: "production",
        POSTGRES_HOST: dbInstance.dbInstanceEndpointAddress,
        POSTGRES_PORT: "5432",
        POSTGRES_DB: "langgraph",
        REDIS_HOST: redisCluster.attrRedisEndpointAddress,
        REDIS_PORT: "6379",
        LANGGRAPH_API_URL: "http://localhost:54367",
        WEB_UI_URL: useDomain ? `https://${domainName}` : undefined,
        AUTH_SERVER_URL: useDomain ? `https://${domainName}` : undefined,
        GOOGLE_REDIRECT_URI: useDomain
          ? `https://${domainName}/auth/google/callback`
          : undefined,
        AUTH_SUCCESS_REDIRECT_URL: useDomain
          ? `https://${domainName}`
          : undefined,
      },
      secrets: {
        POSTGRES_USER: ecs.Secret.fromSecretsManager(
          dbInstance.secret!,
          "username",
        ),
        POSTGRES_PASSWORD: ecs.Secret.fromSecretsManager(
          dbInstance.secret!,
          "password",
        ),
        SESSION_SECRET: ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(
            this,
            "SessionSecret",
            "resume-agent/session-secret",
          ),
        ),
        ENCRYPTION_KEY: ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(
            this,
            "EncryptionKey",
            "resume-agent/encryption-key",
          ),
        ),
        GOOGLE_CLIENT_ID: ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(
            this,
            "GoogleClientId",
            "resume-agent/google-client-id",
          ),
        ),
        GOOGLE_CLIENT_SECRET: ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(
            this,
            "GoogleClientSecret",
            "resume-agent/google-client-secret",
          ),
        ),
      },
    });

    container.addPortMappings({
      containerPort: 3000, // Auth server
      protocol: ecs.Protocol.TCP,
    });

    container.addPortMappings({
      containerPort: 3001, // Web UI
      protocol: ecs.Protocol.TCP,
    });

    container.addPortMappings({
      containerPort: 54367, // LangGraph API
      protocol: ecs.Protocol.TCP,
    });

    // Application Load Balancer (required for domain)
    const alb = new elbv2.ApplicationLoadBalancer(this, "ResumeAgentALB", {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
    });

    // Target Group for Web UI
    const webUITargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      "WebUITargetGroup",
      {
        vpc,
        port: 3001,
        protocol: elbv2.ApplicationProtocol.HTTP,
        healthCheck: {
          path: "/api/health",
          interval: cdk.Duration.seconds(30),
          timeout: cdk.Duration.seconds(5),
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 3,
        },
      },
    );

    // Target Group for Auth Server
    const authTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      "AuthTargetGroup",
      {
        vpc,
        port: 3000,
        protocol: elbv2.ApplicationProtocol.HTTP,
        healthCheck: {
          path: "/health",
          interval: cdk.Duration.seconds(30),
          timeout: cdk.Duration.seconds(5),
          healthyThresholdCount: 2,
          unhealthyThresholdCount: 3,
        },
      },
    );

    // ECS Service
    const service = new ecs.FargateService(this, "ResumeAgentService", {
      cluster,
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      securityGroups: [ecsSecurityGroup],
      loadBalancers: [
        {
          containerName: "ResumeAgentContainer",
          containerPort: 3001,
          targetGroupArn: webUITargetGroup.targetGroupArn,
        },
        {
          containerName: "ResumeAgentContainer",
          containerPort: 3000,
          targetGroupArn: authTargetGroup.targetGroupArn,
        },
      ],
    });

    // Domain setup (if enabled)
    if (useDomain) {
      // Get or create hosted zone
      let hostedZone: route53.IHostedZone;

      try {
        hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
          domainName: domainName,
        });
      } catch {
        // Create hosted zone if it doesn't exist
        hostedZone = new route53.HostedZone(this, "HostedZone", {
          zoneName: domainName,
        });
      }

      // SSL Certificate (must be created manually first in ACM)
      const certificateArn = process.env.SSL_CERTIFICATE_ARN;

      if (certificateArn) {
        const certificate = acm.Certificate.fromCertificateArn(
          this,
          "Certificate",
          certificateArn,
        );

        // HTTPS listener
        const httpsListener = alb.addListener("HttpsListener", {
          port: 443,
          protocol: elbv2.ApplicationProtocol.HTTPS,
          certificates: [certificate],
          defaultAction: elbv2.ListenerAction.forward([webUITargetGroup]),
        });

        // Route /auth/* paths to auth server (higher priority = evaluated first)
        httpsListener.addAction("AuthAction", {
          priority: 100,
          conditions: [elbv2.ListenerCondition.pathPatterns(["/auth/*"])],
          action: elbv2.ListenerAction.forward([authTargetGroup]),
        });

        // HTTP listener (redirect to HTTPS)
        alb.addListener("HttpListener", {
          port: 80,
          protocol: elbv2.ApplicationProtocol.HTTP,
          defaultAction: elbv2.ListenerAction.redirect({
            protocol: "HTTPS",
            port: "443",
            permanent: true,
          }),
        });

        // Route 53 A record for domain
        new route53.ARecord(this, "DomainRecord", {
          zone: hostedZone,
          recordName: domainName,
          target: route53.RecordTarget.fromAlias(
            new route53Targets.LoadBalancerTarget(alb),
          ),
        });

        // www subdomain (optional)
        new route53.ARecord(this, "WwwDomainRecord", {
          zone: hostedZone,
          recordName: `www.${domainName}`,
          target: route53.RecordTarget.fromAlias(
            new route53Targets.LoadBalancerTarget(alb),
          ),
        });

        new cdk.CfnOutput(this, "DomainURL", {
          value: `https://${domainName}`,
          description: "Application URL",
        });
      } else {
        console.warn(
          "⚠️ SSL_CERTIFICATE_ARN not set. Domain setup skipped. Create certificate in ACM first.",
        );
      }
    } else {
      // No domain - use HTTP listener only
      alb.addListener("HttpListener", {
        port: 80,
        protocol: elbv2.ApplicationProtocol.HTTP,
        defaultAction: elbv2.ListenerAction.forward([webUITargetGroup]),
      });

      alb.addListener("AuthListener", {
        port: 80,
        protocol: elbv2.ApplicationProtocol.HTTP,
        defaultAction: elbv2.ListenerAction.forward([authTargetGroup]),
      });
    }

    // Outputs
    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: alb.loadBalancerDnsName,
      description: "Load Balancer DNS name",
    });

    new cdk.CfnOutput(this, "DatabaseEndpoint", {
      value: dbInstance.dbInstanceEndpointAddress,
      description: "RDS PostgreSQL endpoint",
    });

    new cdk.CfnOutput(this, "RedisEndpoint", {
      value: redisCluster.attrRedisEndpointAddress,
      description: "ElastiCache Redis endpoint",
    });

    new cdk.CfnOutput(this, "ServiceName", {
      value: service.serviceName,
      description: "ECS Service name",
    });

    new cdk.CfnOutput(this, "ClusterName", {
      value: cluster.clusterName,
      description: "ECS Cluster name",
    });
  }
}
