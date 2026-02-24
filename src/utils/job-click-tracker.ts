/**
 * Job Click Tracking and Revenue System
 *
 * Tracks job views and clicks for monetization:
 * - Track when users view jobs
 * - Track when users click "Apply" or external links
 * - Calculate revenue from affiliate/referral programs
 * - Track conversion rates
 */

import { db } from "../db/client.js";
import { redisCache } from "./redis-cache.js";

// JobClick interface - kept for future use
// Uncomment when needed:
// interface JobClick {
//   id: string;
//   userId: string;
//   jobId: string;
//   clickType: "view" | "apply" | "external_link" | "recommended_view";
//   source: "job_board" | "recommendation" | "similar_jobs" | "search";
//   revenue?: number;
//   affiliateId?: string;
//   timestamp: Date;
// }

interface RevenueStats {
  totalRevenue: number;
  totalClicks: number;
  totalViews: number;
  conversionRate: number;
  revenuePerClick: number;
  period: string;
}

export class JobClickTracker {
  /**
   * Track a job view
   */
  async trackView(
    userId: string,
    jobId: string,
    source:
      | "job_board"
      | "recommendation"
      | "similar_jobs"
      | "search" = "job_board",
  ): Promise<void> {
    try {
      const pool = (db as any).getPool();

      // Check if already viewed recently (within 1 hour) to avoid duplicate tracking
      const cacheKey = `job_view:${userId}:${jobId}`;
      const recentlyViewed = await redisCache.getUser(cacheKey);
      if (recentlyViewed) {
        return; // Already tracked recently
      }

      // Track in database
      await pool.query(
        `INSERT INTO job_clicks (user_id, job_posting_id, click_type, source, timestamp)
         VALUES ($1, $2, 'view', $3, CURRENT_TIMESTAMP)
         ON CONFLICT DO NOTHING`,
        [userId, jobId, source],
      );

      // Cache to prevent duplicate tracking
      await redisCache.setUser(cacheKey, { viewed: true }, 3600); // 1 hour

      // Update job view count
      await pool.query(
        `UPDATE job_postings SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1`,
        [jobId],
      );
    } catch (error: any) {
      console.error("Error tracking job view:", error);
    }
  }

  /**
   * Track a job application click
   */
  async trackApply(
    userId: string,
    jobId: string,
    source: string,
  ): Promise<void> {
    try {
      const pool = (db as any).getPool();

      await pool.query(
        `INSERT INTO job_clicks (user_id, job_posting_id, click_type, source, timestamp)
         VALUES ($1, $2, 'apply', $3, CURRENT_TIMESTAMP)`,
        [userId, jobId, source],
      );

      // Calculate revenue if applicable
      await this.calculateRevenue(userId, jobId, "apply");
    } catch (error: any) {
      console.error("Error tracking job apply:", error);
    }
  }

  /**
   * Track external link click (for affiliate revenue)
   */
  async trackExternalLink(
    userId: string,
    jobId: string,
    affiliateId?: string,
  ): Promise<void> {
    try {
      const pool = (db as any).getPool();

      await pool.query(
        `INSERT INTO job_clicks (user_id, job_posting_id, click_type, source, affiliate_id, timestamp)
         VALUES ($1, $2, 'external_link', 'external', $3, CURRENT_TIMESTAMP)`,
        [userId, jobId, affiliateId || null],
      );

      // Calculate revenue
      await this.calculateRevenue(userId, jobId, "external_link", affiliateId);
    } catch (error: any) {
      console.error("Error tracking external link:", error);
    }
  }

  /**
   * Calculate revenue from job click
   */
  private async calculateRevenue(
    userId: string,
    jobId: string,
    clickType: string,
    affiliateId?: string,
  ): Promise<void> {
    try {
      const pool = (db as any).getPool();

      // Get job posting to check revenue model
      const jobResult = await pool.query(
        `SELECT revenue_model, revenue_per_click, revenue_per_apply FROM job_postings WHERE id = $1`,
        [jobId],
      );

      if (jobResult.rows.length === 0) return;

      const job = jobResult.rows[0];
      let revenue = 0;

      // Calculate revenue based on click type and job's revenue model
      if (clickType === "apply" && job.revenue_per_apply) {
        revenue = parseFloat(job.revenue_per_apply) || 0;
      } else if (clickType === "external_link" && job.revenue_per_click) {
        revenue = parseFloat(job.revenue_per_click) || 0;
      }

      if (revenue > 0) {
        // Update click record with revenue
        await pool.query(
          `UPDATE job_clicks 
           SET revenue = $1, affiliate_id = $2
           WHERE user_id = $3 AND job_posting_id = $4 AND click_type = $5
           ORDER BY timestamp DESC LIMIT 1`,
          [revenue, affiliateId || null, userId, jobId, clickType],
        );

        // Update total revenue tracking
        await pool.query(
          `INSERT INTO revenue_tracking (job_posting_id, revenue, click_type, date)
           VALUES ($1, $2, $3, CURRENT_DATE)
           ON CONFLICT (job_posting_id, date, click_type)
           DO UPDATE SET revenue = revenue_tracking.revenue + $2`,
          [jobId, revenue, clickType],
        );
      }
    } catch (error: any) {
      console.error("Error calculating revenue:", error);
    }
  }

  /**
   * Get revenue statistics
   */
  async getRevenueStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<RevenueStats> {
    try {
      const pool = (db as any).getPool();

      let query = `
        SELECT 
          COALESCE(SUM(revenue), 0) as total_revenue,
          COUNT(*) FILTER (WHERE click_type IN ('apply', 'external_link')) as total_clicks,
          COUNT(*) FILTER (WHERE click_type = 'view') as total_views
        FROM job_clicks
        WHERE revenue > 0
      `;
      const params: any[] = [];

      if (startDate) {
        query += ` AND timestamp >= $${params.length + 1}`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND timestamp <= $${params.length + 1}`;
        params.push(endDate);
      }

      const result = await pool.query(query, params);
      const row = result.rows[0];

      const totalRevenue = parseFloat(row.total_revenue) || 0;
      const totalClicks = parseInt(row.total_clicks) || 0;
      const totalViews = parseInt(row.total_views) || 0;
      const conversionRate =
        totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
      const revenuePerClick = totalClicks > 0 ? totalRevenue / totalClicks : 0;

      return {
        totalRevenue,
        totalClicks,
        totalViews,
        conversionRate,
        revenuePerClick,
        period:
          startDate && endDate
            ? `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`
            : "all time",
      };
    } catch (error: any) {
      console.error("Error getting revenue stats:", error);
      return {
        totalRevenue: 0,
        totalClicks: 0,
        totalViews: 0,
        conversionRate: 0,
        revenuePerClick: 0,
        period: "error",
      };
    }
  }

  /**
   * Get top performing jobs by revenue
   */
  async getTopJobsByRevenue(limit = 10): Promise<any[]> {
    try {
      const pool = (db as any).getPool();

      const result = await pool.query(
        `SELECT 
          j.id,
          j.title,
          j.company,
          COUNT(DISTINCT c.user_id) as unique_clicks,
          COALESCE(SUM(c.revenue), 0) as total_revenue
         FROM job_postings j
         LEFT JOIN job_clicks c ON j.id = c.job_posting_id AND c.revenue > 0
         GROUP BY j.id, j.title, j.company
         ORDER BY total_revenue DESC
         LIMIT $1`,
        [limit],
      );

      return result.rows;
    } catch (error: any) {
      console.error("Error getting top jobs:", error);
      return [];
    }
  }
}

export const jobClickTracker = new JobClickTracker();
