# Abirad.com Domain Setup Guide

## Domain: abirad.com

This guide covers all code changes and AWS setup needed to launch your app on abirad.com.

---

## Code Changes Required

### 1. Update CORS Settings ✅

**File:** `web-ui/server.ts`

**Change:** Update CORS to allow your domain

```typescript
// Current (allows all):
res.header("Access-Control-Allow-Origin", "*");

// Update to (production):
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://abirad.com", "https://www.abirad.com"]
    : ["http://localhost:3001", "http://localhost:3000"];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});
```

### 2. Update Google OAuth Redirect URI ✅

**File:** `src/auth/auth-server.ts`

**Change:** Update default redirect URI

```typescript
// Current:
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/auth/google/callback";

// Keep as-is (uses env var) - just set in .env:
GOOGLE_REDIRECT_URI=https://abirad.com/auth/google/callback
```

**Also update in Google Cloud Console:**

1. Go to Google Cloud Console
2. APIs & Services → Credentials
3. Edit your OAuth 2.0 Client
4. Add authorized redirect URI: `https://abirad.com/auth/google/callback`
5. Add: `https://www.abirad.com/auth/google/callback` (if using www)

### 3. Update Auth Success Redirect ✅

**File:** `src/auth/auth-server.ts`

**Change:** Update redirect after login

```typescript
// Current:
const redirectUrl = process.env.AUTH_SUCCESS_REDIRECT_URL || "http://localhost:3001";

// Set in .env:
AUTH_SUCCESS_REDIRECT_URL=https://abirad.com
```

### 4. Update Environment Variables ✅

**File:** `.env` (create/update)

```bash
# Domain Configuration
DOMAIN=abirad.com
WEB_UI_URL=https://abirad.com
AUTH_SERVER_URL=https://abirad.com
LANGGRAPH_API_URL=https://api.abirad.com  # Or keep internal if on same server

# Google OAuth
GOOGLE_REDIRECT_URI=https://abirad.com/auth/google/callback

# CORS
NODE_ENV=production

# Host binding (for production)
WEB_UI_HOST=0.0.0.0  # Listen on all interfaces
AUTH_SERVER_HOST=0.0.0.0
```

### 5. Update Cookie Settings ✅

**File:** `src/auth/auth-server.ts`

**Change:** Secure cookies for production

```typescript
// Current:
res.cookie("session_token", sessionToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: expiresInSeconds * 1000,
});

// Already correct! Just ensure NODE_ENV=production
```

---

## AWS Setup for abirad.com

### Step 1: Route 53 Domain Setup

1. **Go to Route 53:**

   - AWS Console → Route 53 → Hosted zones
   - Create hosted zone for `abirad.com`

2. **Update Name Servers:**
   - Copy Route 53 name servers
   - Update at your domain registrar (where you bought abirad.com)
   - Wait 24-48 hours for DNS propagation

### Step 2: SSL Certificate (ACM)

1. **Request Certificate:**

   - AWS Console → Certificate Manager
   - Request public certificate
   - Domain: `abirad.com`
   - Also add: `*.abirad.com` (wildcard) or `www.abirad.com`
   - Validation: DNS validation
   - Add CNAME records to Route 53 (auto-created)

2. **Wait for Validation:**
   - Usually takes 5-30 minutes
   - Certificate status: "Issued"

### Step 3: Update AWS CDK Stack

**File:** `infrastructure/aws-cdk-stack.ts`

Add domain configuration:

```typescript
import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";

// Add after VPC creation:

// Get hosted zone
const hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
  domainName: "abirad.com",
});

// Get SSL certificate
const certificate = acm.Certificate.fromCertificateArn(
  this,
  "Certificate",
  process.env.SSL_CERTIFICATE_ARN || "", // Set in .env
);

// Create Application Load Balancer with HTTPS
const alb = new elbv2.ApplicationLoadBalancer(this, "ResumeAgentALB", {
  vpc,
  internetFacing: true,
});

// HTTPS listener
const httpsListener = alb.addListener("HttpsListener", {
  port: 443,
  protocol: elbv2.ApplicationProtocol.HTTPS,
  certificates: [certificate],
  defaultAction: elbv2.ListenerAction.forward([targetGroup]),
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

// Route 53 record
new route53.ARecord(this, "DomainRecord", {
  zone: hostedZone,
  recordName: "abirad.com",
  target: route53.RecordTarget.fromAlias(
    new route53Targets.LoadBalancerTarget(alb),
  ),
});

// www subdomain (optional)
new route53.ARecord(this, "WwwDomainRecord", {
  zone: hostedZone,
  recordName: "www.abirad.com",
  target: route53.RecordTarget.fromAlias(
    new route53Targets.LoadBalancerTarget(alb),
  ),
});
```

### Step 4: Update ECS Service

**File:** `infrastructure/aws-cdk-stack.ts`

Update service to use load balancer:

```typescript
// Uncomment and update ALB section
const alb = new elbv2.ApplicationLoadBalancer(this, "ResumeAgentALB", {
  vpc,
  internetFacing: true,
});

const targetGroup = new elbv2.ApplicationTargetGroup(this, "WebUITargetGroup", {
  vpc,
  port: 3001,
  protocol: elbv2.ApplicationProtocol.HTTP,
  healthCheck: {
    path: "/api/health",
    interval: cdk.Duration.seconds(30),
  },
});

const httpsListener = alb.addListener("HttpsListener", {
  port: 443,
  protocol: elbv2.ApplicationProtocol.HTTPS,
  certificates: [certificate],
  defaultAction: elbv2.ListenerAction.forward([targetGroup]),
});

// Update service to register with target group
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
      targetGroupArn: targetGroup.targetGroupArn,
    },
  ],
});
```

---

## Environment Variables for Production

**File:** `.env` (production)

```bash
# Domain
DOMAIN=abirad.com
NODE_ENV=production

# URLs
WEB_UI_URL=https://abirad.com
AUTH_SERVER_URL=https://abirad.com
LANGGRAPH_API_URL=http://localhost:54367  # Internal, or use https://api.abirad.com

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://abirad.com/auth/google/callback

# Auth
AUTH_SUCCESS_REDIRECT_URL=https://abirad.com
SESSION_SECRET=your_random_secret
ENCRYPTION_KEY=your_encryption_key

# Host binding
WEB_UI_HOST=0.0.0.0
AUTH_SERVER_HOST=0.0.0.0

# Database (from AWS RDS)
POSTGRES_HOST=your_rds_endpoint
POSTGRES_PORT=5432
POSTGRES_DB=langgraph
POSTGRES_USER=langgraph
POSTGRES_PASSWORD=from_secrets_manager

# Redis (from AWS ElastiCache)
REDIS_HOST=your_redis_endpoint
REDIS_PORT=6379
```

---

## Deployment Checklist

### Before Deployment:

- [ ] Domain registered: ✅ abirad.com
- [ ] Route 53 hosted zone created
- [ ] SSL certificate requested and validated
- [ ] Google OAuth redirect URI updated
- [ ] Environment variables set
- [ ] CORS updated
- [ ] AWS CDK stack updated

### Deployment Steps:

1. **Update Code:**

   ```bash
   # Apply CORS changes
   # Update environment variables
   ```

2. **Build Docker Image:**

   ```bash
   docker build -t resume-agent .
   ```

3. **Push to ECR:**

   ```bash
   aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
   docker tag resume-agent:latest <account>.dkr.ecr.<region>.amazonaws.com/resume-agent:latest
   docker push <account>.dkr.ecr.<region>.amazonaws.com/resume-agent:latest
   ```

4. **Deploy Infrastructure:**

   ```bash
   cd infrastructure
   cdk deploy
   ```

5. **Update DNS:**

   - Wait for ALB to be created
   - Update Route 53 records
   - Wait for DNS propagation

6. **Test:**
   - Visit https://abirad.com
   - Test Google OAuth login
   - Verify HTTPS works

---

## Cost Impact

**Additional AWS Costs:**

- Route 53: $0.50/month (hosted zone)
- SSL Certificate: $0 (free via ACM)
- ALB: $16/month (if using)
- **Total: +$16.50/month**

---

## Quick Start

1. ✅ Domain: abirad.com (you have it!)
2. ⏳ Update code (CORS, env vars)
3. ⏳ Set up Route 53
4. ⏳ Get SSL certificate
5. ⏳ Deploy to AWS

See code changes below!
