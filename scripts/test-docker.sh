#!/bin/bash

# Docker Test Suite Runner
# Runs unit tests and E2E tests in Docker containers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.dev.yml"
ENV_FILE=".env.dev"

function print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

function check_services() {
    echo -e "${YELLOW}Checking if services are running...${NC}"
    
    if ! docker ps | grep -q "data-sovereignty-postgres-dev"; then
        echo -e "${RED}❌ PostgreSQL is not running${NC}"
        return 1
    fi
    
    if ! docker ps | grep -q "data-sovereignty-redis-dev"; then
        echo -e "${RED}❌ Redis is not running${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ All required services are running${NC}"
    return 0
}

function wait_for_services() {
    echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
    sleep 10
    
    # Check PostgreSQL
    for i in {1..30}; do
        if docker exec data-sovereignty-postgres-dev pg_isready -U langgraph > /dev/null 2>&1; then
            echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ PostgreSQL failed to become ready${NC}"
            return 1
        fi
        sleep 1
    done
    
    # Check Redis
    for i in {1..30}; do
        if docker exec data-sovereignty-redis-dev redis-cli ping > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Redis is ready${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ Redis failed to become ready${NC}"
            return 1
        fi
        sleep 1
    done
}

function run_unit_tests() {
    print_header "🧪 Running Unit Tests"
    
    echo -e "${YELLOW}Running unit tests in Docker container...${NC}"
    docker exec -it data-sovereignty-web-ui-dev npm test
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Unit tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Unit tests failed${NC}"
        return 1
    fi
}

function run_unit_tests_coverage() {
    print_header "📊 Running Unit Tests with Coverage"
    
    echo -e "${YELLOW}Running unit tests with coverage...${NC}"
    docker exec -it data-sovereignty-web-ui-dev npm run test:unit:coverage
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Coverage report generated${NC}"
        echo -e "${YELLOW}Coverage report available at: coverage/lcov-report/index.html${NC}"
        return 0
    else
        echo -e "${RED}❌ Coverage generation failed${NC}"
        return 1
    fi
}

function run_e2e_tests() {
    print_header "🔬 Running E2E Tests"
    
    echo -e "${YELLOW}Running E2E tests in Docker container...${NC}"
    docker exec -it data-sovereignty-web-ui-dev npm run test:int
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ E2E tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ E2E tests failed${NC}"
        return 1
    fi
}

function initialize_database() {
    print_header "🗄️ Initializing Database"
    
    echo -e "${YELLOW}Initializing database schema...${NC}"
    docker exec -it data-sovereignty-web-ui-dev npm run db:init
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database initialized${NC}"
        return 0
    else
        echo -e "${RED}❌ Database initialization failed${NC}"
        return 1
    fi
}

function main() {
    print_header "🚀 Docker Test Suite Runner"
    
    # Check if services are running
    if ! check_services; then
        echo -e "${YELLOW}Starting services...${NC}"
        docker compose -f "$COMPOSE_FILE" up -d
        
        echo -e "${YELLOW}Waiting for services to start...${NC}"
        sleep 15
    fi
    
    # Wait for services to be healthy
    wait_for_services
    
    # Initialize database
    initialize_database
    
    # Parse command line arguments
    TEST_TYPE=${1:-all}
    
    case $TEST_TYPE in
        unit)
            run_unit_tests
            ;;
        coverage)
            run_unit_tests_coverage
            ;;
        e2e)
            run_e2e_tests
            ;;
        all)
            run_unit_tests
            UNIT_RESULT=$?
            
            run_unit_tests_coverage
            COVERAGE_RESULT=$?
            
            run_e2e_tests
            E2E_RESULT=$?
            
            print_header "📋 Test Summary"
            
            if [ $UNIT_RESULT -eq 0 ]; then
                echo -e "${GREEN}✅ Unit Tests: PASSED${NC}"
            else
                echo -e "${RED}❌ Unit Tests: FAILED${NC}"
            fi
            
            if [ $COVERAGE_RESULT -eq 0 ]; then
                echo -e "${GREEN}✅ Coverage: GENERATED${NC}"
            else
                echo -e "${RED}❌ Coverage: FAILED${NC}"
            fi
            
            if [ $E2E_RESULT -eq 0 ]; then
                echo -e "${GREEN}✅ E2E Tests: PASSED${NC}"
            else
                echo -e "${RED}❌ E2E Tests: FAILED${NC}"
            fi
            
            if [ $UNIT_RESULT -eq 0 ] && [ $COVERAGE_RESULT -eq 0 ] && [ $E2E_RESULT -eq 0 ]; then
                echo -e "${GREEN}🎉 All tests passed!${NC}"
                exit 0
            else
                echo -e "${RED}💥 Some tests failed${NC}"
                exit 1
            fi
            ;;
        *)
            echo "Usage: $0 [unit|coverage|e2e|all]"
            echo ""
            echo "Options:"
            echo "  unit      - Run unit tests only"
            echo "  coverage  - Run unit tests with coverage"
            echo "  e2e       - Run E2E tests only"
            echo "  all       - Run all tests (default)"
            exit 1
            ;;
    esac
}

main "$@"
