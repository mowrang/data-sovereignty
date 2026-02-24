# Adzuna Integration - Quick Setup

## ✅ What You Need

1. **Adzuna API Credentials** (you already signed up!)

   - App ID
   - API Key

2. **Add to `.env.dev`:**

```bash
ADZUNA_APP_ID=your_app_id
ADZUNA_API_KEY=your_api_key
ADZUNA_ENABLED=true
```

## 🚀 How It Works

### When User Applies to a Job:

1. User applies → System automatically fetches Adzuna jobs
2. Jobs imported → Stored in database
3. Match scores calculated → Using AI
4. Recommendations ready → Available via API

### Get Recommendations:

```bash
# Get Adzuna recommendations based on application history
GET /api/job-recommendations/adzuna?limit=10

# Get recommendations for specific job
GET /api/job-recommendations/adzuna?jobId=job-uuid&limit=5
```

## 📋 Setup Steps

### 1. Add Credentials

Edit `.env.dev`:

```bash
ADZUNA_APP_ID=your_app_id_here
ADZUNA_API_KEY=your_api_key_here
ADZUNA_ENABLED=true
ADZUNA_REVENUE_PER_CLICK=0.15
```

### 2. Restart Dev Environment

```bash
npm run dev:down
npm run dev:up
```

### 3. Test

1. Apply to a job via API
2. Check logs: `npm run dev:logs`
3. Call recommendations endpoint
4. See Adzuna jobs!

## 🎯 Usage

**After user applies to a job:**

- System automatically fetches Adzuna jobs in background
- Recommendations available immediately via API
- Jobs matched using AI based on:
  - Job title
  - Description
  - Location
  - User's application history

**Frontend Integration:**

```javascript
// After applying to job
const response = await fetch("/api/job-recommendations/adzuna?jobId=" + jobId);
const { recommendations } = await response.json();
// Show recommendations to user
```

## 📊 Response Format

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
      "reasons": ["Similar role to your application", "Matches your skills"]
    }
  ],
  "count": 10,
  "source": "adzuna"
}
```

## ✅ Done!

That's it! Adzuna integration is ready.

**What happens:**

- User applies → Adzuna jobs fetched automatically
- Recommendations shown → Based on applied jobs
- Revenue tracked → When users click Adzuna links

See `docs/ADZUNA_INTEGRATION.md` for full details.
