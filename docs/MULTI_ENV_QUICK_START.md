# Multi-Environment Quick Start

## 🚀 Quick Commands

### Development

```bash
npm run dev:up          # Start
npm run dev:logs        # View logs
npm run dev:down        # Stop
npm run dev:db:init     # Initialize DB
```

### Staging

```bash
npm run staging:up      # Start
npm run staging:logs    # View logs
npm run staging:down    # Stop
npm run staging:db:init # Initialize DB
```

### Production

```bash
npm run prod:up         # Start
npm run prod:logs       # View logs
npm run prod:down       # Stop
npm run prod:db:init    # Initialize DB
```

---

## 📋 Setup (One-Time)

### 1. Create Environment Files

```bash
cp .env.full.example .env.dev
cp .env.full.example .env.staging
cp .env.full.example .env.prod
```

### 2. Update Each File

**`.env.dev`:**

- Set `NODE_ENV=development`
- Use default passwords (changeme)
- Set your API keys

**`.env.staging`:**

- Set `NODE_ENV=staging`
- Use stronger passwords
- Set your API keys

**`.env.prod`:**

- Set `NODE_ENV=production`
- **Use strong random passwords**
- Set production API keys
- Set `DOMAIN=abirad.com` and `USE_DOMAIN=true`

---

## 🌐 Access URLs

| Service   | Dev                    | Staging                | Prod                   |
| --------- | ---------------------- | ---------------------- | ---------------------- |
| Web UI    | http://localhost:3001  | http://localhost:3003  | http://localhost:3005  |
| Auth      | http://localhost:3000  | http://localhost:3002  | http://localhost:3004  |
| LangGraph | http://localhost:54367 | http://localhost:54368 | http://localhost:54369 |

---

## 🔧 Common Tasks

### Start Development

```bash
npm run dev:up
npm run dev:db:init
# Access: http://localhost:3001
```

### View Logs

```bash
npm run dev:logs
```

### Stop Environment

```bash
npm run dev:down
```

### Database Shell

```bash
npm run dev:db:shell
```

### Rebuild Images

```bash
npm run dev:build
```

---

## ⚠️ Important Notes

1. **First time:** Run `db:init` after starting
2. **Ports:** Each environment uses different ports
3. **Data:** Environments are isolated (separate databases)
4. **Secrets:** Never commit `.env.*` files

---

## 📚 Full Documentation

See `docs/MULTI_ENVIRONMENT_SETUP.md` for complete guide.
