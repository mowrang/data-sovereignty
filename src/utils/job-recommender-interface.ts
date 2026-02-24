/**
 * Job Recommender Interface
 *
 * Defines a scalable interface for job recommendation providers
 * Allows easy addition of new recommendation sources (Adzuna, Indeed, ZipRecruiter, etc.)
 */

export interface JobRecommendation {
  jobId: string;
  title: string;
  company: string;
  description: string;
  location?: string;
  salary?: string;
  url: string;
  matchScore: number;
  reasons: string[];
  source: string; // 'adzuna', 'indeed', 'ziprecruiter', etc.
}

export interface RecommendationOptions {
  userId: string;
  jobDescription?: string; // Job description user is interested in
  appliedJobId?: string; // ID of job user applied to
  location?: string;
  limit?: number;
}

/**
 * Interface that all job recommenders must implement
 */
export interface IJobRecommender {
  /**
   * Name of the recommender (e.g., 'adzuna', 'indeed')
   */
  readonly name: string;

  /**
   * Whether this recommender is enabled
   */
  readonly enabled: boolean;

  /**
   * Get job recommendations based on options
   */
  getRecommendations(
    options: RecommendationOptions,
  ): Promise<JobRecommendation[]>;

  /**
   * Get recommendations based on a specific job description
   */
  getRecommendationsForJobDescription(
    userId: string,
    jobDescription: string,
    location?: string,
    limit?: number,
  ): Promise<JobRecommendation[]>;

  /**
   * Get recommendations based on a job the user applied to
   */
  getRecommendationsForAppliedJob(
    userId: string,
    appliedJobId: string,
    limit?: number,
  ): Promise<JobRecommendation[]>;

  /**
   * Get recommendations based on user's application history
   */
  getRecommendationsFromHistory(
    userId: string,
    limit?: number,
  ): Promise<JobRecommendation[]>;
}
