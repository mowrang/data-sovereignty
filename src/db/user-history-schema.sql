-- User History Schema
-- Tracks user's job descriptions and resume updates for personalized recommendations

-- User job description history
CREATE TABLE IF NOT EXISTS user_job_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_description TEXT NOT NULL,
    location VARCHAR(255),
    extracted_keywords TEXT[], -- Array of keywords extracted from job description
    resume_updated BOOLEAN DEFAULT false, -- Whether resume was updated for this JD
    resume_document_id VARCHAR(255), -- Google Doc ID of updated resume
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User resume update history
CREATE TABLE IF NOT EXISTS user_resume_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_description_id UUID REFERENCES user_job_descriptions(id) ON DELETE SET NULL,
    original_resume_id VARCHAR(255), -- Original Google Doc ID
    updated_resume_id VARCHAR(255), -- Updated/copied Google Doc ID
    update_type VARCHAR(50) DEFAULT 'job_description', -- 'job_description', 'comments', 'manual'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_job_descriptions_user_id ON user_job_descriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_job_descriptions_created_at ON user_job_descriptions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_resume_updates_user_id ON user_resume_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_resume_updates_job_description_id ON user_resume_updates(job_description_id);
CREATE INDEX IF NOT EXISTS idx_user_resume_updates_created_at ON user_resume_updates(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_job_descriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_job_descriptions_updated_at BEFORE UPDATE ON user_job_descriptions
    FOR EACH ROW EXECUTE FUNCTION update_user_job_descriptions_updated_at();
