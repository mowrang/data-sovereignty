/**
 * Job Recommendations API
 *
 * Provides endpoints for:
 * - Getting recommended jobs for users
 * - Getting similar jobs based on application history
 * - Tracking job views and clicks for revenue
 */

import { Router, Request, Response } from "express";
import { getJobMatcherForUser } from "../utils/job-matcher.js";
import { jobClickTracker } from "../utils/job-click-tracker.js";
import { apiRateLimiter } from "../utils/rate-limiter.js";
import { jobRecommenderManager } from "../utils/job-recommender-manager.js";
import { userHistoryRecommender } from "../utils/user-history-recommender.js";

const router = Router();

// Get recommended jobs based on user's job description history
router.get(
  "/from-history",
  apiRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const { limit = "6" } = req.query;

      // Get recommendations based on user's job description history
      const recommendations =
        await userHistoryRecommender.getRecommendationsFromHistory(
          user.id,
          parseInt(limit as string),
        );

      // Track views for each recommended job
      for (const job of recommendations) {
        await jobClickTracker.trackView(user.id, job.jobId, "recommendation");
      }

      res.json({
        recommendations,
        count: recommendations.length,
        source: "user_history",
      });
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

// Get recommended jobs for user (general recommendations)
router.get(
  "/recommended",
  apiRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const { limit = "10" } = req.query;

      // Track that user viewed recommendations
      // (This helps with analytics, but doesn't generate revenue)

      const matcher = await getJobMatcherForUser(user.id);
      const recommendations = await matcher.getRecommendedJobs(
        user.id,
        parseInt(limit as string),
      );

      // Track views for each recommended job
      for (const job of recommendations) {
        await jobClickTracker.trackView(user.id, job.jobId, "recommendation");
      }

      res.json({
        recommendations,
        count: recommendations.length,
      });
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

// Get similar jobs based on application history
router.get(
  "/similar",
  apiRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const { limit = "10" } = req.query;

      const matcher = await getJobMatcherForUser(user.id);
      const similarJobs = await matcher.getSimilarJobs(
        user.id,
        parseInt(limit as string),
      );

      // Track views for similar jobs
      for (const job of similarJobs) {
        await jobClickTracker.trackView(user.id, job.jobId, "similar_jobs");
      }

      res.json({
        similarJobs,
        count: similarJobs.length,
      });
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

// Get recommendations based on job description (scalable - uses all enabled recommenders)
router.get(
  "/by-description",
  apiRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const { description, location, limit = "10" } = req.query;

      if (!description || typeof description !== "string") {
        res.status(400).json({ error: "Job description is required" });
        return;
      }

      const recommendations =
        await jobRecommenderManager.getRecommendationsForJobDescription(
          user.id,
          description as string,
          location as string | undefined,
          parseInt(limit as string),
        );

      // Track views for recommendations
      for (const job of recommendations) {
        await jobClickTracker.trackView(user.id, job.jobId, "recommendation");
      }

      res.json({
        recommendations,
        count: recommendations.length,
        sources: jobRecommenderManager.getEnabledRecommenders(),
      });
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

// Get Adzuna recommendations based on applied jobs (backward compatibility)
router.get(
  "/adzuna",
  apiRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const { limit = "10", jobId } = req.query;

      let recommendations;

      if (jobId) {
        // Get recommendations for a specific job
        recommendations =
          await jobRecommenderManager.getRecommendationsForAppliedJob(
            user.id,
            jobId as string,
            parseInt(limit as string),
          );
      } else {
        // Get recommendations based on application history
        recommendations =
          await jobRecommenderManager.getRecommendationsFromHistory(
            user.id,
            parseInt(limit as string),
          );
      }

      // Track views for Adzuna recommendations
      for (const job of recommendations) {
        await jobClickTracker.trackView(user.id, job.jobId, "recommendation");
      }

      res.json({
        recommendations,
        count: recommendations.length,
        source: "adzuna",
      });
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

// Track job view (called when user views a job detail page)
router.post(
  "/:jobId/view",
  apiRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const { jobId } = req.params;
      const { source = "job_board" } = req.body;

      await jobClickTracker.trackView(user.id, jobId, source as any);

      res.json({ success: true });
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

// Track job click (for external links - generates revenue)
router.post(
  "/:jobId/click",
  apiRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const { jobId } = req.params;
      const { affiliateId } = req.body;

      await jobClickTracker.trackExternalLink(user.id, jobId, affiliateId);

      res.json({ success: true });
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

// Refresh job matches for user (recalculate recommendations)
router.post(
  "/refresh",
  apiRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const matcher = await getJobMatcherForUser(user.id);

      // Update matches in background (don't wait)
      matcher.updateJobMatches(user.id).catch(console.error);

      res.json({
        success: true,
        message:
          "Job matches are being recalculated. Recommendations will update shortly.",
      });
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

// Get revenue stats (admin/employer only)
router.get(
  "/revenue/stats",
  apiRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;

      // Only employers and admins can view revenue stats
      if (user.userRole !== "employer" && user.userRole !== "admin") {
        res.status(403).json({ error: "Not authorized" });
        return;
      }

      const { startDate, endDate } = req.query;
      const stats = await jobClickTracker.getRevenueStats(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
      );

      res.json(stats);
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

// Get top performing jobs by revenue
router.get(
  "/revenue/top-jobs",
  apiRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;

      if (user.userRole !== "employer" && user.userRole !== "admin") {
        res.status(403).json({ error: "Not authorized" });
        return;
      }

      const { limit = "10" } = req.query;
      const topJobs = await jobClickTracker.getTopJobsByRevenue(
        parseInt(limit as string),
      );

      res.json(topJobs);
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

export default router;
