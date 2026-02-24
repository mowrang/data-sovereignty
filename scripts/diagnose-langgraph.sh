#!/bin/bash

# Diagnostic script for LangGraph container issues

echo "=== LangGraph Container Diagnostics ==="
echo ""

echo "1. Container Status:"
docker compose -f docker-compose.dev.yml ps langgraph-api-dev
echo ""

echo "2. Recent Logs (last 50 lines):"
docker compose -f docker-compose.dev.yml logs --tail=50 langgraph-api-dev
echo ""

echo "3. Environment Variables Check:"
docker compose -f docker-compose.dev.yml exec langgraph-api-dev env | grep -E "DATABASE_URI|REDIS_URI|POSTGRES|REDIS" || echo "Container not running"
echo ""

echo "4. Database Connection Test:"
docker compose -f docker-compose.dev.yml exec postgres-dev psql -U langgraph -d langgraph_dev -c "SELECT version();" 2>&1 || echo "Database connection failed"
echo ""

echo "5. Redis Connection Test:"
docker compose -f docker-compose.dev.yml exec redis-dev redis-cli ping 2>&1 || echo "Redis connection failed"
echo ""

echo "6. Check for thread_ttl table:"
docker compose -f docker-compose.dev.yml exec postgres-dev psql -U langgraph -d langgraph_dev -c "\dt thread_ttl" 2>&1 || echo "Table check failed"
echo ""

echo "=== Diagnostics Complete ==="
echo ""
echo "Common Issues:"
echo "- Missing DATABASE_URI or REDIS_URI: Check docker-compose.dev.yml"
echo "- Database not initialized: LangGraph should auto-create tables on first startup"
echo "- Connection refused: Check if postgres-dev and redis-dev are running"
echo "- Permission errors: Check database user permissions"
