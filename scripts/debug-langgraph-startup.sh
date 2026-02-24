#!/bin/bash

# Debug LangGraph API Server Startup and Port Issues
# Usage: ./scripts/debug-langgraph-startup.sh

set -e

CONTAINER_NAME="resume-agent-langgraph-dev"
PORT=54367

echo "=========================================="
echo "LangGraph API Server Startup Debug"
echo "=========================================="
echo ""

# 1. Check if container exists and is running
echo "1️⃣  Container Status:"
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    STATUS=$(docker inspect --format='{{.State.Status}}' ${CONTAINER_NAME} 2>/dev/null)
    echo "   Status: ${STATUS}"
    
    if [ "$STATUS" = "running" ]; then
        echo "   ✅ Container is running"
    else
        echo "   ❌ Container is not running (status: ${STATUS})"
        echo "   Start with: docker compose -f docker-compose.dev.yml up -d langgraph-api-dev"
        exit 1
    fi
else
    echo "   ❌ Container not found"
    echo "   Start with: docker compose -f docker-compose.dev.yml up -d langgraph-api-dev"
    exit 1
fi
echo ""

# 2. Check what process is running inside container
echo "2️⃣  Processes Running in Container:"
docker exec ${CONTAINER_NAME} ps aux | head -10
echo ""

# 3. Check if langgraphjs command is running
echo "3️⃣  LangGraph Process Check:"
LANGGRAPH_PROC=$(docker exec ${CONTAINER_NAME} ps aux | grep -E "langgraphjs|node.*langgraph" | grep -v grep || echo "")
if [ -n "$LANGGRAPH_PROC" ]; then
    echo "   ✅ LangGraph process found:"
    echo "   ${LANGGRAPH_PROC}" | sed 's/^/   /'
else
    echo "   ❌ No LangGraph process found!"
    echo "   This means the server didn't start properly"
fi
echo ""

# 4. Check if port is listening
echo "4️⃣  Port ${PORT} Listening Check:"
PORT_CHECK=$(docker exec ${CONTAINER_NAME} sh -c "netstat -tlnp 2>/dev/null | grep :${PORT} || ss -tlnp 2>/dev/null | grep :${PORT} || echo 'NOT_LISTENING'" 2>/dev/null || echo "CANNOT_CHECK")
if [ "$PORT_CHECK" != "NOT_LISTENING" ] && [ "$PORT_CHECK" != "CANNOT_CHECK" ]; then
    echo "   ✅ Port ${PORT} is listening:"
    echo "   ${PORT_CHECK}" | sed 's/^/   /'
else
    echo "   ❌ Port ${PORT} is NOT listening!"
    echo "   This is why health checks fail"
fi
echo ""

# 5. Check environment variables
echo "5️⃣  Critical Environment Variables:"
echo "   DATABASE_URI:"
docker exec ${CONTAINER_NAME} sh -c "echo \$DATABASE_URI" 2>/dev/null | sed 's/^/   /' || echo "   ❌ Not set"
echo "   REDIS_URI:"
docker exec ${CONTAINER_NAME} sh -c "echo \$REDIS_URI" 2>/dev/null | sed 's/^/   /' || echo "   ❌ Not set"
echo "   LANGSMITH_API_KEY:"
docker exec ${CONTAINER_NAME} sh -c "echo \$LANGSMITH_API_KEY | cut -c1-20..." 2>/dev/null | sed 's/^/   /' || echo "   ❌ Not set"
echo ""

# 6. Check recent logs for errors
echo "6️⃣  Recent Logs (last 30 lines, looking for errors):"
docker logs --tail 30 ${CONTAINER_NAME} 2>&1 | grep -i -E "error|fail|exception|traceback|cannot|refused|timeout" | tail -10 | sed 's/^/   /' || echo "   No obvious errors found"
echo ""

# 7. Check startup logs
echo "7️⃣  Startup Sequence Check:"
echo "   Looking for key startup messages..."
STARTUP_CHECK=$(docker logs ${CONTAINER_NAME} 2>&1 | grep -iE "started server|listening|server process|application startup" | tail -5)
if [ -n "$STARTUP_CHECK" ]; then
    echo "   ✅ Found startup messages:"
    echo "$STARTUP_CHECK" | sed 's/^/   /'
else
    echo "   ⚠️  No startup messages found - server may not have started"
fi
echo ""

# 8. Test health endpoint from inside container
echo "8️⃣  Health Endpoint Test (from inside container):"
HEALTH_TEST=$(docker exec ${CONTAINER_NAME} sh -c "node -e \"require('http').get('http://localhost:${PORT}/health', (r) => {let d=''; r.on('data', c=>d+=c); r.on('end', ()=>{console.log('Status:', r.statusCode); console.log('Response:', d); process.exit(r.statusCode===200?0:1)});}).on('error', (e)=>{console.error('Error:', e.message); process.exit(1)});\"" 2>&1)
if [ $? -eq 0 ]; then
    echo "   ✅ Health endpoint responding"
    echo "$HEALTH_TEST" | sed 's/^/   /'
else
    echo "   ❌ Health endpoint not responding"
    echo "$HEALTH_TEST" | sed 's/^/   /'
fi
echo ""

# 9. Check what command is actually running
echo "9️⃣  Container Command:"
CMD=$(docker inspect --format='{{.Config.Cmd}}' ${CONTAINER_NAME} 2>/dev/null || echo "unknown")
echo "   ${CMD}"
echo ""

# 10. Check working directory and files
echo "🔟 Working Directory and Key Files:"
echo "   Working directory:"
docker exec ${CONTAINER_NAME} pwd 2>/dev/null | sed 's/^/   /' || echo "   Cannot determine"
echo "   langgraph.json exists:"
docker exec ${CONTAINER_NAME} test -f langgraph.json && echo "   ✅ Yes" || echo "   ❌ No"
echo "   node_modules exists:"
docker exec ${CONTAINER_NAME} test -d node_modules && echo "   ✅ Yes" || echo "   ❌ No"
echo ""

echo "=========================================="
echo "Debug Complete"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. If port not listening: Check logs for startup errors"
echo "2. If process not running: Check CMD in Dockerfile.langgraph"
echo "3. If health endpoint fails: Check DATABASE_URI and REDIS_URI"
echo "4. View full logs: docker logs -f ${CONTAINER_NAME}"
echo ""
