# Job Recommendations & Monetization Guide

## Overview

This system provides **AI-powered job recommendations** and **revenue tracking** based on:

1. Jobs users are applying for
2. Similar jobs they might be interested in
3. Click tracking for monetization

## Features

### 1. Job Recommendations

**Based on:**

- User's resume content
- Jobs they've applied to
- Job descriptions and requirements
- AI-powered matching algorithm

**Endpoints:**

- `GET /api/jobs/recommended` - Get recommended jobs
- `GET /api/jobs/similar` - Get similar jobs to ones applied for
- `POST /api/jobs/:jobId/view` - Track job view
- `POST /api/jobs/:jobId/click` - Track external link click (generates revenue)

### 2. Revenue Models

You can monetize jobs in several ways:

#### A. Pay Per Click (PPC)

- **Revenue**: $0.10 - $0.50 per click
- **When**: User clicks external link to job posting
- **Best for**: Job boards, affiliate programs

#### B. Pay Per Apply (PPA)

- **Revenue**: $1.00 - $5.00 per application
- **When**: User applies to job through your platform
- **Best for**: Premium job postings

#### C. Affiliate/Referral

- **Revenue**: Commission-based (10-30% of placement fee)
- **When**: User gets hired through your platform
- **Best for**: Recruiting agencies

#### D. Flat Fee

- **Revenue**: $10 - $50 per job posting
- **When**: Employer posts job
- **Best for**: Job posting marketplace

### 3. Revenue Tracking

**Track:**

- Job views
- Job clicks (external links)
- Applications
- Revenue per job
- Conversion rates

**Analytics:**

- Total revenue
- Revenue per click
- Top performing jobs
- User conversion rates

## Implementation

### Step 1: Update Database Schema

```bash
npm run db:init
```

This adds:

- `revenue_model`, `revenue_per_click`, `revenue_per_apply` to `job_postings`
- `job_clicks` table for tracking
- `revenue_tracking` table for analytics

### Step 2: Add API Routes

```typescript
// In web-ui/server.ts
import jobRecommendationsRouter from "../src/api/job-recommendations.js";

app.use("/api/jobs", authenticate, jobRecommendationsRouter);
```

### Step 3: Configure Revenue Model

When creating a job posting:

```json
{
  "title": "Software Engineer",
  "company": "Tech Corp",
  "description": "...",
  "revenue_model": "pay_per_click",
  "revenue_per_click": 0.25,
  "revenue_per_apply": 2.0,
  "affiliate_id": "affiliate_123"
}
```

## Usage Examples

### For Job Seekers

**Get Recommended Jobs:**

```bash
GET /api/jobs/recommended?limit=10
```

Response:

```json
{
  "recommendations": [
    {
      "jobId": "uuid",
      "matchScore": 85,
      "reasons": [
        "Strong match with your Python experience",
        "Similar to jobs you've applied to",
        "Remote work matches your preferences"
      ],
      "jobTitle": "Senior Python Developer",
      "company": "Tech Corp"
    }
  ]
}
```

**Get Similar Jobs:**

```bash
GET /api/jobs/similar?limit=10
```

Shows jobs similar to ones they've already applied for.

### For Revenue Tracking

**Track Job View:**

```bash
POST /api/jobs/:jobId/view
{
  "source": "recommendation" // or "job_board", "similar_jobs", "search"
}
```

**Track External Link Click (Generates Revenue):**

```bash
POST /api/jobs/:jobId/click
{
  "affiliateId": "optional_affiliate_id"
}
```

### For Analytics

**Get Revenue Stats:**

```bash
GET /api/jobs/revenue/stats?startDate=2026-01-01&endDate=2026-01-31
```

Response:

```json
{
  "totalRevenue": 125.5,
  "totalClicks": 250,
  "totalViews": 1000,
  "conversionRate": 25.0,
  "revenuePerClick": 0.5,
  "period": "2026-01-01 to 2026-01-31"
}
```

**Get Top Performing Jobs:**

```bash
GET /api/jobs/revenue/top-jobs?limit=10
```

## Revenue Calculation

### Example Scenario

**Job Posting:**

- Revenue model: `pay_per_click`
- Revenue per click: $0.25
- Revenue per apply: $2.00

**User Actions:**

1. Views job (recommended) → **$0** (no revenue)
2. Clicks external link → **$0.25** (revenue generated)
3. Applies to job → **$2.00** (additional revenue)

**Total Revenue**: $2.25 per user who applies

### Monthly Revenue Estimate

**For 10 users, each applying to 10 jobs:**

- **Views**: 1000 views (100 per user)
- **Clicks**: 250 clicks (25% conversion)
- **Applications**: 100 applications (10 per user)

**Revenue:**

- Clicks: 250 × $0.25 = **$62.50**
- Applications: 100 × $2.00 = **$200.00**
- **Total: $262.50/month**

**Per User Revenue**: $26.25/user/month

## Integration with Resume Agent

When user clicks "Apply" on a recommended job:

1. **Track the click** (generates revenue)
2. **Automatically create tailored resume** using resume agent
3. **Submit application** with tailored resume
4. **Track application** (additional revenue if PPA model)

**Flow:**

```
User sees recommended job
  ↓
Clicks "View Details" → Track view
  ↓
Clicks "Apply" → Track click ($0.25 revenue)
  ↓
System creates tailored resume (resume agent)
  ↓
Submit application → Track apply ($2.00 revenue)
  ↓
Total: $2.25 revenue per application
```

## Monetization Strategies

### Strategy 1: Free for Users, Charge Employers

- **Users**: Free to browse and apply
- **Employers**: Pay $10-50 per job posting
- **Revenue**: From employers, not users

### Strategy 2: Affiliate Model

- **Users**: Free
- **Employers**: Free to post
- **Revenue**: Commission from job boards (Indeed, LinkedIn, etc.)
- **Example**: $0.25 per click to external job board

### Strategy 3: Premium Features

- **Basic**: Free job browsing
- **Premium**: $10/month for:
  - Unlimited tailored resumes
  - Priority job recommendations
  - Advanced matching

### Strategy 4: Hybrid

- **Free tier**: Limited recommendations
- **Premium tier**: $5/month for unlimited
- **Employer fees**: $20-50 per posting
- **Affiliate revenue**: From external clicks

## Best Practices

1. **Show Recommendations Prominently**

   - Display on dashboard after user applies
   - "Similar jobs you might like"
   - "Recommended for you"

2. **Track Everything**

   - Every view
   - Every click
   - Every application
   - This data is valuable for optimization

3. **Optimize Match Quality**

   - Better matches = more applications = more revenue
   - Use AI to improve matching over time

4. **A/B Test Revenue Models**
   - Test different pricing
   - See what converts best
   - Optimize for maximum revenue

## Cost Considerations

**AI Matching Costs:**

- Uses user's own AI provider (no cost to you)
- Caching reduces API calls
- **Cost: $0** (users pay their providers)

**Database Costs:**

- Minimal storage increase (~$1-2/month)
- Click tracking is lightweight

**Total Additional Cost: ~$1-2/month**

## Revenue Potential

**Conservative Estimate (10 users):**

- 100 applications/month
- $2.00 per application
- **Revenue: $200/month**

**With Growth (100 users):**

- 1000 applications/month
- $2.00 per application
- **Revenue: $2,000/month**

**Plus Employer Fees:**

- 50 job postings/month
- $20 per posting
- **Additional: $1,000/month**

**Total Potential: $3,000/month** (with 100 users)

## Next Steps

1. ✅ Database schema ready
2. ✅ API endpoints ready
3. ✅ Click tracking ready
4. ⏳ Build recommendation UI
5. ⏳ Add revenue dashboard
6. ⏳ Integrate with job board APIs (Indeed, LinkedIn, etc.)
7. ⏳ Set up affiliate programs

See `src/utils/job-matcher.ts` for matching algorithm and `src/utils/job-click-tracker.ts` for revenue tracking.
