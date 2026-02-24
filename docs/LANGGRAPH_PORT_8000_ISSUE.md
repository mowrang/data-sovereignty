# LangGraph Port 8000 Issue - Server Not Listening

## Problem

You see the process running:
```
uvicorn langgraph_api.server:app --port 8000
```

But `netstat` doesn't show port 8000 listening:
```bash
docker exec resume-agent-langgraph-dev netstat -tlnp | grep 8000
# No output
```

## Why This Happens

The base image `langchain/langgraphjs-api:20` likely has its own **ENTRYPOINT** that runs uvicorn directly, ignoring the `CMD` in your Dockerfile. The `langgraphjs up` command may not be executing at all.

## Diagnostic Commands

Run these to understand what's happening:

```bash
# 1. Check what command is actually running
docker inspect resume-agent-langgraph-dev --format='{{.Config.Cmd}}'
docker inspect resume-agent-langgraph-dev --format='{{.Config.Entrypoint}}'

# 2. Check all listening ports
docker exec resume-agent-langgraph-dev netstat -tlnp
# Or
docker exec resume-agent-langgraph-dev ss -tlnp

# 3. Check what ports ARE listening
docker exec resume-agent-langgraph-dev netstat -tlnp | grep LISTEN

# 4. Check process list
docker exec resume-agent-langgraph-dev ps aux

# 5. Check logs for port binding messages
docker logs resume-agent-langgraph-dev | grep -i "listening\|port\|bind\|8000\|54367"
```

## Possible Scenarios

### Scenario 1: Server Still Starting
- Process exists but port not bound yet
- **Solution:** Wait 1-2 minutes, then check again

### Scenario 2: Server Crashed
- Process started but crashed before binding port
- **Solution:** Check logs for errors

### Scenario 3: Base Image Override
- Base image ENTRYPOINT runs uvicorn directly
- Your CMD is ignored
- **Solution:** Override command in docker-compose

### Scenario 4: Port Binding Failed
- Server tried to bind but failed
- **Solution:** Check for "Address already in use" errors

## Solution: Override Command in docker-compose

If the base image is overriding your CMD, explicitly set the command:

```yaml
langgraph-api-dev:
  command: ["langgraphjs", "up", "--port", "8000"]
```

Or if the base image runs uvicorn directly, you may need to use environment variables or accept the default behavior.

## Check What Port is Actually Listening

Run this script to see all listening ports:

```bash
npm run check:ports
```

This will show:
- All listening ports
- Which ports are actually bound
- Process information
- Health endpoint tests

## Next Steps

1. **Run port check:**
   ```bash
   npm run check:ports
   ```

2. **Check logs for startup completion:**
   ```bash
   docker logs resume-agent-langgraph-dev | grep -i "started\|listening\|application startup"
   ```

3. **Check if server is actually running:**
   ```bash
   docker exec resume-agent-langgraph-dev ps aux | grep uvicorn
   ```

4. **Test health endpoint on different ports:**
   ```bash
   # Try port 8000
   docker exec resume-agent-langgraph-dev curl http://localhost:8000/health
   
   # Try port 54367
   docker exec resume-agent-langgraph-dev curl http://localhost:54367/health
   ```

## Expected Behavior

Once the server fully starts, you should see:
- Port 8000 listening (inside container)
- Health endpoint responding on port 8000
- Process `uvicorn` running and bound to port 8000

If port 8000 is not listening after 2-3 minutes, there's likely an error preventing the server from starting properly.
