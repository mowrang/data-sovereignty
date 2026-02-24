/**
 * AWS CDK Stack for Cost-Optimized Deployment
 *
 * Deploys the resume agent application on AWS with minimal costs
 */

import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as rds from "aws-cdk-lib/aws-rds";
import * as elasticache from "aws-cdk-lib/aws-elasticache";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as logs from "aws-cdk-lib/aws-logs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export class ResumeAgentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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

    // ECR Repository (if not exists)
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

    // ECS Service (without load balancer for cost savings)
    const service = new ecs.FargateService(this, "ResumeAgentService", {
      cluster,
      taskDefinition,
      desiredCount: 1, // Start with 1, scale as needed
      assignPublicIp: true, // Use public IPs to avoid NAT Gateway costs
      securityGroups: [ecsSecurityGroup],
    });

    // Optional: Application Load Balancer (comment out to save $16/month)
    /*
    const alb = new elbv2.ApplicationLoadBalancer(this, "ResumeAgentALB", {
      vpc,
      internetFacing: true,
    });

    const listener = alb.addListener("Listener", {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
    });

    listener.addTargets("ResumeAgentTargets", {
      port: 3001,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: {
        path: "/api/health",
        interval: cdk.Duration.seconds(30),
      },
    });
    */

    // Outputs
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
