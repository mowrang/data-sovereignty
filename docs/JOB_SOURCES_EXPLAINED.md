# Job Sources & Who Pays - Explained Simply

## The Two Questions Answered

### 1. Where Do Jobs Come From?

You have **2 main options**:

---

## Option A: Direct Employer Postings 💰💰💰

**What it means:**

- Employers (companies, recruiters) post jobs directly to YOUR website
- They create an account, fill out a form, and post jobs
- You control the job listings

**Example:**

```
Tech Corp → Signs up → Posts "Software Engineer" job → Pays you $20
```

**Who posts:**

- Real employers/companies
- Recruiters
- HR departments

**How to get them:**

- Market your platform to employers
- Offer free trial postings
- Build relationships

**Revenue:** **Employers pay YOU**

- $10-$50 per job posting
- OR $1-$5 per application received
- YOU set the price

---

## Option B: External Job Board APIs 🔗

**What it means:**

- Pull jobs from big job boards (Indeed, LinkedIn, ZipRecruiter)
- Show their jobs on your platform
- Users click → Go to their site → They pay you commission

**Example:**

```
Indeed has 1M jobs → You pull 100 jobs → User clicks → Indeed pays you $0.25
```

**Who posts:**

- Jobs are already on Indeed/LinkedIn/etc.
- You just show them on your site

**How to get them:**

- Sign up for affiliate programs (free)
- Get API access
- Pull jobs automatically

**Revenue:** **Job boards pay YOU** (affiliate commission)

- $0.10-$0.50 per click
- THEY set the price (you don't control)
- Lower revenue per job, but millions of jobs available

---

## Option C: Hybrid (Both) 💰💰💰💰 **RECOMMENDED**

**What it means:**

- Show BOTH direct postings AND external jobs
- Mix them together
- Multiple revenue streams

**Example:**

```
Your platform shows:
- 50 direct postings (employers pay you $20 each = $1,000)
- 1,000 external jobs (job boards pay you $0.25 per click = $250)
Total: $1,250/month
```

---

## 2. Who Pays for Clicks and Applications?

### Scenario 1: Direct Employer Postings

**Who pays:** **Employers pay YOU**

**Payment options:**

**A. Pay Per Posting:**

```
Employer posts job → Pays you $20 (one-time)
User applies → Employer gets applicant
You keep: $20
```

**B. Pay Per Application:**

```
Employer posts job → Free to post
User applies → Employer pays you $2 per application
You keep: $2 per application
```

**C. Subscription:**

```
Employer pays $100/month → Unlimited job postings
You keep: $100/month per employer
```

**You control:** Pricing, terms, everything

---

### Scenario 2: External Job Boards

**Who pays:** **Job boards pay YOU** (affiliate commission)

**How it works:**

```
1. You sign up for Indeed affiliate program (free)
2. They give you API access + affiliate links
3. User clicks job → Goes to Indeed website
4. Indeed pays you: $0.25 per click
```

**You control:** Nothing (they set the rates)

**Affiliate rates:**

- Indeed: ~$0.25 per click
- Adzuna: ~$0.15 per click
- ZipRecruiter: ~$0.50 per click

---

## Real-World Example

### Direct Postings Only:

**Setup:**

- 10 employers sign up
- Each posts 5 jobs/month
- You charge $20 per job

**Revenue:**

- 10 employers × 5 jobs × $20 = **$1,000/month**
- **Employers pay YOU**

**OR:**

- Charge $2 per application
- 500 applications/month × $2 = **$1,000/month**
- **Employers pay YOU**

---

### External Jobs Only:

**Setup:**

- Sign up for Indeed affiliate (free)
- Pull 1,000 jobs/month
- Users click 1,000 times

**Revenue:**

- 1,000 clicks × $0.25 = **$250/month**
- **Indeed pays YOU** (affiliate commission)

---

### Hybrid (Both):

**Setup:**

- 10 employers post 50 jobs ($1,000)
- Pull 1,000 external jobs (1,000 clicks = $250)

**Revenue:**

- Direct: **$1,000/month** (employers pay you)
- External: **$250/month** (job boards pay you)
- **Total: $1,250/month** (both pay you!)

---

## Which Should You Choose?

### Start with: Direct Postings

**Why:**

- Higher revenue per job
- Full control
- Build employer relationships

**How:**

1. ✅ Already built! Use `POST /api/jobs`
2. Add payment (Stripe/PayPal)
3. Create employer signup page
4. Get first 5-10 employers

**Revenue:** $500-$1,000/month (with 10-20 employers)

---

### Add later: External Jobs

**Why:**

- More jobs = better user experience
- Additional revenue stream
- No employer acquisition needed

**How:**

1. Sign up for Adzuna (easiest, free)
2. Use integration code provided
3. Sync jobs daily
4. Show alongside direct postings

**Revenue:** +$250-$500/month (additional)

---

## Quick Comparison

| Source       | Who Pays   | Revenue/Job | Effort | Jobs Available           |
| ------------ | ---------- | ----------- | ------ | ------------------------ |
| **Direct**   | Employers  | $20-$50     | High   | Limited (need employers) |
| **External** | Job boards | $0.25/click | Low    | Millions                 |
| **Hybrid**   | Both       | Both        | Medium | Millions + Direct        |

---

## Summary

**Where jobs come from:**

1. ✅ **Direct postings** - Employers post to your platform
2. ✅ **External APIs** - Pull from Indeed, Adzuna, etc.
3. ✅ **Hybrid** - Both (recommended)

**Who pays:**

1. **Direct:** Employers pay YOU ($10-$50 per job or $1-$5 per application)
2. **External:** Job boards pay YOU ($0.10-$0.50 per click via affiliate)
3. **Hybrid:** Both pay YOU (maximum revenue)

**Start with:** Direct postings (higher revenue, more control)  
**Add later:** External jobs (more jobs, additional revenue)

**Files created:**

- ✅ `src/integrations/job-boards.ts` - External job board integration
- ✅ `docs/JOB_SOURCES_REVENUE_MODELS.md` - Complete guide
- ✅ `docs/JOB_SOURCES_QUICK_START.md` - Setup instructions

See the quick start guide for step-by-step setup!
