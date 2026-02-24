# Docker Build Troubleshooting Guide

## Common Error: MCP Server Build Fails in Docker

If you see this error:

```
=> ERROR [2/6] RUN cd mcp-google-docs && npm install && npm run build
```

## Quick Fixes

### 1. Test Local Build First

Before building in Docker, test locally:

```bash
# Test MCP build locally
npm run mcp:build

# Or use the debug script
./scripts/debug-docker-build.sh
```

If local build fails, fix those issues first.

---

### 2. Check Docker Build Context

LangGraph Docker build should automatically include `mcp-google-docs`, but verify:

```bash
# Check if directory exists
ls -la mcp-google-docs/

# Check if package.json exists
ls -la mcp-google-docs/package.json
```

---

### 3. Get Full Error Details

The error message you see might be truncated. Get full details:

**Option A: Check Docker build logs**

```bash
# Start build and watch output
npm run langgraph:up 2>&1 | tee docker-build.log

# Or check existing container logs
docker logs langgraph-api-1 2>&1 | grep -A 20 "ERROR\|error\|mcp"
```

**Option B: Build Docker image manually**

```bash
# This will show the full error
docker build -t test-langgraph . 2>&1 | grep -A 30 "mcp"
```

---

### 4. Common Issues and Solutions

#### Issue: "npm: command not found"

**Solution**: Ensure Node.js is available in Docker. LangGraph uses Node 20.

#### Issue: "Cannot find module"

**Solution**:

```bash
# Clean and rebuild
cd mcp-google-docs
rm -rf node_modules dist
npm install
npm run build
```

#### Issue: "TypeScript compilation errors"

**Solution**: Fix TypeScript errors locally first:

```bash
cd mcp-google-docs
npm run build
```

#### Issue: "Permission denied"

**Solution**: Check file permissions:

```bash
chmod -R 755 mcp-google-docs
```

#### Issue: "Network timeout during npm install"

**Solution**: Docker might not have network access. Check:

```bash
docker network ls
docker network inspect bridge
```

---

### 5. Verify Docker Build Configuration

Check `langgraph.json` has the correct build command:

```json
{
  "dockerfile_lines": [
    "RUN set -e && \\",
    "  if [ -d mcp-google-docs ]; then \\",
    "    echo 'Building MCP server...' && \\",
    "    cd mcp-google-docs && \\",
    "    npm ci --production=false && \\",
    "    npm run build && \\",
    "    echo 'MCP server built successfully'; \\",
    "  else \\",
    "    echo 'Warning: mcp-google-docs directory not found - skipping MCP build'; \\",
    "  fi"
  ]
}
```

---

### 6. Alternative: Pre-build MCP Server

If Docker build keeps failing, you can pre-build the MCP server:

**Step 1**: Build locally

```bash
npm run mcp:build
```

**Step 2**: Modify `langgraph.json` to skip build (use pre-built):

```json
{
  "dockerfile_lines": [
    "RUN if [ -f mcp-google-docs/dist/server.js ]; then echo 'Using pre-built MCP server'; else echo 'MCP server not found'; fi"
  ]
}
```

**Note**: This requires `dist/` to be included in Docker build context (not in `.dockerignore`).

---

### 7. Debug Steps

1. **Check Docker is running**:

   ```bash
   docker ps
   ```

2. **Test MCP build locally**:

   ```bash
   cd mcp-google-docs
   npm install
   npm run build
   ```

3. **Check Docker build context**:

   ```bash
   # See what LangGraph includes
   langgraphjs up --dry-run
   ```

4. **Inspect Docker image**:
   ```bash
   # After build fails, inspect the image
   docker images | grep langgraph
   docker run -it <image-id> /bin/bash
   ls -la /deps/social-media-agent/mcp-google-docs
   ```

---

### 8. Get Help

If none of the above works, collect this information:

```bash
# 1. Docker version
docker --version

# 2. Node version
node --version

# 3. Local MCP build output
cd mcp-google-docs && npm run build 2>&1 | tee build.log

# 4. Docker build output
npm run langgraph:up 2>&1 | tee docker-build.log

# 5. Check langgraph.json
cat langgraph.json | grep -A 10 dockerfile_lines
```

---

## Updated Build Command

The `langgraph.json` has been updated with a more robust build command that:

- ✅ Uses `npm ci` for reproducible builds
- ✅ Includes error handling (`set -e`)
- ✅ Provides clear error messages
- ✅ Checks if directory exists before building

Try rebuilding:

```bash
# Stop existing containers
docker compose down

# Rebuild
npm run langgraph:up
```

---

## Success Indicators

When Docker build succeeds, you should see:

```
=> [X/6] RUN cd mcp-google-docs && npm install && npm run build
Building MCP server...
npm ci --production=false
npm run build
MCP server built successfully
```

If you see this, the build worked! ✅
