# Fixing Port Conflicts for Dev Environment

## Problem

Port 3000 is already in use by another container (`crazy_swirles`), which will prevent `auth-server-dev` from starting.

## Solution Options

### Option 1: Stop Conflicting Container (Recommended)

```bash
# Stop the container using port 3000
docker stop crazy_swirles

# Or remove it if you don't need it
docker rm -f crazy_swirles

# Now start dev environment
cd "/Users/maryam/Documents/005 Engineering/JobHunting2026/social-media-agent"
npm run dev:up
```

### Option 2: Change Auth Server Port

If you need to keep the other container running, you can change the auth server port:

1. **Update docker-compose.dev.yml:**

   ```yaml
   auth-server-dev:
     ports:
       - "3002:3000" # Changed from 3000:3000
   ```

2. **Update .env.dev:**

   ```env
   AUTH_SERVER_PORT=3000
   AUTH_SERVER_URL=http://localhost:3002
   ```

3. **Update web-ui environment:**
   ```yaml
   web-ui-dev:
     environment:
       - AUTH_SERVER_URL=http://auth-server-dev:3000 # Internal stays 3000
   ```

### Option 3: Stop All Unnecessary Containers

```bash
# Stop all containers
docker stop $(docker ps -q)

# Or stop specific ones
docker stop crazy_swirles charming_ganguly goofy_swartz flamboyant_hodgkin

# Then start dev environment
cd "/Users/maryam/Documents/005 Engineering/JobHunting2026/social-media-agent"
npm run dev:up
```

## Check Port Usage

```bash
# Check what's using port 3000
lsof -i :3000

# Or
docker ps | grep 3000
```

## After Fixing Port Conflict

```bash
# Navigate to project
cd "/Users/maryam/Documents/005 Engineering/JobHunting2026/social-media-agent"

# Start dev environment
npm run dev:up

# Wait for services
sleep 25

# Verify containers are running
docker ps

# Should see:
# - resume-agent-postgres-dev
# - resume-agent-redis-dev
# - resume-agent-langgraph-dev
# - resume-agent-auth-dev
# - resume-agent-web-ui-dev
```
