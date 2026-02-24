# Why LangGraph Takes 1-2 Minutes to Start

## Startup Process Breakdown

LangGraph performs several initialization steps that take time:

### 1. **Database Connection & Schema Initialization** (~10-30 seconds)
- Connects to PostgreSQL database
- Checks for existing schema
- Creates/updates database tables if needed:
  - `thread_ttl` table
  - `checkpoints` table
  - `runs` table
  - Other LangGraph internal tables
- Runs database migrations if schema version changed

### 2. **Redis Connection** (~1-5 seconds)
- Connects to Redis for caching and session management
- Verifies Redis is accessible
- Sets up connection pool

### 3. **License Verification** (~5-15 seconds)
- Validates `LANGSMITH_API_KEY` with LangSmith API
- Checks account has LangGraph Cloud access
- This requires a network call to LangSmith servers
- Network latency can add time

### 4. **Graph Registration** (~10-30 seconds)
- Loads all graphs defined in `langgraph.json`:
  - `ingest_data`
  - `generate_post`
  - `upload_post`
  - `reflection`
  - `generate_thread`
  - `curate_data`
  - `verify_reddit_post`
  - `verify_tweet`
  - `supervisor`
  - `generate_report`
  - `repurposer`
  - `curated_post_interrupt`
  - `ingest_repurposed_data`
  - `repurposer_post_interrupt`
  - `resume_agent` ← Your main graph
- Compiles TypeScript graphs to JavaScript
- Validates graph structure
- Registers graphs with the API server

### 5. **Worker Thread Initialization** (~5-10 seconds)
- Starts background worker threads (10 workers by default)
- Sets up thread pools for concurrent graph execution
- Initializes queue system for job processing

### 6. **MCP Server Build** (~10-30 seconds, first time only)
- If `mcp-google-docs` directory exists:
  - Runs `npm ci` to install dependencies
  - Runs `npm run build` to compile TypeScript
  - This is cached after first build

### 7. **API Server Startup** (~5-10 seconds)
- Starts HTTP server on port 54367
- Sets up routes and middleware
- Initializes request handlers

## Total Time: ~60-120 seconds (1-2 minutes)

## Factors Affecting Startup Time

### First Startup (Longer)
- Database schema creation
- MCP server compilation
- Dependency installation
- **Can take 2-3 minutes**

### Subsequent Startups (Faster)
- Schema already exists
- MCP server already compiled
- Dependencies cached
- **Usually 1-2 minutes**

### Network Latency
- License verification requires internet connection
- Slow network = slower startup
- **Can add 10-30 seconds**

### Database Performance
- Slow database = slower schema checks
- Large existing database = slower queries
- **Can add 10-20 seconds**

### Number of Graphs
- More graphs = more compilation time
- Your project has 15 graphs defined
- **Each graph adds ~1-2 seconds**

## How to Reduce Startup Time

### 1. **Use Health Check with Longer Start Period**
```yaml
healthcheck:
  start_period: 120s  # Allow 2 minutes for startup
```

### 2. **Pre-build MCP Server**
Build MCP server before starting Docker:
```bash
cd mcp-google-docs && npm ci && npm run build
```

### 3. **Use In-Memory Mode for Development** (Faster)
```bash
npm run langgraph:in_mem:up
```
This skips database initialization but loses persistence.

### 4. **Optimize Database Connection**
- Use local PostgreSQL (faster than remote)
- Ensure PostgreSQL is healthy before starting LangGraph
- Use connection pooling (already configured)

### 5. **Reduce Number of Graphs** (Development Only)
Comment out unused graphs in `langgraph.json`:
```json
{
  "graphs": {
    "resume_agent": "./src/agents/resume-agent/resume-agent-graph.ts:resumeAgentGraph"
    // Comment out others during development
  }
}
```

## Is 2 Minutes Normal?

**Yes, this is completely normal!** 

LangGraph is a complex system that:
- Manages state persistence
- Handles concurrent execution
- Provides observability
- Supports multiple graphs

The startup time is a trade-off for:
- ✅ Robust state management
- ✅ Production-ready features
- ✅ Scalability
- ✅ Observability

## Monitoring Startup Progress

Watch the logs to see progress:

```bash
docker compose -f docker-compose.dev.yml logs -f langgraph-api-dev
```

You'll see:
1. `Starting Postgres runtime` - Database connection
2. `Redis pool stats` - Redis connection
3. `Migration lock acquired` - Schema initialization
4. `No enterprise license key` warning - License check (before verification)
5. `Started server process` - Server ready
6. `Worker stats` - Workers initialized

Once you see `Worker stats` with `available=10`, the server is fully ready!

## Summary

**2 minutes is normal** because LangGraph:
- Initializes databases and schemas
- Verifies licenses
- Compiles and registers 15 graphs
- Sets up worker threads
- Builds MCP servers

This is a one-time cost per container start. Once running, it's fast and efficient!
