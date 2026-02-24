# Unit Tests Documentation

## Overview

This document describes the comprehensive unit test suite for all components of the Resume Agent application.

## Test Structure

All unit tests are located in `__tests__` directories adjacent to their source files:

```
src/
├── db/
│   └── __tests__/
│       └── client.test.ts
├── utils/
│   └── __tests__/
│       ├── redis-cache.test.ts
│       ├── rate-limiter.test.ts
│       ├── job-matcher.test.ts
│       └── adzuna-recommender.test.ts
├── api/
│   └── __tests__/
│       ├── jobs.test.ts
│       └── applications.test.ts
├── integrations/
│   └── __tests__/
│       └── job-boards.test.ts
└── auth/
    └── __tests__/
        └── auth-server.test.ts
web-ui/
└── __tests__/
    └── server.test.ts
```

## Running Tests

### Run all unit tests:

```bash
npm test
```

### Run specific test file:

```bash
npm test -- client.test.ts
```

### Run tests in watch mode:

```bash
npm test -- --watch
```

### Run tests with coverage:

```bash
npm test -- --coverage
```

## Test Coverage

### ✅ Database Client (`src/db/client.test.ts`)

- **User Management**

  - Creating and updating users
  - Getting users by ID, email, Google ID
  - Encryption/decryption of sensitive data
  - Cache integration

- **Session Management**

  - Creating sessions
  - Getting sessions
  - Deleting sessions
  - Session expiration

- **AI Provider Configuration**

  - Updating AI provider
  - Encrypting API keys
  - Cache invalidation

- **User Roles**
  - Updating user roles
  - Role validation

### ✅ Redis Cache (`src/utils/redis-cache.test.ts`)

- **User Caching**

  - Getting cached users
  - Setting users with TTL
  - Invalidating users

- **Session Caching**

  - Getting sessions
  - Setting sessions
  - Deleting sessions

- **Rate Limiting**
  - Checking rate limits
  - Tracking request counts
  - Expiry handling
  - Fail-open on errors

### ✅ Rate Limiter (`src/utils/rate-limiter.test.ts`)

- **Middleware Functionality**

  - Allowing requests under limit
  - Denying requests over limit
  - Custom error messages
  - Key generation (userId + IP)

- **Pre-configured Limiters**

  - `authRateLimiter` (5 requests per 15 minutes)
  - `apiRateLimiter` (60 requests per minute)
  - `chatRateLimiter` (10 requests per minute)

- **Error Handling**
  - Fail-open on Redis errors
  - Graceful degradation

### ✅ Job Matcher (`src/utils/job-matcher.test.ts`)

- **Match Score Calculation**

  - AI-powered matching
  - Caching match scores
  - Fallback to keyword matching
  - Error handling

- **Job Recommendations**

  - Getting recommended jobs
  - Filtering by match score (>50%)
  - Sorting by score
  - User profile integration

- **Similar Jobs**
  - Finding similar jobs
  - Based on application history
  - Deduplication

### ✅ Adzuna Recommender (`src/utils/adzuna-recommender.test.ts`)

- **Recommendations for Applied Jobs**

  - Fetching Adzuna jobs
  - Importing to database
  - Matching and scoring
  - Filtering low matches

- **Recommendations from History**
  - Based on user's applications
  - Extracting search queries
  - Handling empty history

### ✅ Job Boards Integration (`src/integrations/job-boards.test.ts`)

- **Configuration Loading**

  - Loading Adzuna config
  - Multiple API key support
  - Environment variable parsing

- **Adzuna Search**

  - API calls
  - Error handling
  - Round-robin key rotation
  - Rate limit retry logic
  - Result caching

- **Job Import**
  - Importing to database
  - Duplicate detection
  - Affiliate URL handling

### ✅ Jobs API (`src/api/jobs.test.ts`)

- **GET /** - List Jobs

  - Pagination
  - Search filtering
  - Location filtering
  - Remote filtering
  - Status filtering

- **POST /** - Create Job

  - Employer-only access
  - Job creation
  - Validation

- **GET /:id** - Get Job
  - Job retrieval
  - 404 handling

### ✅ Applications API (`src/api/applications.test.ts`)

- **POST /jobs/:jobId/apply**

  - Creating applications
  - Resume tailoring trigger
  - Duplicate prevention
  - Job validation

- **GET /applications**
  - Listing user applications
  - Filtering

### ✅ Auth Server (`src/auth/auth-server.test.ts`)

- **GET /health**

  - Health check endpoint

- **GET /auth/google**

  - OAuth initiation
  - Redirect to Google
  - Scope configuration

- **GET /auth/google/callback**

  - Token exchange
  - User creation/update
  - Session creation
  - Error handling

- **GET /auth/me**
  - User info retrieval
  - Authentication check

### ✅ Web UI Server (`web-ui/server.test.ts`)

- **GET /api/auth/status**

  - Authentication status
  - User info

- **POST /api/settings/ai**

  - AI provider update
  - API key encryption
  - Validation

- **POST /api/chat**
  - LangGraph integration
  - Message forwarding
  - Authentication requirement

## Mocking Strategy

### External Dependencies

- **PostgreSQL**: Mocked `pg.Pool` and `PoolClient`
- **Redis**: Mocked `redis` client
- **Google APIs**: Mocked `googleapis` OAuth2 client
- **LangGraph SDK**: Mocked `@langchain/langgraph-sdk` Client
- **Axios**: Mocked HTTP requests for job board APIs

### Internal Dependencies

- Database client methods mocked
- Redis cache methods mocked
- Rate limiter middleware mocked
- Job matcher mocked

## Test Best Practices

1. **Isolation**: Each test is independent and doesn't rely on other tests
2. **Mocking**: External dependencies are mocked to avoid side effects
3. **Clear Names**: Test names describe what is being tested
4. **Arrange-Act-Assert**: Tests follow AAA pattern
5. **Error Cases**: Both success and error paths are tested
6. **Edge Cases**: Boundary conditions and edge cases are covered

## Continuous Integration

Tests run automatically on:

- Pull requests
- Commits to main branch
- Scheduled nightly runs

See `.github/workflows/unit-tests.yml` for CI configuration.

## Coverage Goals

- **Target**: 80%+ code coverage
- **Critical Paths**: 100% coverage for:
  - Authentication flows
  - Encryption/decryption
  - Rate limiting
  - Database operations

## Adding New Tests

When adding new functionality:

1. Create test file in `__tests__` directory
2. Follow existing test patterns
3. Mock external dependencies
4. Test both success and error cases
5. Update this documentation

Example:

```typescript
describe("NewFeature", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should do something", async () => {
    // Arrange
    const input = "test";

    // Act
    const result = await newFeature.doSomething(input);

    // Assert
    expect(result).toBe("expected");
  });
});
```

## Troubleshooting

### Tests failing due to timeouts

- Increase `testTimeout` in `jest.config.js`
- Check for hanging promises

### Mock not working

- Ensure mocks are set up in `beforeEach`
- Check import paths match exactly

### Database connection errors

- Ensure database mocks are properly configured
- Check that `getPool()` returns mocked pool

## Future Improvements

- [ ] Add integration tests for full flows
- [ ] Add E2E tests for critical user journeys
- [ ] Increase coverage to 90%+
- [ ] Add performance tests
- [ ] Add load tests for rate limiting
