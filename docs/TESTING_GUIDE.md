# Testing Guide

## Unit Testing and End-to-End Testing on Dev Environment

**Last Updated:** February 9, 2026

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Unit Testing](#unit-testing)
3. [End-to-End Testing](#end-to-end-testing)
4. [Dev Environment Setup](#dev-environment-setup)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### 1. Install Dependencies

```bash
# Install all npm dependencies
npm install

# Ensure TypeScript is compiled (if needed)
npm run build
```

### 2. Environment Variables

Make sure `.env.dev` is configured with:

- Database connection strings
- Redis connection
- API keys (Google, Microsoft, AI providers)
- Test credentials

### 3. Dev Environment Services

Ensure dev environment services are running (see [Dev Environment Setup](#dev-environment-setup))

---

## Unit Testing

### Quick Start

```bash
# Run all unit tests
npm test

# Or use the script
npm run test:unit:script
```

### Running Specific Test Suites

```bash
# Database tests
npm run test:unit:db

# Utility tests
npm run test:unit:utils

# API tests
npm run test:unit:api

# Auth tests
npm run test:unit:auth

# Integration tests (job boards, etc.)
npm run test:unit:integrations

# Web UI tests
npm run test:unit:web-ui
```

### Watch Mode (Development)

```bash
# Watch mode - automatically reruns tests on file changes
npm run test:unit:watch

# Or use the script
npm run test:unit:watch:script
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:unit:coverage

# Or use the script
npm run test:unit:coverage:script

# View coverage report
open coverage/lcov-report/index.html  # Mac
# or
xdg-open coverage/lcov-report/index.html  # Linux
```

### Verbose Output

```bash
# Run with verbose output (shows all test names)
npm run test:unit:verbose
```

### CI Mode

```bash
# Run tests in CI mode (optimized for CI/CD)
npm run test:unit:ci
```

### Running Individual Test Files

```bash
# Run a specific test file
npm test -- client.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should create user"
```

### Test Structure

Unit tests are located in `__tests__` directories:

```
src/
├── db/__tests__/client.test.ts
├── utils/__tests__/
│   ├── redis-cache.test.ts
│   ├── rate-limiter.test.ts
│   ├── job-matcher.test.ts
│   ├── adzuna-recommender.test.ts
│   ├── job-recommender-manager.test.ts
│   ├── job-recommender-interface.test.ts
│   └── user-history-recommender.test.ts
├── api/__tests__/
│   ├── jobs.test.ts
│   ├── applications.test.ts
│   └── job-recommendations.test.ts
├── auth/__tests__/auth-server.test.ts
├── integrations/__tests__/job-boards.test.ts
web-ui/__tests__/server.test.ts
```

### What Unit Tests Cover

- ✅ Database operations (user management, sessions, encryption)
- ✅ Redis caching
- ✅ Rate limiting
- ✅ Job matching algorithms
- ✅ Job recommendation logic
- ✅ API endpoints (mocked)
- ✅ Authentication flows
- ✅ Data source interfaces

---

## End-to-End Testing

### Prerequisites for E2E Tests

1. **Dev Environment Running**: All services must be up
2. **Test Data**: Database should be initialized
3. **API Keys**: Valid test API keys configured

### Starting Dev Environment

```bash
# Start all dev services (PostgreSQL, Redis, LangGraph, Auth Server, Web UI)
./scripts/env-manager.sh dev up

# Or using npm scripts
npm run dev:up

# Check status
./scripts/env-manager.sh dev ps

# View logs
./scripts/env-manager.sh dev logs
```

### Running E2E Tests

```bash
# Run all integration/E2E tests
npm run test:int

# Run specific E2E test file
npm run test:int -- resume-agent.e2e.test.ts

# Run with verbose output
npm run test:int -- --verbose
```

### Creating E2E Tests

E2E tests should be named `*.int.test.ts` and placed in appropriate directories:

```typescript
// Example: src/agents/resume-agent/__tests__/resume-agent.e2e.test.ts
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { Client } from "@langchain/langgraph-sdk";

describe("Resume Agent E2E", () => {
  let langgraphClient: Client;

  beforeAll(async () => {
    // Initialize LangGraph client
    langgraphClient = new Client({
      apiUrl: process.env.LANGGRAPH_API_URL || "http://localhost:54367",
    });
  });

  it("should read resume from Google Docs", async () => {
    // Test implementation
  });

  it("should tailor resume for job description", async () => {
    // Test implementation
  });

  it("should show job recommendations after resume update", async () => {
    // Test implementation
  });
});
```

### E2E Test Scenarios

#### 1. Resume Agent Flow

**Test:** Complete resume tailoring workflow

```bash
# Create test file: src/agents/resume-agent/__tests__/resume-agent.e2e.test.ts
```

**Steps to test:**

1. User authenticates with Google
2. User provides job description
3. System reads resume from Google Docs
4. System tailors resume for job description
5. System shows related jobs based on job description
6. Verify formatting is preserved

#### 2. Multi-Source Data Sources

**Test:** Test with different data sources

```bash
# Test Google Docs
# Test Microsoft OneDrive (if configured)
# Test Local file upload
```

**Steps to test:**

1. Upload resume file
2. Read resume from uploaded file
3. Tailor resume for job description
4. Verify recommendations appear

#### 3. Job Recommendations

**Test:** Job recommendation flow

**Steps to test:**

1. User tailors resume for Job Description A
2. System shows similar jobs to Job Description A
3. User tailors resume for Job Description B
4. System shows similar jobs to Job Description B
5. Verify recommendations are contextually relevant

#### 4. User History Tracking

**Test:** History-based recommendations

**Steps to test:**

1. User tailors resume for multiple job descriptions
2. System tracks job descriptions in history
3. User visits homepage
4. System shows recommendations based on history
5. Verify recommendations match user's interests

### API E2E Tests

Test API endpoints directly:

```bash
# Start dev environment first
npm run dev:up

# Test auth endpoints
curl http://localhost:3000/api/auth/status

# Test job recommendations (requires auth)
curl -H "Cookie: session_token=YOUR_TOKEN" \
  http://localhost:3001/api/job-recommendations/from-history

# Test file upload (requires auth)
curl -X POST \
  -H "Cookie: session_token=YOUR_TOKEN" \
  -F "file=@test-resume.docx" \
  http://localhost:3001/api/file-upload
```

### Manual E2E Testing Checklist

#### Setup

- [ ] Dev environment is running (`npm run dev:up`)
- [ ] Database is initialized (`npm run dev:db:init`)
- [ ] All services are healthy (check logs)

#### Authentication Flow

- [ ] Navigate to `http://localhost:3001`
- [ ] Click "Setup Data Sources" → Connect Google account
- [ ] Click "Setup AI" → Configure AI API key
- [ ] Verify authentication status shows connected

#### Resume Tailoring Flow

- [ ] Open chat interface
- [ ] Send message: "Read my resume from [Google Doc URL]"
- [ ] Verify resume is read successfully
- [ ] Send message: "Tailor my resume for this job: [Job Description]"
- [ ] Verify resume is updated
- [ ] Verify related jobs appear automatically

#### Job Recommendations

- [ ] After resume update, verify "Related Jobs" section appears
- [ ] Verify jobs are relevant to the job description used
- [ ] Click on a job → verify it opens correctly
- [ ] Verify match scores are displayed

#### Multi-Source Testing

- [ ] Upload a resume file (.docx or .pdf)
- [ ] Verify file is parsed correctly
- [ ] Use uploaded file for resume tailoring
- [ ] Verify recommendations work with local files

#### History-Based Recommendations

- [ ] Tailor resume for multiple different job descriptions
- [ ] Navigate away and come back
- [ ] Verify recommendations appear based on history
- [ ] Verify recommendations are relevant

---

## Dev Environment Setup

### Starting Dev Environment

```bash
# Start all services
./scripts/env-manager.sh dev up

# This starts:
# - PostgreSQL (port 5432)
# - Redis (port 6379)
# - LangGraph API (port 54367)
# - Auth Server (port 3000)
# - Web UI (port 3001)
```

### Checking Service Status

```bash
# List running containers
./scripts/env-manager.sh dev ps

# Or
docker ps
```

### Viewing Logs

```bash
# View all logs
./scripts/env-manager.sh dev logs

# View specific service logs
docker logs social-media-agent-postgres-dev
docker logs social-media-agent-redis-dev
docker logs social-media-agent-langgraph-api-dev
docker logs social-media-agent-auth-server-dev
docker logs social-media-agent-web-ui-dev
```

### Stopping Dev Environment

```bash
# Stop all services
./scripts/env-manager.sh dev down

# Or
npm run dev:down
```

### Database Initialization

```bash
# Initialize database schema
./scripts/env-manager.sh dev db:init

# Or
npm run dev:db:init
```

### Rebuilding Services

```bash
# Rebuild all services
./scripts/env-manager.sh dev build

# Rebuild specific service
docker compose -f docker-compose.dev.yml build auth-server-dev
```

---

## Test Data Setup

### Creating Test Users

```bash
# Connect to dev database
./scripts/env-manager.sh dev db:shell

# In PostgreSQL shell:
INSERT INTO users (id, email, name, google_id)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  'Test User',
  'test-google-id'
);
```

### Test Google Doc URLs

Use test Google Doc IDs for testing:

- Test Document 1: `[YOUR_TEST_DOC_ID_1]`
- Test Document 2: `[YOUR_TEST_DOC_ID_2]`

### Test Job Descriptions

Sample job descriptions for testing:

```text
Software Engineer - Full Stack
We are looking for a Full Stack Software Engineer with 5+ years of experience in React, Node.js, and PostgreSQL. The ideal candidate should have experience with cloud platforms (AWS, Azure) and be familiar with CI/CD pipelines. Location: San Francisco, CA.
```

---

## Troubleshooting

### Unit Tests Failing

**Issue:** Tests can't connect to database/Redis

**Solution:**

```bash
# Ensure dev environment is running
npm run dev:up

# Check if services are accessible
docker ps
```

**Issue:** Module not found errors

**Solution:**

```bash
# Rebuild TypeScript
npm run build

# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### E2E Tests Failing

**Issue:** LangGraph API not responding

**Solution:**

```bash
# Check LangGraph logs
docker logs social-media-agent-langgraph-api-dev

# Restart LangGraph service
docker restart social-media-agent-langgraph-api-dev
```

**Issue:** Authentication failing

**Solution:**

```bash
# Check auth server logs
docker logs social-media-agent-auth-server-dev

# Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.dev
```

**Issue:** Database connection errors

**Solution:**

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection string in .env.dev
# Should be: postgresql://user:password@localhost:5432/langgraph_dev
```

### Coverage Report Not Generating

**Issue:** Coverage folder not created

**Solution:**

```bash
# Run with coverage flag
npm run test:unit:coverage

# Check if coverage/ directory exists
ls -la coverage/
```

### Tests Timing Out

**Issue:** Tests taking too long

**Solution:**

```bash
# Increase timeout in jest.config.js
# Or use --testTimeout flag
npm test -- --testTimeout=30000
```

---

## Best Practices

### 1. Write Tests First (TDD)

- Write tests before implementing features
- Tests should fail initially, then pass after implementation

### 2. Keep Tests Isolated

- Each test should be independent
- Use `beforeEach`/`afterEach` to clean up state

### 3. Mock External Dependencies

- Mock API calls, database queries, external services
- Use Jest mocks for external dependencies

### 4. Test Edge Cases

- Test error conditions
- Test boundary conditions
- Test invalid inputs

### 5. Maintain Test Coverage

- Aim for >80% coverage
- Focus on critical paths
- Don't obsess over 100% coverage

### 6. Run Tests Before Committing

```bash
# Run all tests before committing
npm run test:all

# This runs:
# - Unit tests
# - Integration tests
# - Linting
```

---

## Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: "18"
      - run: npm install
      - run: npm run test:unit:ci
      - run: npm run lint
```

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Unit Tests Documentation](./UNIT_TESTS.md)
- [Test Scripts Documentation](./TEST_SCRIPTS.md)
- [Dev Environment Setup](./MULTI_ENVIRONMENT_SETUP.md)

---

## Quick Reference

```bash
# Unit Tests
npm test                    # Run all unit tests
npm run test:unit:watch    # Watch mode
npm run test:unit:coverage # Coverage report

# E2E Tests
npm run dev:up             # Start dev environment
npm run test:int           # Run E2E tests
npm run dev:down           # Stop dev environment

# Dev Environment
./scripts/env-manager.sh dev up      # Start
./scripts/env-manager.sh dev down    # Stop
./scripts/env-manager.sh dev logs    # Logs
./scripts/env-manager.sh dev ps      # Status
```
