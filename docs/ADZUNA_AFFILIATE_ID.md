# What is ADZUNA_AFFILIATE_ID?

## Quick Answer

**`ADZUNA_AFFILIATE_ID`** is your **affiliate/referral ID** from Adzuna. It's used to:

1. **Track clicks** - Adzuna knows traffic came from your site
2. **Earn revenue** - You get paid when users click Adzuna job links
3. **Analytics** - Track which clicks generate revenue

---

## How It Works

### 1. **URL Tracking**

When a user clicks on an Adzuna job link, your affiliate ID is added to the URL:

**Original URL:**

```
https://www.adzuna.com/jobs/details/123456
```

**With Affiliate ID:**

```
https://www.adzuna.com/jobs/details/123456?affid=YOUR_AFFILIATE_ID
```

### 2. **Revenue Tracking**

- Adzuna tracks clicks with your affiliate ID
- You earn revenue per click (set by `ADZUNA_REVENUE_PER_CLICK`)
- Revenue is tracked in your database

### 3. **Database Storage**

The affiliate ID is stored in:

- `job_postings.affiliate_id` - Per job
- `job_clicks.affiliate_id` - Per click
- Used for revenue calculation and reporting

---

## Where to Get It

### Option 1: Adzuna Affiliate Program

1. **Sign up for Adzuna Affiliate Program**

   - Visit: https://www.adzuna.com/affiliates (if available)
   - Or contact: info@adzuna.com
   - Ask about their affiliate/referral program

2. **Get Your Affiliate ID**
   - They'll provide you with an affiliate ID
   - Format: Usually a string like `"abc123"` or `"your-site-name"`

### Option 2: Adzuna API Partnership

If you're using Adzuna API with commercial partnership:

- Your affiliate ID might be your API key or a separate ID
- Contact Adzuna support to get your affiliate ID
- Email: info@adzuna.com

### Option 3: Not Required (Optional)

**You can leave it blank** if:

- You're just testing
- You don't have an affiliate account yet
- You're not monetizing clicks yet

**What happens without it:**

- Jobs still work fine
- Links work normally
- You just won't earn affiliate revenue
- You won't track which clicks came from your site

---

## Configuration

### In `.env.dev`:

```bash
# Optional - only if you have an Adzuna affiliate account
ADZUNA_AFFILIATE_ID=your_affiliate_id_here
```

**Example:**

```bash
ADZUNA_AFFILIATE_ID=abirad-com
# or
ADZUNA_AFFILIATE_ID=abc123xyz
```

---

## How It's Used in Code

### 1. **Job URL Generation**

When Adzuna jobs are imported, affiliate ID is added to URLs:

```typescript
// In job-boards.ts
affiliateUrl: config.affiliateId
  ? `${job.redirect_url}?affid=${config.affiliateId}`
  : job.redirect_url;
```

### 2. **Revenue Tracking**

When users click links, affiliate ID is stored:

```typescript
// In job-click-tracker.ts
await pool.query(
  `UPDATE job_clicks
   SET revenue = $1, affiliate_id = $2
   WHERE ...`,
  [revenue, affiliateId || null, ...]
);
```

### 3. **Database Storage**

Stored in `job_postings` table:

```sql
affiliate_id VARCHAR(255) -- Your Adzuna affiliate ID
```

---

## Revenue Model

### With Affiliate ID:

**Pay-Per-Click (PPC):**

- User clicks Adzuna job link
- Adzuna tracks click via affiliate ID
- You earn: `ADZUNA_REVENUE_PER_CLICK` (default: $0.15)
- Revenue tracked in database

**Example:**

- 100 clicks/day × $0.15 = **$15/day**
- 1,000 clicks/month × $0.15 = **$150/month**

### Without Affiliate ID:

- Links work normally
- No revenue tracking
- No affiliate commission
- Still useful for user experience

---

## Is It Required?

**No, it's optional!**

**Use it if:**

- ✅ You have an Adzuna affiliate account
- ✅ You want to earn revenue from clicks
- ✅ You want to track which clicks came from your site

**Don't use it if:**

- ⏳ You're just testing
- ⏳ You don't have an affiliate account yet
- ⏳ You're not monetizing clicks

---

## How to Get Started

### Step 1: Contact Adzuna

**Email:** info@adzuna.com

**Ask:**

- "I'm using the Adzuna API and want to monetize clicks"
- "Do you have an affiliate/referral program?"
- "How do I get an affiliate ID?"

### Step 2: Add to Environment

Once you have your affiliate ID:

```bash
# In .env.dev
ADZUNA_AFFILIATE_ID=your_affiliate_id
```

### Step 3: Restart Services

```bash
npm run dev:down
npm run dev:up
```

### Step 4: Verify

Check that affiliate URLs are generated:

```bash
# Check a job URL - should have ?affid=YOUR_ID
GET /api/job-recommendations/adzuna
```

---

## Example

**Without Affiliate ID:**

```json
{
  "url": "https://www.adzuna.com/jobs/details/123456",
  "affiliateUrl": "https://www.adzuna.com/jobs/details/123456"
}
```

**With Affiliate ID:**

```json
{
  "url": "https://www.adzuna.com/jobs/details/123456",
  "affiliateUrl": "https://www.adzuna.com/jobs/details/123456?affid=abirad-com"
}
```

---

## Summary

**`ADZUNA_AFFILIATE_ID`** = Your referral/affiliate ID from Adzuna

**Purpose:**

- Track clicks from your site
- Earn revenue per click
- Analytics and reporting

**Required:** No (optional)

**How to get:** Contact Adzuna (info@adzuna.com)

**Default:** Leave blank if you don't have one yet

---

## Related

- `ADZUNA_REVENUE_PER_CLICK` - Revenue per click (default: $0.15)
- Revenue tracking - See `docs/JOB_RECOMMENDATIONS_MONETIZATION.md`
- Affiliate programs - See `docs/JOB_SOURCES_REVENUE_MODELS.md`
