#!/bin/bash

# Fix PostgreSQL permissions for LangGraph monitoring
# Usage: ./scripts/fix-postgres-permissions.sh

set -e

echo "=========================================="
echo "Fixing PostgreSQL Permissions"
echo "=========================================="
echo ""

CONTAINER_NAME="resume-agent-postgres-dev"
DB_NAME="langgraph_dev"
DB_USER="langgraph"

echo "📦 Container: ${CONTAINER_NAME}"
echo "🗄️  Database: ${DB_NAME}"
echo "👤 User: ${DB_USER}"
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Container ${CONTAINER_NAME} is not running!"
    echo "Start it with: docker compose -f docker-compose.dev.yml up -d postgres-dev"
    exit 1
fi

echo "🔧 Granting permissions..."
echo ""

# Try to grant pg_monitor role (PostgreSQL 10+)
docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -c "GRANT pg_monitor TO ${DB_USER};" 2>&1 && \
    echo "✅ Granted pg_monitor role" || \
    echo "⚠️  pg_monitor role not available (older PostgreSQL version)"

# Grant direct permissions on system views
docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} <<EOF 2>&1
-- Grant permissions to read pg_stat_activity
GRANT SELECT ON pg_stat_activity TO ${DB_USER};
GRANT SELECT ON pg_stat_database TO ${DB_USER};
GRANT SELECT ON pg_stat_database_conflicts TO ${DB_USER};
GRANT SELECT ON pg_stat_user_tables TO ${DB_USER};
GRANT SELECT ON pg_stat_user_indexes TO ${DB_USER};
EOF

if [ $? -eq 0 ]; then
    echo "✅ Granted SELECT permissions on system views"
else
    echo "❌ Failed to grant permissions"
    echo ""
    echo "Trying with postgres superuser..."
    
    # Try with postgres superuser
    docker exec ${CONTAINER_NAME} psql -U postgres -d ${DB_NAME} <<EOF 2>&1
GRANT pg_monitor TO ${DB_USER};
GRANT SELECT ON pg_stat_activity TO ${DB_USER};
GRANT SELECT ON pg_stat_database TO ${DB_USER};
EOF
    
    if [ $? -eq 0 ]; then
        echo "✅ Granted permissions using postgres superuser"
    else
        echo "❌ Failed to grant permissions even with superuser"
        exit 1
    fi
fi

echo ""
echo "=========================================="
echo "Permissions Updated!"
echo "=========================================="
echo ""
echo "Restart LangGraph to apply changes:"
echo "  docker compose -f docker-compose.dev.yml restart langgraph-api-dev"
echo ""
