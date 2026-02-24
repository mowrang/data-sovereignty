# AWS Deployment Guide

Complete guide for deploying the Resume Agent to AWS.

---

## Architecture Recommendation

### ✅ **Recommended: Separate Docker Containers**

**Why separate containers:**

- ✅ **Independent scaling** - Scale Web UI and LangGraph API separately
- ✅ **Better resource management** - Different CPU/memory needs
- ✅ **Easier updates** - Update one without affecting the other
- ✅ **AWS best practices** - Aligns with ECS/Fargate patterns
- ✅ **Cost optimization** - Right-size each service independently

**Architecture:**

```
Internet
    ↓
AWS ALB (Application Load Balancer)
    ↓
┌─────────────────┬─────────────────┐
│  Web UI         │  LangGraph API  │
│  Container      │  Container      │
│  Port 3001      │  Port 54367     │
└─────────────────┴─────────────────┘
         │                  │
         └──────────┬───────┘
                    ↓
         ┌──────────────────┐
         │  PostgreSQL      │
         │  (RDS)           │
         └──────────────────┘
```

---

## Option 1: Separate Containers (Recommended)

### Structure

```
social-media-agent/
├── docker-compose.yml          # For local dev
├── Dockerfile.web-ui           # Web UI container
├── Dockerfile.langgraph        # LangGraph API container (or use langgraph.json)
└── aws/
    ├── ecs-task-web-ui.json    # ECS task definition for Web UI
    ├── ecs-task-langgraph.json # ECS task definition for LangGraph API
    └── deploy.sh               # Deployment script
```

### Step 1: Create Dockerfile for Web UI

**`Dockerfile.web-ui`**:

```dockerfile
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --production=false

# Copy web UI files
COPY web-ui/ ./web-ui/
COPY src/cli/ ./src/cli/  # For context file reading

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Start web UI server
CMD ["node", "web-ui/server.js"]
```

### Step 2: Create Dockerfile for LangGraph API

**`Dockerfile.langgraph`** (or use existing langgraph.json):

```dockerfile
# Use LangGraph base image
FROM langchain/langgraphjs-api:20

WORKDIR /deps/social-media-agent

# Copy project files
COPY . .

# Build MCP server
RUN cd mcp-google-docs && npm install && npm run build

# LangGraph CLI handles the rest
```

### Step 3: Create Docker Compose for Local Testing

**`docker-compose.yml`**:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: langgraph
      POSTGRES_USER: langgraph
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  langgraph-api:
    build:
      context: .
      dockerfile: Dockerfile.langgraph
    # Or use langgraph.json with langgraphjs up
    ports:
      - "54367:54367"
    environment:
      - LANGSMITH_API_KEY=${LANGSMITH_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - GOOGLE_REFRESH_TOKEN=${GOOGLE_REFRESH_TOKEN}
      - POSTGRES_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis

  web-ui:
    build:
      context: .
      dockerfile: Dockerfile.web-ui
    ports:
      - "3001:3001"
    environment:
      - LANGGRAPH_API_URL=http://langgraph-api:54367
      - WEB_UI_PORT=3001
      - WEB_UI_HOST=0.0.0.0
    depends_on:
      - langgraph-api

volumes:
  postgres_data:
  redis_data:
```

---

## Option 2: Single Container (Not Recommended)

**Why NOT recommended:**

- ❌ Can't scale independently
- ❌ Mixing concerns (API + Web UI)
- ❌ Harder to update
- ❌ Not AWS best practice

**If you still want single container**, you'd need to:

1. Run both services in one container (use a process manager like `supervisord`)
2. Expose both ports (3001 and 54367)
3. Handle service discovery internally

**Not recommended for production.**

---

## AWS Deployment Steps

### Prerequisites

1. **AWS Account** with permissions for:

   - ECS (Elastic Container Service)
   - ECR (Elastic Container Registry)
   - RDS (for PostgreSQL)
   - ElastiCache (for Redis) - optional
   - ALB (Application Load Balancer)
   - IAM (for roles)

2. **AWS CLI** installed and configured:

   ```bash
   aws configure
   ```

3. **Docker** installed locally

---

## Deployment Steps

### Step 1: Create ECR Repositories

```bash
# Create repositories
aws ecr create-repository --repository-name resume-agent-web-ui
aws ecr create-repository --repository-name resume-agent-langgraph-api

# Get login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

### Step 2: Build and Push Images

```bash
# Build Web UI image
docker build -f Dockerfile.web-ui -t resume-agent-web-ui .
docker tag resume-agent-web-ui:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/resume-agent-web-ui:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/resume-agent-web-ui:latest

# Build LangGraph API image
docker build -f Dockerfile.langgraph -t resume-agent-langgraph .
docker tag resume-agent-langgraph:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/resume-agent-langgraph-api:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/resume-agent-langgraph-api:latest
```

### Step 3: Set Up RDS (PostgreSQL)

```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier resume-agent-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username langgraph \
  --master-user-password <password> \
  --allocated-storage 20 \
  --vpc-security-group-ids <security-group-id> \
  --db-subnet-group-name <subnet-group>
```

### Step 4: Set Up ElastiCache (Redis) - Optional

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id resume-agent-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1
```

### Step 5: Create ECS Cluster

```bash
aws ecs create-cluster --cluster-name resume-agent-cluster
```

### Step 6: Create ECS Task Definitions

**`aws/ecs-task-web-ui.json`**:

```json
{
  "family": "resume-agent-web-ui",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "web-ui",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/resume-agent-web-ui:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "LANGGRAPH_API_URL",
          "value": "http://langgraph-api-internal:54367"
        },
        {
          "name": "WEB_UI_PORT",
          "value": "3001"
        },
        {
          "name": "WEB_UI_HOST",
          "value": "0.0.0.0"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/resume-agent-web-ui",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

**`aws/ecs-task-langgraph.json`**:

```json
{
  "family": "resume-agent-langgraph",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "langgraph-api",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/resume-agent-langgraph-api:latest",
      "portMappings": [
        {
          "containerPort": 54367,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "LANGSMITH_API_KEY",
          "value": "<from-secrets-manager>"
        },
        {
          "name": "ANTHROPIC_API_KEY",
          "value": "<from-secrets-manager>"
        },
        {
          "name": "GOOGLE_CLIENT_ID",
          "value": "<from-secrets-manager>"
        },
        {
          "name": "GOOGLE_CLIENT_SECRET",
          "value": "<from-secrets-manager>"
        },
        {
          "name": "GOOGLE_REFRESH_TOKEN",
          "value": "<from-secrets-manager>"
        },
        {
          "name": "POSTGRES_HOST",
          "value": "<rds-endpoint>"
        },
        {
          "name": "REDIS_HOST",
          "value": "<redis-endpoint>"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/resume-agent-langgraph",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Step 7: Create ECS Services

```bash
# Register task definitions
aws ecs register-task-definition --cli-input-json file://aws/ecs-task-web-ui.json
aws ecs register-task-definition --cli-input-json file://aws/ecs-task-langgraph.json

# Create services
aws ecs create-service \
  --cluster resume-agent-cluster \
  --service-name web-ui-service \
  --task-definition resume-agent-web-ui \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"

aws ecs create-service \
  --cluster resume-agent-cluster \
  --service-name langgraph-api-service \
  --task-definition resume-agent-langgraph \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Step 8: Set Up Application Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name resume-agent-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

# Create target groups
aws elbv2 create-target-group \
  --name web-ui-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id vpc-xxx \
  --target-type ip

# Create listener (route to Web UI)
aws elbv2 create-listener \
  --load-balancer-arn <alb-arn> \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=<web-ui-tg-arn>
```

---

## Environment Variables & Secrets

### Use AWS Secrets Manager

```bash
# Store secrets
aws secretsmanager create-secret \
  --name resume-agent/secrets \
  --secret-string '{
    "LANGSMITH_API_KEY": "...",
    "ANTHROPIC_API_KEY": "...",
    "GOOGLE_CLIENT_ID": "...",
    "GOOGLE_CLIENT_SECRET": "...",
    "GOOGLE_REFRESH_TOKEN": "..."
  }'
```

Update task definitions to use secrets:

```json
"secrets": [
  {
    "name": "ANTHROPIC_API_KEY",
    "valueFrom": "arn:aws:secretsmanager:us-east-1:xxx:secret:resume-agent/secrets:ANTHROPIC_API_KEY::"
  }
]
```

---

## Cost Estimation

**Monthly costs (approximate):**

- **ECS Fargate** (Web UI): ~$15/month (0.25 vCPU, 0.5GB RAM)
- **ECS Fargate** (LangGraph API): ~$30/month (1 vCPU, 2GB RAM)
- **RDS PostgreSQL** (db.t3.micro): ~$15/month
- **ElastiCache Redis** (cache.t3.micro): ~$15/month
- **ALB**: ~$20/month
- **Data Transfer**: ~$5-10/month

**Total**: ~$100-120/month

**Cost optimization:**

- Use Spot instances for non-critical workloads
- Right-size containers based on usage
- Use RDS Reserved Instances for long-term
- Consider Aurora Serverless for variable workloads

---

## Quick Start Script

Create `aws/deploy.sh`:

```bash
#!/bin/bash
set -e

REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_BASE="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "🚀 Deploying Resume Agent to AWS..."

# Build and push images
echo "📦 Building and pushing images..."
docker build -f Dockerfile.web-ui -t resume-agent-web-ui .
docker tag resume-agent-web-ui:latest ${ECR_BASE}/resume-agent-web-ui:latest
docker push ${ECR_BASE}/resume-agent-web-ui:latest

# Register task definitions
echo "📋 Registering task definitions..."
aws ecs register-task-definition --cli-input-json file://aws/ecs-task-web-ui.json

# Update services
echo "🔄 Updating services..."
aws ecs update-service --cluster resume-agent-cluster --service web-ui-service --force-new-deployment

echo "✅ Deployment complete!"
```

---

## Monitoring & Logs

### CloudWatch Logs

```bash
# View Web UI logs
aws logs tail /ecs/resume-agent-web-ui --follow

# View LangGraph API logs
aws logs tail /ecs/resume-agent-langgraph --follow
```

### CloudWatch Metrics

Monitor:

- CPU/Memory usage
- Request count
- Error rate
- Response time

---

## Summary

### Recommended Architecture

✅ **Separate Docker Containers**

- Web UI: ECS Fargate service
- LangGraph API: ECS Fargate service
- PostgreSQL: RDS
- Redis: ElastiCache (or RDS)
- Load Balancer: ALB

### Benefits

- ✅ Independent scaling
- ✅ Better resource management
- ✅ Easier updates
- ✅ AWS best practices
- ✅ Cost optimization

### Next Steps

1. Create Dockerfiles (provided above)
2. Set up AWS infrastructure (RDS, ECS, ECR)
3. Build and push images
4. Deploy services
5. Configure ALB and DNS

When you're ready to deploy, I can help you:

- Create the Dockerfiles
- Set up AWS infrastructure
- Configure environment variables
- Set up CI/CD pipeline

Let me know when you want to proceed! 🚀
