# Production Deployment Guide

This guide covers deploying the multi-user service to production with scalability and reliability in mind.

## Scalability Improvements Implemented

### ✅ What's Been Improved

1. **Redis Caching**

   - User data cached with 1-hour TTL
   - Session storage in Redis (faster than PostgreSQL)
   - Reduces database load by 80%+

2. **Database Connection Pooling**

   - Configured with proper limits (default: 20 connections)
   - Prevents connection exhaustion
   - Automatic connection management

3. **Rate Limiting**

   - Auth endpoints: 5 requests per 15 minutes
   - API endpoints: 60 requests per minute
   - Chat endpoints: 10 requests per minute
   - Prevents abuse and DoS attacks

4. **Session Management**
   - Redis-backed sessions (fast lookups)
   - PostgreSQL backup for persistence
   - Automatic expiration

## Deployment Architecture

### Recommended Setup for Production

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                         │
│              (nginx, Cloudflare, etc.)                  │
└───────────────┬─────────────────────────────────────────┘
                │
        ┌───────┴───────┐
        │               │
   ┌────▼────┐     ┌────▼────┐
   │ Web UI  │     │ Web UI  │  (2+ instances)
   │Instance │     │Instance │
   └────┬────┘     └────┬────┘
        │               │
        └───────┬───────┘
                │
        ┌───────▼───────┐
        │  Auth Server │  (1-2 instances)
        └───────┬───────┘
                │
        ┌───────▼───────┐
        │ LangGraph API│  (2+ instances)
        └───────┬───────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼───┐   ┌───▼───┐   ┌───▼───┐
│PostgreSQL│ │ Redis │   │  MCP  │
│Primary   │ │Cluster│   │Server │
└──────────┘ └───────┘   └───────┘
```

## Environment Variables for Production

```bash
# Database
POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_DB=langgraph
POSTGRES_USER=langgraph
POSTGRES_PASSWORD=strong-password-here
POSTGRES_MAX_CONNECTIONS=50
POSTGRES_SSL=true

# Redis
REDIS_URL=redis://your-redis-host:6379
# Or use Redis cluster:
# REDIS_URL=redis://node1:6379,redis://node2:6379,redis://node3:6379

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback

# Security
SESSION_SECRET=generate-random-64-char-string
ENCRYPTION_KEY=generate-random-64-hex-string
NODE_ENV=production

# URLs
AUTH_SERVER_URL=https://auth.yourdomain.com
LANGGRAPH_API_URL=https://api.yourdomain.com
WEB_UI_HOST=0.0.0.0
```

## Deployment Steps

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb langgraph

# Run migrations
npm run db:init

# Set up connection pooling (recommended: PgBouncer)
# Or use managed PostgreSQL (AWS RDS, Google Cloud SQL, etc.)
```

### 2. Redis Setup

```bash
# Option 1: Managed Redis (recommended)
# AWS ElastiCache, Google Cloud Memorystore, Redis Cloud

# Option 2: Self-hosted
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --appendonly yes
```

### 3. Deploy Services

#### Option A: Docker Compose (Single Server)

```yaml
# docker-compose.prod.yml
version: "3.8"
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: langgraph
      POSTGRES_USER: langgraph
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

  auth-server:
    build: .
    command: npm run start:auth:multi
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - POSTGRES_HOST=postgres
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  langgraph-api:
    build: .
    command: npm run langgraph:up:no-watch
    ports:
      - "54367:54367"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - POSTGRES_HOST=postgres
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      replicas: 2

  web-ui:
    build: .
    command: npm run web-ui
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - AUTH_SERVER_URL=https://auth.yourdomain.com
      - LANGGRAPH_API_URL=https://api.yourdomain.com
    depends_on:
      - auth-server
      - langgraph-api
    restart: unless-stopped
    deploy:
      replicas: 2
```

#### Option B: Kubernetes (Multi-Server)

See `k8s/` directory for Kubernetes manifests (create if needed).

#### Option C: Cloud Platforms

- **AWS**: Use ECS/EKS with RDS and ElastiCache
- **Google Cloud**: Use Cloud Run with Cloud SQL and Memorystore
- **Azure**: Use Container Instances with Azure Database and Azure Cache

### 4. Load Balancer Configuration

#### Nginx Example

```nginx
# /etc/nginx/sites-available/yourdomain
upstream web_ui {
    least_conn;
    server web-ui-1:3001;
    server web-ui-2:3001;
}

upstream auth_server {
    least_conn;
    server auth-server-1:3000;
    server auth-server-2:3000;
}

upstream langgraph_api {
    least_conn;
    server langgraph-api-1:54367;
    server langgraph-api-2:54367;
}

server {
    listen 80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Web UI
    location / {
        proxy_pass http://web_ui;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Auth Server
    location /auth/ {
        proxy_pass http://auth_server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # LangGraph API
    location /api/langgraph/ {
        proxy_pass http://langgraph_api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 5. Monitoring & Observability

#### Recommended Tools

1. **Application Monitoring**

   - Datadog, New Relic, or Sentry
   - Track errors, performance, and user activity

2. **Database Monitoring**

   - PostgreSQL: pg_stat_statements, pgAdmin
   - Redis: redis-cli INFO, RedisInsight

3. **Logging**

   - Centralized logging: ELK Stack, Loki, CloudWatch
   - Structured logging with correlation IDs

4. **Health Checks**
   - `/health` endpoints on all services
   - Set up alerts for downtime

### 6. Security Checklist

- [ ] HTTPS enabled (TLS 1.2+)
- [ ] Strong `SESSION_SECRET` and `ENCRYPTION_KEY`
- [ ] Database credentials in secrets manager
- [ ] Rate limiting enabled
- [ ] CORS configured properly
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (using parameterized queries)
- [ ] Regular security updates
- [ ] Backup strategy in place
- [ ] Disaster recovery plan

## Performance Tuning

### Database

```sql
-- Increase connection limits
ALTER SYSTEM SET max_connections = 200;

-- Optimize for read-heavy workload
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '16MB';
```

### Redis

```bash
# Increase memory limit
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Application

```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096"

# Use PM2 for process management
pm2 start server.js -i max --max-memory-restart 1G
```

## Scaling Strategy

### Vertical Scaling (Single Server)

- Increase server resources (CPU, RAM)
- Good for: 100-500 concurrent users

### Horizontal Scaling (Multiple Servers)

- Add more server instances
- Use load balancer
- Good for: 500+ concurrent users

### Database Scaling

- Read replicas for read-heavy workloads
- Connection pooling (PgBouncer)
- Good for: 1000+ concurrent users

## Cost Estimation

### Small Scale (100-500 users)

- 1 server: $50-100/month
- Managed PostgreSQL: $30-50/month
- Managed Redis: $20-30/month
- **Total: ~$100-180/month**

### Medium Scale (500-2000 users)

- 2-3 servers: $150-300/month
- Managed PostgreSQL: $100-200/month
- Managed Redis: $50-100/month
- Load balancer: $20-50/month
- **Total: ~$320-650/month**

### Large Scale (2000+ users)

- Auto-scaling servers: $500-2000/month
- Managed PostgreSQL (HA): $300-500/month
- Managed Redis (cluster): $200-400/month
- Load balancer + CDN: $100-200/month
- **Total: ~$1100-3100/month**

## Maintenance

### Regular Tasks

1. **Weekly**

   - Review error logs
   - Check database performance
   - Monitor Redis memory usage

2. **Monthly**

   - Update dependencies
   - Review and optimize slow queries
   - Check backup integrity

3. **Quarterly**
   - Security audit
   - Performance review
   - Capacity planning

## Support & Troubleshooting

See `docs/SCALABILITY_IMPROVEMENTS.md` for detailed scalability information.

For issues:

1. Check application logs
2. Review database slow query log
3. Monitor Redis memory and connections
4. Check rate limit headers in responses
5. Review error tracking (Sentry, etc.)
