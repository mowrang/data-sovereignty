/**
 * Job Matching and Recommendation Engine
 *
 * Uses AI to match users with relevant jobs based on:
 * - Their resume content
 * - Jobs they've applied to
 * - Job descriptions and requirements
 */

import { db } from "../db/client.js";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { redisCache } from "./redis-cache.js";

interface JobMatch {
  jobId: string;
  matchScore: number;
  reasons: string[];
  jobTitle: string;
  company: string;
}

interface UserProfile {
  userId: string;
  resumeContent?: string;
  appliedJobs: Array<{
    jobId: string;
    title: string;
    description: string;
    appliedAt: Date;
  }>;
  skills?: string[];
  experience?: string;
}

export class JobMatcher {
  private llm: any;

  constructor(aiProvider = "anthropic", apiKey?: string) {
    if (aiProvider === "openai" && apiKey) {
      this.llm = new ChatOpenAI({
        modelName: "gpt-4",
        temperature: 0.3,
        openAIApiKey: apiKey,
      });
    } else {
      this.llm = new ChatAnthropic({
        model: "claude-sonnet-4-5",
        temperature: 0.3,
      });
    }
  }

  /**
   * Get recommended jobs for a user based on their application history
   */
  async getRecommendedJobs(userId: string, limit = 10): Promise<JobMatch[]> {
    try {
      // Get user profile
      const userProfile = await this.getUserProfile(userId);

      // Get active job postings
      const pool = (db as any).getPool();
      const jobsResult = await pool.query(
        `SELECT * FROM job_postings WHERE status = 'active' AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) ORDER BY created_at DESC LIMIT 100`,
      );

      if (jobsResult.rows.length === 0) {
        return [];
      }

      // Calculate match scores for each job
      const matches: JobMatch[] = [];

      for (const job of jobsResult.rows) {
        const matchScore = await this.calculateMatchScore(userProfile, job);
        if (matchScore.score > 50) {
          // Only recommend jobs with >50% match
          matches.push({
            jobId: job.id,
            matchScore: matchScore.score,
            reasons: matchScore.reasons,
            jobTitle: job.title,
            company: job.company,
          });
        }
      }

      // Sort by match score and return top matches
      return matches
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);
    } catch (error: any) {
      console.error("Error getting recommended jobs:", error);
      return [];
    }
  }

  /**
   * Find similar jobs to ones the user has applied for
   */
  async getSimilarJobs(userId: string, limit = 10): Promise<JobMatch[]> {
    try {
      const pool = (db as any).getPool();

      // Get jobs user has applied to
      const appliedJobsResult = await pool.query(
        `SELECT j.* FROM job_postings j
         JOIN job_applications a ON j.id = a.job_posting_id
         WHERE a.applicant_id = $1
         ORDER BY a.applied_at DESC
         LIMIT 5`,
        [userId],
      );

      if (appliedJobsResult.rows.length === 0) {
        return [];
      }

      // Get user's resume for context
      const userProfile = await this.getUserProfile(userId);

      // Find similar jobs using AI
      const similarJobs: JobMatch[] = [];

      for (const appliedJob of appliedJobsResult.rows) {
        // Find jobs with similar titles, descriptions, or requirements
        const similarResult = await pool.query(
          `SELECT * FROM job_postings 
           WHERE status = 'active' 
           AND id != $1
           AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
           AND (
             title ILIKE $2 OR 
             description ILIKE $2 OR
             company ILIKE $3
           )
           ORDER BY created_at DESC
           LIMIT 20`,
          [
            appliedJob.id,
            `%${appliedJob.title.split(" ")[0]}%`, // Match first word of title
            `%${appliedJob.company}%`,
          ],
        );

        for (const job of similarResult.rows) {
          const matchScore = await this.calculateMatchScore(userProfile, job);
          if (matchScore.score > 60) {
            similarJobs.push({
              jobId: job.id,
              matchScore: matchScore.score,
              reasons: [
                `Similar to ${appliedJob.title} at ${appliedJob.company}`,
                ...matchScore.reasons,
              ],
              jobTitle: job.title,
              company: job.company,
            });
          }
        }
      }

      // Remove duplicates and sort
      const uniqueJobs = new Map<string, JobMatch>();
      for (const job of similarJobs) {
        if (
          !uniqueJobs.has(job.jobId) ||
          uniqueJobs.get(job.jobId)!.matchScore < job.matchScore
        ) {
          uniqueJobs.set(job.jobId, job);
        }
      }

      return Array.from(uniqueJobs.values())
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);
    } catch (error: any) {
      console.error("Error getting similar jobs:", error);
      return [];
    }
  }

  /**
   * Calculate match score between user profile and job
   */
  async calculateMatchScore(
    userProfile: UserProfile,
    job: any,
  ): Promise<{ score: number; reasons: string[] }> {
    try {
      // Try cache first
      const cacheKey = `job_match:${userProfile.userId}:${job.id}`;
      const cached = await redisCache.getUser(cacheKey);
      if (cached) {
        return cached;
      }

      // Use AI to calculate match score
      const prompt = `You are a job matching expert. Analyze how well this user profile matches this job posting.

USER PROFILE:
${userProfile.resumeContent ? `Resume: ${userProfile.resumeContent.substring(0, 2000)}` : "No resume available"}
${userProfile.appliedJobs.length > 0 ? `Recently applied to: ${userProfile.appliedJobs.map((j) => j.title).join(", ")}` : ""}

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description.substring(0, 1000)}
Requirements: ${job.requirements || "Not specified"}
Location: ${job.location || "Not specified"}
Remote: ${job.remote ? "Yes" : "No"}

Provide:
1. A match score from 0-100
2. 3-5 specific reasons why this job matches (or doesn't match) the user

Respond in JSON format:
{
  "score": 85,
  "reasons": ["Reason 1", "Reason 2", "Reason 3"]
}`;

      const response = await this.llm.invoke(prompt);
      const content =
        typeof response.content === "string"
          ? response.content
          : response.content[0]?.text || "";

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Invalid AI response format");
      }

      const result = JSON.parse(jsonMatch[0]);

      // Cache result for 24 hours
      await redisCache.setUser(cacheKey, result, 86400);

      return result;
    } catch (error: any) {
      console.error("Error calculating match score:", error);
      // Fallback to simple keyword matching
      return this.simpleMatchScore(userProfile, job);
    }
  }

  /**
   * Simple keyword-based matching (fallback)
   */
  private simpleMatchScore(
    userProfile: UserProfile,
    job: any,
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    const resumeText = (userProfile.resumeContent || "").toLowerCase();
    const jobText =
      `${job.title} ${job.description} ${job.requirements || ""}`.toLowerCase();

    // Extract keywords from job
    const jobKeywords: string[] = jobText.match(/\b\w{4,}\b/g) || [];
    const resumeKeywords: string[] = resumeText.match(/\b\w{4,}\b/g) || [];

    // Count matching keywords
    const matchingKeywords = jobKeywords.filter((kw) =>
      resumeKeywords.includes(kw),
    );
    const matchRatio =
      matchingKeywords.length / Math.max(jobKeywords.length, 1);

    score = Math.min(100, matchRatio * 100);
    reasons.push(`${matchingKeywords.length} matching keywords found`);

    if (
      userProfile.appliedJobs.some((j) =>
        j.title.toLowerCase().includes(job.title.toLowerCase().split(" ")[0]),
      )
    ) {
      score += 10;
      reasons.push("Similar to previously applied jobs");
    }

    return { score: Math.min(100, score), reasons };
  }

  /**
   * Get user profile for matching
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    const pool = (db as any).getPool();

    // Get user's applications
    const applicationsResult = await pool.query(
      `SELECT j.*, a.applied_at
       FROM job_applications a
       JOIN job_postings j ON a.job_posting_id = j.id
       WHERE a.applicant_id = $1
       ORDER BY a.applied_at DESC
       LIMIT 10`,
      [userId],
    );

    // Get user's resume content from their latest resume thread
    // This would need to be stored separately or retrieved from LangGraph checkpoints
    let resumeContent: string | undefined;
    try {
      // Try to get from cache or database
      const cachedResume = await redisCache.getUser(`resume:${userId}`);
      if (cachedResume) {
        resumeContent = cachedResume.content;
      }
    } catch (error) {
      // Resume not cached, that's okay
    }

    return {
      userId,
      resumeContent,
      appliedJobs: applicationsResult.rows.map((row: any) => ({
        jobId: row.id,
        title: row.title,
        description: row.description,
        appliedAt: row.applied_at,
      })),
    };
  }

  /**
   * Update job match scores in database
   */
  async updateJobMatches(userId: string): Promise<void> {
    try {
      const recommendedJobs = await this.getRecommendedJobs(userId, 50);
      const pool = (db as any).getPool();

      // Clear existing matches
      await pool.query(`DELETE FROM job_matches WHERE user_id = $1`, [userId]);

      // Insert new matches
      for (const match of recommendedJobs) {
        await pool.query(
          `INSERT INTO job_matches (job_posting_id, user_id, match_score, match_reasons)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (job_posting_id, user_id) 
           DO UPDATE SET match_score = $3, match_reasons = $4, calculated_at = CURRENT_TIMESTAMP`,
          [match.jobId, userId, match.matchScore, match.reasons],
        );
      }
    } catch (error: any) {
      console.error("Error updating job matches:", error);
    }
  }
}

/**
 * Get job matcher instance for user
 */
export async function getJobMatcherForUser(
  userId: string,
): Promise<JobMatcher> {
  const user = await db.getUserById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }
  return new JobMatcher(user.aiProvider, user.aiApiKey || undefined);
}
