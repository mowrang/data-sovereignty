# Docker Dependency Errors Troubleshooting

## Error: `Error dependency langgraph-api-dev` or `Error dependency auth-server-dev`

This error occurs when Docker Compose services fail their health checks or crash during startup.

## Common Causes

### 1. **Health Check Failures**
Services are waiting for dependencies to become healthy, but health checks are failing.

### 2. **Build Failures**
The Docker images failed to build (TypeScript errors, missing files, etc.)

### 3. **Startup Crashes**
Containers start but immediately crash due to runtime errors.

## Troubleshooting Steps

### Step 1: Check Container Status
```bash
docker compose -f docker-compose.dev.yml ps -a
```

Look for:
- Exit codes (non-zero = error)
- Status (Exited, Restarting, etc.)

### Step 2: Check Build Logs
```bash
# Check if images built successfully
docker compose -f docker-compose.dev.yml build --no-cache langgraph-api-dev
docker compose -f docker-compose.dev.yml build --no-cache auth-server-dev
```

### Step 3: Check Container Logs
```bash
# Check langgraph-api logs
docker compose -f docker-compose.dev.yml logs langgraph-api-dev

# Check auth-server logs
docker compose -f docker-compose.dev.yml logs auth-server-dev

# Check all logs
docker compose -f docker-compose.dev.yml logs
```

### Step 4: Start Services Individually
```bash
# Start dependencies first
docker compose -f docker-compose.dev.yml up -d postgres-dev redis-dev

# Wait for them to be healthy
docker compose -f docker-compose.dev.yml ps

# Then start langgraph-api
docker compose -f docker-compose.dev.yml up langgraph-api-dev

# In another terminal, start auth-server
docker compose -f docker-compose.dev.yml up auth-server-dev
```

### Step 5: Check Health Check Endpoints
```bash
# Test langgraph-api health (after it starts)
curl http://localhost:54367/health

# Test auth-server health (after it starts)
curl http://localhost:3000/health
```

## Common Fixes

### Fix 1: Increase Health Check Timeout
If services take longer to start, increase the `start_period`:

```yaml
healthcheck:
  start_period: 60s  # Increase from 40s
```

### Fix 2: Fix Build Errors
If build fails, check:
- TypeScript compilation errors
- Missing files/directories
- Environment variables

```bash
# Build with verbose output
docker compose -f docker-compose.dev.yml build --progress=plain langgraph-api-dev
```

### Fix 3: Check Environment Variables
Ensure `.env.dev` exists and has required variables:

```bash
# Check if .env.dev exists
ls -la .env.dev

# Verify required variables are set
cat .env.dev | grep -E "POSTGRES|REDIS|LANGGRAPH"
```

### Fix 4: Remove Health Check Dependencies Temporarily
For debugging, temporarily remove `condition: service_healthy`:

```yaml
depends_on:
  langgraph-api-dev:  # Remove condition temporarily
  auth-server-dev:    # Remove condition temporarily
```

### Fix 5: Check Port Conflicts
```bash
# Check if ports are already in use
lsof -i :54367  # LangGraph API
lsof -i :3000   # Auth Server
lsof -i :3001   # Web UI
lsof -i :5432   # PostgreSQL
lsof -i :6379   # Redis
```

## Quick Diagnostic Script

```bash
#!/bin/bash
echo "=== Checking Docker Services ==="
docker compose -f docker-compose.dev.yml ps -a

echo -e "\n=== Checking Build Status ==="
docker images | grep resume-agent

echo -e "\n=== Checking Logs (last 20 lines) ==="
echo "--- langgraph-api-dev ---"
docker compose -f docker-compose.dev.yml logs --tail=20 langgraph-api-dev

echo -e "\n--- auth-server-dev ---"
docker compose -f docker-compose.dev.yml logs --tail=20 auth-server-dev

echo -e "\n=== Checking Health ==="
curl -f http://localhost:54367/health 2>/dev/null && echo "LangGraph API: OK" || echo "LangGraph API: FAILED"
curl -f http://localhost:3000/health 2>/dev/null && echo "Auth Server: OK" || echo "Auth Server: FAILED"
```

## Most Likely Issues

1. **TypeScript Build Failed**: Check if `npm run build` succeeds locally
2. **Missing Files**: Ensure all required source files are copied in Dockerfile
3. **Health Check Too Strict**: Services might need more time to start
4. **Environment Variables Missing**: Check `.env.dev` file

## Next Steps

1. Run the diagnostic script above
2. Check the specific error messages in logs
3. Try building services individually
4. Check if services start without health check dependencies
