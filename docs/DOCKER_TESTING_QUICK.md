# Docker Testing Quick Reference

## 🚀 Quick Start

```bash
# 1. Start dev environment
npm run dev:up

# 2. Run all tests (unit + E2E)
./scripts/test-docker.sh all

# 3. Or run individually
./scripts/test-docker.sh unit      # Unit tests only
./scripts/test-docker.sh coverage  # Unit tests with coverage
./scripts/test-docker.sh e2e       # E2E tests only
```

## 📋 Manual Docker Testing

### Run Unit Tests

```bash
# Start services
npm run dev:up

# Run unit tests
docker exec -it resume-agent-web-ui-dev npm test

# Run with coverage
docker exec -it resume-agent-web-ui-dev npm run test:unit:coverage
```

### Run E2E Tests

```bash
# Start services
npm run dev:up

# Initialize database
docker exec -it resume-agent-web-ui-dev npm run db:init

# Run E2E tests
docker exec -it resume-agent-web-ui-dev npm run test:int
```

## 🔍 Check Services

```bash
# List running containers
docker ps

# Check logs
docker logs resume-agent-web-ui-dev
docker logs resume-agent-langgraph-dev
docker logs resume-agent-auth-dev

# Follow logs
docker logs -f resume-agent-web-ui-dev
```

## 🛠️ Useful Commands

```bash
# Access container shell
docker exec -it resume-agent-web-ui-dev sh

# Run any npm script
docker exec -it resume-agent-web-ui-dev npm run <script>

# Stop services
npm run dev:down

# Rebuild container
docker compose -f docker-compose.dev.yml build web-ui-dev
```

## 📊 Coverage Report

After running coverage tests:

```bash
# Coverage report is saved to ./coverage/
open coverage/lcov-report/index.html  # Mac
```

## 🐛 Troubleshooting

```bash
# Services not starting?
docker ps
docker logs resume-agent-postgres-dev

# Tests can't connect?
docker exec resume-agent-web-ui-dev ping postgres-dev
docker exec resume-agent-web-ui-dev env | grep POSTGRES

# Rebuild everything
docker compose -f docker-compose.dev.yml build --no-cache
npm run dev:up
```

## 📚 More Info

- **Full Guide**: [DOCKER_TESTING.md](./DOCKER_TESTING.md)
- **General Testing**: [TESTING_GUIDE.md](./TESTING_GUIDE.md)
