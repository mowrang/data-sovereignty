# Starting Dev Environment - Step by Step

## Problem: Container Doesn't Exist

If you see:

```
Error response from daemon: No such container: resume-agent-auth-dev
```

This means the dev environment containers haven't been created yet.

## Solution: Start Dev Environment

### Step 1: Navigate to Project Root

```bash
cd "/Users/maryam/Documents/005 Engineering/JobHunting2026/social-media-agent"
```

### Step 2: Start All Services

```bash
# Start all dev services
npm run dev:up

# Or using the script directly
./scripts/env-manager.sh dev up

# Or using docker compose directly
docker compose -f docker-compose.dev.yml up -d
```

### Step 3: Wait for Services to Start

```bash
# Wait 20-30 seconds for services to initialize
sleep 25

# Check status
docker ps

# You should see:
# - resume-agent-postgres-dev
# - resume-agent-redis-dev
# - resume-agent-langgraph-dev
# - resume-agent-auth-dev
# - resume-agent-web-ui-dev
```

### Step 4: Check Service Health

```bash
# Check if containers are running
docker ps --format "table {{.Names}}\t{{.Status}}"

# Check specific container logs
docker logs resume-agent-auth-dev

# Follow logs in real-time
docker logs -f resume-agent-auth-dev
```

## Troubleshooting

### Issue: Services Won't Start

```bash
# Check if ports are already in use
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :54367 # LangGraph
lsof -i :3000  # Auth Server
lsof -i :3001  # Web UI

# Stop any conflicting services
# Then try again
npm run dev:up
```

### Issue: Build Errors

```bash
# Rebuild containers
docker compose -f docker-compose.dev.yml build --no-cache

# Then start
docker compose -f docker-compose.dev.yml up -d
```

### Issue: Container Starts Then Stops

```bash
# Check logs to see why it stopped
docker logs resume-agent-auth-dev

# Common causes:
# - Missing environment variables
# - Database connection errors
# - Port conflicts
```

## Quick Reference

```bash
# Start services
npm run dev:up

# Check status
docker ps

# View logs
docker logs resume-agent-auth-dev

# Stop services
npm run dev:down

# Restart services
npm run dev:down && npm run dev:up
```
