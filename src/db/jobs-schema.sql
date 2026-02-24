-- Job Advertising Feature Database Schema
-- Extends the existing user management schema

-- User roles: add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_role VARCHAR(50) DEFAULT 'job_seeker';
-- Values: 'job_seeker', 'employer', 'admin'

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
    -- Revenue tracking fields
    revenue_model VARCHAR(50) DEFAULT 'pay_per_click', -- 'pay_per_click', 'pay_per_apply', 'affiliate', 'flat_fee'
    revenue_per_click DECIMAL(10,2) DEFAULT 0.10, -- Revenue per click in USD
    revenue_per_apply DECIMAL(10,2) DEFAULT 1.00, -- Revenue per application in USD
    affiliate_id VARCHAR(255), -- Affiliate/referral ID
    view_count INTEGER DEFAULT 0, -- Track views for analytics
    -- External job board fields
    source VARCHAR(50) DEFAULT 'direct', -- 'direct', 'indeed', 'adzuna', 'ziprecruiter', etc.
    external_id VARCHAR(255), -- ID from external job board
    external_url VARCHAR(500), -- Original URL from external source
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

-- Job click tracking (for revenue and analytics)
CREATE TABLE IF NOT EXISTS job_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    click_type VARCHAR(50) NOT NULL, -- 'view', 'apply', 'external_link', 'recommended_view'
    source VARCHAR(50), -- 'job_board', 'recommendation', 'similar_jobs', 'search', 'external'
    revenue DECIMAL(10,2) DEFAULT 0, -- Revenue generated from this click
    affiliate_id VARCHAR(255), -- Affiliate/referral ID
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Revenue tracking (aggregated daily)
CREATE TABLE IF NOT EXISTS revenue_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
    click_type VARCHAR(50) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE(job_posting_id, date, click_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_postings_employer ON job_postings(employer_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_expires ON job_postings(expires_at);
CREATE INDEX IF NOT EXISTS idx_job_postings_created ON job_postings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_postings_revenue ON job_postings(revenue_per_click DESC, revenue_per_apply DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON job_applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_matches_user ON job_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_score ON job_matches(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_job_matches_job ON job_matches(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_clicks_user ON job_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_job_clicks_job ON job_clicks(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_clicks_timestamp ON job_clicks(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_job_clicks_revenue ON job_clicks(revenue DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_tracking_date ON revenue_tracking(date DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_tracking_job ON revenue_tracking(job_posting_id);

-- Trigger to update updated_at for job_postings
CREATE TRIGGER update_job_postings_updated_at BEFORE UPDATE ON job_postings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at for job_applications
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON job_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically expire old job postings
CREATE OR REPLACE FUNCTION expire_old_jobs()
RETURNS void AS $$
BEGIN
    UPDATE job_postings
    SET status = 'closed'
    WHERE expires_at < CURRENT_TIMESTAMP
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run expire_old_jobs() daily
-- This can be done via pg_cron extension or external cron job
