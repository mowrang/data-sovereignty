# Verify LangGraph Server is Running

## Check Server Status

### 1. Check Container Status
```bash
docker compose -f docker-compose.dev.yml ps langgraph-api-dev
```

Should show status as "Up" or "healthy".

### 2. Check Health Endpoint
```bash
curl http://localhost:54367/health
```

Should return a JSON response with status information.

### 3. Check API Endpoint
```bash
curl http://localhost:54367/info
```

Should return LangGraph API information.

### 4. View Real-time Logs
```bash
docker compose -f docker-compose.dev.yml logs -f langgraph-api-dev
```

## What Healthy Logs Look Like

You should see periodic logs like:
- `Postgres pool stats` - Database connection pool status
- `Redis pool stats` - Redis connection pool status  
- `Worker stats` - Background worker thread status
- `Sweep: completed` - Database cleanup operations

## Common Issues

### If you see license errors:
- Make sure `LANGSMITH_API_KEY` is set in `.env.dev`
- Restart the container: `docker compose -f docker-compose.dev.yml restart langgraph-api-dev`

### If you see connection errors:
- Check PostgreSQL is running: `docker compose -f docker-compose.dev.yml ps postgres-dev`
- Check Redis is running: `docker compose -f docker-compose.dev.yml ps redis-dev`

### If startup takes a long time:
- This is normal! First startup can take 1-2 minutes as it:
  - Connects to databases
  - Initializes schema
  - Verifies license
  - Starts workers

## Success Indicators

✅ Container status: "Up"  
✅ No error messages in logs  
✅ Periodic "pool stats" and "worker stats" logs  
✅ Health endpoint responds  
✅ Can make API calls to `/threads`, `/runs`, etc.
