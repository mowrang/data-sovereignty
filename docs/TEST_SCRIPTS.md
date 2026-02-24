# Test Scripts Documentation

## Overview

This document describes all available scripts for running unit tests in the Resume Agent application.

## Quick Start

```bash
# Run all unit tests
npm run test:unit

# Run tests in watch mode (for development)
npm run test:unit:watch

# Run tests with coverage
npm run test:unit:coverage
```

## NPM Scripts

### Basic Test Commands

#### `npm run test:unit`

Run all unit tests (excludes integration tests).

```bash
npm run test:unit
```

#### `npm run test:unit:watch`

Run unit tests in watch mode. Tests re-run automatically when files change.

```bash
npm run test:unit:watch
```

**Watch Mode Commands:**

- `a` - Run all tests
- `f` - Run only failed tests
- `q` - Quit watch mode
- `p` - Filter by filename pattern
- `t` - Filter by test name pattern

#### `npm run test:unit:coverage`

Run unit tests and generate coverage report.

```bash
npm run test:unit:coverage
```

Coverage reports are generated in:

- **HTML**: `coverage/unit/index.html` (open in browser)
- **LCOV**: `coverage/unit/lcov.info` (for CI/CD tools)
- **Text**: Printed to console

#### `npm run test:unit:verbose`

Run unit tests with verbose output (shows individual test results).

```bash
npm run test:unit:verbose
```

#### `npm run test:unit:ci`

Run unit tests optimized for CI/CD environments.

```bash
npm run test:unit:ci
```

Features:

- Coverage enabled
- Max 2 workers (for CI resource limits)
- CI mode optimizations

### Component-Specific Tests

Run tests for specific components:

#### `npm run test:unit:db`

Run database client tests only.

```bash
npm run test:unit:db
```

#### `npm run test:unit:utils`

Run utility tests only (Redis, rate limiter, job matcher, etc.).

```bash
npm run test:unit:utils
```

#### `npm run test:unit:api`

Run API route tests only.

```bash
npm run test:unit:api
```

#### `npm run test:unit:auth`

Run authentication server tests only.

```bash
npm run test:unit:auth
```

#### `npm run test:unit:integrations`

Run job boards integration tests only.

```bash
npm run test:unit:integrations
```

#### `npm run test:unit:web-ui`

Run web UI server tests only.

```bash
npm run test:unit:web-ui
```

## Shell Scripts

### `scripts/test-unit.sh`

Flexible test runner script with multiple options.

**Usage:**

```bash
./scripts/test-unit.sh [options]
```

**Options:**

- `--watch, -w` - Run tests in watch mode
- `--coverage, -c` - Generate coverage report
- `--verbose, -v` - Verbose output
- `--ci` - CI mode (coverage + maxWorkers=2)
- `--component, -C <name>` - Run tests for specific component
- `--file, -f <file>` - Run specific test file
- `--help, -h` - Show help message

**Examples:**

```bash
# Run all unit tests
./scripts/test-unit.sh

# Run tests in watch mode
./scripts/test-unit.sh --watch

# Run tests with coverage
./scripts/test-unit.sh --coverage

# Run database tests only
./scripts/test-unit.sh --component db

# Run specific test file
./scripts/test-unit.sh --file client.test.ts

# Run tests in CI mode
./scripts/test-unit.sh --ci
```

### `scripts/test-unit-coverage.sh`

Generate detailed coverage reports.

**Usage:**

```bash
./scripts/test-unit-coverage.sh
```

Generates:

- HTML report: `coverage/unit/index.html`
- LCOV report: `coverage/unit/lcov.info`
- Text summary: Printed to console

**View HTML Report:**

```bash
open coverage/unit/index.html  # macOS
xdg-open coverage/unit/index.html  # Linux
start coverage/unit/index.html  # Windows
```

### `scripts/test-unit-watch.sh`

Run tests in watch mode (convenience script).

**Usage:**

```bash
./scripts/test-unit-watch.sh
```

## Running Specific Tests

### By File Name

```bash
# Using npm
npm run test:unit -- client.test.ts

# Using shell script
./scripts/test-unit.sh --file client.test.ts

# Using Jest directly
npm test -- client.test.ts
```

### By Test Name Pattern

```bash
# Run tests matching pattern
npm test -- -t "should create user"

# Run tests in specific file matching pattern
npm test -- client.test.ts -t "should create"
```

### By Component

```bash
# Database tests
npm run test:unit:db

# Utility tests
npm run test:unit:utils

# API tests
npm run test:unit:api
```

## Coverage Reports

### Generating Coverage

```bash
# Basic coverage
npm run test:unit:coverage

# Detailed coverage with all reporters
./scripts/test-unit-coverage.sh
```

### Viewing Coverage

**HTML Report:**

```bash
open coverage/unit/index.html
```

**Coverage Thresholds:**

- Target: 80%+ overall coverage
- Critical paths: 100% coverage
  - Authentication flows
  - Encryption/decryption
  - Rate limiting
  - Database operations

### Coverage Files

- `coverage/unit/coverage-final.json` - Raw coverage data
- `coverage/unit/lcov.info` - LCOV format (for CI/CD)
- `coverage/unit/index.html` - HTML report
- `coverage/unit/` - Per-file coverage reports

## CI/CD Integration

### GitHub Actions

Tests run automatically on:

- Pull requests
- Commits to main branch
- Scheduled nightly runs

**CI Test Command:**

```bash
npm run test:unit:ci
```

### Local CI Simulation

```bash
# Simulate CI environment
CI=true npm run test:unit:ci

# Or use script
./scripts/test-unit.sh --ci
```

## Debugging Tests

### Verbose Output

```bash
npm run test:unit:verbose
```

### Run Single Test File

```bash
npm test -- client.test.ts
```

### Debug Mode

```bash
# Run with Node debugger
node --inspect-brk --experimental-vm-modules node_modules/jest/bin/jest.js client.test.ts

# Or use Jest debug mode
npm test -- --detectOpenHandles --forceExit client.test.ts
```

### Watch Mode for Development

```bash
# Start watch mode
npm run test:unit:watch

# Make changes to test or source files
# Tests will automatically re-run
```

## Test Organization

### Test File Naming

- Unit tests: `*.test.ts`
- Integration tests: `*.int.test.ts`

### Test Structure

```
src/
├── db/
│   └── __tests__/
│       └── client.test.ts
├── utils/
│   └── __tests__/
│       ├── redis-cache.test.ts
│       ├── rate-limiter.test.ts
│       └── job-matcher.test.ts
└── api/
    └── __tests__/
        └── jobs.test.ts
```

## Troubleshooting

### Tests Not Running

1. **Check Jest is installed:**

   ```bash
   npm list jest
   ```

2. **Clear Jest cache:**

   ```bash
   npm test -- --clearCache
   ```

3. **Check file paths:**
   ```bash
   npm test -- --listTests
   ```

### Coverage Not Generated

1. **Ensure coverage flag is set:**

   ```bash
   npm run test:unit:coverage
   ```

2. **Check coverage directory:**
   ```bash
   ls -la coverage/unit/
   ```

### Watch Mode Not Working

1. **Check file watching limits:**

   ```bash
   # macOS
   sysctl fs.inotify.max_user_watches
   ```

2. **Try running without watch:**
   ```bash
   npm run test:unit
   ```

### Timeout Issues

Increase timeout in `jest.config.js`:

```javascript
export default {
  testTimeout: 30_000, // 30 seconds
  // ...
};
```

## Best Practices

1. **Run tests before committing:**

   ```bash
   npm run test:unit
   ```

2. **Use watch mode during development:**

   ```bash
   npm run test:unit:watch
   ```

3. **Check coverage regularly:**

   ```bash
   npm run test:unit:coverage
   ```

4. **Run component-specific tests:**

   ```bash
   npm run test:unit:db  # When working on database code
   ```

5. **Use verbose mode for debugging:**
   ```bash
   npm run test:unit:verbose
   ```

## Summary

| Command                           | Description                |
| --------------------------------- | -------------------------- |
| `npm run test:unit`               | Run all unit tests         |
| `npm run test:unit:watch`         | Watch mode for development |
| `npm run test:unit:coverage`      | Generate coverage report   |
| `npm run test:unit:verbose`       | Verbose output             |
| `npm run test:unit:ci`            | CI-optimized tests         |
| `npm run test:unit:db`            | Database tests only        |
| `npm run test:unit:utils`         | Utility tests only         |
| `npm run test:unit:api`           | API tests only             |
| `npm run test:unit:auth`          | Auth tests only            |
| `npm run test:unit:integrations`  | Integration tests only     |
| `npm run test:unit:web-ui`        | Web UI tests only          |
| `./scripts/test-unit.sh`          | Flexible test runner       |
| `./scripts/test-unit-coverage.sh` | Detailed coverage          |
| `./scripts/test-unit-watch.sh`    | Watch mode script          |
