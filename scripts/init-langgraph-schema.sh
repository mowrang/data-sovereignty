#!/bin/bash

# Script to ensure LangGraph schema is initialized
# LangGraph should auto-initialize, but this helps verify

echo "Checking LangGraph database schema..."

# Connect to postgres and check if LangGraph tables exist
docker compose -f docker-compose.dev.yml exec -T postgres-dev psql -U langgraph -d langgraph_dev <<EOF
-- Check if thread_ttl table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'thread_ttl'
);
EOF

echo ""
echo "If the table doesn't exist, LangGraph will create it on next startup."
echo "Restart the langgraph-api-dev container to trigger schema initialization:"
echo "  docker compose -f docker-compose.dev.yml restart langgraph-api-dev"
