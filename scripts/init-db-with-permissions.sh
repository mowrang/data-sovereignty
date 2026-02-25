#!/bin/bash

# Initialize database with permissions
# This script runs init-db.ts and then grants permissions as postgres superuser
# Usage: ./scripts/init-db-with-permissions.sh

set -e

echo "=========================================="
echo "Database Initialization with Permissions"
echo "=========================================="
echo ""

# Step 1: Run TypeScript initialization script
echo "1️⃣  Running database schema initialization..."
npm run db:init

if [ $? -ne 0 ]; then
    echo "❌ Schema initialization failed!"
    exit 1
fi

echo ""
echo "2️⃣  Granting PostgreSQL permissions for LangGraph monitoring..."

# Step 2: Grant permissions as postgres superuser
CONTAINER_NAME="data-sovereignty-postgres-dev"
DB_NAME="langgraph_dev"
DB_USER="langgraph"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "⚠️  PostgreSQL container not running, skipping permissions grant"
    echo "   Run: docker compose -f docker-compose.dev.yml up -d postgres-dev"
    exit 0
fi

# Grant permissions using postgres superuser
docker exec ${CONTAINER_NAME} psql -U postgres -d ${DB_NAME} <<EOF 2>&1
-- Grant pg_monitor role (PostgreSQL 10+)
DO \$\$
BEGIN
    BEGIN
        GRANT pg_monitor TO ${DB_USER};
        RAISE NOTICE 'Granted pg_monitor role';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'pg_monitor not available, using direct permissions';
    END;
END \$\$;

-- Grant direct SELECT permissions
GRANT SELECT ON pg_stat_activity TO ${DB_USER};
GRANT SELECT ON pg_stat_database TO ${DB_USER};
GRANT SELECT ON pg_stat_database_conflicts TO ${DB_USER};
GRANT SELECT ON pg_stat_user_tables TO ${DB_USER};
GRANT SELECT ON pg_stat_user_indexes TO ${DB_USER};
EOF

if [ $? -eq 0 ]; then
    echo "✅ Permissions granted successfully!"
else
    echo "⚠️  Failed to grant permissions (this is okay, app will still work)"
    echo "   Run manually: npm run fix:postgres-permissions"
fi

echo ""
echo "=========================================="
echo "✅ Database initialization complete!"
echo "=========================================="
