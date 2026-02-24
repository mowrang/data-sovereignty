# Docker Debug Build Testing Guide

This guide shows you how to test Docker builds with debug output and verify everything works.

## Quick Start

### Option 1: Debug Build Test (Recommended)

This runs a comprehensive test that builds Docker with verbose output and checks everything:

```bash
npm run test:docker:build:debug
```

**What it does**:

1. ✅ Checks prerequisites (Docker, .env file)
2. ✅ Stops existing containers
3. ✅ Tests local MCP build first (catches issues early)
4. ✅ Starts LangGraph server with verbose output
5. ✅ Monitors Docker build logs for MCP build steps
6. ✅ Checks container status
7. ✅ Tests environment variables in container
8. ✅ Verifies MCP server was built in Docker
9. ✅ Provides detailed error messages

---

### Option 2: Step-by-Step Manual Debug

If you prefer to do it manually:

#### Step 1: Test Local Build First

```bash
# This catches issues before Docker
npm run mcp:build
```

#### Step 2: Start Docker Build with Verbose Output

```bash
# Terminal 1: Start server and watch output
npm run langgraph:up 2>&1 | tee docker-build.log
```

#### Step 3: In Another Terminal, Check Build Progress

```bash
# Terminal 2: Watch Docker logs
docker logs -f langgraph-api-1 2>&1 | grep -i "mcp\|error\|building"
```

#### Step 4: Once Build Completes, Test Environment

```bash
# Terminal 2: Test environment variables
npm run test:docker:env
```

---

## Understanding the Debug Output

### What to Look For

#### ✅ Success Indicators

**MCP Build Success**:

```
Building MCP server...
npm ci --production=false
npm run build
MCP server built successfully
```

**Container Running**:

```
Container is running!
Environment variables found:
  - GOOGLE_CLIENT_ID
  - GOOGLE_REFRESH_TOKEN
  ...
MCP server found in container!
```

#### ❌ Failure Indicators

**MCP Build Failed**:

```
ERROR [X/6] RUN cd mcp-google-docs && npm install && npm run build
npm ERR! code ...
```

**Environment Variables Missing**:

```
MCP server failed: GOOGLE_REFRESH_TOKEN not found
This suggests environment variables are NOT available in Docker
```

**MCP Server Not Built**:

```
MCP server NOT found in container
This means the Docker build step for MCP failed.
```

---

## Common Scenarios

### Scenario 1: Local Build Works, Docker Build Fails

**Symptoms**:

- `npm run mcp:build` succeeds locally
- Docker build fails with MCP errors

**Solutions**:

1. Check Docker has network access:

   ```bash
   docker network ls
   ```

2. Check if `mcp-google-docs` is in Docker build context:

   ```bash
   # Check what LangGraph includes
   ls -la mcp-google-docs/
   ```

3. Try rebuilding Docker image:

   ```bash
   docker compose down
   docker system prune -f
   npm run langgraph:up
   ```

4. Check Docker build logs for specific error:
   ```bash
   docker logs langgraph-api-1 2>&1 | grep -A 20 "ERROR\|mcp"
   ```

---

### Scenario 2: Docker Build Succeeds, But Env Vars Missing

**Symptoms**:

- Docker build completes
- `npm run test:docker:env` shows env vars missing

**Solutions**:

1. Verify `langgraph.json` has `"env": ".env"`:

   ```bash
   cat langgraph.json | grep '"env"'
   ```

2. Check `.env` file exists in project root:

   ```bash
   ls -la .env
   ```

3. Restart Docker containers:

   ```bash
   docker compose down
   npm run langgraph:up
   ```

4. Manually check env vars:
   ```bash
   docker exec langgraph-api-1 env | grep GOOGLE
   ```

---

### Scenario 3: MCP Server Not Found in Container

**Symptoms**:

- Docker build appears to succeed
- MCP server file doesn't exist in container

**Solutions**:

1. Check if build step actually ran:

   ```bash
   docker logs langgraph-api-1 2>&1 | grep "Building MCP server"
   ```

2. Check if file exists at expected path:

   ```bash
   docker exec langgraph-api-1 ls -la /deps/social-media-agent/mcp-google-docs/dist/
   ```

3. Check alternative paths:

   ```bash
   docker exec langgraph-api-1 find /deps -name "server.js" -type f
   ```

4. Rebuild with clean cache:
   ```bash
   docker compose down
   docker builder prune -f
   npm run langgraph:up
   ```

---

## Debug Commands Reference

### Check Docker Status

```bash
# List containers
docker ps -a | grep langgraph

# Check container logs
docker logs langgraph-api-1

# Follow logs in real-time
docker logs -f langgraph-api-1
```

### Check Environment Variables

```bash
# All env vars
docker exec langgraph-api-1 env

# Filter for Google vars
docker exec langgraph-api-1 env | grep GOOGLE

# Filter for all relevant vars
docker exec langgraph-api-1 env | grep -E "GOOGLE|ANTHROPIC|LANGSMITH"
```

### Check MCP Server

```bash
# Check if file exists
docker exec langgraph-api-1 ls -la /deps/social-media-agent/mcp-google-docs/dist/server.js

# Check directory structure
docker exec langgraph-api-1 ls -la /deps/social-media-agent/mcp-google-docs/

# Find server.js anywhere
docker exec langgraph-api-1 find /deps -name "server.js"
```

### Check Build Logs

```bash
# All logs
docker logs langgraph-api-1 2>&1

# MCP-related logs
docker logs langgraph-api-1 2>&1 | grep -i mcp

# Error logs
docker logs langgraph-api-1 2>&1 | grep -i error

# Build step logs
docker logs langgraph-api-1 2>&1 | grep -A 10 "Building MCP"
```

### Inspect Container

```bash
# Get shell in container
docker exec -it langgraph-api-1 /bin/bash

# Then inside container:
cd /deps/social-media-agent
ls -la mcp-google-docs/
cat mcp-google-docs/package.json
```

---

## Test Workflow

### Complete Test Sequence

```bash
# 1. Test local build
npm run mcp:build

# 2. Test Docker build with debug
npm run test:docker:build:debug

# 3. Once build succeeds, test environment
npm run test:docker:env

# 4. Test MCP in Docker context
TEST_DOC_ID=your_doc_id npm run mcp:test

# 5. Test full integration
npm run cli:resume -- read YOUR_DOC_ID
```

---

## Troubleshooting Quick Reference

| Issue                 | Command to Diagnose                                                       | Solution                                   |
| --------------------- | ------------------------------------------------------------------------- | ------------------------------------------ |
| Build fails           | `docker logs langgraph-api-1 \| grep ERROR`                               | Check error, fix locally first             |
| Env vars missing      | `docker exec langgraph-api-1 env \| grep GOOGLE`                          | Check `langgraph.json` has `"env": ".env"` |
| MCP not found         | `docker exec langgraph-api-1 ls /deps/.../mcp-google-docs/dist/server.js` | Rebuild Docker image                       |
| Container not running | `docker ps -a \| grep langgraph`                                          | Start with `npm run langgraph:up`          |
| Network issues        | `docker network ls`                                                       | Check Docker network configuration         |

---

## Next Steps

After debug testing passes:

1. ✅ **Verify all components**: Run `npm run test:all:components`
2. ✅ **Test Resume Agent**: `npm run cli:resume -- read YOUR_DOC_ID`
3. ✅ **Check integration**: Test end-to-end flow

See [`COMPONENT_TESTING.md`](./COMPONENT_TESTING.md) for more testing options.
