# Job Advertising Feature - Quick Start

## Can You Advertise Jobs? **Yes!**

The app can be extended to support job advertising. Here's what you need to know:

## What's Included

✅ **Database Schema** - Ready to use  
✅ **API Endpoints** - Job posting and application management  
✅ **Integration** - Works with existing resume agent

## Quick Setup

### 1. Initialize Database Schema

```bash
# Run the jobs schema migration
psql -U langgraph -d langgraph -f src/db/jobs-schema.sql
```

Or use the database client:

```typescript
import { db } from "./src/db/client.js";
// Add method to initialize jobs schema
await db.initializeJobsSchema();
```

### 2. Add API Routes to Web UI Server

```typescript
// In web-ui/server.ts
import jobsRouter from "../src/api/jobs.js";
import applicationsRouter from "../src/api/applications.js";

app.use("/api/jobs", authenticate, jobsRouter);
app.use("/api/applications", authenticate, applicationsRouter);
```

### 3. Update User Role

To make a user an employer:

```sql
UPDATE users SET user_role = 'employer' WHERE email = 'employer@example.com';
```

## Usage Examples

### For Employers

**Post a Job:**

```bash
POST /api/jobs
{
  "title": "Senior Software Engineer",
  "company": "Tech Corp",
  "description": "We're looking for...",
  "requirements": "5+ years experience...",
  "location": "San Francisco, CA",
  "remote": true,
  "salaryMin": 150000,
  "salaryMax": 200000,
  "employmentType": "full-time"
}
```

**View Applications:**

```bash
GET /api/jobs/:jobId/applications
```

### For Job Seekers

**Browse Jobs:**

```bash
GET /api/jobs?page=1&limit=20&status=active
```

**Apply to Job (automatically creates tailored resume):**

```bash
POST /api/jobs/:jobId/apply
{
  "coverLetter": "I'm interested in..."
}
```

**View My Applications:**

```bash
GET /api/applications/my
```

## Features

1. **Job Posting Management**

   - Create, update, delete job postings
   - Set expiration dates
   - Track application counts

2. **Automatic Resume Tailoring**

   - When user applies, system automatically creates tailored resume
   - Uses existing resume agent
   - Saves tailored resume to Google Docs

3. **Application Tracking**

   - Employers can see all applications
   - Update application status
   - Job seekers can track their applications

4. **Future Enhancements**
   - AI-powered job matching
   - Email notifications
   - Job recommendations
   - Search and filters

## Cost Impact

**Additional AWS Costs: ~$1-2/month**

- Minimal database storage increase
- No compute increase

## Revenue Opportunities

- **Job Posting Fee**: $10-50 per posting
- **Premium Employer Account**: $20-50/month
- **Featured Listings**: $5-10 per job

## Next Steps

1. ✅ Database schema is ready
2. ✅ API endpoints are ready
3. ⏳ Build job board UI (see `web-ui/job-board/` directory)
4. ⏳ Add job matching algorithm
5. ⏳ Add email notifications

See `docs/JOB_ADVERTISING_FEATURE.md` for complete documentation.
