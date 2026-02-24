#!/bin/bash
# Unit Test Watch Script
# Runs unit tests in watch mode for development

set -e

# Colors for output
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Running unit tests in watch mode...${NC}"
echo "Press 'a' to run all tests, 'f' to run only failed tests, 'q' to quit"
echo ""

# Run tests in watch mode
cross-env TZ=America/Los_Angeles node --experimental-vm-modules node_modules/jest/bin/jest.js \
  --testPathPattern="\\.test\\.ts$" \
  --testPathIgnorePatterns="\\.int\\.test\\.ts$" \
  --watch
