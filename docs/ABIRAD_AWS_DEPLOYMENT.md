# Deploying Abirad.com on AWS - Step by Step

## Domain: abirad.com ✅

You have the domain! Here's everything you need to deploy it on AWS.

---

## Code Changes Made ✅

I've already updated the code for you:

1. ✅ **CORS Settings** - Updated to allow abirad.com
2. ✅ **Auth Redirect** - Updated to use domain
3. ✅ **Environment Variables** - Ready for production

**No additional code changes needed!** Just configure AWS and environment variables.

---

## AWS Setup Steps

### Step 1: Route 53 Domain Setup

1. **Go to Route 53:**

   - AWS Console → Route 53 → Hosted zones
   - Click "Create hosted zone"
   - Domain name: `abirad.com`
   - Type: Public hosted zone
   - Click "Create"

2. **Update Name Servers at Registrar:**
   - Copy the 4 name servers from Route 53
   - Go to your domain registrar (where you bought abirad.com)
   - Update name servers to Route 53 values
   - Wait 24-48 hours for DNS propagation

**Cost:** $0.50/month

---

### Step 2: SSL Certificate (ACM)

1. **Request Certificate:**

   - AWS Console → Certificate Manager
   - Click "Request certificate"
   - Domain name: `abirad.com`
   - Also add: `*.abirad.com` (wildcard) OR `www.abirad.com`
   - Validation: DNS validation
   - Click "Request"

2. **Validate Certificate:**

   - Click on the certificate
   - Click "Create record in Route 53" (auto-creates CNAME)
   - Wait 5-30 minutes for validation
   - Status should change to "Issued"

3. **Copy Certificate ARN:**
   - Once issued, copy the ARN
   - Format: `arn:aws:acm:region:account:certificate/cert-id`

**Cost:** $0 (free via ACM)

---

### Step 3: Update Environment Variables

**File:** `.env` (production)

```bash
# Domain Configuration
DOMAIN=abirad.com
USE_DOMAIN=true
NODE_ENV=production

# URLs
WEB_UI_URL=https://abirad.com
AUTH_SERVER_URL=https://abirad.com
LANGGRAPH_API_URL=http://localhost:54367  # Internal

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://abirad.com/auth/google/callback

# Auth
AUTH_SUCCESS_REDIRECT_URL=https://abirad.com
SESSION_SECRET=your_random_secret_here
ENCRYPTION_KEY=your_64_hex_char_encryption_key

# Host binding
WEB_UI_HOST=0.0.0.0
AUTH_SERVER_HOST=0.0.0.0

# SSL Certificate ARN (from Step 2)
SSL_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789:certificate/abc123

# Database (will be set by CDK)
POSTGRES_HOST=will_be_set_by_cdk
POSTGRES_PORT=5432
POSTGRES_DB=langgraph
POSTGRES_USER=langgraph
POSTGRES_PASSWORD=will_be_in_secrets_manager

# Redis (will be set by CDK)
REDIS_HOST=will_be_set_by_cdk
REDIS_PORT=6379
```

---

### Step 4: Update Google Cloud Console

1. **Go to Google Cloud Console:**

   - APIs & Services → Credentials
   - Edit your OAuth 2.0 Client ID

2. **Add Authorized Redirect URIs:**

   - `https://abirad.com/auth/google/callback`
   - `https://www.abirad.com/auth/google/callback` (if using www)

3. **Save Changes**

---

### Step 5: Create AWS Secrets

```bash
# Session secret
aws secretsmanager create-secret \
  --name resume-agent/session-secret \
  --secret-string "your-random-64-character-string"

# Encryption key
aws secretsmanager create-secret \
  --name resume-agent/encryption-key \
  --secret-string "your-64-hex-character-key"

# Google OAuth
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

---

### Step 6: Deploy Infrastructure

**Option A: Use Updated CDK Stack (with domain support)**

```bash
# Copy the domain-enabled stack
cp infrastructure/aws-cdk-stack-with-domain.ts infrastructure/aws-cdk-stack.ts

# Install CDK dependencies
cd infrastructure
npm install

# Set environment variable
export SSL_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789:certificate/abc123
export DOMAIN=abirad.com
export USE_DOMAIN=true

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy
cdk deploy
```

**Option B: Use Original Stack (no domain, cheaper)**

Keep using `aws-cdk-stack.ts` as-is if you want to skip domain setup initially.

---

### Step 7: Build and Push Docker Image

```bash
# Build image
docker build -t resume-agent .

# Get ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag resume-agent:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/resume-agent:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/resume-agent:latest
```

---

### Step 8: Update ECS Service

After CDK deployment, update the service to use the new image:

```bash
aws ecs update-service \
  --cluster ResumeAgentCluster \
  --service ResumeAgentService \
  --force-new-deployment
```

---

## DNS Configuration

### After Deployment:

1. **Get Load Balancer DNS:**

   - From CDK output: `LoadBalancerDNS`
   - Or: AWS Console → EC2 → Load Balancers → Copy DNS name

2. **Update Route 53:**

   - Route 53 → Hosted zones → abirad.com
   - Create A record:
     - Name: (leave blank for root domain)
     - Type: A
     - Alias: Yes
     - Alias target: Your load balancer
     - Routing policy: Simple
   - Create A record for www:
     - Name: www
     - Same settings

3. **Wait for DNS Propagation:**
   - Usually 5-30 minutes
   - Check: `dig abirad.com` or `nslookup abirad.com`

---

## Testing

### 1. Test HTTPS:

```bash
curl https://abirad.com/api/health
```

### 2. Test Google OAuth:

- Visit: https://abirad.com
- Click "Login with Google"
- Should redirect to Google, then back to abirad.com

### 3. Test Application:

- Login
- Read resume
- Create tailored resume
- Verify everything works

---

## Cost Breakdown

**With Domain (abirad.com):**

- ECS Fargate: $7-10/month
- RDS PostgreSQL: $15/month
- ElastiCache Redis: $12/month
- **Application Load Balancer: $16/month** (required for domain)
- Route 53: $0.50/month
- SSL Certificate: $0 (free)
- Storage & Network: $4/month
- **Total: ~$54.50-57.50/month**

**Without Domain (skip ALB):**

- Total: ~$38-41/month
- But no HTTPS, no custom domain

**Recommendation:** Use domain + ALB for production ($16/month extra)

---

## Troubleshooting

### "Certificate not found"

- Make sure SSL_CERTIFICATE_ARN is set correctly
- Certificate must be in same region as ALB (us-east-1 recommended)

### "DNS not resolving"

- Wait 24-48 hours after updating name servers
- Check Route 53 records are correct
- Verify load balancer DNS is correct

### "CORS error"

- Check NODE_ENV=production is set
- Verify WEB_UI_URL=https://abirad.com
- Check browser console for exact error

### "Google OAuth fails"

- Verify redirect URI in Google Cloud Console
- Check GOOGLE_REDIRECT_URI in .env
- Must match exactly: `https://abirad.com/auth/google/callback`

---

## Quick Checklist

- [ ] Domain registered: ✅ abirad.com
- [ ] Route 53 hosted zone created
- [ ] SSL certificate requested and validated
- [ ] Certificate ARN copied
- [ ] Google OAuth redirect URI updated
- [ ] Environment variables set
- [ ] AWS secrets created
- [ ] CDK stack deployed
- [ ] Docker image built and pushed
- [ ] ECS service updated
- [ ] Route 53 records created
- [ ] DNS propagated
- [ ] HTTPS working
- [ ] OAuth login working

---

## Summary

**Code Changes:** ✅ Already done!

- CORS updated
- Auth redirects updated
- Environment variables ready

**What You Need to Do:**

1. Set up Route 53 (5 minutes)
2. Get SSL certificate (10 minutes + wait)
3. Update Google OAuth settings (2 minutes)
4. Set environment variables (5 minutes)
5. Deploy to AWS (30 minutes)

**Total Setup Time:** ~1 hour (plus DNS propagation wait)

**Cost:** ~$55/month (with domain + ALB)

See `docs/ABIRAD_DOMAIN_SETUP.md` for detailed code changes and `infrastructure/aws-cdk-stack-with-domain.ts` for domain-enabled CDK stack!
