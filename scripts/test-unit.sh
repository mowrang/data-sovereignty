#!/bin/bash
# Unit Test Runner Script
# Provides convenient commands for running unit tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TEST_PATTERN="\\.test\\.ts$"
COVERAGE=false
WATCH=false
VERBOSE=false
CI=false
COMPONENT=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --watch|-w)
      WATCH=true
      shift
      ;;
    --coverage|-c)
      COVERAGE=true
      shift
      ;;
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --ci)
      CI=true
      shift
      ;;
    --component|-C)
      COMPONENT="$2"
      shift 2
      ;;
    --file|-f)
      TEST_FILE="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --watch, -w          Run tests in watch mode"
      echo "  --coverage, -c        Generate coverage report"
      echo "  --verbose, -v         Verbose output"
      echo "  --ci                   CI mode (coverage + maxWorkers=2)"
      echo "  --component, -C       Run tests for specific component (db|utils|api|auth|integrations|web-ui)"
      echo "  --file, -f            Run specific test file"
      echo "  --help, -h            Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                                    # Run all unit tests"
      echo "  $0 --watch                           # Run tests in watch mode"
      echo "  $0 --coverage                        # Run tests with coverage"
      echo "  $0 --component db                   # Run database tests"
      echo "  $0 --file client.test.ts             # Run specific test file"
      echo "  $0 --ci                              # Run tests in CI mode"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Build Jest command
JEST_CMD="cross-env TZ=America/Los_Angeles node --experimental-vm-modules node_modules/jest/bin/jest.js"
JEST_CMD="$JEST_CMD --testPathPattern=$TEST_PATTERN"
JEST_CMD="$JEST_CMD --testPathIgnorePatterns=\\.int\\.test\\.ts$"

# Add options based on flags
if [ "$WATCH" = true ]; then
  JEST_CMD="$JEST_CMD --watch"
fi

if [ "$COVERAGE" = true ] || [ "$CI" = true ]; then
  JEST_CMD="$JEST_CMD --coverage"
fi

if [ "$VERBOSE" = true ]; then
  JEST_CMD="$JEST_CMD --verbose"
fi

if [ "$CI" = true ]; then
  JEST_CMD="$JEST_CMD --ci --maxWorkers=2"
fi

# Handle component-specific tests
if [ -n "$COMPONENT" ]; then
  case $COMPONENT in
    db)
      JEST_CMD="$JEST_CMD src/db/__tests__"
      ;;
    utils)
      JEST_CMD="$JEST_CMD src/utils/__tests__"
      ;;
    api)
      JEST_CMD="$JEST_CMD src/api/__tests__"
      ;;
    auth)
      JEST_CMD="$JEST_CMD src/auth/__tests__"
      ;;
    integrations)
      JEST_CMD="$JEST_CMD src/integrations/__tests__"
      ;;
    web-ui)
      JEST_CMD="$JEST_CMD web-ui/__tests__"
      ;;
    *)
      echo -e "${RED}Unknown component: $COMPONENT${NC}"
      echo "Available components: db, utils, api, auth, integrations, web-ui"
      exit 1
      ;;
  esac
fi

# Handle specific file
if [ -n "$TEST_FILE" ]; then
  JEST_CMD="$JEST_CMD $TEST_FILE"
fi

# Print command
echo -e "${BLUE}Running:${NC} $JEST_CMD"
echo ""

# Execute
eval $JEST_CMD
