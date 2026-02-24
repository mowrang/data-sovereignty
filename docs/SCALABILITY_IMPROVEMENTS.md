# Scalability Improvements for Production

This document outlines the scalability improvements needed to make the service production-ready for multiple concurrent users on a public website.

## Current Architecture Analysis

### ✅ What's Already Scalable

1. **PostgreSQL** - Handles concurrent connections well
2. **Redis** - Already in place for caching
3. **Stateless API Design** - LangGraph API is stateless
4. **Database Schema** - Properly normalized with indexes

### ⚠️ Scalability Bottlenecks Identified

1. **MCP Server Spawning** - Creates new subprocess per request (expensive)
2. **Database Connection Pool** - Not configured with proper limits
3. **No User Caching** - Every request hits database for user lookups
4. **Session Storage** - Stored in PostgreSQL (should use Redis)
5. **No Rate Limiting** - Vulnerable to abuse
6. **Single Encryption Key** - All users share same key (security risk)
7. **No Connection Pooling for MCP** - Each request spawns new process

## Recommended Improvements

### Priority 1: Critical for Production

#### 1. Redis Session Storage

**Impact**: High - Reduces database load significantly
**Effort**: Medium

Move sessions from PostgreSQL to Redis for faster lookups and reduced DB load.

#### 2. User Data Caching

**Impact**: High - Reduces database queries by 80%+
**Effort**: Low

Cache user data in Redis with TTL. Invalidate on updates.

#### 3. Database Connection Pool Configuration

**Impact**: High - Prevents connection exhaustion
**Effort**: Low

Configure proper pool limits and timeouts.

#### 4. Rate Limiting

**Impact**: Critical - Prevents abuse and DoS
**Effort**: Medium

Add rate limiting middleware for all endpoints.

### Priority 2: Performance Optimization

#### 5. MCP Server Connection Pooling

**Impact**: High - Reduces process spawning overhead
**Effort**: High

Instead of spawning subprocess per request, use:

- Persistent worker pool
- Or HTTP-based MCP server with connection pooling
- Or reuse MCP connections per user session

#### 6. Horizontal Scaling Support

**Impact**: High - Enables multiple server instances
**Effort**: Medium

- Shared session storage (Redis)
- Load balancer configuration
- Stateless application design (already done)

### Priority 3: Security & Reliability

#### 7. Per-User Encryption Keys

**Impact**: Medium - Better security isolation
**Effort**: Medium

Use key derivation from master key + user ID.

#### 8. Monitoring & Observability

**Impact**: Medium - Essential for production
**Effort**: Medium

- Request logging
- Error tracking
- Performance metrics
- Database query monitoring

## Implementation Plan

See the code improvements in:

- `src/db/client.ts` - Connection pooling and caching
- `src/auth/auth-server.ts` - Redis sessions and rate limiting
- `src/utils/redis-cache.ts` - User data caching utility
- `src/utils/rate-limiter.ts` - Rate limiting middleware

## Expected Performance Improvements

| Metric               | Before               | After          | Improvement   |
| -------------------- | -------------------- | -------------- | ------------- |
| User lookup latency  | 50-100ms             | 5-10ms         | 10x faster    |
| Database connections | Unlimited            | Pooled (20-50) | Controlled    |
| Concurrent users     | ~50                  | 500+           | 10x capacity  |
| MCP overhead         | High (process spawn) | Low (pooled)   | 5-10x faster  |
| Session lookup       | 20-50ms              | <1ms           | 20-50x faster |

## Deployment Recommendations

### For 100-500 Users

- Single server instance
- PostgreSQL with connection pooling
- Redis for sessions and caching
- Rate limiting enabled

### For 500-2000 Users

- 2-3 server instances behind load balancer
- PostgreSQL read replicas (optional)
- Redis cluster for high availability
- CDN for static assets

### For 2000+ Users

- Multiple server instances (auto-scaling)
- PostgreSQL with read replicas
- Redis cluster
- Separate MCP server service (HTTP-based)
- Database sharding (if needed)
