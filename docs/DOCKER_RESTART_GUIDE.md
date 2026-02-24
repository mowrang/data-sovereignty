# Docker Restart Guide

Quick guide on when and how to restart the LangGraph API Server in Docker.

---

## Do You Need to Restart?

### ✅ **YES, restart required for:**

1. **Code changes in graph nodes** (`src/agents/resume-agent/nodes/*.ts`)

   - Example: Updated `update-resume.ts` logic
   - **Why**: Graph code is loaded when server starts

2. **MCP server changes** (`mcp-google-docs/server.ts`)

   - Example: Fixed `updateDocument` function
   - **Why**: MCP server is built into Docker image
   - **Note**: If using `--watch` mode, some changes auto-reload

3. **Graph structure changes** (`resume-agent-graph.ts`)

   - Example: Added/removed nodes or edges
   - **Why**: Graph definition is loaded at startup

4. **Environment variable changes** (`.env` file)

   - Example: Updated `GOOGLE_REFRESH_TOKEN`
   - **Why**: Env vars are loaded when container starts

5. **Dependencies changes** (`package.json`)
   - Example: Added new npm packages
   - **Why**: Requires rebuilding Docker image

### ❌ **NO restart needed for:**

1. **CLI changes** (`src/cli/resume-cli.ts`)

   - CLI runs separately, not in Docker
   - Just run the CLI command again

2. **Documentation changes** (`docs/*.md`)

   - Documentation doesn't affect running code

3. **Test script changes** (`scripts/*.ts`)
   - Test scripts run separately

---

## Fastest Restart Methods

### Method 1: Quick Restart (Recommended) ⚡

**Fastest - keeps containers, just restarts the API server:**

```bash
# Stop and start (keeps volumes/data)
docker compose restart langgraph-api-1

# Or if you don't know the exact name:
docker compose restart $(docker ps --format "{{.Names}}" | grep langgraph-api | head -1)
```

**Time**: ~10-30 seconds

**What it does**:

- Restarts the container
- Keeps PostgreSQL/Redis data
- Reloads code from mounted volume (if using `--watch`)

---

### Method 2: Full Restart (If Method 1 doesn't work)

**Stops everything and starts fresh:**

```bash
# Stop all containers
docker compose down

# Start again
npm run langgraph:up
```

**Time**: ~1-2 minutes (if no rebuild needed)

**What it does**:

- Stops all containers (PostgreSQL, Redis, API)
- Starts fresh
- Reloads everything

---

### Method 3: Rebuild and Restart (For code changes)

**If you changed code that's built into the image:**

```bash
# Stop containers
docker compose down

# Rebuild and start (forces rebuild)
npm run langgraph:up
```

**Time**: ~5-10 minutes (rebuilds Docker image)

**What it does**:

- Rebuilds Docker image with new code
- Starts fresh containers

---

## For Your Recent Changes

You just updated:

- ✅ `mcp-google-docs/server.ts` (MCP server code)
- ✅ `src/agents/resume-agent/nodes/update-resume.ts` (Graph node)

**Since MCP server is built into Docker image**, you need:

### Option A: Quick Restart (if using `--watch`)

```bash
docker compose restart langgraph-api-1
```

### Option B: Rebuild (recommended for MCP changes)

```bash
docker compose down
npm run langgraph:up
```

**Why rebuild?** MCP server is built during Docker image creation (`dockerfile_lines` in `langgraph.json`), so code changes require rebuilding.

---

## Quick Reference Commands

```bash
# Find container name
docker ps | grep langgraph

# Quick restart (fastest)
docker compose restart <container-name>

# Full restart
docker compose down && npm run langgraph:up

# Rebuild and restart (for code changes)
docker compose down && npm run langgraph:up

# Check if server is running
docker ps | grep langgraph

# View logs after restart
docker logs -f <container-name>
```

---

## Restart Checklist

After restarting, verify:

1. ✅ Container is running: `docker ps | grep langgraph`
2. ✅ No errors in logs: `docker logs <container-name> | tail -20`
3. ✅ Env vars loaded: `docker exec <container-name> env | grep GOOGLE_REFRESH_TOKEN`
4. ✅ Test resume update: `npm run cli:resume -- update --job-description "test"`

---

## Watch Mode

If you're using `npm run langgraph:up` (which includes `--watch`), some changes auto-reload:

- ✅ Graph code changes (sometimes)
- ❌ MCP server changes (requires rebuild)
- ❌ Environment variables (requires restart)

**Best practice**: For code changes, do a full restart to be sure.

---

## Troubleshooting

### Container won't restart?

```bash
# Force stop
docker compose down

# Remove containers
docker compose rm -f

# Start fresh
npm run langgraph:up
```

### Changes not taking effect?

1. Check if you rebuilt (for MCP/code changes)
2. Check logs for errors: `docker logs <container-name>`
3. Verify code is in container: `docker exec <container-name> ls /deps/social-media-agent/src/agents/resume-agent/nodes/`

---

## Summary

**For your recent changes (MCP server + update-resume node):**

```bash
# Fastest: Quick restart (if watch mode works)
docker compose restart langgraph-api-1

# Most reliable: Full rebuild
docker compose down
npm run langgraph:up
```

**Time**:

- Quick restart: ~10-30 seconds
- Full rebuild: ~5-10 minutes
