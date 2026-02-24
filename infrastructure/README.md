# AWS Infrastructure Deployment

This directory contains infrastructure-as-code for deploying the resume agent on AWS.

## Domain Support: abirad.com ✅

For domain deployment with abirad.com, use:

- `aws-cdk-stack-with-domain.ts` - Includes Route 53, SSL certificate, and load balancer setup

For cost-optimized deployment without domain:

- `aws-cdk-stack.ts` - Original stack (no domain, saves $16/month)

## Prerequisites

1. **AWS CLI** installed and configured
2. **AWS CDK** installed: `npm install -g aws-cdk`
3. **Node.js** 18+ installed
4. **Docker** installed (for building images)

## Setup

### 1. Install Dependencies

```bash
cd infrastructure
npm install
```

### 2. Bootstrap CDK (first time only)

```bash
cdk bootstrap
```

### 3. Create Secrets in AWS Secrets Manager

Before deploying, create the required secrets:

```bash
# Session secret
aws secretsmanager create-secret \
  --name resume-agent/session-secret \
  --secret-string "your-random-64-character-string"

# Encryption key (64 hex characters)
aws secretsmanager create-secret \
  --name resume-agent/encryption-key \
  --secret-string "your-64-hex-character-encryption-key"

# Google OAuth credentials
aws secretsmanager create-secret \
  --name resume-agent/google-client-id \
  --secret-string "your-google-client-id"

aws secretsmanager create-secret \
  --name resume-agent/google-client-secret \
  --secret-string "your-google-client-secret"
```

Generate secrets:

```bash
# Session secret
openssl rand -hex 32

# Encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Build and Push Docker Image

```bash
# Build image
cd ..
docker build -t resume-agent .

# Get ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag resume-agent:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/resume-agent:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/resume-agent:latest
```

### 5. Deploy Stack

```bash
cd infrastructure
cdk deploy
```

## Cost Optimization

The stack is configured for minimal costs:

- **Single AZ**: Saves on multi-AZ costs
- **No NAT Gateway**: Uses public IPs (saves $32/month)
- **No Load Balancer**: Commented out (saves $16/month)
- **Minimal instances**: t3.micro for RDS and Redis
- **Minimal Fargate**: 0.25 vCPU, 0.5GB RAM

## Estimated Monthly Cost

- ECS Fargate: ~$7-10
- RDS PostgreSQL: ~$15
- ElastiCache Redis: ~$12
- Storage: ~$3
- **Total: ~$37-40/month** (without ALB)

## Scaling

To scale the service:

```bash
aws ecs update-service \
  --cluster ResumeAgentCluster \
  --service ResumeAgentService \
  --desired-count 2
```

## Monitoring

View logs:

```bash
aws logs tail /aws/ecs/resume-agent --follow
```

View service status:

```bash
aws ecs describe-services \
  --cluster ResumeAgentCluster \
  --services ResumeAgentService
```

## Cleanup

To destroy all resources:

```bash
cdk destroy
```

**Warning**: This will delete all data including the database!
