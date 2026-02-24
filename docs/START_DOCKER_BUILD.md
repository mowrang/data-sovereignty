# Starting Docker Build and Monitoring

## Step 1: Check Docker is Running

First, make sure Docker is running:

```bash
# Check Docker daemon
docker ps

# If you get permission errors, make sure Docker Desktop is running
# On Mac: Open Docker Desktop app
```

---

## Step 2: Start LangGraph Server (This Triggers Docker Build)

The Docker build happens automatically when you start the LangGraph server:

```bash
# Start LangGraph server (this will build Docker image)
npm run langgraph:up
```

**What happens**:

1. LangGraph CLI checks for Docker image
2. If image doesn't exist, it builds it (this includes MCP server build)
3. Starts Docker containers
4. Container name will be something like `langgraph-api-1` or `social-media-agent-...-langgraph-api-1`

**First build takes 5-10 minutes** - be patient!

---

## Step 3: Monitor the Build Process

### Option A: Watch Build Output Directly

The `npm run langgraph:up` output shows the build progress. Look for:

```
[+] Building X.Xs (Y/Z)
=> [internal] load build definition
=> [X/Y] RUN cd mcp-google-docs && npm install && npm run build
Building MCP server...
npm ci --production=false
npm run build
MCP server built successfully
```

### Option B: Find Container Name and Watch Logs

**In a NEW terminal** (keep the first one running):

```bash
# Step 1: Find the container name
docker ps --format "{{.Names}}" | grep langgraph

# Step 2: Watch logs (replace <container-name> with actual name)
docker logs -f <container-name> 2>&1 | grep -i "mcp\|building\|error"

# Or watch all logs
docker logs -f <container-name>
```

### Option C: Use the Check Script

```bash
# Run the check script to see container status
./scripts/check-docker-containers.sh
```

---

## Step 4: Verify Build Success

Once the build completes and container is running:

```bash
# Check container is running
docker ps | grep langgraph

# Check MCP server was built
docker exec <container-name> ls -la /deps/social-media-agent/mcp-google-docs/dist/server.js

# Check environment variables
docker exec <container-name> env | grep GOOGLE

# Test environment
npm run test:docker:env
```

---

## Common Container Names

LangGraph containers are usually named:

- `langgraph-api-1`
- `social-media-agent-<hash>-langgraph-api-1`
- `langgraph-api-<project-name>`

To find yours:

```bash
# List all containers
docker ps -a

# Filter for langgraph
docker ps -a | grep langgraph

# Get just the names
docker ps --format "{{.Names}}" | grep -i langgraph
```

---

## Troubleshooting

### Container Not Found After Starting

**Wait a bit**: The build takes time. Check again after 1-2 minutes:

```bash
docker ps -a | grep langgraph
```

### Build Seems Stuck

Check if it's actually building:

```bash
# See Docker build processes
docker ps

# Check Docker system info
docker system df

# Check if there are build errors
docker images | grep langgraph
```

### Permission Denied

Make sure Docker Desktop is running and you have permissions:

```bash
# On Mac, restart Docker Desktop
# Then try:
docker ps
```

---

## Quick Start Commands

```bash
# Terminal 1: Start build
npm run langgraph:up

# Terminal 2: After 30 seconds, check containers
sleep 30
docker ps --format "{{.Names}}" | grep langgraph

# Terminal 2: Watch logs (replace <name> with actual container name)
docker logs -f <name> 2>&1 | grep -i "mcp\|error"
```

---

## What Success Looks Like

### Build Output:

```
[+] Building 120.5s (10/10) FINISHED
=> [6/10] RUN cd mcp-google-docs && npm install && npm run build
Building MCP server...
MCP server built successfully
```

### Container Running:

```
CONTAINER ID   IMAGE                    STATUS
abc123def456   langgraphjs-api:20      Up 2 minutes
```

### Logs Show:

```
Google Docs MCP server running on stdio
LangGraph API server started
```

---

## Next Steps After Build

1. ✅ **Test environment**: `npm run test:docker:env`
2. ✅ **Test MCP**: `TEST_DOC_ID=xxx npm run mcp:test`
3. ✅ **Test Resume Agent**: `npm run cli:resume -- read YOUR_DOC_ID`
