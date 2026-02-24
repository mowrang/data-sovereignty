# AWS Cost-Optimized Deployment Guide

## Architecture for Minimal AWS Costs

Since you only want to pay for infrastructure (not AI services), here's a cost-optimized setup:

```
┌─────────────────────────────────────────┐
│         Application Load Balancer       │
│              (ALB - $16/month)           │
└───────────────┬─────────────────────────┘
                │
        ┌───────▼───────┐
        │  ECS Fargate  │
        │  (2 tasks)    │
        │  ~$15/month   │
        └───────┬───────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼───┐   ┌───▼───┐   ┌───▼───┐
│ RDS   │   │Redis  │   │  S3   │
│Postgres│  │Cache  │   │(logs) │
│$15/mo │   │$12/mo │   │$1/mo  │
└───────┘   └───────┘   └───────┘
```

## Cost Breakdown for 10 Users

### Monthly AWS Costs

| Service                       | Configuration                        | Monthly Cost      |
| ----------------------------- | ------------------------------------ | ----------------- |
| **ECS Fargate**               | 2 tasks × 0.25 vCPU × 0.5GB RAM      | **$7-10**         |
| **Application Load Balancer** | 1 ALB (shared)                       | **$16**           |
| **RDS PostgreSQL**            | db.t3.micro (1 vCPU, 1GB RAM)        | **$15**           |
| **ElastiCache Redis**         | cache.t3.micro (0.5GB)               | **$12**           |
| **EBS Storage**               | 20GB for RDS + 10GB for ECS          | **$3**            |
| **Data Transfer**             | ~10GB/month (minimal)                | **$1**            |
| **CloudWatch**                | Basic monitoring                     | **$2**            |
| **Route 53**                  | Hosted zone (if using custom domain) | **$0.50**         |
| **S3**                        | Logs and backups (minimal)           | **$1**            |
| **Total**                     |                                      | **~$57-60/month** |

### Cost Optimization Tips

1. **Use Fargate Spot** (if available): Save 70% on compute → **$2-3/month** instead of $7-10
2. **Single AZ RDS**: Use single-AZ instead of multi-AZ → Save **$15/month**
3. **Skip ALB initially**: Use ECS service directly → Save **$16/month** (but lose HTTPS)
4. **Use t3.micro burstable**: Good for low-traffic → Already using this

**Minimum Cost (with optimizations)**: **~$30-35/month**

## Detailed Service Configuration

### 1. ECS Fargate (Compute)

**Configuration:**

- **Tasks**: 2 (for redundancy)
- **CPU**: 0.25 vCPU per task
- **Memory**: 512 MB per task
- **Platform**: Linux/X86_64

**Cost Calculation:**

- vCPU: $0.04048/hour × 0.25 × 2 tasks × 730 hours = **$7.40/month**
- Memory: $0.004445/GB-hour × 0.5GB × 2 tasks × 730 hours = **$3.24/month**
- **Total: ~$10.64/month**

**For 10 users/day**: This is more than enough capacity.

### 2. RDS PostgreSQL

**Configuration:**

- **Instance**: db.t3.micro
- **Storage**: 20GB gp3
- **Backups**: 7 days retention
- **Multi-AZ**: No (single AZ for cost savings)

**Cost Calculation:**

- Instance: $0.017/hour × 730 hours = **$12.41/month**
- Storage: 20GB × $0.115/GB = **$2.30/month**
- **Total: ~$15/month**

### 3. ElastiCache Redis

**Configuration:**

- **Instance**: cache.t3.micro
- **Memory**: 0.5GB
- **Multi-AZ**: No

**Cost Calculation:**

- Instance: $0.017/hour × 730 hours = **$12.41/month**
- **Total: ~$12/month**

### 4. Application Load Balancer

**Configuration:**

- **Type**: Application Load Balancer
- **LCU**: ~0.1 LCU (very low traffic)

**Cost Calculation:**

- Fixed: $0.0225/hour × 730 hours = **$16.43/month**
- LCU: ~$0.008/hour × 730 = **$5.84/month**
- **Total: ~$22/month**

**Alternative**: Skip ALB initially, use ECS service directly with public IP → **$0/month** (but no HTTPS without ALB)

### 5. Data Transfer

**Estimation for 10 users/day × 10 resumes:**

- Each resume operation: ~100KB request + 500KB response = 600KB
- Daily: 10 users × 10 resumes × 600KB = 60MB/day
- Monthly: 60MB × 30 = 1.8GB
- **Cost**: First 100GB free, then $0.09/GB = **~$0.20/month**

### 6. CloudWatch

**Basic monitoring:**

- Logs: ~100MB/month = **$0.50**
- Metrics: 10 custom metrics = **$1.50**
- **Total: ~$2/month**

## Usage Pattern Analysis

### For 10 Users × 10 Resumes/Day:

**Daily Operations:**

- 10 users login (auth requests)
- 10 users read resumes (Google Docs API calls)
- 100 resume updates (10 per user)
- 100 AI API calls (to user's AI provider - **NOT AWS**)

**Resource Usage:**

- **CPU**: Burst usage during AI processing, idle most of the time
- **Memory**: ~200MB average, spikes to 500MB during processing
- **Database**: ~1000 writes/day, ~5000 reads/day
- **Redis**: ~2000 operations/day
- **Network**: ~60MB/day

**This workload fits comfortably in:**

- t3.micro instances (burstable)
- 0.25 vCPU Fargate tasks
- Minimal storage

## Cost Breakdown by Component

### Infrastructure Costs (AWS)

- Compute (ECS): $7-10/month
- Database (RDS): $15/month
- Cache (Redis): $12/month
- Load Balancer: $16/month (optional)
- Storage: $3/month
- Network: $1/month
- Monitoring: $2/month
- **Total AWS: $57-60/month**

### External Costs (NOT AWS)

- **AI API Calls**: Users pay their own providers

  - Anthropic: ~$0.003 per resume update
  - OpenAI: ~$0.002 per resume update
  - **User pays directly, not AWS**

- **Google OAuth**: Free (users authenticate with Google)

### Total Cost to You

- **AWS Infrastructure**: $57-60/month
- **AI Costs**: $0 (users pay their providers)
- **Total**: **$57-60/month** for 10 active users

## Cost Per User

- **Per user per month**: $57 ÷ 10 = **$5.70/user/month**
- **Per resume update**: $57 ÷ (10 users × 10 resumes × 30 days) = **$0.019/resume**

## Scaling Costs

| Users | Monthly Cost | Cost/User |
| ----- | ------------ | --------- |
| 10    | $57-60       | $5.70     |
| 50    | $80-90       | $1.60     |
| 100   | $120-140     | $1.20     |
| 500   | $300-400     | $0.60     |

**Note**: Costs decrease per user as you scale due to fixed costs (ALB, base infrastructure).

## Cost Optimization Strategies

### 1. Start Without Load Balancer

- Use ECS service with public IP
- Use CloudFront for HTTPS (cheaper than ALB)
- **Save: $16/month** → **Total: $41-44/month**

### 2. Use Fargate Spot (if available)

- 70% discount on compute
- **Save: $5-7/month** → **Total: $36-39/month**

### 3. Single AZ Everything

- RDS single-AZ (already doing this)
- Redis single-AZ
- **No additional savings** (already optimized)

### 4. Reserved Instances (for 1-year commitment)

- RDS: 30% discount
- **Save: $4.50/month** → **Total: $52-55/month**

### 5. Use Smaller Instances Initially

- Start with minimal resources
- Scale up only when needed
- **Current config is already minimal**

## Minimum Viable Setup

**Absolute minimum for 10 users:**

| Service        | Config                     | Cost           |
| -------------- | -------------------------- | -------------- |
| ECS Fargate    | 1 task, 0.25 vCPU, 0.5GB   | $5             |
| RDS PostgreSQL | db.t3.micro, 10GB          | $12            |
| ElastiCache    | cache.t3.micro, 0.5GB      | $12            |
| CloudFront     | For HTTPS (instead of ALB) | $1             |
| S3             | Logs                       | $1             |
| **Total**      |                            | **~$31/month** |

**Trade-offs:**

- No load balancer (use CloudFront instead)
- Single task (no redundancy)
- Smaller storage
- Less monitoring

## Deployment Steps

### 1. Create Infrastructure

```bash
# Use AWS CDK or Terraform (see infrastructure/ directory)
cd infrastructure/
npm install
cdk deploy
```

### 2. Configure Environment Variables

Set in ECS task definition:

```bash
POSTGRES_HOST=<rds-endpoint>
REDIS_URL=redis://<elasticache-endpoint>:6379
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-secret>
SESSION_SECRET=<random-string>
ENCRYPTION_KEY=<random-hex-string>
```

### 3. Deploy Application

```bash
# Build Docker image
docker build -t resume-agent .

# Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker tag resume-agent:latest <account>.dkr.ecr.<region>.amazonaws.com/resume-agent:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/resume-agent:latest

# Update ECS service
aws ecs update-service --cluster resume-agent --service resume-agent-service --force-new-deployment
```

## Monitoring Costs

**Free Tier Includes:**

- 10 custom metrics
- 5GB log ingestion
- 10 dashboard widgets

**For 10 users, you'll likely stay within free tier:**

- **Cost: $0/month**

## Billing Alerts

Set up AWS Budgets to monitor costs:

```bash
# Create budget alert at $60/month
aws budgets create-budget \
  --account-id <your-account> \
  --budget file://budget.json
```

## Summary

**For 10 users using the app once a day to update 10 resumes:**

- **AWS Infrastructure Cost**: **$57-60/month**
- **AI Costs**: **$0** (users pay their providers)
- **Cost per user**: **$5.70/month**
- **Cost per resume update**: **$0.019**

**With optimizations**: **$31-35/month**

The main costs are:

1. **Load Balancer** ($16/month) - can skip initially
2. **RDS PostgreSQL** ($15/month) - necessary
3. **ElastiCache Redis** ($12/month) - necessary for performance
4. **ECS Fargate** ($7-10/month) - compute

All AI API calls go to user's own providers (Anthropic, OpenAI, etc.), so you don't pay for those.
