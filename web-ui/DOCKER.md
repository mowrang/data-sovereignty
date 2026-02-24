# Web UI Docker Setup

Guide for running the Web UI in a separate Docker container.

---

## Quick Start

### Option 1: Web UI in Docker, LangGraph API Separate

**Terminal 1**: Start LangGraph API Server (not in Docker, or in separate Docker)

```bash
npm run langgraph:up
# or
npm run dev
```

**Terminal 2**: Start Web UI in Docker

```bash
docker compose -f docker-compose.web-ui.yml up --build
```

**Access**: http://localhost:3001

---

### Option 2: Both in Docker (Full Stack)

```bash
docker compose up
```

This starts:

- PostgreSQL
- Redis
- LangGraph API Server
- Web UI

**Access**: http://localhost:3001

---

## Building Web UI Docker Image

### Build locally

```bash
docker build -f Dockerfile.web-ui -t resume-agent-web-ui .
```

### Run container

```bash
docker run -p 3001:3001 \
  -e LANGGRAPH_API_URL=http://host.docker.internal:54367 \
  -e WEB_UI_PORT=3001 \
  -e WEB_UI_HOST=0.0.0.0 \
  resume-agent-web-ui
```

---

## Configuration

### Environment Variables

Set in `.env` or pass to Docker:

```bash
# LangGraph API URL
# Use host.docker.internal to access services on host machine
LANGGRAPH_API_URL=http://host.docker.internal:54367

# Or if LangGraph API is in another Docker container
LANGGRAPH_API_URL=http://langgraph-api:54367

# Web UI Port
WEB_UI_PORT=3001

# Web UI Host (0.0.0.0 to accept connections from outside container)
WEB_UI_HOST=0.0.0.0
```

---

## Docker Compose Options

### Web UI Only (`docker-compose.web-ui.yml`)

```bash
# Start Web UI container
docker compose -f docker-compose.web-ui.yml up

# Start in background
docker compose -f docker-compose.web-ui.yml up -d

# View logs
docker compose -f docker-compose.web-ui.yml logs -f

# Stop
docker compose -f docker-compose.web-ui.yml down
```

### Full Stack (`docker-compose.yml`)

```bash
# Start everything
docker compose up

# Start in background
docker compose up -d

# View logs
docker compose logs -f web-ui

# Stop everything
docker compose down
```

---

## Connecting to LangGraph API

### Scenario 1: LangGraph API on Host Machine

If LangGraph API runs via `npm run langgraph:up` (not in Docker):

```yaml
environment:
  - LANGGRAPH_API_URL=http://host.docker.internal:54367
```

**Note**: `host.docker.internal` works on:

- ✅ Mac Docker Desktop
- ✅ Windows Docker Desktop
- ❌ Linux (use `--network host` or bridge network)

### Scenario 2: LangGraph API in Separate Docker Container

If both are in Docker:

```yaml
environment:
  - LANGGRAPH_API_URL=http://langgraph-api:54367
depends_on:
  - langgraph-api
```

### Scenario 3: LangGraph API on AWS/Remote

```yaml
environment:
  - LANGGRAPH_API_URL=https://your-langgraph-api.com
```

---

## Troubleshooting

### Can't connect to LangGraph API

**Error**: `ECONNREFUSED` or `fetch failed`

**Solutions**:

1. **Check LangGraph API is running**:

   ```bash
   curl http://localhost:54367/health
   ```

2. **For Mac/Windows**: Use `host.docker.internal`

   ```bash
   LANGGRAPH_API_URL=http://host.docker.internal:54367
   ```

3. **For Linux**: Use host network mode:

   ```bash
   docker run --network host ...
   ```

4. **Check Docker network**:
   ```bash
   docker network ls
   docker network inspect bridge
   ```

### Port already in use

```bash
# Change port in docker-compose.web-ui.yml
ports:
  - "3002:3001"  # Host:Container
```

### Build fails

```bash
# Check if TypeScript compiles
npm run build

# Check if web-ui/server.js exists after build
ls web-ui/server.js
```

---

## Production Deployment

For AWS/production, see `docs/AWS_DEPLOYMENT.md`

Key points:

- Build image: `docker build -f Dockerfile.web-ui -t web-ui .`
- Push to ECR: `docker push <ecr-url>/web-ui:latest`
- Deploy to ECS with environment variables

---

## Files

- `Dockerfile.web-ui` - Web UI Docker image definition
- `docker-compose.web-ui.yml` - Compose file for Web UI only
- `docker-compose.yml` - Full stack (all services)

---

## Quick Commands

```bash
# Build Web UI image
docker build -f Dockerfile.web-ui -t resume-agent-web-ui .

# Run Web UI container
docker compose -f docker-compose.web-ui.yml up

# Run in background
docker compose -f docker-compose.web-ui.yml up -d

# View logs
docker compose -f docker-compose.web-ui.yml logs -f

# Stop
docker compose -f docker-compose.web-ui.yml down

# Rebuild and restart
docker compose -f docker-compose.web-ui.yml up --build
```
