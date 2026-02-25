#!/bin/bash

# Check what ports LangGraph is actually listening on
# Usage: ./scripts/check-langgraph-ports.sh

set -e

CONTAINER_NAME="data-sovereignty-langgraph-dev"

echo "=========================================="
echo "LangGraph Port Check"
echo "=========================================="
echo ""

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Container ${CONTAINER_NAME} is not running!"
    exit 1
fi

echo "1️⃣  All Listening Ports:"
echo "   Using netstat:"
docker exec ${CONTAINER_NAME} netstat -tlnp 2>/dev/null | grep LISTEN | sed 's/^/   /' || echo "   netstat not available"

echo ""
echo "   Using ss:"
docker exec ${CONTAINER_NAME} ss -tlnp 2>/dev/null | grep LISTEN | sed 's/^/   /' || echo "   ss not available"

echo ""
echo "2️⃣  Checking Specific Ports:"
for port in 8000 54367 50051; do
    echo -n "   Port ${port}: "
    CHECK=$(docker exec ${CONTAINER_NAME} sh -c "netstat -tlnp 2>/dev/null | grep :${port} || ss -tlnp 2>/dev/null | grep :${port} || echo 'NOT_LISTENING'" 2>/dev/null || echo "CANNOT_CHECK")
    if [ "$CHECK" != "NOT_LISTENING" ] && [ "$CHECK" != "CANNOT_CHECK" ]; then
        echo "✅ LISTENING"
        echo "$CHECK" | sed 's/^/      /'
    else
        echo "❌ NOT LISTENING"
    fi
done

echo ""
echo "3️⃣  Process Info:"
echo "   Python/uvicorn processes:"
docker exec ${CONTAINER_NAME} ps aux | grep -E "python|uvicorn|langgraph" | grep -v grep | sed 's/^/   /' || echo "   None found"

echo ""
echo "4️⃣  Port Mapping (from docker-compose):"
docker port ${CONTAINER_NAME} 2>/dev/null | sed 's/^/   /' || echo "   Cannot determine"

echo ""
echo "5️⃣  Test Health Endpoints:"
for port in 8000 54367; do
    echo -n "   http://localhost:${port}/health: "
    TEST=$(docker exec ${CONTAINER_NAME} sh -c "node -e \"require('http').get('http://localhost:${port}/health', (r) => {process.exit(r.statusCode===200?0:1)}).on('error', ()=>{process.exit(1)});\"" 2>&1)
    if [ $? -eq 0 ]; then
        echo "✅ Responding"
    else
        echo "❌ Not responding"
    fi
done

echo ""
echo "=========================================="
