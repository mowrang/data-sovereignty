# Fix: LangGraph Port Mismatch (8000 vs 54367)

## Issue

The LangGraph API server is running on port **8000** inside the container (default for uvicorn), but the configuration expects port **54367**.

**Symptoms:**
- Health check fails
- Port not accessible on expected port
- Server process shows: `uvicorn ... --port 8000`

## Root Cause

The LangGraph base image (`langchain/langgraphjs-api:20`) runs a Python uvicorn server that defaults to port **8000**. The `--port` flag in the CMD may not be working as expected, or the base image ignores it.

## Solution

Map the host port 54367 to container port 8000 in docker-compose:

```yaml
ports:
  - "54367:8000"  # Host:Container
```

And update health check to check port 8000:

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:8000/health', ...)"]
```

## Changes Made

### 1. docker-compose.dev.yml
- Changed port mapping: `"54367:8000"` (was `"54367:54367"`)
- Updated health check to check port 8000

### 2. Dockerfile.langgraph
- Changed EXPOSE to 8000
- Updated health check to check port 8000
- Updated CMD to use port 8000 (though this may not be necessary)

## Verification

After restarting:

```bash
# Check port mapping
docker compose -f docker-compose.dev.yml ps langgraph-api-dev

# Test from host (should work now)
curl http://localhost:54367/health

# Test from inside container (should work)
docker exec resume-agent-langgraph-dev curl http://localhost:8000/health
```

## Why Port 8000?

The LangGraph API server uses Python's uvicorn, which defaults to port 8000. The base image `langchain/langgraphjs-api:20` runs:
```
uvicorn langgraph_api.server:app --port 8000
```

The `--port` flag in `langgraphjs up` might not override this, or the base image configuration takes precedence.

## Alternative: Use Port 8000 Everywhere

If you prefer to use port 8000 consistently:

1. Update docker-compose port mapping: `"8000:8000"`
2. Update `LANGGRAPH_API_URL` to use port 8000
3. Update all references from 54367 to 8000

But keeping 54367 on the host is fine - it's just a mapping.

## Summary

- **Container port:** 8000 (LangGraph default)
- **Host port:** 54367 (mapped in docker-compose)
- **Health check:** Checks port 8000 inside container
- **External access:** Use `http://localhost:54367` from host

This fixes the port mismatch issue!
