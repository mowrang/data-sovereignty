# Fix LangGraph Health Check Failure

## Issue
```
dependency failed to start: container resume-agent-langgraph-dev is unhealthy
```

## Cause
The health check in `docker-compose.dev.yml` was using `curl`, which may not be available in the LangGraph container. The Dockerfile uses Node.js for health checks, so we should match that.

## Solution

The health check has been updated to use Node.js instead of `curl`:

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:54367/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 120s  # Increased from 40s to allow more startup time
```

## Changes Made

1. **Changed from `curl` to Node.js** - Uses Node.js HTTP module which is guaranteed to be available
2. **Increased `start_period` to 120s** - LangGraph can take 1-2 minutes to fully start (database connections, schema init, license verification)
3. **Increased `retries` to 5** - More attempts before marking as unhealthy
4. **Added error handling** - Properly handles connection errors

## After Making Changes

Restart the containers:

```bash
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d
```

## Verify Health Check

Check the container health status:

```bash
docker compose -f docker-compose.dev.yml ps langgraph-api-dev
```

Should show "healthy" status.

## Manual Health Check Test

Test the health endpoint manually:

```bash
# From host machine
curl http://localhost:54367/health

# Or from inside container
docker compose -f docker-compose.dev.yml exec langgraph-api-dev node -e "require('http').get('http://localhost:54367/health', (r) => console.log('Status:', r.statusCode))"
```

## Troubleshooting

### If health check still fails:

1. **Check logs** for actual errors:
   ```bash
   docker compose -f docker-compose.dev.yml logs langgraph-api-dev --tail=100
   ```

2. **Verify server is actually running**:
   ```bash
   docker compose -f docker-compose.dev.yml exec langgraph-api-dev ps aux | grep langgraph
   ```

3. **Check if port is listening**:
   ```bash
   docker compose -f docker-compose.dev.yml exec langgraph-api-dev netstat -tlnp | grep 54367
   ```

4. **Increase start_period further** if startup takes longer:
   ```yaml
   start_period: 180s  # 3 minutes
   ```

### Common Issues

- **License verification failing** - Make sure `LANGSMITH_API_KEY` is set in `.env.dev`
- **Database connection issues** - Check PostgreSQL container is healthy
- **Redis connection issues** - Check Redis container is healthy
- **Port conflicts** - Make sure port 54367 is not in use by another process
