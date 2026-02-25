#!/bin/bash

# Diagnose LangGraph Health Check Issues
# Usage: ./scripts/diagnose-health-check.sh

set -e

CONTAINER_NAME="data-sovereignty-langgraph-dev"
HEALTH_ENDPOINT="http://localhost:54367/health"

echo "=========================================="
echo "LangGraph Health Check Diagnostics"
echo "=========================================="
echo ""

# 1. Container Status
echo "1️⃣  Container Status:"
STATUS=$(docker inspect --format='{{.State.Status}}' ${CONTAINER_NAME} 2>/dev/null || echo "not_found")
HEALTH=$(docker inspect --format='{{.State.Health.Status}}' ${CONTAINER_NAME} 2>/dev/null || echo "no_healthcheck")
echo "   Status: ${STATUS}"
echo "   Health: ${HEALTH}"
echo ""

# 2. Health Check Details
if [ "$HEALTH" != "no_healthcheck" ]; then
    echo "2️⃣  Health Check History:"
    docker inspect ${CONTAINER_NAME} --format='{{range .State.Health.Log}}{{.Output}}{{end}}' 2>/dev/null | tail -3
    echo ""
fi

# 3. Port Listening
echo "3️⃣  Port 54367 Status:"
PORT_CHECK=$(docker exec ${CONTAINER_NAME} sh -c "netstat -tlnp 2>/dev/null | grep :54367 || ss -tlnp 2>/dev/null | grep :54367 || echo 'NOT_LISTENING'" 2>/dev/null || echo "CANNOT_CHECK")
if [ "$PORT_CHECK" != "NOT_LISTENING" ] && [ "$PORT_CHECK" != "CANNOT_CHECK" ]; then
    echo "   ✅ Port is listening"
    echo "   ${PORT_CHECK}"
else
    echo "   ❌ Port is NOT listening"
fi
echo ""

# 4. Health Endpoint Test
echo "4️⃣  Health Endpoint Test:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 ${HEALTH_ENDPOINT} 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ HTTP 200 - Health endpoint responding"
    RESPONSE=$(curl -s ${HEALTH_ENDPOINT} 2>/dev/null || echo "error")
    echo "   Response: ${RESPONSE}"
elif [ "$HTTP_CODE" = "000" ]; then
    echo "   ❌ Connection refused or timeout"
else
    echo "   ⚠️  HTTP ${HTTP_CODE} - Unexpected status"
    RESPONSE=$(curl -s ${HEALTH_ENDPOINT} 2>/dev/null || echo "error")
    echo "   Response: ${RESPONSE}"
fi
echo ""

# 5. Database Connection
echo "5️⃣  Database Connection:"
DB_CHECK=$(docker exec ${CONTAINER_NAME} sh -c "psql -h postgres-dev -U langgraph -d langgraph_dev -c 'SELECT 1;' > /dev/null 2>&1 && echo 'connected' || echo 'failed'" 2>/dev/null || echo "cannot_check")
if [ "$DB_CHECK" = "connected" ]; then
    echo "   ✅ PostgreSQL connected"
else
    echo "   ❌ PostgreSQL connection failed"
fi
echo ""

# 6. Redis Connection
echo "6️⃣  Redis Connection:"
REDIS_CHECK=$(docker exec ${CONTAINER_NAME} sh -c "redis-cli -h redis-dev ping 2>/dev/null || echo 'failed'" 2>/dev/null || echo "cannot_check")
if [ "$REDIS_CHECK" = "PONG" ]; then
    echo "   ✅ Redis connected"
else
    echo "   ❌ Redis connection failed"
fi
echo ""

# 7. License Key
echo "7️⃣  License Key:"
LICENSE_CHECK=$(docker exec ${CONTAINER_NAME} sh -c "echo \$LANGSMITH_API_KEY | grep -q 'lsv2_' && echo 'set' || echo 'not_set'" 2>/dev/null || echo "cannot_check")
if [ "$LICENSE_CHECK" = "set" ]; then
    echo "   ✅ LANGSMITH_API_KEY is set"
else
    echo "   ❌ LANGSMITH_API_KEY is NOT set"
fi
echo ""

# 8. Recent Logs
echo "8️⃣  Recent Logs (last 10 lines):"
docker logs --tail 10 ${CONTAINER_NAME} 2>&1 | sed 's/^/   /'
echo ""

# 9. Error Logs
echo "9️⃣  Error Logs (if any):"
docker logs ${CONTAINER_NAME} 2>&1 | grep -i error | tail -5 | sed 's/^/   /' || echo "   No errors found"
echo ""

# 10. Startup Time
echo "🔟 Container Uptime:"
STARTED=$(docker inspect --format='{{.State.StartedAt}}' ${CONTAINER_NAME} 2>/dev/null || echo "unknown")
echo "   Started: ${STARTED}"
echo ""

echo "=========================================="
echo "Diagnostics Complete"
echo "=========================================="
