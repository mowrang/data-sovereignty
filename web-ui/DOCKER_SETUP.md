# Web UI Docker Setup

## Current Architecture

**Web UI is NOT in Docker** - it runs separately on your machine:

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR MACHINE                          │
│                                                          │
│  ┌──────────────┐     HTTP      ┌──────────────────┐ │
│  │   Browser    │ ────────────► │  Web UI Server    │ │
│  │ localhost:3001│               │  (localhost:3001) │ │
│  └──────────────┘               │  NOT in Docker    │ │
│                                  └──────────┬─────────┘ │
│                                             │ HTTP      │
│                                  ┌──────────▼─────────┐ │
│                                  │ LangGraph API       │ │
│                                  │ Server (Docker)     │ │
│                                  │ localhost:54367     │ │
│                                  └─────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Current Setup

### Web UI

- **Location**: Runs on your machine (not in Docker)
- **Command**: `npm run web-ui`
- **Port**: 3001 (localhost)
- **Process**: Separate Node.js process

### LangGraph API Server

- **Location**: Runs in Docker (when using `npm run langgraph:up`)
- **Port**: 54367
- **Containers**: PostgreSQL, Redis, LangGraph API

---

## Do You Need Docker for Web UI?

### ❌ **NO Docker needed** (Current Setup)

**Pros:**

- ✅ Simple - just run `npm run web-ui`
- ✅ Easy to develop/debug
- ✅ Fast startup
- ✅ Works perfectly for localhost

**Cons:**

- ⚠️ Separate process to manage
- ⚠️ Not containerized (but that's fine for localhost)

### ✅ **YES Docker** (Optional - for production)

**When you might want Docker:**

- Deploying to a server/domain
- Want everything containerized
- Need consistent environment
- Production deployment

---

## Option 1: Keep Separate (Recommended for Now)

**Current setup works great!**

```bash
# Terminal 1: LangGraph API (Docker)
npm run langgraph:up

# Terminal 2: Web UI (separate process)
npm run web-ui
```

**Access**: http://localhost:3001

**No Docker needed for Web UI** - it connects to LangGraph API Server which is in Docker.

---

## Option 2: Add Web UI to Docker (For Production)

If you want to Dockerize the Web UI, you have two options:

### Option 2A: Separate Docker Container

Create a separate Docker container for Web UI:

**docker-compose.yml** (example):

```yaml
services:
  langgraph-api:
    # ... existing LangGraph setup

  web-ui:
    build:
      context: .
      dockerfile: Dockerfile.web-ui
    ports:
      - "3001:3001"
    environment:
      - LANGGRAPH_API_URL=http://langgraph-api:54367
    depends_on:
      - langgraph-api
```

### Option 2B: Add to LangGraph Container

Add Web UI to the same Docker container as LangGraph API (not recommended - better to keep separate).

---

## Recommendation

### For Localhost (Now):

✅ **Keep Web UI separate** - No Docker needed

- Simple and works perfectly
- Easy to develop and debug
- Fast iteration

### For Domain Deployment (Later):

✅ **Add Web UI to Docker** when you deploy

- Can add to docker-compose
- Or deploy separately (both work)

---

## Current Status

**Web UI**: ✅ Runs separately (not in Docker)
**LangGraph API**: ✅ Runs in Docker

**This is fine!** The Web UI connects to LangGraph API Server via HTTP, so it doesn't need to be in the same Docker container.

---

## When You Deploy to Domain

When you provide the domain, we can:

1. **Option A**: Keep Web UI separate (deploy as separate service)
2. **Option B**: Add Web UI to Docker Compose (one command to start everything)

Both work! For now, the separate setup is perfect for localhost development.

---

## Summary

**Question**: Is Web UI in Docker?
**Answer**: ❌ No - it runs separately on localhost

**Question**: Do you need separate Docker?
**Answer**: ❌ No - current setup works fine. Web UI connects to LangGraph API Server (which is in Docker) via HTTP.

**For now**: Just run `npm run web-ui` - no Docker needed! 🚀
