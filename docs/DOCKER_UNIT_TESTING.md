# Unit Testing in Docker - Step-by-Step Guide

## Quick Start

```bash
# 1. Start dev environment
npm run dev:up

# 2. Run unit tests
docker exec -it resume-agent-web-ui-dev npm test
```

---

## Prerequisites

### 1. Install Dependencies (on host)

```bash
# Install npm dependencies (needed for building)
npm install
```

### 2. Ensure Docker is Running

```bash
# Check Docker is running
docker ps

# If not running, start Docker Desktop or Docker daemon
```

---

## Method 1: Using Existing Container (Recommended)

### Step 1: Start Dev Environment

```bash
# Start all services (PostgreSQL, Redis, LangGraph, Auth Server, Web UI)
npm run dev:up

# Or using the script
./scripts/env-manager.sh dev up
```

**Expected Output:**

```
✅ Starting postgres-dev...
✅ Starting redis-dev...
✅ Starting langgraph-api-dev...
✅ Starting auth-server-dev...
✅ Starting web-ui-dev...
```

### Step 2: Verify Services Are Running

```bash
# Check all containers are running
docker ps

# You should see:
# - resume-agent-postgres-dev
# - resume-agent-redis-dev
# - resume-agent-langgraph-dev
# - resume-agent-auth-dev
# - resume-agent-web-ui-dev
```

### Step 3: Wait for Services to Be Ready

```bash
# Wait 20-30 seconds for services to initialize
sleep 20

# Check service health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Step 4: Run Unit Tests

```bash
# Run all unit tests
docker exec -it resume-agent-web-ui-dev npm test

# The tests will run inside the container and output results
```

**Expected Output:**

```
PASS  src/db/__tests__/client.test.ts
PASS  src/utils/__tests__/redis-cache.test.ts
PASS  src/utils/__tests__/rate-limiter.test.ts
...
Test Suites: 14 passed, 14 total
Tests:       127 passed, 127 total
```

### Step 5: Run Specific Test Suites

```bash
# Database tests only
docker exec -it resume-agent-web-ui-dev npm run test:unit:db

# Utility tests only
docker exec -it resume-agent-web-ui-dev npm run test:unit:utils

# API tests only
docker exec -it resume-agent-web-ui-dev npm run test:unit:api

# Auth tests only
docker exec -it resume-agent-web-ui-dev npm run test:unit:auth

# Integration tests only
docker exec -it resume-agent-web-ui-dev npm run test:unit:integrations

# Web UI tests only
docker exec -it resume-agent-web-ui-dev npm run test:unit:web-ui
```

### Step 6: Run Tests with Coverage

```bash
# Generate coverage report
docker exec -it resume-agent-web-ui-dev npm run test:unit:coverage

# Coverage report is saved inside container at /app/coverage/
# To view on host, copy it out:
docker cp resume-agent-web-ui-dev:/app/coverage ./coverage

# Or if volume is mounted, it's already available at ./coverage/
open coverage/lcov-report/index.html  # Mac
```

### Step 7: Run Tests in Watch Mode

```bash
# Watch mode - automatically reruns tests on file changes
docker exec -it resume-agent-web-ui-dev npm run test:unit:watch

# Note: File changes on host won't trigger reruns unless volumes are mounted
```

### Step 8: Run Tests with Verbose Output

```bash
# Show detailed test output
docker exec -it resume-agent-web-ui-dev npm run test:unit:verbose
```

---

## Method 2: Using Automated Script

### Quick Command

```bash
# Run unit tests using the automated script
./scripts/test-docker.sh unit
```

**What it does:**

1. Checks if services are running
2. Starts services if needed
3. Waits for services to be healthy
4. Initializes database
5. Runs unit tests
6. Shows results

### Full Test Suite

```bash
# Run all tests (unit + coverage + E2E)
./scripts/test-docker.sh all

# Or just unit tests
./scripts/test-docker.sh unit

# Or unit tests with coverage
./scripts/test-docker.sh coverage
```

---

## Method 3: Using Docker Compose Test Service

### Step 1: Add Test Service to docker-compose.dev.yml

Add this service to your `docker-compose.dev.yml`:

```yaml
test:
  build:
    context: .
    dockerfile: Dockerfile.test
  container_name: resume-agent-test
  env_file:
    - .env.dev
  environment:
    - NODE_ENV=test
    - POSTGRES_HOST=postgres-dev
    - POSTGRES_PORT=5432
    - POSTGRES_DB=langgraph_dev
    - POSTGRES_USER=langgraph
    - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-changeme}
    - REDIS_HOST=redis-dev
    - REDIS_PORT=6379
  depends_on:
    postgres-dev:
      condition: service_healthy
    redis-dev:
      condition: service_healthy
  networks:
    - resume-agent-dev
  volumes:
    - ./coverage:/app/coverage
  command: npm test
```

### Step 2: Start Dependencies

```bash
# Start only PostgreSQL and Redis
docker compose -f docker-compose.dev.yml up -d postgres-dev redis-dev

# Wait for them to be healthy
sleep 10
```

### Step 3: Run Tests

```bash
# Run unit tests
docker compose -f docker-compose.dev.yml run --rm test npm test

# Run with coverage
docker compose -f docker-compose.dev.yml run --rm test npm run test:unit:coverage

# Run specific test suite
docker compose -f docker-compose.dev.yml run --rm test npm run test:unit:db
```

---

## Running Individual Test Files

### Run Single Test File

```bash
# Run specific test file
docker exec -it resume-agent-web-ui-dev npm test -- client.test.ts

# Run tests matching a pattern
docker exec -it resume-agent-web-ui-dev npm test -- --testNamePattern="should create user"
```

### Run Tests by Path

```bash
# Run tests in specific directory
docker exec -it resume-agent-web-ui-dev npm test -- src/db/__tests__

# Run tests matching pattern
docker exec -it resume-agent-web-ui-dev npm test -- --testPathPattern="redis"
```

---

## Viewing Test Results

### Standard Output

Tests output directly to your terminal when using `docker exec -it`.

### Coverage Reports

```bash
# After running coverage tests
docker exec -it resume-agent-web-ui-dev npm run test:unit:coverage

# Copy coverage to host (if not mounted)
docker cp resume-agent-web-ui-dev:/app/coverage ./coverage

# View HTML report
open coverage/lcov-report/index.html  # Mac
xdg-open coverage/lcov-report/index.html  # Linux
```

### Test Logs

```bash
# View container logs
docker logs resume-agent-web-ui-dev

# Follow logs in real-time
docker logs -f resume-agent-web-ui-dev
```

---

## Troubleshooting

### Issue: Container Not Found

**Error:** `Error: No such container: resume-agent-web-ui-dev`

**Solution:**

```bash
# Start the dev environment first
npm run dev:up

# Verify container exists
docker ps | grep web-ui-dev
```

### Issue: Tests Can't Connect to Database

**Error:** `Connection refused` or `ECONNREFUSED`

**Solution:**

```bash
# Check PostgreSQL is running
docker ps | grep postgres-dev

# Check network connectivity
docker exec resume-agent-web-ui-dev ping postgres-dev

# Verify environment variables
docker exec resume-agent-web-ui-dev env | grep POSTGRES

# Check PostgreSQL logs
docker logs resume-agent-postgres-dev
```

### Issue: Tests Can't Connect to Redis

**Error:** `Redis connection failed`

**Solution:**

```bash
# Check Redis is running
docker ps | grep redis-dev

# Test Redis connection
docker exec resume-agent-redis-dev redis-cli ping

# Check network connectivity
docker exec resume-agent-web-ui-dev ping redis-dev

# Verify environment variables
docker exec resume-agent-web-ui-dev env | grep REDIS
```

### Issue: Module Not Found Errors

**Error:** `Cannot find module '...'`

**Solution:**

```bash
# Rebuild the container
docker compose -f docker-compose.dev.yml build web-ui-dev

# Restart the container
docker restart resume-agent-web-ui-dev

# Check node_modules inside container
docker exec resume-agent-web-ui-dev ls -la node_modules | head -20
```

### Issue: Tests Timing Out

**Error:** `Timeout - Async callback was not invoked`

**Solution:**

```bash
# Increase timeout
docker exec -e TEST_TIMEOUT=30000 resume-agent-web-ui-dev npm test

# Or check if services are slow to respond
docker logs resume-agent-postgres-dev | tail -20
docker logs resume-agent-redis-dev | tail -20
```

### Issue: Coverage Report Not Generated

**Error:** Coverage directory not found

**Solution:**

```bash
# Check if coverage directory exists in container
docker exec resume-agent-web-ui-dev ls -la coverage/

# Create coverage directory if needed
docker exec resume-agent-web-ui-dev mkdir -p coverage

# Run coverage again
docker exec -it resume-agent-web-ui-dev npm run test:unit:coverage

# Copy coverage to host
docker cp resume-agent-web-ui-dev:/app/coverage ./coverage
```

### Issue: Port Already in Use

**Error:** `Bind for 0.0.0.0:5432 failed: port is already allocated`

**Solution:**

```bash
# Stop existing containers
npm run dev:down

# Check for processes using ports
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :3000  # Auth Server
lsof -i :3001  # Web UI

# Kill processes if needed
kill -9 <PID>

# Start services again
npm run dev:up
```

---

## Best Practices

### 1. Always Start Services First

```bash
# Always start services before running tests
npm run dev:up

# Wait for services to be healthy
sleep 20
```

### 2. Check Service Health

```bash
# Before running tests, verify services are healthy
docker ps --format "table {{.Names}}\t{{.Status}}"

# All services should show "healthy" or "Up"
```

### 3. Use Volume Mounts for Coverage

Ensure `docker-compose.dev.yml` has volume mounts:

```yaml
volumes:
  - ./coverage:/app/coverage
```

This makes coverage reports immediately available on the host.

### 4. Clean Up After Testing

```bash
# Stop services when done (optional, they can stay running)
npm run dev:down

# Or keep them running for faster subsequent test runs
```

### 5. Run Tests Before Committing

```bash
# Quick test before committing
docker exec -it resume-agent-web-ui-dev npm test

# Full test suite
./scripts/test-docker.sh all
```

---

## Complete Workflow Example

```bash
# 1. Start dev environment
npm run dev:up

# 2. Wait for services (20-30 seconds)
echo "Waiting for services to be ready..."
sleep 25

# 3. Verify services are running
docker ps

# 4. Run unit tests
echo "Running unit tests..."
docker exec -it resume-agent-web-ui-dev npm test

# 5. Run unit tests with coverage
echo "Generating coverage report..."
docker exec -it resume-agent-web-ui-dev npm run test:unit:coverage

# 6. View coverage report
echo "Opening coverage report..."
open coverage/lcov-report/index.html

# 7. (Optional) Stop services
# npm run dev:down
```

---

## Quick Reference

```bash
# Start services
npm run dev:up

# Run all unit tests
docker exec -it resume-agent-web-ui-dev npm test

# Run specific test suite
docker exec -it resume-agent-web-ui-dev npm run test:unit:db

# Run with coverage
docker exec -it resume-agent-web-ui-dev npm run test:unit:coverage

# Run in watch mode
docker exec -it resume-agent-web-ui-dev npm run test:unit:watch

# View logs
docker logs -f resume-agent-web-ui-dev

# Stop services
npm run dev:down
```

---

## Additional Resources

- **Docker Testing Guide**: [DOCKER_TESTING.md](./DOCKER_TESTING.md)
- **General Testing Guide**: [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- **Unit Tests Documentation**: [UNIT_TESTS.md](./UNIT_TESTS.md)
