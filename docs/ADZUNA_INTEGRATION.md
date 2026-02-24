# Adzuna Integration Guide

## Overview

Adzuna integration automatically fetches job recommendations from Adzuna when users apply to jobs. The system analyzes the job they're applying for and shows them similar opportunities from Adzuna.

---

## Setup

### 1. Get Adzuna API Credentials

1. Sign up at https://developer.adzuna.com/
2. Create an application
3. Get your **App ID** and **API Key**

### 2. Configure Environment Variables

Add to `.env.dev` (and `.env.staging`, `.env.prod`):

```bash
# Adzuna API
ADZUNA_APP_ID=your_app_id_here
ADZUNA_API_KEY=your_api_key_here
ADZUNA_ENABLED=true
ADZUNA_AFFILIATE_ID=your_affiliate_id  # Optional, for revenue tracking
ADZUNA_REVENUE_PER_CLICK=0.15  # Revenue per click in USD
```

### 3. Restart Services

```bash
npm run dev:down
npm run dev:up
```

---

## How It Works

### When User Applies to a Job

1. **User applies** → `/api/applications/jobs/:jobId/apply`
2. **System extracts** job title, description, location
3. **Searches Adzuna** for similar jobs
4. **Imports jobs** to database
5. **Calculates match scores** using AI
6. **Stores recommendations** for user

### Getting Recommendations

**API Endpoint:**

```
GET /api/job-recommendations/adzuna
```

**Query Parameters:**

- `limit` - Number of recommendations (default: 10)
- `jobId` - Optional: Get recommendations for specific job

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
      "salary": "$100,000 - $150,000",
      "url": "https://...",
      "matchScore": 85,
      "reasons": [
        "Similar role to your application",
        "Matches your skills",
        "Same location preference"
      ]
    }
  ],
  "count": 10,
  "source": "adzuna"
}
```

---

## Usage Examples

### Get Recommendations Based on Application History

```bash
curl -X GET "http://localhost:3001/api/job-recommendations/adzuna?limit=10" \
  -H "Cookie: session_token=your_session_token"
```

### Get Recommendations for Specific Job

```bash
curl -X GET "http://localhost:3001/api/job-recommendations/adzuna?jobId=job-uuid&limit=5" \
  -H "Cookie: session_token=your_session_token"
```

### Frontend Integration

```javascript
// After user applies to a job
async function applyToJob(jobId) {
  // Submit application
  await fetch(`/api/applications/jobs/${jobId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  // Fetch Adzuna recommendations
  const response = await fetch(
    "/api/job-recommendations/adzuna?jobId=" + jobId,
  );
  const data = await response.json();

  // Show recommendations to user
  displayRecommendations(data.recommendations);
}
```

---

## Features

### ✅ Automatic Fetching

- Fetches Adzuna jobs automatically when user applies
- Runs in background (non-blocking)

### ✅ Smart Matching

- Uses AI to calculate match scores
- Considers user's application history
- Provides reasons for each recommendation

### ✅ Revenue Tracking

- Tracks clicks on Adzuna jobs
- Calculates revenue per click
- Supports affiliate tracking

### ✅ Caching

- Caches match scores for 24 hours
- Reduces API calls
- Improves performance

---

## API Endpoints

### Get Adzuna Recommendations

```
GET /api/job-recommendations/adzuna
```

**Query Parameters:**

- `limit` (number, optional) - Max recommendations (default: 10)
- `jobId` (string, optional) - Get recommendations for specific job

**Response:**

- `recommendations` - Array of job recommendations
- `count` - Number of recommendations
- `source` - "adzuna"

---

## Configuration

### Environment Variables

| Variable                   | Description              | Required           |
| -------------------------- | ------------------------ | ------------------ |
| `ADZUNA_APP_ID`            | Adzuna application ID    | Yes                |
| `ADZUNA_API_KEY`           | Adzuna API key           | Yes                |
| `ADZUNA_ENABLED`           | Enable/disable Adzuna    | Yes (true/false)   |
| `ADZUNA_AFFILIATE_ID`      | Affiliate ID for revenue | No                 |
| `ADZUNA_REVENUE_PER_CLICK` | Revenue per click (USD)  | No (default: 0.15) |

---

## Testing

### Test Adzuna Connection

```bash
# Test script (if exists)
npm run test:job-boards
```

### Manual Test

1. Apply to a job via API
2. Check logs for Adzuna fetch
3. Call recommendations endpoint
4. Verify recommendations appear

---

## Troubleshooting

### No Recommendations Appearing

1. **Check API credentials:**

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

4. **Verify Adzuna API:**
   - Test API key at https://developer.adzuna.com/
   - Check API limits/quota

### Recommendations Not Relevant

- Match score threshold is 50% (configurable)
- AI matching may need tuning
- Check user's application history

### API Rate Limits

- Adzuna has rate limits
- Recommendations are cached
- Consider implementing request throttling

---

## Revenue Tracking

When users click on Adzuna job links:

1. **Click tracked** → `/api/job-recommendations/:jobId/click`
2. **Revenue calculated** → Based on `ADZUNA_REVENUE_PER_CLICK`
3. **Stored in database** → `job_clicks` and `revenue_tracking` tables

**View Revenue:**

```
GET /api/job-recommendations/revenue/stats
```

---

## Next Steps

1. ✅ Add Adzuna credentials to `.env.dev`
2. ✅ Restart dev environment
3. ✅ Apply to a test job
4. ✅ Check recommendations endpoint
5. ✅ Integrate into frontend

---

## Summary

**What happens:**

1. User applies to job → System fetches Adzuna jobs
2. Jobs imported → Stored in database
3. Match scores calculated → Using AI
4. Recommendations shown → Via API endpoint

**To use:**

- Add Adzuna credentials
- Apply to jobs
- Call `/api/job-recommendations/adzuna`
- Show recommendations to users

**Revenue:**

- Track clicks on Adzuna jobs
- Earn revenue per click
- View stats via revenue endpoints

See `docs/JOB_RECOMMENDATIONS_MONETIZATION.md` for more details on revenue models.
