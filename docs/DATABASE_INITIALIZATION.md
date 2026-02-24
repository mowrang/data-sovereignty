# Database Initialization Guide

## Quick Start

### Full Initialization (Recommended)
This initializes schemas AND grants monitoring permissions:

```bash
npm run db:init:full
```

### Schema Only Initialization
This only initializes schemas (permissions may need to be granted separately):

```bash
npm run db:init
```

## What Gets Initialized

### 1. User Management Schema
- `users` table - stores user accounts and preferences
- `user_sessions` table - manages authentication sessions
- Indexes for performance

### 2. Jobs Schema
- `job_postings` table - stores job listings
- `job_applications` table - tracks user applications
- `job_matches` table - stores job matching results
- `job_clicks` table - tracks job clicks for revenue
- `revenue_tracking` table - tracks revenue from job recommendations

### 3. User History Schema
- `user_job_descriptions` table - stores job descriptions users have used
- `user_resume_updates` table - tracks resume update events

### 4. PostgreSQL Permissions
- Grants `pg_monitor` role (PostgreSQL 10+)
- Grants SELECT permissions on system views:
  - `pg_stat_activity` - for monitoring long-running queries
  - `pg_stat_database` - for database statistics
  - `pg_stat_user_tables` - for table statistics
  - `pg_stat_user_indexes` - for index statistics

## Why Permissions Are Needed

LangGraph needs these permissions to:
- Monitor long-running database queries
- Track database performance metrics
- Provide observability features

**Without these permissions:**
- ✅ LangGraph works normally
- ❌ You'll see "Failed to query long-running queries" errors in logs
- ⚠️ No monitoring of database performance

**With these permissions:**
- ✅ LangGraph works normally
- ✅ Monitoring works correctly
- ✅ No errors in logs

## Manual Permission Grant

If permissions weren't granted during initialization:

```bash
npm run fix:postgres-permissions
```

Or manually:

```bash
docker compose -f docker-compose.dev.yml exec postgres-dev psql -U postgres -d langgraph_dev -c "GRANT pg_monitor TO langgraph;"
```

## When to Run Initialization

### First Time Setup
```bash
# Start PostgreSQL first
docker compose -f docker-compose.dev.yml up -d postgres-dev

# Wait for PostgreSQL to be healthy, then initialize
npm run db:init:full
```

### After Schema Changes
If you modify schema files (`schema.sql`, `user-history-schema.sql`), run:

```bash
npm run db:init
```

### After Fresh Database
If you recreate the database volume:

```bash
# Remove old volume
docker compose -f docker-compose.dev.yml down -v

# Start fresh
docker compose -f docker-compose.dev.yml up -d postgres-dev

# Initialize
npm run db:init:full
```

## Troubleshooting

### Permissions Can't Be Granted

**Error:** "insufficient privileges" or "permission denied"

**Solution:**
1. Make sure PostgreSQL container is running
2. Run as postgres superuser:
   ```bash
   npm run fix:postgres-permissions
   ```

### Schema Already Exists

**Error:** "relation already exists"

**Solution:**
- This is normal if schemas are already initialized
- The scripts use `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times
- No action needed

### Database Connection Failed

**Error:** "connection refused" or "could not connect"

**Solution:**
1. Check PostgreSQL is running:
   ```bash
   docker compose -f docker-compose.dev.yml ps postgres-dev
   ```
2. Wait for PostgreSQL to be healthy before running init
3. Check environment variables in `.env.dev`

## Files Involved

- `scripts/init-db.ts` - Main initialization script
- `scripts/init-db-with-permissions.sh` - Full initialization with permissions
- `src/db/schema.sql` - User management schema
- `src/db/user-history-schema.sql` - User history schema
- `src/db/permissions.sql` - PostgreSQL permissions (used by init script)
- `src/db/client.ts` - Database client with initialization methods

## Summary

- **Use `npm run db:init:full`** for complete setup (recommended)
- **Use `npm run db:init`** for schema-only initialization
- **Use `npm run fix:postgres-permissions`** if permissions are missing
- Permissions are **optional** but recommended (removes monitoring errors)
