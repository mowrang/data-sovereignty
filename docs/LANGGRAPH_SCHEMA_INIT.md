# LangGraph Database Schema Initialization

## Issue: Missing `thread_ttl` Table

LangGraph API requires its own database schema to be initialized. The error:
```
ERROR: relation "thread_ttl" does not exist (SQLSTATE 42P01)
```

indicates that LangGraph's internal tables haven't been created yet.

## Solution

LangGraph automatically initializes its schema when it starts, but it needs:
1. **Database connection** (`DATABASE_URI`) ✅ Fixed
2. **Redis connection** (`REDIS_URI`) ✅ Fixed  
3. **Database to exist** - The database `langgraph_dev` must exist
4. **Proper permissions** - User must have CREATE TABLE permissions

## Automatic Schema Initialization

LangGraph will automatically create its required tables (including `thread_ttl`) on first startup if:
- Database exists
- User has CREATE permissions
- Connection is successful

## Manual Schema Initialization (if needed)

If automatic initialization fails, you can manually trigger it:

```bash
# Connect to the langgraph-api container
docker compose -f docker-compose.dev.yml exec langgraph-api-dev bash

# Or run langgraph CLI to initialize
langgraphjs up --port 54367
```

## Verify Schema

Check if LangGraph tables exist:

```bash
# Connect to PostgreSQL
docker compose -f docker-compose.dev.yml exec postgres-dev psql -U langgraph -d langgraph_dev

# List tables
\dt

# Should see LangGraph tables like:
# - thread_ttl
# - checkpoints
# - threads
# - etc.
```

## Troubleshooting

If schema still doesn't initialize:

1. **Check database exists:**
   ```bash
   docker compose -f docker-compose.dev.yml exec postgres-dev psql -U langgraph -l
   ```

2. **Check user permissions:**
   ```bash
   docker compose -f docker-compose.dev.yml exec postgres-dev psql -U langgraph -d langgraph_dev -c "\du"
   ```

3. **Check LangGraph logs:**
   ```bash
   docker compose -f docker-compose.dev.yml logs langgraph-api-dev | grep -i schema
   docker compose -f docker-compose.dev.yml logs langgraph-api-dev | grep -i error
   ```

4. **Restart LangGraph container** (will retry schema initialization):
   ```bash
   docker compose -f docker-compose.dev.yml restart langgraph-api-dev
   ```

## Expected Behavior

On first startup, LangGraph should:
1. Connect to database
2. Check if schema exists
3. Create tables if missing
4. Start serving requests

This happens automatically - no manual intervention needed if configuration is correct.
