# Automatic Job Recommendations UI

## Overview

The UI now automatically displays recommended jobs while users wait for resume updates. No "Find Jobs" button needed - jobs appear automatically based on the user's activity.

## Features

### Automatic Display

- **No user action required**: Jobs appear automatically when user is authenticated and has both data sources and AI set up
- **Passive browsing**: Users can browse jobs while waiting for resume processing
- **Smart loading**: Recommendations load based on:
  - User's application history (most relevant)
  - General recommendations (fallback)
  - Refreshes after resume updates

### When Jobs Appear

1. **On page load**: If user is authenticated and set up, jobs load automatically
2. **After setup**: When user completes Google and AI setup, jobs appear
3. **After resume updates**: Jobs refresh 3 seconds after user sends a message (they might have applied to a job)

### Job Display

Each job card shows:

- **Match score**: Percentage match (e.g., "85% match")
- **Title & Company**: Job title and company name
- **Location**: Job location (if available)
- **Salary**: Salary range (if available)
- **Description**: Brief job description (truncated)
- **Match reasons**: Why this job matches the user
- **View Job link**: Direct link to job posting

## UI Layout

```
┌─────────────────────────────────────┐
│         Header                       │
├─────────────────────────────────────┤
│   "Never deal with formatting!"     │
├─────────────────────────────────────┤
│         Chatbot                      │
├─────────────────────────────────────┤
│  [Setup Data Sources] [Setup AI]    │
├─────────────────────────────────────┤
│  🎯 Recommended Jobs (6 jobs)       │
│  ┌─────────────────────────────┐   │
│  │ Job Card 1 (85% match)      │   │
│  │ Job Card 2 (82% match)      │   │
│  │ Job Card 3 (78% match)      │   │
│  │ ...                          │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│         Input + Send Button         │
└─────────────────────────────────────┘
```

## API Endpoints Used

### Primary: History-Based Recommendations

```
GET /api/job-recommendations/adzuna?limit=6
```

- Gets recommendations based on jobs user has applied to
- Most relevant and personalized

### Fallback: General Recommendations

```
GET /api/job-recommendations/recommended?limit=6
```

- Used if no history-based recommendations available
- Based on user's resume content

## User Flow

1. **User visits page**

   - If authenticated & set up → Jobs load automatically
   - If not authenticated → Shows "Login required"

2. **User sets up Google account**

   - After redirect back → Checks if AI is also set up
   - If both ready → Loads recommendations

3. **User sets up AI provider**

   - After saving → Checks if Google is also set up
   - If both ready → Loads recommendations

4. **User sends chat message**

   - After 3 seconds → Refreshes recommendations
   - (User might have applied to a job, so refresh to show new matches)

5. **User clicks on job card**
   - Opens job in new tab
   - Tracks click for revenue

## Styling

- **Section**: Light gray background (`#f9fafb`)
- **Scrollable**: Max height 450px, scrolls if many jobs
- **Job cards**: White background, hover effects
- **Match badge**: Purple gradient badge showing match percentage
- **Responsive**: Works on mobile, tablet, desktop

## Benefits

1. **Passive discovery**: Users discover jobs without extra effort
2. **Engagement**: Keeps users engaged while waiting
3. **Revenue**: More job views = more potential clicks = more revenue
4. **Better UX**: No need to search - jobs come to them
5. **Contextual**: Jobs match what user is actually doing (updating resume)

## Technical Details

### Loading Logic

```javascript
// On page load
checkAuthStatus().then(() => {
    if (authenticated && hasGoogleToken && hasAIKey) {
        loadRecommendedJobs();
    }
});

// After setup
updateSetupButtons(status) {
    if (hasGoogleToken && hasAIKey) {
        loadRecommendedJobs();
    }
}

// After message
refreshRecommendationsAfterMessage() {
    setTimeout(() => {
        loadRecommendedJobs();
    }, 3000);
}
```

### Error Handling

- If API fails → Shows friendly message
- If no jobs → Shows "No recommendations yet" message
- If not authenticated → Hides section

## Future Enhancements

- **Real-time updates**: WebSocket for instant job updates
- **Infinite scroll**: Load more jobs as user scrolls
- **Filters**: Filter by location, salary, remote, etc.
- **Save jobs**: Allow users to save jobs for later
- **Job alerts**: Notify when new matching jobs appear
