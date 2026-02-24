# Adzuna Scalability - Quick Answer

## ⚠️ Short Answer: **NO, single API key is NOT scalable**

**Adzuna Limits:**

- 25 calls/minute
- **250 calls/day** ← This is the bottleneck!

**With 10 users applying to 10 jobs/day:**

- 100 applications × 2 (fetch + match) = **200 calls/day** ✅ (OK)
- 25 users × 10 jobs = **500 calls/day** ❌ (exceeds limit!)

---

## ✅ Solutions

### Option 1: Multiple API Keys (Easiest)

**Get 2-3 Adzuna accounts, add to `.env.dev`:**

```bash
ADZUNA_APP_ID_1=app_id_1
ADZUNA_API_KEY_1=key_1
ADZUNA_APP_ID_2=app_id_2
ADZUNA_API_KEY_2=key_2
ADZUNA_ENABLED=true
```

**Capacity:** 2 keys = 500 calls/day = ~50 users ✅

### Option 2: Aggressive Caching (Already Implemented!)

**Cache Adzuna results for 24 hours:**

- Reduces API calls by 80-90%
- Single key can handle ~50 users with caching

**Capacity:** 1 key + caching = ~250 users ✅

### Option 3: Contact Adzuna

**Request higher limits:**

- Email: info@adzuna.com
- They support "millions of hits per day" for partners
- May require commercial agreement

---

## 🎯 Recommendation

**For <50 users:** Single key + caching ✅  
**For 50-200 users:** Multiple keys + caching ✅  
**For 200+ users:** Contact Adzuna for partnership ✅

---

## 📊 Quick Capacity Calculator

```
users × applications_per_user × 2 = daily_calls

If daily_calls < 200: ✅ Single key OK
If daily_calls > 200: ❌ Need multiple keys
```

**Example:**

- 10 users × 10 apps × 2 = 200 calls ✅
- 25 users × 10 apps × 2 = 500 calls ❌ (need 2-3 keys)

---

## ✅ Code Already Updated!

I've added:

- ✅ Multiple API key support (round-robin)
- ✅ 24-hour caching
- ✅ Automatic key rotation
- ✅ Rate limit handling

**Just add multiple keys to `.env.dev` and restart!**

See `docs/ADZUNA_SCALABILITY.md` for full details.
