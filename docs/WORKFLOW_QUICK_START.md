# Development Workflow - Quick Start

## 🚀 Simple Workflow

### 1. Develop (Dev Environment)

```bash
# Start dev environment
npm run dev:up

# Make your code changes
# Edit files, add features, etc.

# Test locally
npm run dev:logs
# Visit: http://localhost:3001

# Commit changes
git add .
git commit -m "feat: your feature description"
git push
```

### 2. Promote to Staging

**Option A: Use the script**

```bash
npm run promote:staging
```

**Option B: Ask me**

> **"Please promote my code to staging"**

Then rebuild and restart:

```bash
npm run staging:build
npm run staging:down && npm run staging:up
npm run staging:logs
# Visit: http://localhost:3003
```

### 3. Test in Staging

```bash
# Watch logs
npm run staging:logs

# Test all functionality
# Visit: http://localhost:3003
```

### 4. Promote to Production

**Option A: Use the script**

```bash
npm run promote:prod
```

**Option B: Ask me**

> **"Please promote staging code to production"**

Then deploy:

```bash
npm run prod:build
npm run prod:down && npm run prod:up
npm run prod:logs
# Visit: https://abirad.com
```

---

## 📋 Typical Day Workflow

### Morning: Development

```bash
npm run dev:up
# Make changes
# Test locally
git commit -m "feat: new feature"
```

### Afternoon: Staging

```bash
# Ask me: "Please promote code to staging"
npm run staging:build && npm run staging:up
# Test in staging
```

### Evening: Production

```bash
# Ask me: "Please promote to production"
npm run prod:build && npm run prod:up
# Monitor production
```

---

## 🎯 Quick Commands

| Task               | Command                                       |
| ------------------ | --------------------------------------------- |
| Start dev          | `npm run dev:up`                              |
| Promote to staging | `npm run promote:staging`                     |
| Deploy staging     | `npm run staging:build && npm run staging:up` |
| Promote to prod    | `npm run promote:prod`                        |
| Deploy production  | `npm run prod:build && npm run prod:up`       |

---

## 💬 Just Ask Me!

Instead of running scripts manually, you can simply say:

- **"Please promote my code to staging"**
- **"Please promote staging to production"**
- **"Please deploy staging with latest code"**
- **"Please deploy production"**

I'll handle the git operations and guide you through deployment!

---

## 📚 Full Documentation

See `docs/DEVELOPMENT_WORKFLOW.md` for complete guide.
