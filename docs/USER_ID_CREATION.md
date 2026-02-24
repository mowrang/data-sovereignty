# User ID Creation & History Tracking

## How User ID is Created

### ✅ No Username/Password Required!

The system uses **Google OAuth** to create user accounts automatically. No separate username/password needed.

### User Creation Flow

1. **User clicks "Setup Data Sources"**
2. **Redirected to Google OAuth**
3. **User grants permissions** (Google Docs access)
4. **System automatically:**

   ```typescript
   // Creates user in database
   const user = await db.createOrUpdateUser(
     email, // From Google: "user@example.com"
     name, // From Google: "John Doe"
     googleId, // From Google: "123456789"
     refreshToken, // Encrypted Google refresh token
   );

   // User ID is automatically generated as UUID
   // user.id = "550e8400-e29b-41d4-a716-446655440000"
   ```

5. **Session created** → User is logged in
6. **User can now use the service**

### User ID Format

- **Type**: UUID (Universally Unique Identifier)
- **Example**: `550e8400-e29b-41d4-a716-446655440000`
- **Generated**: Automatically by PostgreSQL (`gen_random_uuid()`)
- **Unique**: Guaranteed unique across all users

### Database Schema

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- ← User ID created here
    email VARCHAR(255) UNIQUE NOT NULL,              -- Used for login
    name VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    google_refresh_token TEXT,                       -- Encrypted
    ai_provider VARCHAR(50) DEFAULT 'anthropic',
    ai_api_key TEXT,                                 -- Encrypted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);
```

## User History Tracking

### What Gets Tracked

Every time a user updates their resume based on a job description:

1. **Job Description** → Saved to `user_job_descriptions` table
2. **Resume Update** → Saved to `user_resume_updates` table
3. **Keywords** → Extracted automatically from job description
4. **Location** → Extracted if mentioned in job description
5. **Timestamps** → When each update happened

### History Tables

#### `user_job_descriptions`

```sql
- id (UUID)
- user_id (UUID) → Links to users table
- job_description (TEXT) → Full job description text
- location (VARCHAR) → Extracted location
- extracted_keywords (TEXT[]) → Array of keywords
- resume_updated (BOOLEAN) → Whether resume was updated
- resume_document_id (VARCHAR) → Google Doc ID
- created_at, updated_at
```

#### `user_resume_updates`

```sql
- id (UUID)
- user_id (UUID) → Links to users table
- job_description_id (UUID) → Links to job description
- original_resume_id (VARCHAR) → Original Google Doc ID
- updated_resume_id (VARCHAR) → Updated/copied Google Doc ID
- update_type (VARCHAR) → 'job_description', 'comments', 'manual'
- created_at
```

## How Recommendations Use History

### On Page Load

```javascript
GET /api/job-recommendations/from-history?limit=6
```

**Process:**

1. Gets user's recent job descriptions (last 5)
2. For each job description where resume was updated:
   - Fetches related jobs using scalable recommender
   - Uses job description + location for search
3. Aggregates all recommendations
4. Deduplicates and sorts by match score
5. Returns top 6 jobs

### After Resume Update

```javascript
// User: "create resume for this job: Software Engineer..."
// System:
// 1. Updates resume
// 2. Saves job description to history
// 3. After 2 seconds → Shows related jobs
```

### Next Visit

```javascript
// System remembers previous job descriptions
// Shows jobs similar to ones they've worked on before
GET / api / job - recommendations / from - history;
```

## Example User Journey

### Day 1: First Use

```
1. User visits → No recommendations (no history)
2. User: "create resume for this job: Software Engineer at Tech Corp"
3. System:
   - Creates user_id (if not exists): "550e8400-..."
   - Updates resume
   - Saves job description: "Software Engineer at Tech Corp"
   - Shows related Software Engineer jobs
```

### Day 2: Return Visit

```
1. User visits → System checks history
2. Finds: "Software Engineer at Tech Corp"
3. Shows: Software Engineer jobs automatically
```

### Day 3: New Job Type

```
1. User: "create resume for this job: Data Scientist at AI Startup"
2. System:
   - Updates resume
   - Saves new job description: "Data Scientist..."
   - Shows Data Scientist jobs
3. Next visit: Shows both Software Engineer AND Data Scientist jobs
```

## Benefits

1. **No Extra Login**: Google OAuth handles everything
2. **Automatic Tracking**: No user action needed
3. **Personalized**: Based on actual work user has done
4. **Improves Over Time**: More history = better recommendations
5. **Privacy**: User ID is anonymous UUID, email only for OAuth

## Privacy & Security

- **User ID**: UUID (anonymous identifier)
- **Email**: Only used for Google OAuth, encrypted in transit
- **History**: Stored securely in PostgreSQL
- **Encryption**: Sensitive data (tokens, API keys) encrypted with AES-256-GCM
- **User Control**: Can delete account to remove all history

## Database Initialization

To set up user history tracking:

```bash
npm run db:init
```

This creates:

- `users` table (if not exists)
- `user_sessions` table
- `user_job_descriptions` table ← **NEW**
- `user_resume_updates` table ← **NEW**
- All indexes for performance

## API Endpoints

### Get Recommendations from History

```
GET /api/job-recommendations/from-history?limit=6
```

**Returns:** Jobs based on user's previous job descriptions

### Get User History (Internal)

```typescript
const history = await db.getUserJobDescriptions(userId, 10);
// Returns: Array of job descriptions user has worked with
```

### Save Job Description (Internal)

```typescript
const jobDescId = await db.saveJobDescription(
  userId,
  jobDescription,
  location,
  true, // resumeUpdated
  resumeDocId,
);
```

## Summary

✅ **User ID**: Created automatically via Google OAuth (UUID)  
✅ **No Username/Password**: Google handles authentication  
✅ **History Tracking**: Automatic - saves every job description  
✅ **Recommendations**: Based on previous job descriptions  
✅ **Privacy**: Secure, encrypted, user-controlled

The system remembers what users have worked on and shows them relevant opportunities automatically! 🎯
