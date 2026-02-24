# Docker Quick Reference

Quick reference for Docker commands in this project.

---

## Check Environment Variables in Docker

### Method 1: Check All Environment Variables

```bash
# Step 1: Find your container name
docker ps | grep langgraph

# Step 2: Check all env vars (replace container-name with actual name)
docker exec <container-name> env

# Or filter for specific ones:
docker exec <container-name> env | grep GOOGLE
docker exec <container-name> env | grep ANTHROPIC
docker exec <container-name> env | grep LANGSMITH
```

### Method 2: Check Specific Variables

```bash
# Check Google credentials
docker exec <container-name> env | grep -E "GOOGLE|ANTHROPIC|LANGSMITH"

# Or check one at a time:
docker exec <container-name> sh -c 'echo $GOOGLE_REFRESH_TOKEN'
docker exec <container-name> sh -c 'echo $ANTHROPIC_API_KEY'
docker exec <container-name> sh -c 'echo $LANGSMITH_API_KEY'
```

### Method 3: Quick One-Liner

```bash
# Find container and check env vars in one command
docker ps --format "{{.Names}}" | grep langgraph | head -1 | xargs -I {} docker exec {} env | grep -E "GOOGLE|ANTHROPIC|LANGSMITH"
```

---

## Container Management

### List Containers

```bash
# Running containers
docker ps

# All containers (including stopped)
docker ps -a

# Filter for LangGraph containers
docker ps | grep langgraph
docker ps -a | grep langgraph
```

### Container Names

```bash
# Get just container names
docker ps --format "{{.Names}}"

# Get LangGraph container names
docker ps --format "{{.Names}}" | grep langgraph
```

### Stop/Start Containers

```bash
# Stop all containers
docker compose down

# Stop specific container
docker stop <container-name>

# Start stopped container
docker start <container-name>

# Restart container
docker restart <container-name>
```

---

## View Logs

### Basic Log Commands

```bash
# View logs (replace container-name)
docker logs <container-name>

# Follow logs in real-time
docker logs -f <container-name>

# Last 100 lines
docker logs --tail 100 <container-name>

# Last 50 lines and follow
docker logs --tail 50 -f <container-name>
```

### Filter Logs

```bash
# Filter for MCP-related logs
docker logs <container-name> 2>&1 | grep -i mcp

# Filter for errors
docker logs <container-name> 2>&1 | grep -i error

# Filter for Google/env related
docker logs <container-name> 2>&1 | grep -i "google\|env\|refresh_token"

# Filter for build steps
docker logs <container-name> 2>&1 | grep -i "building\|mcp server"
```

---

## Check MCP Server in Docker

### Verify MCP Server Was Built

```bash
# Check if MCP server executable exists
docker exec <container-name> ls -la /deps/social-media-agent/mcp-google-docs/dist/server.js

# Check MCP directory structure
docker exec <container-name> ls -la /deps/social-media-agent/mcp-google-docs/

# Find server.js anywhere in container
docker exec <container-name> find /deps -name "server.js" -type f
```

---

## Inspect Container

### Get Shell Access

```bash
# Get bash shell in container
docker exec -it <container-name> /bin/bash

# Get sh shell (if bash not available)
docker exec -it <container-name> /bin/sh
```

### Check File System

```bash
# List files in project directory
docker exec <container-name> ls -la /deps/social-media-agent

# Check if .env was copied (should NOT be - env vars are injected)
docker exec <container-name> ls -la /deps/social-media-agent/.env

# Check langgraph.json
docker exec <container-name> cat /deps/social-media-agent/langgraph.json
```

---

## Docker System Commands

### Check Docker Status

```bash
# Docker version
docker --version

# Docker info
docker info

# System disk usage
docker system df

# Prune unused resources
docker system prune
```

### Images

```bash
# List images
docker images

# List LangGraph images
docker images | grep langgraph

# Remove image
docker rmi <image-id>
```

### Networks

```bash
# List networks
docker network ls

# Inspect network
docker network inspect <network-name>
```

---

## Common Troubleshooting Commands

### Check If Server Is Running

```bash
# Check container status
docker ps | grep langgraph

# Check if port is listening
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep 54367

# Check process inside container
docker exec <container-name> ps aux
```

### Check Environment Variables Are Loaded

```bash
# Quick check
docker exec <container-name> env | grep GOOGLE_REFRESH_TOKEN

# Full check
docker exec <container-name> env | grep -E "GOOGLE|ANTHROPIC|LANGSMITH|MCP"
```

### Check Build Status

```bash
# View build logs
docker logs <container-name> 2>&1 | grep -A 10 "Building MCP"

# Check for build errors
docker logs <container-name> 2>&1 | grep -i "error\|failed"
```

---

## Project-Specific Commands

### Start/Stop LangGraph Server

```bash
# Start in Docker mode
npm run langgraph:up

# Start without watch
npm run langgraph:up:no-watch

# Start in-memory (no Docker)
npm run dev

# Stop Docker containers
docker compose down
```

### Test Commands

```bash
# Test Docker environment
npm run test:docker:env

# Test Docker build
npm run test:docker:build

# Test all components
npm run test:all:components
```

---

## Quick Reference: Container Names

LangGraph containers are usually named:

- `langgraph-api-1`
- `social-media-agent-<hash>-langgraph-api-1`
- `langgraph-api-<project-name>`

**Find yours:**

```bash
docker ps --format "{{.Names}}" | grep langgraph
```

---

## Ports

| Service              | Port  | Purpose  |
| -------------------- | ----- | -------- |
| LangGraph API Server | 54367 | HTTP API |
| PostgreSQL           | 5432  | Database |
| Redis                | 6379  | Cache    |

---

## Common Workflows

### Check Everything Is Working

```bash
# 1. Check containers are running
docker ps | grep langgraph

# 2. Check env vars are loaded
docker exec <container-name> env | grep GOOGLE_REFRESH_TOKEN

# 3. Check MCP server exists
docker exec <container-name> ls /deps/social-media-agent/mcp-google-docs/dist/server.js

# 4. Check logs for errors
docker logs <container-name> 2>&1 | tail -50 | grep -i error

# 5. Test via API
npm run test:docker:env
```

### Restart Everything

```bash
# Stop all containers
docker compose down

# Start fresh
npm run langgraph:up

# Wait for build, then check
sleep 30
docker ps | grep langgraph
```

### Debug MCP Server Issues

```bash
# 1. Check if MCP server was built
docker exec <container-name> ls -la /deps/social-media-agent/mcp-google-docs/dist/

# 2. Check env vars
docker exec <container-name> env | grep GOOGLE

# 3. Check logs for MCP errors
docker logs <container-name> 2>&1 | grep -i "mcp\|google\|connection closed"

# 4. Try to run MCP server manually (inside container)
docker exec -it <container-name> /bin/bash
cd /deps/social-media-agent
node mcp-google-docs/dist/server.js
```

---

## Useful Aliases (Optional)

Add these to your `~/.zshrc` or `~/.bashrc`:

```bash
# Get LangGraph container name
alias lg-container='docker ps --format "{{.Names}}" | grep langgraph | head -1'

# Check env vars
alias lg-env='docker exec $(lg-container) env | grep -E "GOOGLE|ANTHROPIC|LANGSMITH"'

# View logs
alias lg-logs='docker logs -f $(lg-container)'

# Get shell in container
alias lg-shell='docker exec -it $(lg-container) /bin/bash'
```

Then use:

```bash
lg-env      # Check environment variables
lg-logs     # View logs
lg-shell    # Get shell access
```

---

## Quick Troubleshooting

| Problem               | Command to Diagnose                                              |
| --------------------- | ---------------------------------------------------------------- |
| Container not running | `docker ps -a \| grep langgraph`                                 |
| Env vars missing      | `docker exec <name> env \| grep GOOGLE`                          |
| MCP server not found  | `docker exec <name> ls /deps/.../mcp-google-docs/dist/server.js` |
| Build failed          | `docker logs <name> \| grep -i error`                            |
| Port conflict         | `docker ps --format "{{.Ports}}"`                                |
| Out of space          | `docker system df`                                               |

---

## See Also

- [`DOCKER_ENV_TESTING.md`](./DOCKER_ENV_TESTING.md) - Detailed environment variable testing guide
- [`DOCKER_BUILD_TROUBLESHOOTING.md`](./DOCKER_BUILD_TROUBLESHOOTING.md) - Build error solutions
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) - Overall architecture explanation
