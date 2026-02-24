# LangGraph API Server Startup Source & Debugging

## Where the Server Code Lives

**Important:** The LangGraph API server code is **NOT in this repository**. It comes from:

1. **NPM Package:** `@langchain/langgraph-cli` (installed in `node_modules`)
2. **Base Docker Image:** `langchain/langgraphjs-api:20` (pre-built image)

## Startup Flow in Your Project

### 1. Docker Compose Starts Container
```yaml
# docker-compose.dev.yml
langgraph-api-dev:
  build:
    dockerfile: Dockerfile.langgraph
  command: ["langgraphjs", "up", "--port", "54367"]
```

### 2. Dockerfile.langgraph Sets Up Environment
```dockerfile
FROM langchain/langgraphjs-api:20  # Base image with LangGraph runtime
WORKDIR /deps/social-media-agent
COPY . .                           # Copy your project files
RUN npm ci                         # Install dependencies
CMD ["langgraphjs", "up", "--port", "54367"]  # Start command
```

### 3. `langgraphjs up` Command Runs
This command (from `@langchain/langgraph-cli`):
- Reads `langgraph.json` from your project
- Loads graphs defined in `langgraph.json`
- Connects to PostgreSQL (from `DATABASE_URI`)
- Connects to Redis (from `REDIS_URI`)
- Verifies license (using `LANGSMITH_API_KEY`)
- Starts HTTP server on port 54367
- Registers all graphs as API endpoints

### 4. Server Listens on Port 54367
The server should be listening on `0.0.0.0:54367` inside the container.

## Key Files in Your Project

### Configuration Files
- **`langgraph.json`** - Defines graphs, Node version, env file
  - This is what `langgraphjs` reads to know what to run
  - Location: Project root

- **`Dockerfile.langgraph`** - Custom Dockerfile
  - Base image: `langchain/langgraphjs-api:20`
  - Command: `langgraphjs up --port 54367`
  - Location: Project root

- **`docker-compose.dev.yml`** - Docker Compose config
  - Builds image from `Dockerfile.langgraph`
  - Sets environment variables
  - Location: Project root

### Your Graph Code (What Gets Loaded)
- **`src/agents/resume-agent/resume-agent-graph.ts`** - Your resume agent graph
- **`src/agents/*/`** - Other graphs defined in `langgraph.json`
- These are loaded by `langgraphjs` when it reads `langgraph.json`

## Debugging Port Not Coming Up

### Step 1: Run Debug Script
```bash
npm run debug:langgraph
```

This will check:
- Container status
- Processes running
- Port listening status
- Environment variables
- Recent errors
- Health endpoint

### Step 2: Check Logs
```bash
docker logs -f resume-agent-langgraph-dev
```

Look for:
- `Started server process` - Server started
- `Application startup failed` - Startup error
- `License verification failed` - License issue
- `Connection refused` - Database/Redis issue
- `listening on` - Port binding confirmation

### Step 3: Check Process Inside Container
```bash
docker exec resume-agent-langgraph-dev ps aux
```

Should see:
- `node` process running `langgraphjs`
- Or the LangGraph API server process

### Step 4: Check Port Binding
```bash
docker exec resume-agent-langgraph-dev netstat -tlnp | grep 54367
# Or
docker exec resume-agent-langgraph-dev ss -tlnp | grep 54367
```

Should show:
```
tcp  0  0  0.0.0.0:54367  0.0.0.0:*  LISTEN  <pid>/node
```

### Step 5: Test Health Endpoint
```bash
# From host
curl -v http://localhost:54367/health

# From inside container
docker exec resume-agent-langgraph-dev node -e "require('http').get('http://localhost:54367/health', (r) => console.log('Status:', r.statusCode))"
```

## Common Issues

### Issue 1: Server Never Starts
**Symptoms:** No process running, port not listening
**Check:**
- Container logs for startup errors
- `DATABASE_URI` and `REDIS_URI` are set correctly
- `LANGSMITH_API_KEY` is set

### Issue 2: Server Starts But Crashes
**Symptoms:** Process starts then exits
**Check:**
- License verification errors
- Database connection errors
- Graph compilation errors

### Issue 3: Server Starts But Port Not Listening
**Symptoms:** Process running but port check fails
**Check:**
- Server binding to wrong interface (should be `0.0.0.0`)
- Port conflict
- Firewall rules

### Issue 4: Health Check Fails
**Symptoms:** Port listening but `/health` returns error
**Check:**
- Database connectivity
- Redis connectivity
- Server actually ready (may need more startup time)

## Where to Look for Source Code

### In node_modules (Local)
```bash
cat node_modules/@langchain/langgraph-cli/package.json | grep repository
```

### In Container
```bash
docker exec resume-agent-langgraph-dev cat /deps/social-media-agent/node_modules/@langchain/langgraph-cli/package.json | grep repository
```

### Base Image Source
The `langchain/langgraphjs-api:20` image is built from:
- LangGraph repository: https://github.com/langchain-ai/langgraph
- Likely contains the API server runtime

## Summary

**Your Project Provides:**
- `langgraph.json` - Configuration
- Graph code (`src/agents/*`)
- Docker setup (`Dockerfile.langgraph`, `docker-compose.dev.yml`)

**LangGraph CLI Provides:**
- `langgraphjs` command
- Server runtime
- Graph loading and execution
- HTTP API server

**To Debug:**
1. Run `npm run debug:langgraph`
2. Check logs: `docker logs -f resume-agent-langgraph-dev`
3. Verify port: `docker exec resume-agent-langgraph-dev netstat -tlnp | grep 54367`
4. Test health: `curl http://localhost:54367/health`
