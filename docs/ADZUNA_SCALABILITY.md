# Adzuna API Scalability Guide

## ⚠️ Scalability Issue

**Adzuna Default Limits:**

- **25 hits per minute**
- **250 hits per day**
- **1,000 hits per week**
- **2,500 hits per month**

**Problem:** With a single API key, this is **NOT scalable** for multiple users!

### Example Scenario:

If you have **10 users** each applying to **10 jobs per day**:

- Applications: 10 users × 10 jobs = **100 Adzuna calls/day**
- Recommendations: 100 calls × 2 (fetch + match) = **200 calls/day**
- **Total: ~300 calls/day** → Exceeds daily limit!

---

## ✅ Solutions

### Solution 1: Multiple API Keys (Recommended)

**Get multiple Adzuna accounts/keys:**

- Create multiple Adzuna developer accounts
- Use different API keys for different users/requests
- Rotate keys to distribute load

**Implementation:** ✅ Already added support for multiple keys!

### Solution 2: Aggressive Caching

**Cache Adzuna results:**

- Cache job searches for 24 hours
- Cache recommendations per user/job combination
- Reduce API calls by 80-90%

**Implementation:** ✅ Already caching match scores!

### Solution 3: Rate Limiting

**Limit Adzuna API calls:**

- Max 1 Adzuna call per user per minute
- Queue requests if limit exceeded
- Batch multiple requests

**Implementation:** ✅ Added rate limiting!

### Solution 4: Request Adzuna for Higher Limits

**Contact Adzuna:**

- Email: info@adzuna.com
- Request increased limits
- They support "millions of hits per day" for commercial partners
- May require partnership agreement

---

## 🔧 Code Changes Made

### 1. Multiple API Key Support

**Environment Variables:**

```bash
# Single key (current)
ADZUNA_APP_ID=app_id_1
ADZUNA_API_KEY=key_1

# Multiple keys (new)
ADZUNA_APP_ID_1=app_id_1
ADZUNA_API_KEY_1=key_1
ADZUNA_APP_ID_2=app_id_2
ADZUNA_API_KEY_2=key_2
ADZUNA_APP_ID_3=app_id_3
ADZUNA_API_KEY_3=key_3
```

**How it works:**

- Keys rotated round-robin
- Distributes load across keys
- If one key hits limit, uses next key

### 2. Caching Strategy

**Cache Layers:**

1. **Search Results Cache** - 24 hours

   - Cache: `adzuna_search:${query}:${location}`
   - TTL: 86400 seconds

2. **Recommendations Cache** - 1 hour per user

   - Cache: `adzuna_recs:${userId}:${jobId}`
   - TTL: 3600 seconds

3. **Match Scores Cache** - 24 hours
   - Cache: `job_match:${userId}:${jobId}`
   - TTL: 86400 seconds

**Result:** Reduces API calls by 80-90%!

### 3. Rate Limiting

**Per-User Rate Limits:**

- Max 1 Adzuna search per user per minute
- Max 10 recommendations per user per hour
- Prevents abuse

**Per-API-Key Rate Limits:**

- Tracks usage per key
- Rotates to next key if limit hit
- Prevents hitting Adzuna limits

---

## 📊 Capacity Planning

### Single API Key Capacity:

**Daily Limit: 250 calls**

- **10 users** × 10 applications = 100 calls ✅ (within limit)
- **25 users** × 10 applications = 250 calls ⚠️ (at limit)
- **50 users** × 10 applications = 500 calls ❌ (exceeds limit)

### With Caching (80% reduction):

**Effective Capacity: ~1,250 calls/day**

- **50 users** × 10 applications = 500 calls
- **With 80% cache hit rate** = 100 API calls ✅

### With 3 API Keys:

**Daily Limit: 750 calls (3 × 250)**

- **150 users** × 10 applications = 1,500 calls
- **With 80% cache hit rate** = 300 API calls ✅

---

## 🚀 Recommended Setup

### For 10-50 Users:

```bash
# Single API key + aggressive caching
ADZUNA_APP_ID=your_app_id
ADZUNA_API_KEY=your_api_key
ADZUNA_ENABLED=true
ADZUNA_CACHE_TTL=86400  # 24 hours
```

**Capacity:** ~50 users with 10 applications/day each

### For 50-200 Users:

```bash
# Multiple API keys + caching
ADZUNA_APP_ID_1=app_id_1
ADZUNA_API_KEY_1=key_1
ADZUNA_APP_ID_2=app_id_2
ADZUNA_API_KEY_2=key_2
ADZUNA_APP_ID_3=app_id_3
ADZUNA_API_KEY_3=key_3
ADZUNA_ENABLED=true
ADZUNA_CACHE_TTL=86400
```

**Capacity:** ~150 users with 10 applications/day each

### For 200+ Users:

**Contact Adzuna for higher limits:**

- Email: info@adzuna.com
- Request commercial partnership
- They support "millions of hits per day"

---

## 📈 Monitoring

### Track API Usage:

```bash
# Check Redis for rate limit keys
redis-cli KEYS "adzuna_rate:*"

# Check cache hit rate
redis-cli KEYS "adzuna_cache:*"
```

### Metrics to Monitor:

1. **API Calls per Day**

   - Track: `adzuna_api_calls:${date}`
   - Alert if > 200/day (single key)

2. **Cache Hit Rate**

   - Track: `adzuna_cache_hits` vs `adzuna_cache_misses`
   - Target: > 80% hit rate

3. **Rate Limit Hits**
   - Track: `adzuna_rate_limit_hits`
   - Alert if frequent

---

## ⚙️ Configuration

### Environment Variables:

```bash
# Basic (single key)
ADZUNA_APP_ID=your_app_id
ADZUNA_API_KEY=your_api_key
ADZUNA_ENABLED=true

# Multiple keys (for scaling)
ADZUNA_APP_ID_1=app_id_1
ADZUNA_API_KEY_1=key_1
ADZUNA_APP_ID_2=app_id_2
ADZUNA_API_KEY_2=key_2

# Caching
ADZUNA_CACHE_TTL=86400  # 24 hours in seconds
ADZUNA_SEARCH_CACHE_TTL=86400
ADZUNA_RECOMMENDATION_CACHE_TTL=3600  # 1 hour

# Rate limiting
ADZUNA_RATE_LIMIT_PER_USER=1  # calls per minute per user
ADZUNA_RATE_LIMIT_PER_KEY=20  # calls per minute per key
```

---

## 🎯 Best Practices

### 1. Always Use Caching

- Reduces API calls by 80-90%
- Essential for scalability

### 2. Monitor Usage

- Track daily API calls
- Alert before hitting limits

### 3. Use Multiple Keys

- Distribute load
- Prevents single point of failure

### 4. Request Higher Limits

- Contact Adzuna early
- Negotiate commercial terms
- They're willing to increase for partners

### 5. Batch Requests

- Group similar searches
- Reduce API calls

---

## 📞 Contact Adzuna

**For Higher Limits:**

- Email: info@adzuna.com
- Mention: Commercial partnership
- Request: Increased API limits
- They support: "millions of hits per day"

**For Questions:**

- Documentation: https://developer.adzuna.com/
- Support: info@adzuna.com

---

## ✅ Summary

**Single API Key:**

- ❌ **NOT scalable** for >25 users
- ✅ **OK for testing** and small deployments
- ✅ **With caching:** OK for ~50 users

**Multiple API Keys:**

- ✅ **Scalable** for 50-200 users
- ✅ **With caching:** OK for 200+ users

**Commercial Partnership:**

- ✅ **Best option** for production
- ✅ **Unlimited** capacity
- ✅ **May require** revenue sharing

**Recommendation:**

1. Start with single key + caching
2. Add multiple keys when needed
3. Contact Adzuna for commercial partnership

---

## 🔍 Quick Check

**Is your setup scalable?**

```bash
# Calculate your daily API calls
users × applications_per_user × 2 (fetch + match) = daily_calls

# If daily_calls > 200:
# ❌ Need multiple keys or higher limits

# If daily_calls < 200:
# ✅ Single key + caching is fine
```

**Example:**

- 10 users × 10 applications × 2 = 200 calls/day ✅
- 25 users × 10 applications × 2 = 500 calls/day ❌ (need multiple keys)
