# Development Workflow: Dev → Staging → Prod

## Overview

This guide explains how to develop code, promote it to staging for testing, and then deploy to production.

---

## Workflow Overview

```
┌─────────────┐
│   Develop   │  →  Code changes, testing locally
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Staging   │  →  Test with production-like config
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Production  │  →  Live deployment
└─────────────┘
```

---

## Step 1: Development (Dev Environment)

### 1.1 Make Code Changes

Work on your code locally or in the dev environment:

```bash
# Start dev environment
npm run dev:up

# Make code changes
# Edit files, add features, fix bugs, etc.

# Test locally
npm run dev:logs  # Watch logs
# Access: http://localhost:3001
```

### 1.2 Test Your Changes

```bash
# Run tests
npm test

# Test in dev environment
npm run dev:logs
# Visit http://localhost:3001 and test your changes
```

### 1.3 Commit Your Changes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add new feature X"

# Push to your branch
git push origin your-branch-name
```

---

## Step 2: Promote to Staging

### Option A: Using Git Branches (Recommended)

```bash
# Merge your dev branch into staging branch
git checkout staging
git pull origin staging
git merge your-dev-branch
git push origin staging

# Then ask me: "Please deploy staging environment with latest code"
```

### Option B: Direct Promotion (Ask Me)

Simply tell me:

> **"Please promote my latest code changes to staging"**

I will:

1. Check your git status
2. Create a staging branch or update it
3. Rebuild staging Docker images
4. Restart staging environment

### 2.1 Deploy to Staging

After code is promoted:

```bash
# Rebuild staging images with new code
npm run staging:build

# Restart staging environment
npm run staging:down
npm run staging:up

# Or use the restart command
docker compose -f docker-compose.staging.yml restart
```

### 2.2 Test in Staging

```bash
# View logs
npm run staging:logs

# Access staging
# Web UI: http://localhost:3003
# Auth: http://localhost:3002
# LangGraph: http://localhost:54368

# Test all functionality
# Verify everything works as expected
```

---

## Step 3: Promote to Production

### Option A: Using Git Branches (Recommended)

```bash
# Merge staging into main/master
git checkout main  # or master
git pull origin main
git merge staging
git push origin main

# Then ask me: "Please deploy production environment"
```

### Option B: Direct Promotion (Ask Me)

Tell me:

> **"Please promote staging code to production"**

I will:

1. Verify staging tests passed
2. Merge staging → production
3. Rebuild production images
4. Deploy to production

### 3.1 Deploy to Production

```bash
# Rebuild production images
npm run prod:build

# Restart production environment
npm run prod:down
npm run prod:up

# Monitor deployment
npm run prod:logs
```

### 3.2 Verify Production

```bash
# Check health
npm run prod:ps

# View logs
npm run prod:logs

# Access production
# Web UI: http://localhost:3005
# Or: https://abirad.com (if domain configured)
```

---

## Quick Commands Reference

### Development

```bash
npm run dev:up          # Start dev
npm run dev:logs        # Watch logs
npm run dev:down         # Stop dev
```

### Staging

```bash
npm run staging:build   # Rebuild with new code
npm run staging:up       # Start staging
npm run staging:logs     # Watch logs
npm run staging:down     # Stop staging
```

### Production

```bash
npm run prod:build      # Rebuild with new code
npm run prod:up          # Start production
npm run prod:logs        # Watch logs
npm run prod:down        # Stop production
```

---

## Typical Workflow Example

### Day 1: Development

```bash
# 1. Start dev environment
npm run dev:up

# 2. Make code changes
# Edit files...

# 3. Test locally
npm run dev:logs
# Visit http://localhost:3001

# 4. Commit changes
git add .
git commit -m "feat: add job recommendations"
git push origin feature/job-recommendations
```

### Day 2: Promote to Staging

**Tell me:** "Please promote my latest code to staging"

**Then:**

```bash
# Rebuild and restart staging
npm run staging:build
npm run staging:down && npm run staging:up

# Test staging
npm run staging:logs
# Visit http://localhost:3003
```

### Day 3: Promote to Production

**Tell me:** "Please promote staging code to production"

**Then:**

```bash
# Rebuild and restart production
npm run prod:build
npm run prod:down && npm run prod:up

# Monitor production
npm run prod:logs
# Visit https://abirad.com
```

---

## Git Branch Strategy (Recommended)

```
main/master          ← Production (stable)
  │
  └── staging        ← Staging (testing)
       │
       └── dev      ← Development (your branch)
```

**Workflow:**

1. Develop on `dev` branch
2. Merge `dev` → `staging` for testing
3. Merge `staging` → `main` for production

---

## What Happens When You Ask Me to Promote Code

When you say **"Please promote code to staging"**, I will:

1. ✅ Check current git status
2. ✅ Create/update staging branch
3. ✅ Merge your changes
4. ✅ Provide commands to rebuild/restart staging
5. ✅ Guide you through testing

When you say **"Please promote to production"**, I will:

1. ✅ Verify staging is stable
2. ✅ Merge staging → production
3. ✅ Provide deployment commands
4. ✅ Guide you through production verification

---

## Best Practices

1. **Always test in dev first** - Don't skip dev testing
2. **Test thoroughly in staging** - Staging should mirror production
3. **Use descriptive commit messages** - Helps track changes
4. **Deploy during low-traffic hours** - For production
5. **Monitor after deployment** - Watch logs and metrics
6. **Have a rollback plan** - Know how to revert if needed

---

## Rollback Procedure

If something goes wrong in production:

```bash
# 1. Stop production
npm run prod:down

# 2. Checkout previous stable version
git checkout <previous-commit-hash>

# 3. Rebuild and restart
npm run prod:build
npm run prod:up

# 4. Verify
npm run prod:logs
```

---

## Summary

**Development Flow:**

1. **Develop** → Make changes, test in dev
2. **Ask me** → "Please promote code to staging"
3. **Test** → Verify in staging environment
4. **Ask me** → "Please promote to production"
5. **Deploy** → Production goes live

**Simple Commands:**

- `npm run dev:up` - Start development
- `npm run staging:build && npm run staging:up` - Deploy staging
- `npm run prod:build && npm run prod:up` - Deploy production

**Just ask me to promote code when ready!** 🚀
