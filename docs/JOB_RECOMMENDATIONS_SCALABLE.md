# Scalable Job Recommendations System

## Overview

The job recommendation system has been redesigned to be **scalable and extensible**, allowing easy addition of new recommendation sources beyond Adzuna (e.g., Indeed, ZipRecruiter, LinkedIn, etc.).

## Architecture

### 1. Interface-Based Design

All job recommenders implement the `IJobRecommender` interface:

```typescript
interface IJobRecommender {
  readonly name: string;
  readonly enabled: boolean;

  getRecommendations(options: RecommendationOptions): Promise<JobRecommendation[]>;
  getRecommendationsForJobDescription(...): Promise<JobRecommendation[]>;
  getRecommendationsForAppliedJob(...): Promise<JobRecommendation[]>;
  getRecommendationsFromHistory(...): Promise<JobRecommendation[]>;
}
```

### 2. Recommendation Manager

The `JobRecommenderManager` aggregates results from multiple recommenders:

- **Parallel Execution**: Fetches from all enabled recommenders simultaneously
- **Deduplication**: Removes duplicate jobs (same title + company)
- **Ranking**: Sorts by match score (highest first)
- **Error Handling**: Continues even if some recommenders fail

### 3. Current Implementation

- **AdzunaRecommender**: Implements `IJobRecommender` interface
- **JobRecommenderManager**: Manages all recommenders

## Adding New Recommenders

### Step 1: Create Recommender Class

```typescript
import {
  IJobRecommender,
  JobRecommendation,
  RecommendationOptions,
} from "../utils/job-recommender-interface.js";

export class IndeedRecommender implements IJobRecommender {
  readonly name = "indeed";
  readonly enabled = process.env.INDEED_ENABLED === "true";

  async getRecommendations(
    options: RecommendationOptions,
  ): Promise<JobRecommendation[]> {
    // Implementation
  }

  async getRecommendationsForJobDescription(
    userId: string,
    jobDescription: string,
    location?: string,
    limit?: number,
  ): Promise<JobRecommendation[]> {
    // Search Indeed API
    // Import jobs to database
    // Score with job matcher
    // Return recommendations
  }

  // ... other methods
}

export const indeedRecommender = new IndeedRecommender();
```

### Step 2: Register Recommender

```typescript
import { jobRecommenderManager } from "../utils/job-recommender-manager.js";
import { indeedRecommender } from "./indeed-recommender.js";

// Register in initialization code
jobRecommenderManager.registerRecommender(indeedRecommender);
```

### Step 3: Enable in Environment

```bash
INDEED_ENABLED=true
INDEED_API_KEY=your_api_key
```

## API Endpoints

### GET `/api/job-recommendations/by-description`

Get recommendations based on job description (uses all enabled recommenders).

**Query Parameters:**

- `description` (required): Job description text
- `location` (optional): Location filter
- `limit` (optional): Number of results (default: 10)

**Example:**

```bash
GET /api/job-recommendations/by-description?description=Software%20Engineer&location=San%20Francisco&limit=10
```

**Response:**

```json
{
  "recommendations": [
    {
      "jobId": "uuid",
      "title": "Software Engineer",
      "company": "Tech Corp",
      "description": "Great opportunity...",
      "location": "San Francisco",
      "salary": "$120k-$150k",
      "url": "https://adzuna.com/job/123",
      "matchScore": 85,
      "reasons": ["Strong React experience", "Remote work"],
      "source": "adzuna"
    }
  ],
  "count": 10,
  "sources": ["adzuna", "indeed"]
}
```

### GET `/api/job-recommendations/adzuna`

Backward compatibility endpoint (still works, but uses manager internally).

## UI Integration

The UI includes:

1. **Job Description Input**: Users can describe jobs they're interested in
2. **Recommendations Display**: Shows matching jobs with:
   - Match score
   - Company and title
   - Location and salary
   - Match reasons
   - Direct links

**Location**: Below the setup buttons, above the chat input

## Benefits of Scalable Design

1. **Easy Expansion**: Add new sources without modifying existing code
2. **Parallel Fetching**: Faster results by querying multiple sources simultaneously
3. **Fault Tolerance**: System continues working if one recommender fails
4. **Unified Interface**: Same API for all recommendation sources
5. **Better Results**: Aggregates results from multiple sources

## Testing

Unit tests cover:

- Interface implementation
- Manager aggregation
- Deduplication
- Error handling
- API endpoints

Run tests:

```bash
npm run test:unit:utils
npm run test:unit:api
```

## Future Enhancements

Potential new recommenders:

- **IndeedRecommender**: Indeed API integration
- **ZipRecruiterRecommender**: ZipRecruiter API
- **LinkedInRecommender**: LinkedIn Jobs API
- **GlassdoorRecommender**: Glassdoor API
- **CustomRecommender**: Internal job database

Each can be added by:

1. Implementing `IJobRecommender`
2. Registering with manager
3. Enabling in environment

No changes needed to existing code! 🎉
