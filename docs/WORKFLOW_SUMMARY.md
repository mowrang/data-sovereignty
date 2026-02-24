# Development Workflow Summary

## 🎯 How It Works

### Simple Answer: **Just Ask Me!**

You don't need to remember complex commands. Just tell me what you want:

1. **Develop** → Make changes, test in dev
2. **Say:** "Please promote my code to staging"
3. **Test** → Verify in staging
4. **Say:** "Please promote staging to production"
5. **Done!** → Production is live

---

## 📊 Visual Workflow

```
┌─────────────────────────────────────────────────────────┐
│                    DEVELOPMENT                          │
│                                                         │
│  1. npm run dev:up                                      │
│  2. Make code changes                                   │
│  3. Test locally (http://localhost:3001)               │
│  4. git commit & push                                   │
│                                                         │
│  ✅ Ready? Say: "Please promote code to staging"       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      STAGING                            │
│                                                         │
│  1. I'll merge your code                                │
│  2. npm run staging:build                              │
│  3. npm run staging:up                                 │
│  4. Test (http://localhost:3003)                      │
│                                                         │
│  ✅ Ready? Say: "Please promote to production"         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    PRODUCTION                            │
│                                                         │
│  1. I'll merge staging → production                     │
│  2. npm run prod:build                                 │
│  3. npm run prod:up                                    │
│  4. Live! (https://abirad.com)                         │
│                                                         │
│  ✅ Monitor: npm run prod:logs                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Step-by-Step Example

### Day 1: Development

```bash
# Start dev
npm run dev:up

# Make changes
# Edit files...

# Test
npm run dev:logs
# Visit http://localhost:3001

# Commit
git add .
git commit -m "feat: add job recommendations"
git push
```

**Then tell me:**

> "Please promote my code to staging"

---

### Day 2: Staging

**I'll help you:**

1. Merge your code to staging branch
2. Guide you to rebuild staging

**You run:**

```bash
npm run staging:build
npm run staging:down && npm run staging:up
npm run staging:logs
# Visit http://localhost:3003
```

**Test everything, then tell me:**

> "Please promote staging to production"

---

### Day 3: Production

**I'll help you:**

1. Merge staging → production
2. Guide you through deployment

**You run:**

```bash
npm run prod:build
npm run prod:down && npm run prod:up
npm run prod:logs
# Visit https://abirad.com
```

**Monitor and verify!**

---

## 💡 Two Ways to Promote Code

### Option 1: Ask Me (Easiest!)

Just say:

- **"Please promote my code to staging"**
- **"Please promote staging to production"**

I'll handle git operations and guide you!

### Option 2: Use Scripts

```bash
# Promote to staging
npm run promote:staging

# Promote to production
npm run promote:prod
```

---

## 📋 Quick Reference

| What You Want         | What to Say/Do                                |
| --------------------- | --------------------------------------------- |
| Start development     | `npm run dev:up`                              |
| Promote to staging    | **"Please promote code to staging"**          |
| Deploy staging        | `npm run staging:build && npm run staging:up` |
| Promote to production | **"Please promote to production"**            |
| Deploy production     | `npm run prod:build && npm run prod:up`       |

---

## ✅ Checklist

### Development

- [ ] Code changes made
- [ ] Tested locally
- [ ] Committed and pushed
- [ ] Ready for staging

### Staging

- [ ] Code promoted (ask me!)
- [ ] Staging rebuilt
- [ ] Staging restarted
- [ ] Tested thoroughly
- [ ] Ready for production

### Production

- [ ] Code promoted (ask me!)
- [ ] Production rebuilt
- [ ] Production restarted
- [ ] Monitored and verified
- [ ] Live and working!

---

## 🎉 That's It!

**Remember:** You don't need to remember all the commands. Just:

1. Develop
2. **Ask me to promote**
3. Test
4. **Ask me to promote**
5. Deploy

**Simple!** 🚀

---

## 📚 More Details

- **Complete Guide:** `docs/DEVELOPMENT_WORKFLOW.md`
- **Quick Start:** `docs/WORKFLOW_QUICK_START.md`
- **This Summary:** `docs/WORKFLOW_SUMMARY.md`
