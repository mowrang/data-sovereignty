# Debug LangGraph Health Check Failure

## Which Service is Failing?

The error "dependency failed to start" means:
- **`web-ui-dev`** depends on `langgraph-api-dev` being healthy
- If `langgraph-api-dev` is unhealthy, `web-ui-dev` won't start

## Diagnostic Commands

### 1. Check Container Status
```bash
docker compose -f docker-compose.dev.yml ps
```

Look for:
- `langgraph-api-dev` status (should be "Up" or "healthy")
- `web-ui-dev` status (will show "dependency failed" if langgraph is unhealthy)

### 2. Check LangGraph Health Check Logs
```bash
docker inspect resume-agent-langgraph-dev | grep -A 10 Health
```

### 3. Test Health Endpoint Manually
```bash
# From host machine
curl -v http://localhost:54367/health

# Should return 200 OK with JSON response
```

### 4. Check LangGraph Logs
```bash
docker compose -f docker-compose.dev.yml logs langgraph-api-dev --tail=100
```

Look for:
- License errors
- Database connection errors
- Server startup messages
- Health check attempts

### 5. Check if Server is Actually Running
```bash
# Check if process is running inside container
docker compose -f docker-compose.dev.yml exec langgraph-api-dev ps aux | grep langgraph

# Check if port is listening
docker compose -f docker-compose.dev.yml exec langgraph-api-dev netstat -tlnp | grep 54367
```

## Common Issues

### Issue 1: Health Check Timing Out
**Symptoms:** Health check fails even though server is running
**Solution:** Increase `start_period` in docker-compose.dev.yml

### Issue 2: Health Endpoint Not Responding
**Symptoms:** `curl http://localhost:54367/health` returns connection refused
**Solution:** 
- Check server logs for startup errors
- Verify `LANGSMITH_API_KEY` is set
- Check database/Redis connections

### Issue 3: Health Check Command Failing
**Symptoms:** Health check command itself fails (not the endpoint)
**Solution:** Use Node.js instead of curl (already fixed in docker-compose.dev.yml)

## Quick Fix: Temporarily Remove Dependency

If you need to start services independently for debugging:

```yaml
# In docker-compose.dev.yml, temporarily comment out:
web-ui-dev:
  # depends_on:
  #   langgraph-api-dev:
  #     condition: service_healthy
```

Then start services separately:
```bash
# Start langgraph first
docker compose -f docker-compose.dev.yml up -d langgraph-api-dev

# Wait for it to be healthy, then start web-ui
docker compose -f docker-compose.dev.yml up -d web-ui-dev
```

## Verify Health Check is Working

After fixing, verify:
```bash
# Check health status
docker compose -f docker-compose.dev.yml ps langgraph-api-dev

# Should show: "healthy" status
```
