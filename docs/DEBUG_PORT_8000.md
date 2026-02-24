# Debug: LangGraph Not Listening on Port 8000

## Issue

The process shows `uvicorn ... --port 8000` but `netstat` doesn't show port 8000 listening.

## Possible Causes

### 1. Server Still Starting
The server may still be initializing (takes 1-2 minutes). Check if it's still starting up.

### 2. Server Crashed After Starting
The server may have started but then crashed. Check logs for errors.

### 3. Port Binding Failed
The server may have failed to bind to port 8000. Check for "Address already in use" errors.

### 4. Wrong Command Being Executed
The docker-compose may be overriding the Dockerfile CMD, or the base image may have its own CMD.

## Diagnostic Steps

### Step 1: Check All Listening Ports
```bash
docker exec resume-agent-langgraph-dev netstat -tlnp
# Or
docker exec resume-agent-langgraph-dev ss -tlnp
```

### Step 2: Check What Command is Actually Running
```bash
docker inspect resume-agent-langgraph-dev | grep -A 5 Cmd
```

### Step 3: Check Process List
```bash
docker exec resume-agent-langgraph-dev ps aux
```

Look for:
- `uvicorn` process
- `langgraphjs` process
- `python` process

### Step 4: Check Recent Logs
```bash
docker logs resume-agent-langgraph-dev --tail=50
```

Look for:
- "Application startup complete"
- "Uvicorn running on"
- "Listening on"
- Any errors about port binding

### Step 5: Test Health Endpoint
```bash
# Try both ports
docker exec resume-agent-langgraph-dev curl http://localhost:8000/health
docker exec resume-agent-langgraph-dev curl http://localhost:54367/health
```

## Solution: Ensure Correct Command

If the base image is overriding the CMD, we need to explicitly set it in docker-compose:

```yaml
langgraph-api-dev:
  command: ["langgraphjs", "up", "--port", "8000"]
```

Or check if there's an environment variable to set the port.

## Check Base Image Behavior

The base image `langchain/langgraphjs-api:20` may have its own CMD that runs uvicorn directly, ignoring the `langgraphjs up` command. In that case, we may need to:

1. Use an environment variable to set the port
2. Override the CMD in docker-compose
3. Or accept port 8000 and map it correctly
