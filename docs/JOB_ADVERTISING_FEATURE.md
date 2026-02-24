# Job Advertising Feature

## Overview

Yes, you can add job advertising functionality to the app! This would allow:

- **Employers/Recruiters** to post job listings
- **Job Seekers** to browse and discover jobs
- **Automatic matching** between resumes and job postings
- **One-click resume tailoring** for specific jobs

## Feature Design

### User Roles

1. **Job Seeker** (current user type)

   - Browse jobs
   - Apply with tailored resume
   - Get job recommendations

2. **Employer/Recruiter** (new user type)
   - Post job listings
   - View applications
   - Manage job postings

### Database Schema

```sql
-- Job postings table
CREATE TABLE IF NOT EXISTS job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    location VARCHAR(255),
    remote BOOLEAN DEFAULT false,
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency VARCHAR(10) DEFAULT 'USD',
    employment_type VARCHAR(50), -- 'full-time', 'part-time', 'contract', 'internship'
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'closed', 'draft'
    application_url VARCHAR(500),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job applications table
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_doc_id VARCHAR(255), -- Google Doc ID of tailored resume
    resume_url VARCHAR(500),
    cover_letter TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewed', 'interview', 'rejected', 'accepted'
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_posting_id, applicant_id) -- One application per job per user
);

-- Job matching scores (for recommendations)
CREATE TABLE IF NOT EXISTS job_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_score DECIMAL(5,2), -- 0-100 score
    match_reasons TEXT[], -- Array of reasons for match
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_posting_id, user_id)
);

-- User roles table
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_role VARCHAR(50) DEFAULT 'job_seeker';
-- Values: 'job_seeker', 'employer', 'admin'

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_postings_employer ON job_postings(employer_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_expires ON job_postings(expires_at);
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_user ON job_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_score ON job_matches(match_score DESC);
```

## API Endpoints

### Job Postings

```
GET    /api/jobs                    # List all active jobs (with pagination, filters)
GET    /api/jobs/:id                # Get job details
POST   /api/jobs                    # Create job posting (employer only)
PUT    /api/jobs/:id                # Update job posting (employer only)
DELETE /api/jobs/:id                # Delete job posting (employer only)
GET    /api/jobs/my-postings        # Get employer's job postings
GET    /api/jobs/recommended        # Get recommended jobs for user
```

### Job Applications

```
POST   /api/jobs/:id/apply         # Apply to job (creates tailored resume)
GET    /api/jobs/:id/applications  # Get applications for job (employer only)
GET    /api/applications/my        # Get user's applications
PUT    /api/applications/:id/status # Update application status (employer only)
```

## Implementation Plan

### Phase 1: Database & Basic API (Week 1)

1. Add database schema
2. Create job posting API endpoints
3. Add user role management
4. Basic CRUD operations

### Phase 2: Job Board UI (Week 2)

1. Job listing page
2. Job detail page
3. Job posting form (for employers)
4. Application management UI

### Phase 3: Resume Matching (Week 3)

1. AI-powered job matching algorithm
2. Recommendation engine
3. Match score calculation
4. "Apply with tailored resume" feature

### Phase 4: Advanced Features (Week 4)

1. Job search and filters
2. Email notifications
3. Application tracking
4. Analytics dashboard

## Cost Implications

### Additional AWS Costs

- **Database Storage**: ~$1-2/month (minimal increase)
- **Compute**: No increase (same workload)
- **Total**: **+$1-2/month**

### Revenue Opportunities

- **Job Posting Fees**: $10-50 per job posting
- **Premium Features**: $20-50/month for employers
- **Application Fees**: Optional per-application fee

## Example Usage Flow

### For Employers:

1. Sign up as "Employer"
2. Post job listing with description
3. Receive applications with tailored resumes
4. Review and manage applications

### For Job Seekers:

1. Browse job board
2. See recommended jobs based on resume
3. Click "Apply" → System automatically tailors resume
4. Submit application with tailored resume

## Integration with Existing Features

The job advertising feature integrates seamlessly:

1. **Resume Agent**: Used to tailor resumes for specific jobs
2. **User System**: Same authentication, different roles
3. **AI Matching**: Uses user's AI provider for job matching
4. **Google Docs**: Stores tailored resumes for applications

## Next Steps

See implementation files:

- `src/db/jobs-schema.sql` - Database schema
- `src/api/jobs.ts` - Job posting API
- `src/api/applications.ts` - Application API
- `src/utils/job-matcher.ts` - AI job matching
- `web-ui/job-board/` - Job board UI components
