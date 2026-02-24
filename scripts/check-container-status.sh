#!/bin/bash

# Quick script to check container status and logs

echo "=== Container Status ==="
docker compose -f docker-compose.dev.yml ps -a

echo -e "\n=== LangGraph API Logs (last 30 lines) ==="
docker compose -f docker-compose.dev.yml logs --tail=30 langgraph-api-dev 2>&1 || echo "No logs available"

echo -e "\n=== Auth Server Logs (last 30 lines) ==="
docker compose -f docker-compose.dev.yml logs --tail=30 auth-server-dev 2>&1 || echo "No logs available"

echo -e "\n=== PostgreSQL Logs (last 10 lines) ==="
docker compose -f docker-compose.dev.yml logs --tail=10 postgres-dev 2>&1 || echo "No logs available"

echo -e "\n=== Redis Logs (last 10 lines) ==="
docker compose -f docker-compose.dev.yml logs --tail=10 redis-dev 2>&1 || echo "No logs available"

echo -e "\n=== Checking Health Endpoints ==="
echo "LangGraph API:"
curl -f http://localhost:54367/health 2>/dev/null && echo "✓ Healthy" || echo "✗ Not responding"

echo "Auth Server:"
curl -f http://localhost:3000/health 2>/dev/null && echo "✓ Healthy" || echo "✗ Not responding"
