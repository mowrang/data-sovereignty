# Job Sources & Revenue - Quick Start

## The Big Question: Where Do Jobs Come From?

### Answer: You Have 3 Options

---

## Option 1: Direct Employer Postings 💰💰💰 **START HERE**

**What it is:**

- Employers post jobs directly to YOUR platform
- They pay YOU to post jobs
- You control everything

**Who pays:** **Employers pay YOU**

**Payment options:**

- $10-$50 per job posting (one-time)
- OR $1-$5 per application received
- OR $50-$200/month subscription (unlimited jobs)

**How to set up:**

1. ✅ Already built! Employers can post via `POST /api/jobs`
2. Add payment processing (Stripe/PayPal)
3. Create employer signup page
4. Market to employers

**Revenue example:**

- 10 employers × 5 jobs/month × $20 = **$1,000/month**

**Pros:**

- ✅ Highest revenue per job
- ✅ Full control
- ✅ Direct relationships

**Cons:**

- ⚠️ Need to attract employers
- ⚠️ Requires marketing

---

## Option 2: External Job Board APIs 🔗 **ADD LATER**

**What it is:**

- Pull jobs from Indeed, LinkedIn, ZipRecruiter, etc.
- Show their jobs on your platform
- Earn affiliate revenue when users click

**Who pays:** **Job boards pay YOU** (affiliate commission)

**Payment:**

- $0.10-$0.50 per click
- Set by job board (you don't control)

**How to set up:**

### Step 1: Sign Up for Affiliate Programs

**Indeed:**

1. Go to: https://www.indeed.com/publisher
2. Apply for publisher account
3. Get API key + affiliate ID
4. Revenue: ~$0.25 per click

**Adzuna (Easiest):**

1. Go to: https://developer.adzuna.com/
2. Sign up (free)
3. Get API key
4. Revenue: ~$0.15 per click

**ZipRecruiter:**

1. Go to: https://www.ziprecruiter.com/affiliates
2. Apply for affiliate program
3. Get API access
4. Revenue: ~$0.50 per click

### Step 2: Add Environment Variables

```bash
# Indeed
INDEED_PUBLISHER_ID=your_publisher_id
INDEED_API_KEY=your_api_key
INDEED_AFFILIATE_ID=your_affiliate_id
INDEED_REVENUE_PER_CLICK=0.25
INDEED_ENABLED=true

# Adzuna
ADZUNA_APP_ID=your_app_id
ADZUNA_API_KEY=your_api_key
ADZUNA_REVENUE_PER_CLICK=0.15
ADZUNA_ENABLED=true
```

### Step 3: Use Integration Service

```typescript
import { jobBoardIntegrator } from "./src/integrations/job-boards.js";

// Search and import jobs
const jobs = await jobBoardIntegrator.searchAll(
  "software engineer",
  "San Francisco, CA",
  50,
);

// Import to database
await jobBoardIntegrator.importJobsToDatabase(jobs, systemUserId);
```

**Revenue example:**

- 1,000 clicks/month × $0.25 = **$250/month**

**Pros:**

- ✅ Millions of jobs instantly
- ✅ No employer acquisition needed
- ✅ Always fresh listings

**Cons:**

- ⚠️ Lower revenue per job
- ⚠️ Users redirected away
- ⚠️ Depend on external APIs

---

## Option 3: Hybrid 💰💰💰💰 **BEST FOR MAXIMUM REVENUE**

**What it is:**

- Mix of direct postings + external jobs
- Show both types together
- Multiple revenue streams

**Who pays:** **Both employers AND job boards**

**Revenue:**

- Direct postings: $1-$5 per application
- External jobs: $0.10-$0.50 per click
- **Total: Maximum revenue**

**Revenue example:**

- Direct: 50 jobs × $20 = **$1,000**
- External: 1,000 clicks × $0.25 = **$250**
- **Total: $1,250/month**

---

## Recommended Path

### Month 1-3: Direct Postings Only

**Why:**

- Start simple
- Higher revenue
- Build employer base

**Steps:**

1. ✅ Use existing job posting API
2. Add Stripe/PayPal payment
3. Create employer signup
4. Get first 5-10 employers

**Goal:** $500-$1,000/month revenue

---

### Month 4+: Add External Jobs

**Why:**

- More jobs = better UX
- Additional revenue stream
- Scale faster

**Steps:**

1. Sign up for Indeed/Adzuna affiliate
2. Integrate APIs (code provided)
3. Sync jobs daily
4. Show alongside direct postings

**Goal:** $1,250+/month revenue

---

## Who Actually Pays?

### Direct Postings:

```
Employer → Posts job → Pays YOU $20
User → Applies → Employer gets applicant
You keep: $20 (or $2 per application)
```

### External Jobs:

```
Job Board (Indeed) → Provides jobs → Pays YOU $0.25 per click
User → Clicks job → Goes to Indeed
You keep: $0.25 (affiliate commission)
```

### Hybrid:

```
Direct: Employer pays YOU
External: Job board pays YOU
You keep: Both!
```

---

## Quick Setup: Direct Postings

### 1. Add Payment Processing

```typescript
// Install Stripe
npm install stripe

// In job posting API
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// When employer posts job
const charge = await stripe.charges.create({
  amount: 2000, // $20.00
  currency: 'usd',
  source: paymentToken,
  description: `Job posting: ${jobTitle}`
});

// Then create job posting
await createJobPosting(jobData);
```

### 2. Create Employer Signup

```typescript
// Add to auth server
app.post("/auth/employer/signup", async (req, res) => {
  const { email, name, company } = req.body;

  // Create user with employer role
  const user = await db.createOrUpdateUser(email, name, null, null);
  await db.updateUserRole(user.id, "employer");

  res.json({ success: true, userId: user.id });
});
```

### 3. Job Posting Form

Create a form where employers can:

- Enter job details
- Upload company logo
- Pay via Stripe
- Submit job

---

## Quick Setup: External Jobs

### 1. Sign Up for Adzuna (Easiest)

1. Go to: https://developer.adzuna.com/
2. Sign up (free)
3. Get App ID and API Key
4. Add to `.env`:

```bash
ADZUNA_APP_ID=your_app_id
ADZUNA_API_KEY=your_api_key
ADZUNA_REVENUE_PER_CLICK=0.15
ADZUNA_ENABLED=true
```

### 2. Sync Jobs Daily

```typescript
// Create cron job or scheduled task
import { jobBoardIntegrator } from "./src/integrations/job-boards.js";

// Run daily
async function syncJobs() {
  const jobs = await jobBoardIntegrator.syncJobs(
    "software engineer",
    "San Francisco, CA",
  );
  console.log(`Synced ${jobs} jobs`);
}

// Schedule to run daily at 2 AM
setInterval(syncJobs, 24 * 60 * 60 * 1000);
```

---

## Revenue Comparison

| Model             | Jobs/Month | Revenue/Month | Effort                |
| ----------------- | ---------- | ------------- | --------------------- |
| **Direct Only**   | 50         | $1,000        | High (need employers) |
| **External Only** | 1,000+     | $250          | Low (just API)        |
| **Hybrid**        | 1,050+     | $1,250        | Medium (both)         |

---

## Summary

**Where jobs come from:**

1. ✅ **Direct postings** - Employers post to your platform
2. ✅ **External APIs** - Pull from Indeed, Adzuna, etc.
3. ✅ **Hybrid** - Both (recommended)

**Who pays:**

1. **Direct:** Employers pay YOU ($10-$50 per job)
2. **External:** Job boards pay YOU ($0.10-$0.50 per click)
3. **Hybrid:** Both pay YOU (maximum revenue)

**Start with:** Direct postings (higher revenue)  
**Add later:** External jobs (more jobs, additional revenue)

**Files created:**

- ✅ `src/integrations/job-boards.ts` - External job board integration
- ✅ `docs/JOB_SOURCES_REVENUE_MODELS.md` - Complete guide

See implementation files for code examples!
