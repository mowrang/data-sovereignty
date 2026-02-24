# Quick Fix for LangGraph License Error

## The Problem
LangGraph is failing with:
```
ValueError: License verification failed
```

## The Solution

**You need to add your LangSmith API key to `.env.dev`:**

1. **Get your LangSmith API key:**
   - Go to https://smith.langchain.com/
   - Sign up/login
   - Go to Settings → API Keys
   - Create a new API key

2. **Add it to `.env.dev`:**
   ```bash
   # Open .env.dev file
   nano .env.dev
   
   # Add this line (replace with your actual key):
   LANGSMITH_API_KEY=lsv2_pt_xxxxxxxxxxxxxxxxxxxxx
   ```

3. **Restart LangGraph container:**
   ```bash
   docker compose -f docker-compose.dev.yml restart langgraph-api-dev
   ```

## Alternative: Set Environment Variable

If you don't want to edit `.env.dev`, you can export it:

```bash
export LANGSMITH_API_KEY=your-key-here
docker compose -f docker-compose.dev.yml restart langgraph-api-dev
```

## Verify It Works

Check the logs - you should no longer see license errors:

```bash
docker compose -f docker-compose.dev.yml logs langgraph-api-dev | tail -20
```

The server should start successfully!
