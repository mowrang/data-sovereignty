#!/bin/bash
# Unit Test Coverage Script
# Generates detailed coverage reports for unit tests

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Running unit tests with coverage...${NC}"
echo ""

# Run tests with coverage
cross-env TZ=America/Los_Angeles node --experimental-vm-modules node_modules/jest/bin/jest.js \
  --testPathPattern="\\.test\\.ts$" \
  --testPathIgnorePatterns="\\.int\\.test\\.ts$" \
  --coverage \
  --coverageDirectory=coverage/unit \
  --coverageReporters=text \
  --coverageReporters=text-summary \
  --coverageReporters=html \
  --coverageReporters=lcov \
  --collectCoverageFrom="src/**/*.ts" \
  --collectCoverageFrom="web-ui/**/*.ts" \
  --collectCoverageFrom="!src/**/*.int.test.ts" \
  --collectCoverageFrom="!src/**/__tests__/**" \
  --collectCoverageFrom="!**/node_modules/**" \
  --collectCoverageFrom="!**/dist/**"

echo ""
echo -e "${GREEN}Coverage report generated!${NC}"
echo ""
echo "View HTML report: open coverage/unit/index.html"
echo "View LCOV report: coverage/unit/lcov.info"
