# Abirad.com Quick Start

## ✅ Domain: abirad.com

**Good news:** Code is already updated! You just need to configure AWS.

---

## What's Already Done ✅

1. ✅ **CORS Settings** - Updated to allow abirad.com
2. ✅ **Auth Redirects** - Updated to use domain
3. ✅ **Environment Variables** - Ready for production

**No code changes needed!** Just AWS setup.

---

## Quick Setup (3 Steps)

### Step 1: Route 53 (5 minutes)

1. AWS Console → Route 53 → Create hosted zone
2. Domain: `abirad.com`
3. Copy name servers
4. Update at your domain registrar
5. Wait 24-48 hours

### Step 2: SSL Certificate (10 minutes)

1. AWS Console → Certificate Manager
2. Request certificate for `abirad.com`
3. DNS validation
4. Create CNAME records (auto-created)
5. Wait for validation (5-30 min)
6. Copy Certificate ARN

### Step 3: Deploy (30 minutes)

1. Set environment variables:

```bash
DOMAIN=abirad.com
USE_DOMAIN=true
SSL_CERTIFICATE_ARN=arn:aws:acm:us-east-1:xxx:certificate/xxx
WEB_UI_URL=https://abirad.com
GOOGLE_REDIRECT_URI=https://abirad.com/auth/google/callback
```

2. Update Google OAuth:

   - Add `https://abirad.com/auth/google/callback` to authorized redirect URIs

3. Deploy:

```bash
cd infrastructure
cdk deploy
```

---

## Environment Variables Needed

```bash
# Domain
DOMAIN=abirad.com
USE_DOMAIN=true
NODE_ENV=production

# URLs
WEB_UI_URL=https://abirad.com
AUTH_SERVER_URL=https://abirad.com
GOOGLE_REDIRECT_URI=https://abirad.com/auth/google/callback
AUTH_SUCCESS_REDIRECT_URL=https://abirad.com

# SSL (from ACM)
SSL_CERTIFICATE_ARN=arn:aws:acm:region:account:certificate/id
```

---

## Cost

**With Domain:**

- Infrastructure: $38-41/month
- Load Balancer: +$16/month (required for domain)
- Route 53: +$0.50/month
- **Total: ~$55/month**

---

## Files Updated

- ✅ `web-ui/server.ts` - CORS updated
- ✅ `src/auth/auth-server.ts` - Redirects updated
- ✅ `infrastructure/aws-cdk-stack-with-domain.ts` - Domain support added
- ✅ `.env.full.example` - Domain variables added

**Everything is ready!** Just configure AWS and deploy.

See `docs/ABIRAD_AWS_DEPLOYMENT.md` for complete step-by-step guide!
