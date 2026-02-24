# Quick Fix for Docker Dependency Errors

## Problem
Getting errors:
- `Error dependency langgraph-api-dev`
- `Error dependency auth-server-dev`

## Quick Fix Steps

### 1. Stop All Containers
```bash
docker compose -f docker-compose.dev.yml down
```

### 2. Rebuild Images (with no cache)
```bash
docker compose -f docker-compose.dev.yml build --no-cache
```

### 3. Start Services One by One
```bash
# Start dependencies first
docker compose -f docker-compose.dev.yml up -d postgres-dev redis-dev

# Wait 10 seconds for them to be healthy
sleep 10

# Check they're healthy
docker compose -f docker-compose.dev.yml ps

# Start langgraph-api
docker compose -f docker-compose.dev.yml up -d langgraph-api-dev

# Wait for it to be healthy (check logs)
docker compose -f docker-compose.dev.yml logs -f langgraph-api-dev
# Press Ctrl-C when you see it's running

# Start auth-server
docker compose -f docker-compose.dev.yml up -d auth-server-dev

# Check logs
docker compose -f docker-compose.dev.yml logs -f auth-server-dev

# Finally start web-ui
docker compose -f docker-compose.dev.yml up -d web-ui-dev
```

### 4. Check All Services
```bash
docker compose -f docker-compose.dev.yml ps
```

All services should show "healthy" status.

## If Still Failing

### Check Logs
```bash
# LangGraph API
docker compose -f docker-compose.dev.yml logs langgraph-api-dev

# Auth Server
docker compose -f docker-compose.dev.yml logs auth-server-dev

# All services
docker compose -f docker-compose.dev.yml logs
```

### Common Issues

1. **Build Failed**: Check if TypeScript compiled successfully
   ```bash
   npm run build
   ```

2. **Health Check Failing**: Services might need more time
   - Increase `start_period` in docker-compose.dev.yml
   - Or temporarily remove `condition: service_healthy`

3. **Port Conflicts**: Check if ports are already in use
   ```bash
   lsof -i :54367  # LangGraph
   lsof -i :3000   # Auth Server
   lsof -i :3001   # Web UI
   ```

4. **Missing Environment Variables**: Check `.env.dev` exists
   ```bash
   ls -la .env.dev
   ```

## Alternative: Start Without Health Checks

Temporarily modify `docker-compose.dev.yml` to remove health check dependencies:

```yaml
depends_on:
  postgres-dev:  # Remove: condition: service_healthy
  redis-dev:     # Remove: condition: service_healthy
```

Then start normally:
```bash
docker compose -f docker-compose.dev.yml up -d
```
