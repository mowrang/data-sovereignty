# LangGraph License Verification Fix

## Issue
LangGraph API is failing with:
```
ValueError: License verification failed. Please ensure proper configuration:
- For local development, set a valid LANGSMITH_API_KEY for an account with LangGraph Cloud access
```

## Solution

LangGraph requires a `LANGSMITH_API_KEY` for local development. This key must be from an account with LangGraph Cloud access.

### Option 1: Add to .env.dev file (Recommended)

Add your LangSmith API key to `.env.dev`:

```bash
# In .env.dev file
LANGSMITH_API_KEY=your-langsmith-api-key-here
LANGCHAIN_API_KEY=your-langsmith-api-key-here  # Can be same as LANGSMITH_API_KEY
```

### Option 2: Set Environment Variable

```bash
# Export before running docker compose
export LANGSMITH_API_KEY=your-langsmith-api-key-here
npm run dev:up
```

### Option 3: Add to docker-compose.dev.yml directly

The docker-compose.dev.yml now includes:
```yaml
- LANGSMITH_API_KEY=${LANGSMITH_API_KEY:-}
- LANGCHAIN_API_KEY=${LANGCHAIN_API_KEY:-${LANGSMITH_API_KEY:-}}
```

This will read from `.env.dev` or environment variables.

## Getting a LangSmith API Key

1. Sign up at https://smith.langchain.com/
2. Go to Settings → API Keys
3. Create a new API key
4. Ensure your account has LangGraph Cloud access (may require subscription)

## Alternative: Use LangGraph Cloud License Key

For production, you can use:
```bash
LANGGRAPH_CLOUD_LICENSE_KEY=your-license-key-here
```

## Verification

After adding the key, restart the container:

```bash
docker compose -f docker-compose.dev.yml restart langgraph-api-dev
docker compose -f docker-compose.dev.yml logs -f langgraph-api-dev
```

You should see the server start successfully without license errors.

## Note

The `langgraph.json` file references `.env`, but Docker Compose uses `.env.dev`. The environment variables in `docker-compose.dev.yml` will override/merge with `.env.dev`, so make sure `LANGSMITH_API_KEY` is set in `.env.dev`.
