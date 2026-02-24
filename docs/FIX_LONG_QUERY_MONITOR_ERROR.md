# Fix: Failed to Query Long-Running Queries Error

## Error Message
```
Failed to query long-running queries [langgraph_runtime_postgres.long_query_monitor]
```

## What This Means

This is a **non-critical monitoring error**. LangGraph is trying to monitor long-running database queries for observability, but it's failing to query PostgreSQL's `pg_stat_activity` system view.

**Important:** This does NOT affect core functionality. LangGraph will still work normally, you just won't have monitoring of long-running queries.

## Why It Happens

LangGraph tries to query `pg_stat_activity` to monitor database performance, but this can fail if:
1. The database user doesn't have permissions to read `pg_stat_activity`
2. PostgreSQL configuration restricts access to system views
3. The monitoring query times out

## Solutions

### Option 1: Grant Permissions (Recommended)

Grant the necessary permissions to the LangGraph database user:

```bash
# Connect to PostgreSQL
docker compose -f docker-compose.dev.yml exec postgres-dev psql -U langgraph -d langgraph_dev

# Grant permissions
GRANT pg_monitor TO langgraph;
```

Or if `pg_monitor` role doesn't exist (older PostgreSQL versions):

```sql
-- Grant permissions to read pg_stat_activity
GRANT SELECT ON pg_stat_activity TO langgraph;
GRANT SELECT ON pg_stat_database TO langgraph;
```

### Option 2: Use Superuser (Development Only)

For development, you can use a superuser:

```yaml
# In docker-compose.dev.yml
postgres-dev:
  environment:
    POSTGRES_USER: postgres  # Use default superuser
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}
```

Then update LangGraph connection:
```yaml
langgraph-api-dev:
  environment:
    POSTGRES_USER: postgres
```

**⚠️ Warning:** Only use superuser in development, never in production!

### Option 3: Ignore the Error (Simplest)

Since this is just monitoring and doesn't affect functionality, you can safely ignore it. The error will appear in logs but won't prevent LangGraph from working.

## Verify the Fix

After granting permissions, restart LangGraph:

```bash
docker compose -f docker-compose.dev.yml restart langgraph-api-dev
```

Check logs - the error should disappear:

```bash
docker compose -f docker-compose.dev.yml logs langgraph-api-dev | grep -i "long-running"
```

Should show no errors (or the error should be gone).

## Quick Fix Script

Run this to grant permissions:

```bash
docker compose -f docker-compose.dev.yml exec postgres-dev psql -U langgraph -d langgraph_dev -c "GRANT pg_monitor TO langgraph;" || \
docker compose -f docker-compose.dev.yml exec postgres-dev psql -U langgraph -d langgraph_dev -c "GRANT SELECT ON pg_stat_activity TO langgraph; GRANT SELECT ON pg_stat_database TO langgraph;"
```

## Impact

**Without Fix:**
- ✅ LangGraph works normally
- ✅ All features function correctly
- ❌ No monitoring of long-running queries
- ⚠️ Error appears in logs (cosmetic)

**With Fix:**
- ✅ LangGraph works normally
- ✅ All features function correctly
- ✅ Monitoring of long-running queries works
- ✅ No error in logs

## Summary

This is a **low-priority, non-critical error**. You can:
1. **Fix it** by granting database permissions (recommended)
2. **Ignore it** - it won't affect functionality
3. **Use superuser** in development (quick but less secure)

The error is just about observability/monitoring, not core functionality.
