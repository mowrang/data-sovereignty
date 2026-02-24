# LangGraph Health Check Explained

## What We Check

The health check in `docker-compose.dev.yml` verifies that the LangGraph API server is:

1. **Running** - The HTTP server is up and listening on port 54367
2. **Responding** - The `/health` endpoint returns HTTP 200 (success)
3. **Accessible** - The server can handle HTTP requests

## Current Health Check Configuration

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:54367/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"]
  interval: 30s      # Check every 30 seconds
  timeout: 10s      # Timeout after 10 seconds
  retries: 5        # Retry 5 times before marking unhealthy
  start_period: 120s # Allow 2 minutes for initial startup
```

## What the Health Check Does

### The Command:
```javascript
require('http').get('http://localhost:54367/health', (r) => {
  process.exit(r.statusCode === 200 ? 0 : 1)
}).on('error', () => process.exit(1))
```

This Node.js one-liner:
1. Makes an HTTP GET request to `http://localhost:54367/health`
2. Checks if the response status code is `200` (OK)
3. Exits with code `0` (success) if status is 200
4. Exits with code `1` (failure) if:
   - Status code is not 200
   - Connection error occurs
   - Request times out

### What `/health` Endpoint Checks

The LangGraph `/health` endpoint typically verifies:

1. **Server Status** - Is the HTTP server running?
2. **Database Connectivity** - Can it connect to PostgreSQL?
3. **Redis Connectivity** - Can it connect to Redis?
4. **License Status** - Is the license valid?
5. **Worker Status** - Are background workers running?

**Note:** The exact implementation depends on LangGraph's version, but it generally checks that core services are operational.

## Health Check Timing

### Start Period (120 seconds)
- Docker waits 120 seconds before starting health checks
- This gives LangGraph time to:
  - Connect to databases
  - Initialize schema
  - Verify license
  - Start workers
  - Register graphs

### Interval (30 seconds)
- After start period, checks run every 30 seconds
- If a check fails, it retries up to 5 times

### Timeout (10 seconds)
- Each health check must complete within 10 seconds
- If it takes longer, it's considered a failure

## What Makes It Healthy

The container is marked **healthy** when:
- ✅ Health check returns exit code 0
- ✅ HTTP status 200 from `/health` endpoint
- ✅ No connection errors
- ✅ Happens consistently (not just once)

## What Makes It Unhealthy

The container is marked **unhealthy** when:
- ❌ Health check returns exit code 1
- ❌ HTTP status is not 200 (e.g., 500, 503, connection refused)
- ❌ Connection timeout (>10 seconds)
- ❌ Fails 5 consecutive times

## Common Failure Scenarios

### 1. Server Not Started Yet
**Symptom:** Connection refused
**Solution:** Increase `start_period` or check server logs

### 2. Database Connection Failed
**Symptom:** `/health` returns 500 or 503
**Solution:** Check PostgreSQL is running and accessible

### 3. License Verification Failed
**Symptom:** Server crashes or returns error
**Solution:** Verify `LANGSMITH_API_KEY` is set correctly

### 4. Port Not Listening
**Symptom:** Connection refused
**Solution:** Check if port 54367 is bound and listening

## Testing the Health Check Manually

### From Host Machine:
```bash
curl -v http://localhost:54367/health
```

Expected response:
```json
{
  "ok": true,
  "status": "healthy"
}
```

### From Inside Container:
```bash
docker compose -f docker-compose.dev.yml exec langgraph-api-dev \
  node -e "require('http').get('http://localhost:54367/health', (r) => {
    let data = '';
    r.on('data', chunk => data += chunk);
    r.on('end', () => {
      console.log('Status:', r.statusCode);
      console.log('Response:', data);
      process.exit(r.statusCode === 200 ? 0 : 1);
    });
  }).on('error', (e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })"
```

## Viewing Health Check Status

### Check Container Health:
```bash
docker inspect resume-agent-langgraph-dev | grep -A 20 Health
```

### Check Health Check History:
```bash
docker inspect resume-agent-langgraph-dev --format='{{json .State.Health}}' | jq
```

### Check Container Status:
```bash
docker compose -f docker-compose.dev.yml ps langgraph-api-dev
```

Shows:
- `Up (healthy)` - Container is running and healthy
- `Up (unhealthy)` - Container is running but health check failing
- `Up (starting)` - Container is starting, health check not started yet

## Summary

The health check is **simple but effective**:
- ✅ Verifies server is running and responding
- ✅ Checks `/health` endpoint returns 200
- ✅ Allows 2 minutes for startup
- ✅ Retries 5 times before giving up
- ✅ Runs every 30 seconds

If the health check passes, it means LangGraph is:
- Running
- Connected to databases
- Ready to handle requests
- Properly licensed

This is why `web-ui-dev` depends on it being healthy before starting!
