# Component Testing Guide

This guide helps you test each component separately before integrating everything together.

## Test Order

Test components in this order:

1. ✅ **LangChain/Anthropic** - Test LLM API
2. ✅ **LangSmith** - Test observability platform
3. ✅ **MCP Server** - Test Google Docs integration
4. ✅ **Docker Build** - Test containerization
5. ✅ **Docker Environment** - Test env vars in containers
6. ✅ **Integration** - Test everything together

---

## 1. Test LangChain/Anthropic API

**Purpose**: Verify Claude API is working

```bash
npm run test:langchain
```

**What it tests**:

- ✅ `ANTHROPIC_API_KEY` is set and valid
- ✅ Can make API calls to Claude
- ✅ Model `claude-sonnet-4-5` is accessible
- ✅ Simple completion works
- ✅ Streaming works

**Expected output**:

```
🧪 Testing LangChain/Anthropic Integration...

✅ ANTHROPIC_API_KEY found

1️⃣ Initializing ChatAnthropic client...
   ✅ Client initialized

2️⃣ Testing simple completion...
   ✅ Response received (XXXms)
   Response: Hello, LangChain!...

✅ All LangChain tests passed!
```

**If it fails**:

- Check `ANTHROPIC_API_KEY` in `.env`
- Get key from: https://console.anthropic.com/
- Verify key has credits/quota

---

## 2. Test LangSmith

**Purpose**: Verify observability platform connection

```bash
npm run test:langsmith
```

**What it tests**:

- ✅ `LANGSMITH_API_KEY` is set
- ✅ API key format is correct
- ✅ Can connect to LangGraph API (if running)
- ✅ LangSmith web API is accessible

**Expected output**:

```
🧪 Testing LangSmith Integration...

✅ LANGSMITH_API_KEY found

1️⃣ Verifying API key format...
   ✅ API key format looks correct

2️⃣ Testing LangGraph SDK connection...
   ✅ Connected to LangGraph API
   Found X assistants

✅ LangSmith tests completed!
```

**If it fails**:

- Check `LANGSMITH_API_KEY` in `.env`
- Get key from: https://smith.langchain.com/
- **Note**: LangSmith is required for Docker mode (`npm run langgraph:up`)
- **Note**: LangSmith is optional for local dev (`npm run dev`)

---

## 3. Test MCP Server

**Purpose**: Verify Google Docs integration

```bash
TEST_DOC_ID=your_doc_id npm run mcp:test
```

**What it tests**:

- ✅ MCP server connects
- ✅ All 5 tools are available
- ✅ Can read Google Docs
- ✅ Can copy documents
- ✅ Can get comments
- ✅ Can receive update instructions

**Expected output**:

```
🧪 Starting MCP Server Tests...

1️⃣ Connecting to MCP server...
   ✅ Connected

2️⃣ Testing listTools()...
   ✅ Found 5 tools: read_google_doc, copy_google_doc, ...

3️⃣ Testing read_google_doc...
   ✅ Read successful (5267 chars)

✅ All tests completed!
```

**If it fails**:

- Check Google OAuth credentials in `.env`
- Get new refresh token: `npm run mcp:get-token`
- Ensure document ID is correct
- Check document permissions in Google Drive

---

## 4. Test Docker Build

**Purpose**: Verify Docker setup and configuration

```bash
npm run test:docker:build
```

**What it tests**:

- ✅ Docker is installed
- ✅ Docker daemon is running
- ✅ `langgraph.json` exists and is valid
- ✅ `.env` file exists with required variables
- ✅ MCP server is built locally
- ✅ Docker configuration is correct

**Expected output**:

```
🧪 Testing Docker Build and Environment...

1️⃣ Checking Docker installation...
   ✅ Docker version 24.x.x

2️⃣ Checking Docker daemon...
   ✅ Docker daemon is running

3️⃣ Checking langgraph.json configuration...
   ✅ langgraph.json found
   - Env file: .env
   - Graphs: 19

✅ Docker build tests completed!
```

**If it fails**:

- Install Docker: https://www.docker.com/get-started
- Start Docker Desktop
- Check `langgraph.json` exists
- Ensure `.env` has all required variables

---

## 5. Test Docker Environment Variables

**Purpose**: Verify `.env` variables are passed to Docker containers

**Prerequisites**: LangGraph server must be running

```bash
# Step 1: Start LangGraph server
npm run langgraph:up

# Step 2: In another terminal, test env vars
npm run test:docker:env
```

**What it tests**:

- ✅ LangGraph server is running
- ✅ Can connect to LangGraph API
- ✅ Environment variables are available in Docker
- ✅ MCP server can access Google credentials

**Expected output**:

```
🧪 Testing Docker Environment Variables...

📡 Connecting to LangGraph API: http://localhost:54367

1️⃣ Checking if LangGraph server is running...
   ✅ Server is running (found X assistants)

2️⃣ Testing if resume_agent can access environment variables...
   ✅ Environment variables ARE available in Docker
```

**Alternative manual check**:

```bash
# Check env vars directly in container
docker exec langgraph-api-1 env | grep GOOGLE

# Check logs for MCP errors
docker logs langgraph-api-1 | grep -i "google\|mcp\|env"
```

**If it fails**:

- Ensure `langgraph.json` has `"env": ".env"`
- Verify `.env` file is in project root
- Restart Docker: `docker compose down && npm run langgraph:up`
- Check Docker logs: `docker logs langgraph-api-1`

---

## 6. Test All Components Together

**Purpose**: Run all component tests in sequence

```bash
npm run test:all:components
```

This runs:

1. `test:langchain`
2. `test:langsmith`
3. `test:docker:build`
4. `mcp:test`

**Note**: For `mcp:test`, you'll need to provide `TEST_DOC_ID`:

```bash
TEST_DOC_ID=your_doc_id npm run test:all:components
```

---

## Quick Reference: Test Commands

| Component      | Command                            | Requires Running Server?        |
| -------------- | ---------------------------------- | ------------------------------- |
| LangChain      | `npm run test:langchain`           | ❌ No                           |
| LangSmith      | `npm run test:langsmith`           | ⚠️ Optional                     |
| MCP Server     | `TEST_DOC_ID=xxx npm run mcp:test` | ❌ No                           |
| Docker Build   | `npm run test:docker:build`        | ❌ No                           |
| Docker Env     | `npm run test:docker:env`          | ✅ Yes (`npm run langgraph:up`) |
| All Components | `npm run test:all:components`      | ⚠️ Partial                      |

---

## Troubleshooting

### LangChain fails

- ✅ Check `ANTHROPIC_API_KEY` in `.env`
- ✅ Verify API key has credits
- ✅ Check internet connection

### LangSmith fails

- ✅ Check `LANGSMITH_API_KEY` in `.env`
- ✅ Get key from https://smith.langchain.com/
- ⚠️ Not required for local dev (`npm run dev`)

### MCP Server fails

- ✅ Check Google OAuth credentials
- ✅ Get new refresh token: `npm run mcp:get-token`
- ✅ Ensure document has correct permissions
- ✅ Verify MCP server is built: `npm run mcp:build`

### Docker Build fails

- ✅ Install Docker Desktop
- ✅ Start Docker daemon
- ✅ Check `langgraph.json` configuration
- ✅ Verify `.env` file exists

### Docker Env fails

- ✅ Ensure LangGraph server is running
- ✅ Check `langgraph.json` has `"env": ".env"`
- ✅ Restart Docker containers
- ✅ Check Docker logs for errors

---

## Next Steps After Testing

Once all components pass:

1. ✅ **Start LangGraph server**: `npm run langgraph:up`
2. ✅ **Test Resume Agent**: `npm run cli:resume -- read YOUR_DOC_ID`
3. ✅ **Test end-to-end flow**: Read → Update → Copy

See [`QUICKSTART_RESUME.md`](./QUICKSTART_RESUME.md) for full integration testing.
