# Adzuna Integration - Development Guide

## ✅ Code Changes Made

I've integrated Adzuna to automatically show job recommendations when users apply to jobs.

### Files Created/Modified:

1. **`src/utils/adzuna-recommender.ts`** (NEW)

   - Fetches Adzuna jobs based on applied jobs
   - Calculates match scores using AI
   - Returns ranked recommendations

2. **`src/api/applications.ts`** (MODIFIED)

   - Automatically fetches Adzuna jobs when user applies
   - Runs in background (non-blocking)

3. **`src/api/job-recommendations.ts`** (MODIFIED)

   - Added `/adzuna` endpoint
   - Returns Adzuna recommendations

4. **`web-ui/server.ts`** (MODIFIED)

   - Mounted job recommendations router
   - Mounted applications router
   - Mounted jobs router

5. **`.env.dev`** (MODIFIED)
   - Added Adzuna configuration variables

---

## 🔧 What You Need to Do

### 1. Add Your Adzuna Credentials

Edit `.env.dev`:

```bash
ADZUNA_APP_ID=your_app_id_from_adzuna
ADZUNA_API_KEY=your_api_key_from_adzuna
ADZUNA_ENABLED=true
ADZUNA_REVENUE_PER_CLICK=0.15
```

### 2. Restart Dev Environment

```bash
npm run dev:down
npm run dev:up
```

### 3. Test the Integration

**Step 1: Apply to a job**

```bash
curl -X POST "http://localhost:3001/api/applications/jobs/JOB_ID/apply" \
  -H "Cookie: session_token=YOUR_SESSION" \
  -H "Content-Type: application/json"
```

**Step 2: Get Adzuna recommendations**

```bash
curl -X GET "http://localhost:3001/api/job-recommendations/adzuna?jobId=JOB_ID" \
  -H "Cookie: session_token=YOUR_SESSION"
```

---

## 🎯 How It Works

### Flow:

1. **User applies to job** → `POST /api/applications/jobs/:jobId/apply`
2. **System extracts** job details (title, description, location)
3. **Searches Adzuna** → `jobBoardIntegrator.searchAdzuna()`
4. **Imports jobs** → Stores in database with `source='adzuna'`
5. **Calculates match scores** → Uses AI job matcher
6. **Returns recommendations** → Via `/api/job-recommendations/adzuna`

### API Endpoints:

**Get Adzuna Recommendations:**

```
GET /api/job-recommendations/adzuna?limit=10&jobId=optional-job-id
```

**Response:**

```json
{
  "recommendations": [
    {
      "jobId": "uuid",
      "title": "Software Engineer",
      "company": "Tech Corp",
      "description": "...",
      "location": "San Francisco, CA",
      "salary": "$100k - $150k",
      "url": "https://...",
      "matchScore": 85,
      "reasons": ["Reason 1", "Reason 2"]
    }
  ],
  "count": 10,
  "source": "adzuna"
}
```

---

## 🧪 Testing in Dev

### 1. Start Dev Environment

```bash
npm run dev:up
npm run dev:db:init  # If first time
```

### 2. Create a Test Job Posting

```bash
# Via API or database
# Job should have: title, description, location
```

### 3. Apply to Job

```bash
POST /api/applications/jobs/:jobId/apply
```

### 4. Check Logs

```bash
npm run dev:logs
# Look for: "Found X Adzuna recommendations"
```

### 5. Get Recommendations

```bash
GET /api/job-recommendations/adzuna?jobId=:jobId
```

---

## 📝 Next Steps

1. ✅ **Add Adzuna credentials** to `.env.dev`
2. ✅ **Restart dev environment**
3. ✅ **Test with a real job application**
4. ✅ **Verify recommendations appear**
5. ⏳ **Integrate into frontend** (when ready)

---

## 🔍 Debugging

### No Recommendations?

1. **Check credentials:**

   ```bash
   echo $ADZUNA_APP_ID
   echo $ADZUNA_API_KEY
   ```

2. **Check if enabled:**

   ```bash
   echo $ADZUNA_ENABLED
   ```

3. **Check logs:**

   ```bash
   npm run dev:logs
   ```

4. **Test Adzuna API directly:**
   ```bash
   curl "https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=YOUR_APP_ID&app_key=YOUR_API_KEY&what=software%20engineer&where=United%20States"
   ```

### Recommendations Not Relevant?

- Match score threshold is 50% (configurable in code)
- AI matching considers:
  - Job title similarity
  - Description keywords
  - Location match
  - User's application history

---

## 📚 Related Files

- `src/integrations/job-boards.ts` - Adzuna API integration
- `src/utils/job-matcher.ts` - AI matching engine
- `src/utils/adzuna-recommender.ts` - Recommendation logic
- `src/api/job-recommendations.ts` - API endpoints
- `src/api/applications.ts` - Application handling

---

## ✅ Summary

**What's Done:**

- ✅ Adzuna integration code written
- ✅ Automatic fetching on job application
- ✅ API endpoint for recommendations
- ✅ AI-powered matching
- ✅ Revenue tracking support

**What You Need:**

- ⏳ Add Adzuna credentials
- ⏳ Restart dev environment
- ⏳ Test with real job application

**Ready to test!** 🚀
