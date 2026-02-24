/**
 * Job Recommender Manager
 *
 * Manages multiple job recommendation providers and aggregates results
 * Provides a scalable way to add new recommendation sources
 */

import {
  IJobRecommender,
  JobRecommendation,
  RecommendationOptions,
} from "./job-recommender-interface.js";

export class JobRecommenderManager {
  private recommenders: Map<string, IJobRecommender> = new Map();

  constructor() {
    // Adzuna recommender will be registered after import
    // This avoids circular dependency issues
  }

  /**
   * Register a new job recommender
   */
  registerRecommender(recommender: IJobRecommender): void {
    if (recommender.enabled) {
      this.recommenders.set(recommender.name, recommender);
      console.log(`✅ Registered job recommender: ${recommender.name}`);
    } else {
      console.log(`⚠️ Skipping disabled recommender: ${recommender.name}`);
    }
  }

  /**
   * Get recommendations from all enabled recommenders
   */
  async getRecommendations(
    options: RecommendationOptions,
  ): Promise<JobRecommendation[]> {
    const allRecommendations: JobRecommendation[] = [];
    const errors: Array<{ source: string; error: string }> = [];

    // Get recommendations from all enabled recommenders in parallel
    const promises = Array.from(this.recommenders.values()).map(
      async (recommender) => {
        try {
          const recommendations = await recommender.getRecommendations(options);
          return recommendations;
        } catch (error: any) {
          errors.push({
            source: recommender.name,
            error: error.message || "Unknown error",
          });
          console.error(
            `Error getting recommendations from ${recommender.name}:`,
            error,
          );
          return [];
        }
      },
    );

    const results = await Promise.allSettled(promises);

    for (const result of results) {
      if (result.status === "fulfilled") {
        allRecommendations.push(...result.value);
      }
    }

    // Log errors but don't fail
    if (errors.length > 0) {
      console.warn("Some recommenders failed:", errors);
    }

    // Remove duplicates (same title + company)
    const uniqueJobs = this.deduplicateRecommendations(allRecommendations);

    // Sort by match score and return top results
    return uniqueJobs
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, options.limit || 10);
  }

  /**
   * Get recommendations for a specific job description
   */
  async getRecommendationsForJobDescription(
    userId: string,
    jobDescription: string,
    location?: string,
    limit = 10,
  ): Promise<JobRecommendation[]> {
    return this.getRecommendations({
      userId,
      jobDescription,
      location,
      limit,
    });
  }

  /**
   * Get recommendations for a job the user applied to
   */
  async getRecommendationsForAppliedJob(
    userId: string,
    appliedJobId: string,
    limit = 10,
  ): Promise<JobRecommendation[]> {
    return this.getRecommendations({
      userId,
      appliedJobId,
      limit,
    });
  }

  /**
   * Get recommendations based on user's application history
   */
  async getRecommendationsFromHistory(
    userId: string,
    limit = 10,
  ): Promise<JobRecommendation[]> {
    return this.getRecommendations({
      userId,
      limit,
    });
  }

  /**
   * Get recommendations from a specific recommender
   */
  async getRecommendationsFromSource(
    source: string,
    options: RecommendationOptions,
  ): Promise<JobRecommendation[]> {
    const recommender = this.recommenders.get(source);
    if (!recommender) {
      throw new Error(`Recommender '${source}' not found`);
    }
    return recommender.getRecommendations(options);
  }

  /**
   * Get list of enabled recommenders
   */
  getEnabledRecommenders(): string[] {
    return Array.from(this.recommenders.keys());
  }

  /**
   * Remove duplicate recommendations
   */
  private deduplicateRecommendations(
    recommendations: JobRecommendation[],
  ): JobRecommendation[] {
    const seen = new Map<string, JobRecommendation>();

    for (const job of recommendations) {
      const key = `${job.title.toLowerCase()}_${job.company.toLowerCase()}`;
      const existing = seen.get(key);

      if (!existing || existing.matchScore < job.matchScore) {
        seen.set(key, job);
      }
    }

    return Array.from(seen.values());
  }
}

// Singleton instance
export const jobRecommenderManager = new JobRecommenderManager();

// Register default recommenders after manager is created
// Use setTimeout to avoid circular dependency issues during module initialization
setTimeout(() => {
  import("./adzuna-recommender.js")
    .then((module) => {
      if (module.adzunaRecommender && module.adzunaRecommender.enabled) {
        jobRecommenderManager.registerRecommender(module.adzunaRecommender);
      }
    })
    .catch((error) => {
      // Adzuna not available or error loading, continue without it
      console.warn("Could not load Adzuna recommender:", error.message);
    });
}, 0);
