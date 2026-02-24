/**
 * User History-Based Job Recommender
 *
 * Uses user's job description history to provide personalized recommendations
 * Shows jobs similar to ones they've updated their resume for
 */

import { db } from "../db/client.js";
import { jobRecommenderManager } from "./job-recommender-manager.js";
import { JobRecommendation } from "./job-recommender-interface.js";

export class UserHistoryRecommender {
  /**
   * Get recommendations based on user's job description history
   */
  async getRecommendationsFromHistory(
    userId: string,
    limit = 6,
  ): Promise<JobRecommendation[]> {
    try {
      // Get user's recent job descriptions (ones they updated resume for)
      const jobDescriptions = await db.getUserJobDescriptions(userId, 5);

      if (jobDescriptions.length === 0) {
        return [];
      }

      // Collect recommendations from all job descriptions
      const allRecommendations: JobRecommendation[] = [];

      for (const jd of jobDescriptions) {
        if (jd.resumeUpdated) {
          // Only use job descriptions where resume was actually updated
          const recommendations =
            await jobRecommenderManager.getRecommendationsForJobDescription(
              userId,
              jd.jobDescription,
              jd.location || undefined,
              limit,
            );
          allRecommendations.push(...recommendations);
        }
      }

      // Remove duplicates and sort by match score
      const uniqueJobs = this.deduplicateRecommendations(allRecommendations);

      return uniqueJobs
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);
    } catch (error: any) {
      console.error("Error getting recommendations from user history:", error);
      return [];
    }
  }

  /**
   * Get recommendations based on most recent job description
   */
  async getRecommendationsFromLatestJD(
    userId: string,
    limit = 6,
  ): Promise<JobRecommendation[]> {
    try {
      const jobDescriptions = await db.getUserJobDescriptions(userId, 1);

      if (jobDescriptions.length === 0) {
        return [];
      }

      const latestJD = jobDescriptions[0];
      return await jobRecommenderManager.getRecommendationsForJobDescription(
        userId,
        latestJD.jobDescription,
        latestJD.location || undefined,
        limit,
      );
    } catch (error: any) {
      console.error("Error getting recommendations from latest JD:", error);
      return [];
    }
  }

  /**
   * Get recommendations based on keywords from user's history
   */
  async getRecommendationsFromKeywords(
    userId: string,
    limit = 6,
  ): Promise<JobRecommendation[]> {
    try {
      const jobDescriptions = await db.getUserJobDescriptions(userId, 10);

      if (jobDescriptions.length === 0) {
        return [];
      }

      // Collect all keywords from user's history
      const allKeywords = new Set<string>();
      for (const jd of jobDescriptions) {
        jd.keywords.forEach((keyword) => allKeywords.add(keyword));
      }

      // Create a search query from top keywords
      const topKeywords = Array.from(allKeywords).slice(0, 5);
      const searchQuery = topKeywords.join(" ");

      if (!searchQuery) {
        return [];
      }

      return await jobRecommenderManager.getRecommendationsForJobDescription(
        userId,
        searchQuery,
        undefined,
        limit,
      );
    } catch (error: any) {
      console.error("Error getting recommendations from keywords:", error);
      return [];
    }
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

export const userHistoryRecommender = new UserHistoryRecommender();
