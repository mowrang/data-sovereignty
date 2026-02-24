# Testing Quick Start Guide

## 🚀 Quick Commands

### Unit Testing

```bash
# Run all unit tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:unit:watch

# Coverage report
npm run test:unit:coverage

# Run specific test suite
npm run test:unit:db      # Database tests
npm run test:unit:utils  # Utility tests
npm run test:unit:api    # API tests
```

### End-to-End Testing

```bash
# 1. Start dev environment
npm run dev:up

# 2. Initialize database
npm run dev:db:init

# 3. Run E2E tests
npm run test:int

# 4. Stop dev environment (when done)
npm run dev:down
```

## 📋 Step-by-Step: Unit Testing

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Run Tests

```bash
# All unit tests
npm test

# Specific component
npm run test:unit:db
```

### Step 3: Check Coverage

```bash
npm run test:unit:coverage
open coverage/lcov-report/index.html
```

## 📋 Step-by-Step: E2E Testing on Dev

### Step 1: Start Dev Environment

```bash
# Start all services
./scripts/env-manager.sh dev up

# Verify services are running
./scripts/env-manager.sh dev ps
```

Expected output:

```
✅ postgres-dev (port 5432)
✅ redis-dev (port 6379)
✅ langgraph-api-dev (port 54367)
✅ auth-server-dev (port 3000)
✅ web-ui-dev (port 3001)
```

### Step 2: Initialize Database

```bash
./scripts/env-manager.sh dev db:init
```

### Step 3: Run E2E Tests

```bash
npm run test:int
```

### Step 4: Manual E2E Testing

1. **Open Web UI**: http://localhost:3001
2. **Authenticate**: Click "Setup Data Sources" → Connect Google
3. **Setup AI**: Click "Setup AI" → Enter API key
4. **Test Resume Tailoring**:
   - Chat: "Read my resume from [Google Doc URL]"
   - Chat: "Tailor my resume for this job: [Job Description]"
   - Verify related jobs appear

### Step 5: View Logs (if issues)

```bash
# All logs
./scripts/env-manager.sh dev logs

# Specific service
docker logs social-media-agent-web-ui-dev
```

### Step 6: Stop Environment

```bash
./scripts/env-manager.sh dev down
```

## 🔍 Troubleshooting

### Tests Can't Connect to Database

```bash
# Ensure dev environment is running
npm run dev:up

# Check PostgreSQL is accessible
docker ps | grep postgres
```

### Tests Failing with Module Errors

```bash
# Rebuild TypeScript
npm run build

# Clear and reinstall
rm -rf node_modules
npm install
```

### E2E Tests Timing Out

```bash
# Check services are healthy
./scripts/env-manager.sh dev ps

# Check logs for errors
./scripts/env-manager.sh dev logs
```

## 📊 Test Coverage Goals

- **Unit Tests**: >80% coverage
- **Critical Paths**: 100% coverage
- **E2E Tests**: Cover main user flows

## 🎯 Test Checklist

### Unit Tests

- [ ] All tests passing
- [ ] Coverage >80%
- [ ] No console errors
- [ ] Tests are fast (<30s total)

### E2E Tests

- [ ] Dev environment starts successfully
- [ ] Database initializes correctly
- [ ] Authentication flow works
- [ ] Resume tailoring works
- [ ] Job recommendations appear
- [ ] Multi-source data sources work

## 📚 More Information

- **Full Testing Guide**: [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- **Unit Tests Details**: [UNIT_TESTS.md](./UNIT_TESTS.md)
- **Dev Environment**: [MULTI_ENVIRONMENT_SETUP.md](./MULTI_ENVIRONMENT_SETUP.md)
