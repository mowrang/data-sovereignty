# LangGraph API Environment Variables

## Required Variables

The LangGraph API requires the following environment variables:

### Database Connection
- `DATABASE_URI` - PostgreSQL connection string in format: `postgresql://user:password@host:port/database`
  - Example: `postgresql://langgraph:changeme@postgres-dev:5432/langgraph_dev`

### Optional Variables
- `POSTGRES_URI` - Alternative to DATABASE_URI (if DATABASE_URI not set)
- `REDIS_URI` - Redis connection string (if using Redis)
- `LANGGRAPH_API_URL` - API URL (for client connections)

## Docker Compose Configuration

The `docker-compose.dev.yml` now includes:
```yaml
environment:
  - DATABASE_URI=postgresql://langgraph:${POSTGRES_PASSWORD:-changeme}@postgres-dev:5432/langgraph_dev
```

## Troubleshooting

If you see `KeyError: "Config 'DATABASE_URI' is missing"`:
1. Check that `DATABASE_URI` is set in docker-compose.dev.yml
2. Verify the PostgreSQL credentials match your database
3. Ensure the database name matches (langgraph_dev for dev environment)
