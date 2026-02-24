# Multi-Environment Setup Guide

## Overview

This project supports three environments: **dev**, **staging**, and **prod**. Each environment runs independently with its own Docker containers, databases, and configuration.

---

## Quick Start

### Development Environment

```bash
# Start development environment
npm run dev:up

# View logs
npm run dev:logs

# Stop environment
npm run dev:down
```

### Staging Environment

```bash
# Start staging environment
npm run staging:up

# View logs
npm run staging:logs

# Stop environment
npm run staging:down
```

### Production Environment

```bash
# Start production environment
npm run prod:up

# View logs
npm run prod:logs

# Stop environment
npm run prod:down
```

---

## Environment Details

### Port Mappings

Each environment uses different ports to avoid conflicts:

| Service       | Dev   | Staging | Prod  |
| ------------- | ----- | ------- | ----- |
| PostgreSQL    | 5432  | 5433    | 5434  |
| Redis         | 6379  | 6380    | 6381  |
| LangGraph API | 54367 | 54368   | 54369 |
| Auth Server   | 3000  | 3002    | 3004  |
| Web UI        | 3001  | 3003    | 3005  |

### Database Names

- **Dev**: `langgraph_dev`
- **Staging**: `langgraph_staging`
- **Prod**: `langgraph_prod`

### Container Names

All containers are prefixed with the environment name:

- `resume-agent-postgres-dev`
- `resume-agent-redis-dev`
- `resume-agent-langgraph-dev`
- `resume-agent-auth-dev`
- `resume-agent-web-ui-dev`

---

## Configuration Files

### Environment Files

- `.env.dev` - Development configuration
- `.env.staging` - Staging configuration
- `.env.prod` - Production configuration

### Docker Compose Files

- `docker-compose.dev.yml` - Development services
- `docker-compose.staging.yml` - Staging services
- `docker-compose.prod.yml` - Production services

---

## Setup Instructions

### 1. Create Environment Files

Copy the example environment file and customize for each environment:

```bash
# Development
cp .env.full.example .env.dev
# Edit .env.dev with your dev settings

# Staging
cp .env.full.example .env.staging
# Edit .env.staging with your staging settings

# Production
cp .env.full.example .env.prod
# Edit .env.prod with your production settings
```

### 2. Update Environment-Specific Settings

**Development (`.env.dev`):**

```bash
NODE_ENV=development
POSTGRES_DB=langgraph_dev
REDIS_HOST=redis-dev
LANGGRAPH_API_URL=http://localhost:54367
```

**Staging (`.env.staging`):**

```bash
NODE_ENV=staging
POSTGRES_DB=langgraph_staging
REDIS_HOST=redis-staging
LANGGRAPH_API_URL=http://localhost:54368
```

**Production (`.env.prod`):**

```bash
NODE_ENV=production
POSTGRES_DB=langgraph_prod
REDIS_HOST=redis-prod
LANGGRAPH_API_URL=http://localhost:54369
DOMAIN=abirad.com
USE_DOMAIN=true
```

### 3. Generate Secrets

**Session Secret:**

```bash
openssl rand -hex 32
```

**Encryption Key:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**PostgreSQL Password:**

```bash
openssl rand -base64 32
```

**Redis Password (production only):**

```bash
openssl rand -base64 32
```

---

## Available Commands

### Using npm scripts:

```bash
# Development
npm run dev:up          # Start dev environment
npm run dev:down        # Stop dev environment
npm run dev:logs        # View dev logs
npm run dev:build       # Build dev images
npm run dev:ps          # Show dev containers
npm run dev:shell       # Open shell in web-ui container
npm run dev:db:shell    # Open PostgreSQL shell
npm run dev:db:init     # Initialize database schema

# Staging
npm run staging:up      # Start staging environment
npm run staging:down    # Stop staging environment
npm run staging:logs    # View staging logs
npm run staging:build   # Build staging images
npm run staging:ps      # Show staging containers
npm run staging:shell   # Open shell in web-ui container
npm run staging:db:shell   # Open PostgreSQL shell
npm run staging:db:init    # Initialize database schema

# Production
npm run prod:up         # Start prod environment
npm run prod:down       # Stop prod environment
npm run prod:logs       # View prod logs
npm run prod:build      # Build prod images
npm run prod:ps         # Show prod containers
npm run prod:shell      # Open shell in web-ui container
npm run prod:db:shell   # Open PostgreSQL shell
npm run prod:db:init    # Initialize database schema
```

### Using the env-manager script directly:

```bash
# General syntax
./scripts/env-manager.sh [dev|staging|prod] [command]

# Examples
./scripts/env-manager.sh dev up
./scripts/env-manager.sh staging logs
./scripts/env-manager.sh prod down
```

---

## Services

Each environment includes:

1. **PostgreSQL** - Database for user data, sessions, jobs, etc.
2. **Redis** - Cache and session storage
3. **LangGraph API** - Core agent API server
4. **Auth Server** - Google OAuth authentication
5. **Web UI** - User interface

---

## Database Initialization

After starting an environment, initialize the database schema:

```bash
# Development
npm run dev:db:init

# Staging
npm run staging:db:init

# Production
npm run prod:db:init
```

---

## Accessing Services

### Development

- **Web UI**: http://localhost:3001
- **Auth Server**: http://localhost:3000
- **LangGraph API**: http://localhost:54367
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### Staging

- **Web UI**: http://localhost:3003
- **Auth Server**: http://localhost:3002
- **LangGraph API**: http://localhost:54368
- **PostgreSQL**: localhost:5433
- **Redis**: localhost:6380

### Production

- **Web UI**: http://localhost:3005
- **Auth Server**: http://localhost:3004
- **LangGraph API**: http://localhost:54369
- **PostgreSQL**: localhost:5434
- **Redis**: localhost:6381

---

## Data Persistence

Each environment has its own Docker volumes:

- `postgres_dev_data` - Development database
- `postgres_staging_data` - Staging database
- `postgres_prod_data` - Production database
- `redis_dev_data` - Development Redis data
- `redis_staging_data` - Staging Redis data
- `redis_prod_data` - Production Redis data

**Important:** Data is isolated between environments. Changes in dev won't affect staging or prod.

---

## Running Multiple Environments

You can run multiple environments simultaneously since they use different ports:

```bash
# Start dev and staging at the same time
npm run dev:up
npm run staging:up

# Both will run without conflicts
```

---

## Troubleshooting

### Port Already in Use

If you get a "port already in use" error:

1. Check which process is using the port:

   ```bash
   lsof -i :5432  # For PostgreSQL
   lsof -i :6379  # For Redis
   ```

2. Stop the conflicting service or use a different environment

### Container Won't Start

1. Check logs:

   ```bash
   npm run dev:logs
   ```

2. Verify environment file exists:

   ```bash
   ls -la .env.dev
   ```

3. Rebuild images:
   ```bash
   npm run dev:build
   ```

### Database Connection Issues

1. Ensure PostgreSQL container is healthy:

   ```bash
   docker ps | grep postgres
   ```

2. Check database credentials in `.env.dev` (or `.env.staging`/`.env.prod`)

3. Try connecting manually:
   ```bash
   npm run dev:db:shell
   ```

---

## Best Practices

1. **Never commit `.env.*` files** - They contain secrets
2. **Use strong passwords in production** - Generate random passwords
3. **Initialize database after first start** - Run `db:init` command
4. **Keep environments isolated** - Don't share data between environments
5. **Test in dev/staging first** - Before deploying to production

---

## Environment-Specific Considerations

### Development

- Uses default passwords (`changeme`)
- No SSL/HTTPS required
- Debug logging enabled
- Hot reload support

### Staging

- Should mirror production configuration
- Use stronger passwords than dev
- Test production-like scenarios
- Can use test API keys

### Production

- **Strong passwords required**
- SSL/HTTPS enabled (if using domain)
- Production API keys
- Monitoring and logging
- Backup strategy

---

## Next Steps

1. Create `.env.dev`, `.env.staging`, and `.env.prod` files
2. Update with your API keys and secrets
3. Start development environment: `npm run dev:up`
4. Initialize database: `npm run dev:db:init`
5. Access Web UI: http://localhost:3001

For domain setup (production), see `docs/ABIRAD_AWS_DEPLOYMENT.md`.
