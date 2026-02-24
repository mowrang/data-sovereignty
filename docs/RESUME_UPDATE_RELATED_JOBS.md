# Resume Update → Related Jobs Feature

## Overview

When a user updates their resume based on a job description, the system automatically shows related jobs. This creates a seamless flow where users discover new opportunities right after tailoring their resume.

## User Flow

```
1. User sends: "create resume for this job: [job description]"
   ↓
2. Resume agent updates resume based on job description
   ↓
3. System extracts job description from message
   ↓
4. After resume update completes (2 seconds delay)
   ↓
5. System fetches related jobs based on job description
   ↓
6. Related jobs appear automatically in recommendations section
```

## Implementation

### 1. Job Description Extraction

The system extracts job descriptions from user messages using multiple patterns:

```javascript
// Patterns detected:
-"job description: [text]" -
  "for this job: [text]" -
  "JD: [text]" -
  "create resume for: [text]" -
  "update resume for: [text]";
```

### 2. Resume Update Detection

The backend API returns a flag when resume is updated:

```json
{
  "response": "✅ Resume updated successfully!",
  "status": "Success",
  "jobDescription": "Software Engineer position...",
  "location": "San Francisco", // Extracted if found
  "resumeUpdated": true
}
```

### 3. Related Jobs Fetching

After resume update completes:

```javascript
// Wait 2 seconds for processing
setTimeout(() => {
  loadRelatedJobsForDescription(jobDescription, location);
}, 2000);
```

### 4. API Call

```javascript
GET /api/job-recommendations/by-description?
    description=[job description]&
    location=[location]&
    limit=6
```

This uses the scalable recommendation manager to fetch jobs from all enabled sources (Adzuna, etc.).

### 5. Display

- **Header changes**: "🎯 Related Jobs (Based on your resume update)"
- **Shows 6 related jobs** with match scores
- **Automatic**: No user action needed

## Example Scenario

### User Message:

```
"create resume for this job: Software Engineer position at Tech Corp.
Looking for someone with 5+ years React experience, remote work,
location: San Francisco"
```

### What Happens:

1. **Resume Update**: Resume is tailored for this job
2. **Job Description Extracted**: "Software Engineer position at Tech Corp..."
3. **Location Extracted**: "San Francisco"
4. **Related Jobs Fetched**: Jobs matching "Software Engineer" + "React" + "San Francisco"
5. **Display**: 6 related jobs appear automatically

## Benefits

1. **Immediate Value**: Users see related jobs right after updating resume
2. **Contextual**: Jobs match what they just worked on
3. **Passive Discovery**: No extra clicks needed
4. **Better Matches**: Based on actual job description, not just resume
5. **More Applications**: Users more likely to apply to related jobs

## Technical Details

### Frontend (`app.js`)

- **Job Description Storage**: `lastJobDescription` variable
- **Pattern Matching**: Regex to extract job descriptions
- **Timing**: 2-second delay after resume update
- **Fallback**: If related jobs fail, shows general recommendations

### Backend (`server.ts`)

- **Job Description Extraction**: Multiple regex patterns
- **Location Extraction**: Optional location parsing
- **Response Flag**: `resumeUpdated: true` signals frontend
- **Job Description Included**: Sent back in response for frontend use

### API Integration

- **Endpoint**: `/api/job-recommendations/by-description`
- **Scalable**: Uses `JobRecommenderManager` (all sources)
- **Location Filtering**: Optional location parameter
- **Limit**: 6 jobs (optimal for UI)

## UI Behavior

### Before Resume Update:

- Shows general recommendations (if available)
- Header: "🎯 Recommended Jobs"

### After Resume Update:

- Shows related jobs based on job description
- Header: "🎯 Related Jobs (Based on your resume update)"
- Automatically updates after 2 seconds

### If No Related Jobs:

- Falls back to general recommendations
- Shows friendly message: "No related jobs found"

## Error Handling

- **API Failure**: Falls back to general recommendations
- **No Job Description**: Uses general recommendations
- **No Jobs Found**: Shows friendly message
- **Network Error**: Gracefully handles, doesn't break UI

## Future Enhancements

1. **Smart Extraction**: Better NLP for job description parsing
2. **Multiple Jobs**: Track multiple job descriptions user has worked on
3. **Job History**: Show "Jobs similar to ones you've updated for"
4. **Real-time Updates**: WebSocket for instant job updates
5. **Save Jobs**: Allow users to save related jobs for later

## Testing

To test this feature:

1. **Setup**: Ensure user is authenticated with Google and AI
2. **Send Message**: "create resume for this job: [job description]"
3. **Wait**: 2 seconds after resume update completes
4. **Verify**: Related jobs appear automatically
5. **Check**: Jobs match the job description provided

## Example Test Cases

### Test Case 1: Basic Job Description

```
Input: "create resume for this job: Software Engineer"
Expected: Shows software engineer jobs
```

### Test Case 2: With Location

```
Input: "create resume for this job: Data Scientist, location: New York"
Expected: Shows data scientist jobs in New York
```

### Test Case 3: No Job Description

```
Input: "update my resume"
Expected: Shows general recommendations (no related jobs)
```

### Test Case 4: Multiple Patterns

```
Input: "JD: Frontend Developer at Startup"
Expected: Extracts "Frontend Developer at Startup"
```
