/**
 * Adzuna Job Recommender
 *
 * Fetches job recommendations from Adzuna based on jobs the user is applying for
 * Implements IJobRecommender interface for scalable recommendation system
 */

import { jobBoardIntegrator } from "../integrations/job-boards.js";
import { db } from "../db/client.js";
import { getJobMatcherForUser } from "./job-matcher.js";
import {
  IJobRecommender,
  JobRecommendation,
  RecommendationOptions,
} from "./job-recommender-interface.js";

interface AdzunaRecommendation {
  jobId: string;
  title: string;
  company: string;
  description: string;
  location?: string;
  salary?: string;
  url: string;
  matchScore: number;
  reasons: string[];
  source: string; // Required by JobRecommendation interface
}

export class AdzunaRecommender implements IJobRecommender {
  readonly name = "adzuna";
  readonly enabled = process.env.ADZUNA_ENABLED === "true";

  /**
   * Get recommendations based on options (implements IJobRecommender)
   */
  async getRecommendations(
    options: RecommendationOptions,
  ): Promise<JobRecommendation[]> {
    if (options.jobDescription) {
      return this.getRecommendationsForJobDescription(
        options.userId,
        options.jobDescription,
        options.location,
        options.limit,
      );
    } else if (options.appliedJobId) {
      return this.getRecommendationsForAppliedJob(
        options.userId,
        options.appliedJobId,
        options.limit,
      );
    } else {
      return this.getRecommendationsFromHistory(options.userId, options.limit);
    }
  }

  /**
   * Get recommendations based on job description
   */
  async getRecommendationsForJobDescription(
    userId: string,
    jobDescription: string,
    location?: string,
    limit = 10,
  ): Promise<JobRecommendation[]> {
    try {
      // Extract search query from job description
      const searchQuery =
        this.extractSearchQueryFromDescription(jobDescription);
      const searchLocation = location || "United States";

      // Search Adzuna for jobs matching the description
      const adzunaJobs = await jobBoardIntegrator.searchAdzuna(
        searchQuery,
        searchLocation,
        limit * 2, // Get more to filter and match
      );

      if (adzunaJobs.length === 0) {
        return [];
      }

      // Import jobs to database
      const systemUser = await this.getSystemUser();
      await jobBoardIntegrator.importJobsToDatabase(adzunaJobs, systemUser.id);

      // Use job matcher to score and rank
      const matcher = await getJobMatcherForUser(userId);
      const recommendations: JobRecommendation[] = [];

      const pool = (db as any).getPool();

      for (const adzunaJob of adzunaJobs) {
        const dbJobResult = await pool.query(
          `SELECT * FROM job_postings WHERE external_id = $1 AND source = 'adzuna'`,
          [adzunaJob.id],
        );

        if (dbJobResult.rows.length === 0) {
          continue;
        }

        const dbJob = dbJobResult.rows[0];
        const userProfile = await this.getUserProfile(userId);
        const matchScore = await (matcher as any).calculateMatchScore(
          userProfile,
          dbJob,
        );

        if (matchScore.score > 50) {
          recommendations.push({
            jobId: dbJob.id,
            title: adzunaJob.title,
            company: adzunaJob.company,
            description: adzunaJob.description,
            location: adzunaJob.location,
            salary: adzunaJob.salary,
            url: adzunaJob.affiliateUrl,
            matchScore: matchScore.score,
            reasons: matchScore.reasons,
            source: this.name,
          });
        }
      }

      return recommendations
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);
    } catch (error: any) {
      console.error(
        "Error getting Adzuna recommendations for job description:",
        error,
      );
      return [];
    }
  }

  /**
   * Get Adzuna job recommendations based on a job the user is applying for
   */
  async getRecommendationsForAppliedJob(
    userId: string,
    appliedJobId: string,
    limit = 10,
  ): Promise<JobRecommendation[]> {
    try {
      // Get the job the user applied to
      const pool = (db as any).getPool();
      const jobResult = await pool.query(
        `SELECT * FROM job_postings WHERE id = $1`,
        [appliedJobId],
      );

      if (jobResult.rows.length === 0) {
        return [];
      }

      const appliedJob = jobResult.rows[0];

      // Extract search terms from the applied job
      const searchQuery = this.extractSearchQuery(appliedJob);
      const location = appliedJob.location || "United States";

      // Search Adzuna for similar jobs
      const adzunaJobs = await jobBoardIntegrator.searchAdzuna(
        searchQuery,
        location,
        limit * 2, // Get more to filter and match
      );

      if (adzunaJobs.length === 0) {
        return [];
      }

      // Import jobs to database (if not already there)
      const systemUser = await this.getSystemUser();
      await jobBoardIntegrator.importJobsToDatabase(adzunaJobs, systemUser.id);

      // Use job matcher to score and rank the Adzuna jobs
      const matcher = await getJobMatcherForUser(userId);
      const recommendations: JobRecommendation[] = [];

      for (const adzunaJob of adzunaJobs) {
        // Get the job from database (after import)
        const dbJobResult = await pool.query(
          `SELECT * FROM job_postings WHERE external_id = $1 AND source = 'adzuna'`,
          [adzunaJob.id],
        );

        if (dbJobResult.rows.length === 0) {
          continue;
        }

        const dbJob = dbJobResult.rows[0];

        // Calculate match score
        const userProfile = await this.getUserProfile(userId);
        // Use the matcher's method - it expects UserProfile and job object
        const matchScore = await (matcher as any).calculateMatchScore(
          userProfile,
          dbJob,
        );

        if (matchScore.score > 50) {
          recommendations.push({
            jobId: dbJob.id,
            title: adzunaJob.title,
            company: adzunaJob.company,
            description: adzunaJob.description,
            location: adzunaJob.location,
            salary: adzunaJob.salary,
            url: adzunaJob.affiliateUrl,
            matchScore: matchScore.score,
            reasons: matchScore.reasons,
            source: this.name,
          });
        }
      }

      // Sort by match score and return top recommendations
      return recommendations
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);
    } catch (error: any) {
      console.error("Error getting Adzuna recommendations:", error);
      return [];
    }
  }

  /**
   * Get Adzuna recommendations based on user's application history
   */
  async getRecommendationsFromHistory(
    userId: string,
    limit = 10,
  ): Promise<JobRecommendation[]> {
    try {
      const pool = (db as any).getPool();

      // Get user's recent applications
      const applicationsResult = await pool.query(
        `SELECT j.* FROM job_applications a
         JOIN job_postings j ON a.job_posting_id = j.id
         WHERE a.applicant_id = $1
         ORDER BY a.applied_at DESC
         LIMIT 5`,
        [userId],
      );

      if (applicationsResult.rows.length === 0) {
        return [];
      }

      // Collect recommendations from all applied jobs
      const allRecommendations: AdzunaRecommendation[] = [];

      for (const appliedJob of applicationsResult.rows) {
        const recommendations = await this.getRecommendationsForAppliedJob(
          userId,
          appliedJob.id,
          limit,
        );
        allRecommendations.push(...recommendations);
      }

      // Remove duplicates and sort
      const uniqueJobs = new Map<string, JobRecommendation>();
      for (const job of allRecommendations) {
        const key = `${job.title}_${job.company}`.toLowerCase();
        if (
          !uniqueJobs.has(key) ||
          uniqueJobs.get(key)!.matchScore < job.matchScore
        ) {
          uniqueJobs.set(key, job);
        }
      }

      return Array.from(uniqueJobs.values())
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit)
        .map((job) => ({
          ...job,
          source: this.name,
        }));
    } catch (error: any) {
      console.error("Error getting recommendations from history:", error);
      return [];
    }
  }

  /**
   * Extract search query from job posting
   */
  private extractSearchQuery(job: any): string {
    // Use job title as primary search term
    let query = job.title;

    // Add key terms from description if available
    if (job.description) {
      // Extract first few words from description
      const descWords = job.description.split(/\s+/).slice(0, 5).join(" ");
      query = `${query} ${descWords}`;
    }

    return query.trim();
  }

  /**
   * Extract search query from job description text
   */
  private extractSearchQueryFromDescription(jobDescription: string): string {
    // Extract key terms from job description
    // Look for job title patterns (e.g., "Software Engineer", "Senior Developer")
    const titleMatch = jobDescription.match(
      /(?:looking for|seeking|hiring)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    );
    if (titleMatch) {
      return titleMatch[1];
    }

    // Extract first sentence or first 10 words
    const sentences = jobDescription.split(/[.!?]/);
    const firstSentence = sentences[0] || jobDescription;
    const words = firstSentence.split(/\s+/).slice(0, 10).join(" ");

    return words.trim();
  }

  /**
   * Get user profile for matching
   */
  private async getUserProfile(userId: string): Promise<any> {
    const pool = (db as any).getPool();
    const applicationsResult = await pool.query(
      `SELECT j.*, a.applied_at
       FROM job_applications a
       JOIN job_postings j ON a.job_posting_id = j.id
       WHERE a.applicant_id = $1
       ORDER BY a.applied_at DESC
       LIMIT 10`,
      [userId],
    );

    return {
      userId,
      appliedJobs: applicationsResult.rows.map((row: any) => ({
        jobId: row.id,
        title: row.title,
        description: row.description,
        appliedAt: row.applied_at,
      })),
    };
  }

  /**
   * Get or create system user for external jobs
   */
  private async getSystemUser(): Promise<{ id: string }> {
    const pool = (db as any).getPool();
    const systemUser = await pool.query(
      `SELECT id FROM users WHERE email = 'system@jobboard.com'`,
    );

    if (systemUser.rows.length === 0) {
      const result = await pool.query(
        `INSERT INTO users (email, name, user_role) 
         VALUES ('system@jobboard.com', 'System', 'admin')
         RETURNING id`,
      );
      return { id: result.rows[0].id };
    }

    return { id: systemUser.rows[0].id };
  }
}

export const adzunaRecommender = new AdzunaRecommender();

// Export as IJobRecommender for type checking
export default adzunaRecommender as IJobRecommender;
