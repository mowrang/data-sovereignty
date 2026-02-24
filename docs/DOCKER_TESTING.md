# Docker Testing Guide

## Running Unit Tests and E2E Tests in Docker

**Last Updated:** February 9, 2026

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Running Unit Tests in Docker](#running-unit-tests-in-docker)
3. [Running E2E Tests in Docker](#running-e2e-tests-in-docker)
4. [Testing Inside Containers](#testing-inside-containers)
5. [Docker Compose Test Service](#docker-compose-test-service)
6. [CI/CD Testing](#cicd-testing)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Option 1: Run Tests in Existing Container

```bash
# Start dev environment
npm run dev:up

# Run unit tests inside web-ui container
docker exec -it resume-agent-web-ui-dev npm test

# Run E2E tests inside web-ui container
docker exec -it resume-agent-web-ui-dev npm run test:int
```

### Option 2: Run Tests in New Test Container

```bash
# Build and run test container
docker compose -f docker-compose.dev.yml run --rm test npm test

# Or use the test service (see below)
```

---

## Running Unit Tests in Docker

### Method 1: Using Existing Container

```bash
# 1. Start dev environment
npm run dev:up

# 2. Wait for services to be healthy
docker ps  # Verify all containers are running

# 3. Run unit tests in web-ui container
docker exec -it resume-agent-web-ui-dev npm test

# 4. Run with coverage
docker exec -it resume-agent-web-ui-dev npm run test:unit:coverage

# 5. Run specific test suite
docker exec -it resume-agent-web-ui-dev npm run test:unit:db
```

### Method 2: Using Test Container

```bash
# Build test container
docker build -f Dockerfile.test -t resume-agent-test .

# Run unit tests
docker run --rm \
  --network resume-agent-dev \
  -v $(pwd)/coverage:/app/coverage \
  resume-agent-test npm test
```

### Method 3: Using Docker Compose Test Service

Add this to `docker-compose.dev.yml`:

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

Then run:

```bash
# Start dependencies
npm run dev:up

# Run tests
docker compose -f docker-compose.dev.yml run --rm test npm test
```

---

## Running E2E Tests in Docker

### Prerequisites

1. **Start all services**:

   ```bash
   npm run dev:up
   ```

2. **Initialize database**:
   ```bash
   docker exec -it resume-agent-web-ui-dev npm run db:init
   ```

### Run E2E Tests

```bash
# Run E2E tests in web-ui container
docker exec -it resume-agent-web-ui-dev npm run test:int

# Run with verbose output
docker exec -it resume-agent-web-ui-dev npm run test:int -- --verbose

# Run specific E2E test
docker exec -it resume-agent-web-ui-dev npm run test:int -- resume-agent.e2e.test.ts
```

### E2E Test with All Services

```bash
# 1. Start all services
npm run dev:up

# 2. Wait for services to be healthy (check logs)
docker logs resume-agent-langgraph-dev
docker logs resume-agent-auth-dev
docker logs resume-agent-web-ui-dev

# 3. Initialize database
docker exec -it resume-agent-web-ui-dev npm run db:init

# 4. Run E2E tests
docker exec -it resume-agent-web-ui-dev npm run test:int

# 5. View test results
docker logs resume-agent-web-ui-dev
```

---

## Testing Inside Containers

### Access Container Shell

```bash
# Access web-ui container shell
docker exec -it resume-agent-web-ui-dev sh

# Or bash (if available)
docker exec -it resume-agent-web-ui-dev bash
```

### Run Commands Inside Container

```bash
# Run any npm script
docker exec -it resume-agent-web-ui-dev npm run <script-name>

# Examples:
docker exec -it resume-agent-web-ui-dev npm test
docker exec -it resume-agent-web-ui-dev npm run test:unit:coverage
docker exec -it resume-agent-web-ui-dev npm run lint
```

### Check Service Health

```bash
# Check all containers
docker ps

# Check specific service logs
docker logs resume-agent-postgres-dev
docker logs resume-agent-redis-dev
docker logs resume-agent-langgraph-dev
docker logs resume-agent-auth-dev
docker logs resume-agent-web-ui-dev

# Follow logs in real-time
docker logs -f resume-agent-web-ui-dev
```

---

## Docker Compose Test Service

### Create Dockerfile.test

Create `Dockerfile.test`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Default command (can be overridden)
CMD ["npm", "test"]
```

### Add Test Service to docker-compose.dev.yml

Add this service:

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
    - ./node_modules:/app/node_modules # Optional: for faster rebuilds
  profiles:
    - test # Only start with --profile test
```

### Usage

```bash
# Start dependencies only
docker compose -f docker-compose.dev.yml up -d postgres-dev redis-dev

# Run unit tests
docker compose -f docker-compose.dev.yml run --rm test npm test

# Run E2E tests (requires all services)
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml run --rm test npm run test:int

# Run with coverage
docker compose -f docker-compose.dev.yml run --rm test npm run test:unit:coverage

# Clean up
docker compose -f docker-compose.dev.yml down
```

---

## CI/CD Testing

### GitHub Actions Example

```yaml
name: Docker Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start services
        run: |
          docker compose -f docker-compose.dev.yml up -d postgres-dev redis-dev

      - name: Run unit tests
        run: |
          docker compose -f docker-compose.dev.yml run --rm test npm test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start all services
        run: |
          docker compose -f docker-compose.dev.yml up -d
          sleep 30  # Wait for services to be healthy

      - name: Initialize database
        run: |
          docker exec resume-agent-web-ui-dev npm run db:init

      - name: Run E2E tests
        run: |
          docker exec resume-agent-web-ui-dev npm run test:int
```

---

## Complete Testing Workflow

### Step-by-Step: Full Test Suite in Docker

```bash
# 1. Start all services
npm run dev:up

# 2. Wait for services (30-60 seconds)
sleep 30

# 3. Check service health
docker ps
docker logs resume-agent-langgraph-dev | tail -20

# 4. Initialize database
docker exec -it resume-agent-web-ui-dev npm run db:init

# 5. Run unit tests
docker exec -it resume-agent-web-ui-dev npm test

# 6. Run unit tests with coverage
docker exec -it resume-agent-web-ui-dev npm run test:unit:coverage

# 7. Run E2E tests
docker exec -it resume-agent-web-ui-dev npm run test:int

# 8. View coverage report (on host)
open coverage/lcov-report/index.html

# 9. Clean up (optional)
npm run dev:down
```

### Quick Test Script

Create `scripts/test-docker.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting Docker test suite..."

# Start services
echo "📦 Starting services..."
npm run dev:up

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 30

# Initialize database
echo "🗄️ Initializing database..."
docker exec resume-agent-web-ui-dev npm run db:init

# Run unit tests
echo "🧪 Running unit tests..."
docker exec resume-agent-web-ui-dev npm test

# Run unit tests with coverage
echo "📊 Running unit tests with coverage..."
docker exec resume-agent-web-ui-dev npm run test:unit:coverage

# Run E2E tests
echo "🔬 Running E2E tests..."
docker exec resume-agent-web-ui-dev npm run test:int

echo "✅ All tests completed!"
```

Make it executable:

```bash
chmod +x scripts/test-docker.sh
```

Run it:

```bash
./scripts/test-docker.sh
```

---

## Troubleshooting

### Issue: Tests Can't Connect to Database

**Solution:**

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check network connectivity
docker exec resume-agent-web-ui-dev ping postgres-dev

# Check environment variables
docker exec resume-agent-web-ui-dev env | grep POSTGRES
```

### Issue: Tests Can't Connect to Redis

**Solution:**

```bash
# Check Redis is running
docker ps | grep redis

# Test Redis connection
docker exec resume-agent-redis-dev redis-cli ping

# Check network connectivity
docker exec resume-agent-web-ui-dev ping redis-dev
```

### Issue: Module Not Found Errors

**Solution:**

```bash
# Rebuild container
docker compose -f docker-compose.dev.yml build web-ui-dev

# Restart container
docker restart resume-agent-web-ui-dev

# Check node_modules
docker exec resume-agent-web-ui-dev ls -la node_modules | head
```

### Issue: Coverage Report Not Generated

**Solution:**

```bash
# Check coverage directory exists
docker exec resume-agent-web-ui-dev ls -la coverage/

# Copy coverage to host (if needed)
docker cp resume-agent-web-ui-dev:/app/coverage ./coverage
```

### Issue: Tests Timing Out

**Solution:**

```bash
# Increase timeout in container
docker exec -e TEST_TIMEOUT=60000 resume-agent-web-ui-dev npm test

# Check service health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Issue: Port Already in Use

**Solution:**

```bash
# Stop existing containers
npm run dev:down

# Check for processes using ports
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :54367 # LangGraph
lsof -i :3000  # Auth Server
lsof -i :3001  # Web UI

# Kill processes if needed
kill -9 <PID>
```

---

## Best Practices

### 1. Use Health Checks

Ensure services have health checks before running tests:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### 2. Clean Up After Tests

```bash
# Stop services after testing
npm run dev:down

# Remove volumes (if needed)
docker volume rm resume-agent_postgres_dev_data
docker volume rm resume-agent_redis_dev_data
```

### 3. Use Test Profiles

Use Docker Compose profiles to separate test services:

```yaml
profiles:
  - test
```

### 4. Mount Coverage Directory

Mount coverage directory to persist reports:

```yaml
volumes:
  - ./coverage:/app/coverage
```

### 5. Use .dockerignore

Create `.dockerignore` to exclude unnecessary files:

```
node_modules
coverage
.git
.env
*.log
```

---

## Quick Reference

```bash
# Start services
npm run dev:up

# Run unit tests
docker exec -it resume-agent-web-ui-dev npm test

# Run E2E tests
docker exec -it resume-agent-web-ui-dev npm run test:int

# View logs
docker logs -f resume-agent-web-ui-dev

# Stop services
npm run dev:down

# Rebuild and restart
docker compose -f docker-compose.dev.yml build web-ui-dev
docker compose -f docker-compose.dev.yml up -d web-ui-dev
```

---

## Additional Resources

- [Testing Guide](./TESTING_GUIDE.md) - General testing instructions
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Dev Environment Setup](./MULTI_ENVIRONMENT_SETUP.md)
