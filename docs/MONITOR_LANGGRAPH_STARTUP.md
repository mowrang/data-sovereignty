# Monitor LangGraph Startup

## Quick Start

### Monitor Startup Progress
```bash
npm run monitor:langgraph
```

This will:
- Monitor container status
- Check health check status
- Test health endpoint
- Show recent logs
- Exit when healthy (or timeout after 5 minutes)

### Diagnose Health Check Issues
```bash
npm run diagnose:health
```

This will show:
- Container status
- Health check history
- Port listening status
- Health endpoint response
- Database connection
- Redis connection
- License key status
- Recent logs
- Error logs

## Manual Monitoring

### Watch Logs in Real-Time
```bash
docker compose -f docker-compose.dev.yml logs -f langgraph-api-dev
```

### Check Container Status
```bash
docker compose -f docker-compose.dev.yml ps langgraph-api-dev
```

### Test Health Endpoint
```bash
curl -v http://localhost:54367/health
```

### Check Health Check History
```bash
docker inspect resume-agent-langgraph-dev --format='{{json .State.Health}}' | jq
```

## Understanding Startup Phases

### Phase 1: Container Starting (0-10s)
- Container is created
- Status: "starting"
- Health: "starting" or "no_healthcheck"

### Phase 2: Server Initialization (10-60s)
- LangGraph server starting
- Connecting to databases
- Status: "running"
- Health: "starting"
- Logs show: "Starting Postgres runtime", "Redis pool stats"

### Phase 3: Schema & License (60-90s)
- Database schema initialization
- License verification
- Health: "starting"
- Logs show: "Migration lock acquired", "License verification"

### Phase 4: Graph Registration (90-120s)
- Loading and compiling graphs
- Registering with API server
- Health: "starting"
- Logs show: Graph compilation messages

### Phase 5: Workers Starting (120-150s)
- Starting background workers
- Health: "starting" → "healthy"
- Logs show: "Worker stats", "available=10"

### Phase 6: Healthy (150s+)
- All systems operational
- Status: "running"
- Health: "healthy"
- HTTP: 200

## Common Issues

### Health Check Fails Immediately
**Symptom:** Health check fails right away
**Cause:** Server not starting
**Check:** Look for errors in logs

### Health Check Times Out
**Symptom:** Health check keeps failing, server seems running
**Cause:** Health endpoint not responding
**Check:** `curl http://localhost:54367/health`

### Takes Longer Than 2 Minutes
**Symptom:** Still "starting" after 2 minutes
**Cause:** Slow database, network issues, or many graphs
**Solution:** Increase `start_period` in docker-compose.dev.yml

## Troubleshooting Steps

1. **Run diagnostics:**
   ```bash
   npm run diagnose:health
   ```

2. **Check logs for errors:**
   ```bash
   docker compose -f docker-compose.dev.yml logs langgraph-api-dev | grep -i error
   ```

3. **Verify dependencies:**
   ```bash
   docker compose -f docker-compose.dev.yml ps
   ```
   Make sure postgres-dev and redis-dev are healthy

4. **Check license key:**
   ```bash
   docker compose -f docker-compose.dev.yml exec langgraph-api-dev env | grep LANGSMITH
   ```

5. **Test health endpoint manually:**
   ```bash
   curl -v http://localhost:54367/health
   ```

## Expected Timeline

- **0-30s:** Container starting, server initializing
- **30-60s:** Database connections, schema checks
- **60-90s:** License verification, graph loading starts
- **90-120s:** Graph compilation, worker initialization
- **120-150s:** Workers starting, health check begins
- **150s+:** Healthy and ready

**Total: ~2-3 minutes for full startup**
