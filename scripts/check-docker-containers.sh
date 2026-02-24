#!/bin/bash
# Quick script to check Docker container status

echo "🔍 Checking Docker Containers...\n"

# Check all containers
echo "All containers (running and stopped):"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}" | grep -E "NAMES|langgraph|social-media"

echo "\n"

# Check running containers
echo "Running containers:"
RUNNING=$(docker ps --format "{{.Names}}" | grep -E "langgraph|social-media")
if [ -z "$RUNNING" ]; then
  echo "  ⚠️  No LangGraph containers are running"
  echo "  Start with: npm run langgraph:up"
else
  echo "$RUNNING" | while read name; do
    echo "  ✅ $name"
  done
fi

echo "\n"

# Check Docker Compose
echo "Docker Compose status:"
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
  docker compose ps 2>/dev/null || echo "  No docker-compose.yml found in current directory"
else
  echo "  Docker Compose not available"
fi

echo "\n"

# Check if LangGraph server process is running
echo "LangGraph server process:"
LANGGRAPH_PROC=$(ps aux | grep -i "langgraphjs\|langgraph" | grep -v grep)
if [ -z "$LANGGRAPH_PROC" ]; then
  echo "  ⚠️  LangGraph server process not found"
  echo "  Start with: npm run langgraph:up"
else
  echo "  ✅ LangGraph process found:"
  echo "$LANGGRAPH_PROC" | head -1
fi

echo "\n"

# Provide next steps
echo "💡 Next steps:"
echo "  1. If no containers: npm run langgraph:up"
echo "  2. If containers exist but stopped: docker start <container-name>"
echo "  3. To see all containers: docker ps -a"
echo "  4. To see logs: docker logs <container-name>"
