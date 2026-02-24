# Code Changes for Abirad.com - Summary

## ✅ Code Changes Already Made

I've updated the code to support abirad.com. Here's what changed:

---

## 1. CORS Configuration ✅

**File:** `web-ui/server.ts`

**Changed:** Updated CORS to allow abirad.com in production

**Before:**

```typescript
res.header("Access-Control-Allow-Origin", "*");
```

**After:**

```typescript
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [process.env.WEB_UI_URL || "https://abirad.com", "https://www.abirad.com"]
    : ["http://localhost:3001", "http://localhost:3000"];

// Only allow configured origins in production
```

**Impact:** Secure CORS for production, allows localhost in development

---

## 2. Auth Redirect URL ✅

**File:** `src/auth/auth-server.ts`

**Changed:** Updated redirect after Google OAuth login

**Before:**

```typescript
const redirectUrl =
  process.env.AUTH_SUCCESS_REDIRECT_URL || "http://localhost:3001";
```

**After:**

```typescript
const redirectUrl =
  process.env.AUTH_SUCCESS_REDIRECT_URL ||
  (process.env.NODE_ENV === "production"
    ? process.env.WEB_UI_URL || "https://abirad.com"
    : "http://localhost:3001");
```

**Impact:** Automatically uses abirad.com in production

---

## 3. Environment Variables ✅

**File:** `.env.full.example`

**Added:**

```bash
DOMAIN=abirad.com
USE_DOMAIN=false  # Set to true for production
WEB_UI_URL=https://abirad.com
AUTH_SERVER_URL=https://abirad.com
```

**Impact:** Easy configuration for domain deployment

---

## 4. AWS CDK Stack with Domain ✅

**File:** `infrastructure/aws-cdk-stack-with-domain.ts`

**Added:**

- Route 53 hosted zone lookup/creation
- SSL certificate integration (ACM)
- Application Load Balancer with HTTPS
- HTTP to HTTPS redirect
- Domain A records (abirad.com and www.abirad.com)
- Auth server routing (/auth/\* paths)

**Impact:** Complete AWS infrastructure for domain deployment

---

## What You Need to Do

### 1. Set Environment Variables

Add to your `.env` file:

```bash
DOMAIN=abirad.com
USE_DOMAIN=true
NODE_ENV=production
WEB_UI_URL=https://abirad.com
AUTH_SERVER_URL=https://abirad.com
GOOGLE_REDIRECT_URI=https://abirad.com/auth/google/callback
SSL_CERTIFICATE_ARN=arn:aws:acm:region:account:certificate/id
```

### 2. Update Google Cloud Console

Add redirect URI:

- `https://abirad.com/auth/google/callback`

### 3. Use Domain-Enabled CDK Stack

```bash
# Copy domain-enabled stack
cp infrastructure/aws-cdk-stack-with-domain.ts infrastructure/aws-cdk-stack.ts

# Or use it directly by updating the import in your CDK app
```

### 4. Deploy

```bash
cd infrastructure
cdk deploy
```

---

## Files Changed

1. ✅ `web-ui/server.ts` - CORS configuration
2. ✅ `src/auth/auth-server.ts` - Redirect URL
3. ✅ `.env.full.example` - Domain variables
4. ✅ `infrastructure/aws-cdk-stack-with-domain.ts` - New file with domain support

---

## No Additional Code Changes Needed!

Everything is ready. Just:

1. Configure AWS (Route 53, SSL certificate)
2. Set environment variables
3. Deploy

See `docs/ABIRAD_AWS_DEPLOYMENT.md` for complete deployment guide!
