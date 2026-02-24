# User History Tracking & Recommendations

## Overview

The system automatically tracks user's job descriptions and resume updates to provide personalized job recommendations based on their history. **No username/password needed** - users are identified via Google OAuth (which creates a user_id automatically).

## How User ID is Created

### Current System (Google OAuth)

1. **User clicks "Setup Data Sources"**
2. **Redirected to Google OAuth**
3. **User grants permissions**
4. **System automatically:**
   - Creates user_id (UUID) in database
   - Uses email as unique identifier
   - Stores Google refresh token (encrypted)
   - Creates session cookie
   - **No username/password required!**

### User Creation Flow

```typescript
// In auth-server.ts
const user = await db.createOrUpdateUser(
  email, // From Google OAuth
  name, // From Google OAuth
  googleId, // From Google OAuth
  refreshToken, // From Google OAuth
);

// User ID is automatically generated as UUID
// user.id = "550e8400-e29b-41d4-a716-446655440000"
```

## User History Tracking

### What Gets Tracked

1. **Job Descriptions**: Every job description user updates resume for
2. **Resume Updates**: When resume is updated/copied
3. **Keywords**: Extracted keywords from job descriptions
4. **Locations**: Location mentioned in job descriptions
5. **Timestamps**: When each update happened

### Database Schema

```sql
-- Job descriptions user has worked with
user_job_descriptions (
  id, user_id, job_description, location,
  extracted_keywords, resume_updated, resume_document_id,
  created_at, updated_at
)

-- Resume update history
user_resume_updates (
  id, user_id, job_description_id,
  original_resume_id, updated_resume_id, update_type,
  created_at
)
```

## How Recommendations Work

### 1. On Page Load

```javascript
// Automatically loads recommendations based on user's history
GET /api/job-recommendations/from-history?limit=6
```

**What it does:**

- Gets user's recent job descriptions (where resume was updated)
- Fetches related jobs for each job description
- Aggregates and deduplicates
- Shows top 6 matches

### 2. After Resume Update

```javascript
// User updates resume for a job description
POST /api/chat
{
  "message": "create resume for this job: Software Engineer..."
}

// System:
// 1. Updates resume
// 2. Saves job description to history
// 3. After 2 seconds → Shows related jobs
```

### 3. Next Time User Visits

```javascript
// System remembers previous job descriptions
// Shows jobs similar to ones they've worked on before
GET / api / job - recommendations / from - history;
```

## Implementation Details

### Saving Job Description History

**When:** After resume update completes successfully

**What gets saved:**

- Full job description text
- Extracted location (if mentioned)
- Keywords (automatically extracted)
- Resume document ID (if created)
- Timestamp

**Code:**

```typescript
// In web-ui/server.ts
await db.saveJobDescription(
  userId,
  jobDescription,
  location,
  true, // resumeUpdated
  state?.copiedResumeId,
);
```

### Getting Recommendations from History

**Endpoint:**

```
GET /api/job-recommendations/from-history?limit=6
```

**Process:**

1. Gets user's recent job descriptions (last 5)
2. For each job description where resume was updated:
   - Fetches related jobs using scalable recommender manager
   - Uses job description + location for search
3. Aggregates all recommendations
4. Deduplicates (same title + company)
5. Sorts by match score
6. Returns top N jobs

### Keyword-Based Recommendations

**Alternative approach:**

- Extracts keywords from all user's job descriptions
- Creates search query from top keywords
- Finds jobs matching those keywords

**Use case:** When user has updated resume for multiple different job types

## User Experience

### First Time User

1. **Visits page** → No recommendations (no history yet)
2. **Updates resume for a job** → Related jobs appear
3. **Next visit** → Jobs based on previous job description

### Returning User

1. **Visits page** → Jobs based on all previous job descriptions
2. **Updates resume for new job** → New related jobs appear
3. **System learns** → Recommendations get better over time

## Benefits

1. **No Extra Login**: Uses Google OAuth (no username/password)
2. **Automatic Tracking**: No user action needed
3. **Personalized**: Based on actual work user has done
4. **Improves Over Time**: More history = better recommendations
5. **Contextual**: Shows jobs similar to ones they've actually applied for

## Privacy & Data

- **User ID**: UUID (anonymous identifier)
- **Email**: Only used for Google OAuth (not shared)
- **History**: Stored securely in PostgreSQL
- **Encryption**: Sensitive data (tokens, API keys) encrypted
- **User Control**: Can delete account to remove all history

## Future Enhancements

1. **Anonymous Mode**: Cookie-based user_id for users who don't want Google login
2. **Export History**: Let users download their job description history
3. **Delete History**: Allow users to delete specific job descriptions
4. **Analytics**: Show user their job search patterns
5. **Smart Suggestions**: "Jobs similar to ones you've updated for"

## Example Flow

### Day 1:

```
User: "create resume for this job: Software Engineer at Tech Corp"
System:
  - Updates resume
  - Saves job description to history
  - Shows related Software Engineer jobs
```

### Day 2:

```
User visits page
System:
  - Checks history: "Software Engineer at Tech Corp"
  - Shows Software Engineer jobs automatically
```

### Day 3:

```
User: "create resume for this job: Data Scientist at AI Startup"
System:
  - Updates resume
  - Saves new job description
  - Shows Data Scientist jobs
  - Next visit: Shows both Software Engineer AND Data Scientist jobs
```

## API Endpoints

### Get Recommendations from History

```
GET /api/job-recommendations/from-history?limit=6
```

**Response:**

```json
{
  "recommendations": [
    {
      "jobId": "uuid",
      "title": "Software Engineer",
      "company": "Tech Corp",
      "matchScore": 85,
      "reasons": ["Similar to jobs you've updated for"],
      "source": "adzuna"
    }
  ],
  "count": 6,
  "source": "user_history"
}
```

### Save Job Description (Internal)

```typescript
await db.saveJobDescription(
  userId,
  jobDescription,
  location,
  true,
  resumeDocId,
);
```

### Get User History (Internal)

```typescript
const history = await db.getUserJobDescriptions(userId, 10);
```

## Database Initialization

Run to create history tables:

```bash
npm run db:init
```

This creates:

- `user_job_descriptions` table
- `user_resume_updates` table
- Indexes for performance

## Summary

✅ **User ID**: Created automatically via Google OAuth (no username/password)  
✅ **History Tracking**: Automatic - saves every job description user works with  
✅ **Recommendations**: Based on previous job descriptions  
✅ **Privacy**: Secure, encrypted, user-controlled  
✅ **Scalable**: Works with multiple recommendation sources

The system remembers what users have worked on and shows them relevant opportunities automatically! 🎯
