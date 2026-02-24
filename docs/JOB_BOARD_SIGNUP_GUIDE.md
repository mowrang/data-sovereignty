# Job Board Signup Guide - Step by Step

## Quick Answer: Which Platforms Can You Sign Up For?

**Easy (Start Here):**

1. ✅ **Adzuna** - Free, instant access
2. ✅ **RemoteOK** - Free, no signup needed
3. ✅ **Juju** - Free, quick approval

**High Revenue (Apply For):** 4. 💰 **Indeed** - $0.25-$0.50 per click 5. 💰💰 **ZipRecruiter** - $0.50-$1.00 per click

**Others:** 6. Careerjet, LinkedIn, Monster, Glassdoor (various requirements)

---

## Detailed Signup Instructions

### 1. Adzuna ⭐ **START HERE** (5 minutes)

**Why:** Easiest, free, instant access

**Steps:**

1. Go to: https://developer.adzuna.com/overview
2. Click "Get Started" or "Sign Up"
3. Enter:
   - Email address
   - Password
   - Name
4. Verify email (check inbox)
5. Log in
6. Go to "My Account" → "API Keys"
7. Copy your:
   - App ID
   - API Key

**Add to .env:**

```bash
ADZUNA_APP_ID=your_app_id_here
ADZUNA_API_KEY=your_api_key_here
ADZUNA_REVENUE_PER_CLICK=0.15
ADZUNA_ENABLED=true
```

**Test:**

```bash
npm run test:job-boards
```

**Time:** 5 minutes  
**Cost:** Free  
**Revenue:** $0.15 per click

---

### 2. Indeed ⭐ **HIGHEST REVENUE** (1-2 weeks)

**Why:** Highest revenue rates, millions of jobs

**Steps:**

1. Go to: https://www.indeed.com/publisher
2. Click "Apply Now" or "Get Started"
3. Fill out application:
   - **Website URL:** Your platform URL
   - **Monthly Traffic:** Estimate (even 100/month helps)
   - **How you'll use jobs:**
     - "Job matching platform"
     - "AI-powered job recommendations"
     - "Resume tailoring service"
   - **Business Type:** Select appropriate
   - **Contact Info:** Your email/phone
4. Submit application
5. Wait for email approval (1-2 weeks)
6. Once approved:
   - Log into Indeed Publisher dashboard
   - Get Publisher ID
   - Get API Key
   - Set up affiliate links

**Add to .env (after approval):**

```bash
INDEED_PUBLISHER_ID=your_publisher_id
INDEED_API_KEY=your_api_key
INDEED_AFFILIATE_ID=your_affiliate_id
INDEED_REVENUE_PER_CLICK=0.25
INDEED_ENABLED=true
```

**Time:** 15 min application + 1-2 weeks approval  
**Cost:** Free  
**Revenue:** $0.25-$0.50 per click

**Tips for Approval:**

- Have a live website
- Show you're providing value to job seekers
- Be professional in application

---

### 3. ZipRecruiter ⭐ **VERY HIGH REVENUE** (1-2 weeks)

**Why:** Highest revenue rates ($0.50-$1.00 per click)

**Steps:**

1. Go to: https://www.ziprecruiter.com/affiliates
2. Click "Join Now" or "Apply"
3. Fill out affiliate application:
   - **Website URL:** Your platform
   - **Traffic:** Monthly visitors
   - **Marketing Plan:** How you'll promote jobs
   - **Business Info:** Company details
4. Submit application
5. Wait for approval email
6. Once approved:
   - Get API access
   - Get affiliate links
   - Set up tracking

**Add to .env (after approval):**

```bash
ZIPRECRUITER_API_KEY=your_api_key
ZIPRECRUITER_AFFILIATE_ID=your_affiliate_id
ZIPRECRUITER_REVENUE_PER_CLICK=0.50
ZIPRECRUITER_ENABLED=true
```

**Time:** 20 min application + approval time  
**Cost:** Free  
**Revenue:** $0.50-$1.00 per click (highest!)

---

### 4. RemoteOK (No Signup Needed!)

**Why:** Free, no signup, remote jobs only

**Steps:**

1. Go to: https://remoteok.io/api
2. That's it! No signup needed
3. Use API directly

**Usage:**

```typescript
// Direct API call (no auth needed)
const response = await fetch("https://remoteok.io/api");
const jobs = await response.json();
```

**Note:** No affiliate program (free API, no revenue)

**Time:** 0 minutes  
**Cost:** Free  
**Revenue:** $0 (no affiliate program)

---

### 5. Juju (Quick Approval)

**Why:** Easy approval, aggregates multiple sources

**Steps:**

1. Go to: https://www.juju.com/publishers/apply
2. Fill out application form
3. Submit
4. Wait for approval (usually quick)
5. Get API access

**Time:** 10 min + quick approval  
**Cost:** Free  
**Revenue:** ~$0.10-$0.30 per click

---

### 6. Careerjet (International)

**Why:** Good for international jobs

**Steps:**

1. Go to: https://www.careerjet.com/partners/apply
2. Fill out partner application
3. Submit
4. Wait for approval
5. Get API access

**Time:** 10 min + approval  
**Cost:** Free  
**Revenue:** ~$0.10-$0.30 per click

---

## Complete .env Configuration

Once you've signed up for platforms, add to `.env`:

```bash
# Adzuna (Start here - easiest)
ADZUNA_APP_ID=your_app_id
ADZUNA_API_KEY=your_api_key
ADZUNA_REVENUE_PER_CLICK=0.15
ADZUNA_ENABLED=true

# Indeed (Apply for - highest revenue)
INDEED_PUBLISHER_ID=your_publisher_id
INDEED_API_KEY=your_api_key
INDEED_AFFILIATE_ID=your_affiliate_id
INDEED_REVENUE_PER_CLICK=0.25
INDEED_ENABLED=true

# ZipRecruiter (Apply for - very high revenue)
ZIPRECRUITER_API_KEY=your_api_key
ZIPRECRUITER_AFFILIATE_ID=your_affiliate_id
ZIPRECRUITER_REVENUE_PER_CLICK=0.50
ZIPRECRUITER_ENABLED=true

# Juju (Optional)
JUJU_API_KEY=your_api_key
JUJU_ENABLED=true

# Careerjet (Optional)
CAREERJET_API_KEY=your_api_key
CAREERJET_ENABLED=true
```

---

## Testing Your Integrations

After adding API keys:

```bash
# Test all job board integrations
npm run test:job-boards
```

This will:

- Test each platform
- Show how many jobs found
- Verify API keys work
- Show revenue potential

---

## Recommended Signup Timeline

### Week 1: Quick Wins

- ✅ **Day 1:** Sign up for Adzuna (5 min)
- ✅ **Day 1:** Test RemoteOK API (no signup)
- ✅ **Day 2:** Apply for Indeed (15 min)
- ✅ **Day 3:** Apply for ZipRecruiter (20 min)

### Week 2-3: Wait for Approvals

- ⏳ Wait for Indeed approval
- ⏳ Wait for ZipRecruiter approval
- ✅ Use Adzuna in the meantime

### Week 4: Add Approved Platforms

- ✅ Add Indeed API keys
- ✅ Add ZipRecruiter API keys
- ✅ Test all integrations

---

## Revenue Comparison

| Platform         | Signup Time | Approval Time | Revenue/Click | Monthly Potential\* |
| ---------------- | ----------- | ------------- | ------------- | ------------------- |
| **Adzuna**       | 5 min       | Instant       | $0.15         | $150                |
| **Indeed**       | 15 min      | 1-2 weeks     | $0.25-$0.50   | $250-$500           |
| **ZipRecruiter** | 20 min      | 1-2 weeks     | $0.50-$1.00   | $500-$1,000         |
| **Juju**         | 10 min      | Quick         | $0.10-$0.30   | $100-$300           |
| **Careerjet**    | 10 min      | Quick         | $0.10-$0.30   | $100-$300           |

\*Based on 1,000 clicks/month

---

## Troubleshooting

### "API key invalid"

- Double-check API key in .env
- Make sure no extra spaces
- Verify key is active in platform dashboard

### "No jobs found"

- Check search query (try "software engineer")
- Check location format
- Verify API is enabled in .env

### "Approval pending"

- Indeed/ZipRecruiter require approval
- Wait 1-2 weeks
- Check email for updates
- Use Adzuna in the meantime

---

## Summary

**Start Today:**

1. ✅ **Adzuna** - https://developer.adzuna.com/ (5 min, free)
2. ✅ **RemoteOK** - https://remoteok.io/api (0 min, free, no signup)

**Apply This Week:** 3. 💰 **Indeed** - https://www.indeed.com/publisher (highest revenue) 4. 💰💰 **ZipRecruiter** - https://www.ziprecruiter.com/affiliates (very high revenue)

**Total Potential:**

- 3-4 platforms × 1,000 clicks = **$400-$800/month**
- Plus direct employer postings = **$1,400-$1,800/month**

See `docs/JOB_BOARD_PLATFORMS.md` for complete list of all platforms!
