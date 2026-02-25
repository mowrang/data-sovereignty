#!/bin/bash

# Monitor LangGraph Startup and Health Check
# Usage: ./scripts/monitor-langgraph-startup.sh

set -e

CONTAINER_NAME="data-sovereignty-langgraph-dev"
HEALTH_ENDPOINT="http://localhost:54367/health"
MAX_WAIT_TIME=300  # 5 minutes max wait
CHECK_INTERVAL=5   # Check every 5 seconds

echo "=========================================="
echo "LangGraph Startup Monitor"
echo "=========================================="
echo ""

# Check if container exists
if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Container ${CONTAINER_NAME} not found!"
    echo "Start it with: docker compose -f docker-compose.dev.yml up -d langgraph-api-dev"
    exit 1
fi

echo "📦 Container: ${CONTAINER_NAME}"
echo "🔍 Health Endpoint: ${HEALTH_ENDPOINT}"
echo "⏱️  Max Wait Time: ${MAX_WAIT_TIME} seconds"
echo ""

# Function to check container status
check_container_status() {
    docker inspect --format='{{.State.Status}}' ${CONTAINER_NAME} 2>/dev/null || echo "not_found"
}

# Function to check health status
check_health_status() {
    docker inspect --format='{{.State.Health.Status}}' ${CONTAINER_NAME} 2>/dev/null || echo "no_healthcheck"
}

# Function to test health endpoint
test_health_endpoint() {
    curl -s -o /dev/null -w "%{http_code}" --max-time 5 ${HEALTH_ENDPOINT} 2>/dev/null || echo "000"
}

# Function to get recent logs
get_recent_logs() {
    docker logs --tail 5 ${CONTAINER_NAME} 2>&1 | tail -3
}

echo "🚀 Starting monitoring..."
echo ""

START_TIME=$(date +%s)
ELAPSED=0
LAST_STATUS=""
LAST_HEALTH=""

while [ $ELAPSED -lt $MAX_WAIT_TIME ]; do
    STATUS=$(check_container_status)
    HEALTH=$(check_health_status)
    HTTP_CODE=$(test_health_endpoint)
    
    # Show status if it changed
    if [ "$STATUS" != "$LAST_STATUS" ] || [ "$HEALTH" != "$LAST_HEALTH" ]; then
        CURRENT_TIME=$(date +%H:%M:%S)
        echo "[$CURRENT_TIME] Status: $STATUS | Health: $HEALTH | HTTP: $HTTP_CODE"
        
        # Show recent logs on status change
        if [ "$STATUS" = "running" ]; then
            echo "   Recent logs:"
            get_recent_logs | sed 's/^/   /'
        fi
        echo ""
        
        LAST_STATUS=$STATUS
        LAST_HEALTH=$HEALTH
    fi
    
    # Success condition
    if [ "$HEALTH" = "healthy" ] && [ "$HTTP_CODE" = "200" ]; then
        echo "✅ SUCCESS! LangGraph is healthy!"
        echo "   Health: $HEALTH"
        echo "   HTTP Status: $HTTP_CODE"
        echo "   Time elapsed: ${ELAPSED} seconds"
        exit 0
    fi
    
    sleep $CHECK_INTERVAL
    CURRENT=$(date +%s)
    ELAPSED=$((CURRENT - START_TIME))
done

echo "⏱️  Timeout reached (${MAX_WAIT_TIME} seconds)"
echo "❌ LangGraph did not become healthy"
echo ""
echo "Run diagnostics: npm run diagnose:health"
exit 1
