/**
 * Job Posting API Endpoints
 *
 * Handles job posting creation, listing, and management
 */

import { Router, Request, Response } from "express";
import { db } from "../db/client.js";
import { redisCache } from "../utils/redis-cache.js";
import { apiRateLimiter } from "../utils/rate-limiter.js";

const router = Router();

// JobPosting interface - kept for type reference
// interface JobPosting {
//   id: string;
//   employerId: string;
//   title: string;
//   company: string;
//   description: string;
//   requirements?: string;
//   location?: string;
//   remote: boolean;
//   salaryMin?: number;
//   salaryMax?: number;
//   salaryCurrency: string;
//   employmentType?: string;
//   status: string;
//   applicationUrl?: string;
//   expiresAt?: Date;
//   createdAt: Date;
//   updatedAt: Date;
// }

// Middleware to check if user is employer
function requireEmployer(req: Request, res: Response, next: () => void): void {
  const user = (req as any).user;
  if (!user || (user.userRole !== "employer" && user.userRole !== "admin")) {
    res.status(403).json({ error: "Employer access required" });
    return;
  }
  next();
}

// List all active job postings
router.get(
  "/",
  apiRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = "1",
        limit = "20",
        status = "active",
        search,
        location,
        remote,
      } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      // Build query
      let query = `
      SELECT j.*, u.name as employer_name, u.email as employer_email
      FROM job_postings j
      JOIN users u ON j.employer_id = u.id
      WHERE 1=1
    `;
      const params: any[] = [];
      let paramCount = 1;

      if (status) {
        query += ` AND j.status = $${paramCount++}`;
        params.push(status);
      }

      if (search) {
        query += ` AND (j.title ILIKE $${paramCount} OR j.description ILIKE $${paramCount} OR j.company ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      if (location) {
        query += ` AND j.location ILIKE $${paramCount++}`;
        params.push(`%${location}%`);
      }

      if (remote === "true") {
        query += ` AND j.remote = true`;
      }

      query += ` ORDER BY j.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
      params.push(limitNum, offset);

      const pool = (db as any).getPool();
      const result = await pool.query(query, params);
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM job_postings WHERE status = $1`,
        [status],
      );

      res.json({
        jobs: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limitNum),
        },
      });
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

// Get job details
router.get(
  "/:id",
  apiRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Try cache first
      const cached = await redisCache.getUser(`job:${id}`);
      if (cached) {
        res.json(cached);
        return;
      }

      const pool = (db as any).getPool();
      const result = await pool.query(
        `SELECT j.*, u.name as employer_name, u.email as employer_email
       FROM job_postings j
       JOIN users u ON j.employer_id = u.id
       WHERE j.id = $1`,
        [id],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "Job posting not found" });
        return;
      }

      const job = result.rows[0];

      // Cache for 1 hour
      await redisCache.setUser(`job:${id}`, job, 3600);

      res.json(job);
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

// Create job posting (employer only)
router.post(
  "/",
  apiRateLimiter,
  requireEmployer,
  async (req: Request, res: Response, _next: () => void): Promise<void> => {
    try {
      const user = (req as any).user;
      const {
        title,
        company,
        description,
        requirements,
        location,
        remote = false,
        salaryMin,
        salaryMax,
        salaryCurrency = "USD",
        employmentType,
        applicationUrl,
        expiresAt,
      } = req.body;

      if (!title || !company || !description) {
        res
          .status(400)
          .json({ error: "Title, company, and description are required" });
        return;
      }

      const pool = (db as any).getPool();
      const result = await pool.query(
        `INSERT INTO job_postings (
        employer_id, title, company, description, requirements,
        location, remote, salary_min, salary_max, salary_currency,
        employment_type, application_url, expires_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active')
      RETURNING *`,
        [
          user.id,
          title,
          company,
          description,
          requirements || null,
          location || null,
          remote,
          salaryMin || null,
          salaryMax || null,
          salaryCurrency,
          employmentType || null,
          applicationUrl || null,
          expiresAt ? new Date(expiresAt) : null,
        ],
      );

      res.status(201).json(result.rows[0]);
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

// Update job posting (employer only)
router.put(
  "/:id",
  apiRateLimiter,
  requireEmployer,
  async (req: Request, res: Response, _next: () => void): Promise<void> => {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      // Verify ownership
      const pool = (db as any).getPool();
      const checkResult = await pool.query(
        `SELECT employer_id FROM job_postings WHERE id = $1`,
        [id],
      );

      if (checkResult.rows.length === 0) {
        res.status(404).json({ error: "Job posting not found" });
        return;
      }

      if (
        checkResult.rows[0].employer_id !== user.id &&
        user.userRole !== "admin"
      ) {
        res
          .status(403)
          .json({ error: "Not authorized to update this job posting" });
        return;
      }

      const {
        title,
        company,
        description,
        requirements,
        location,
        remote,
        salaryMin,
        salaryMax,
        salaryCurrency,
        employmentType,
        applicationUrl,
        expiresAt,
        status,
      } = req.body;

      const updateFields: string[] = [];
      const params: any[] = [];
      let paramCount = 1;

      if (title) {
        updateFields.push(`title = $${paramCount++}`);
        params.push(title);
      }
      if (company) {
        updateFields.push(`company = $${paramCount++}`);
        params.push(company);
      }
      if (description) {
        updateFields.push(`description = $${paramCount++}`);
        params.push(description);
      }
      if (requirements !== undefined) {
        updateFields.push(`requirements = $${paramCount++}`);
        params.push(requirements);
      }
      if (location !== undefined) {
        updateFields.push(`location = $${paramCount++}`);
        params.push(location);
      }
      if (remote !== undefined) {
        updateFields.push(`remote = $${paramCount++}`);
        params.push(remote);
      }
      if (salaryMin !== undefined) {
        updateFields.push(`salary_min = $${paramCount++}`);
        params.push(salaryMin);
      }
      if (salaryMax !== undefined) {
        updateFields.push(`salary_max = $${paramCount++}`);
        params.push(salaryMax);
      }
      if (salaryCurrency) {
        updateFields.push(`salary_currency = $${paramCount++}`);
        params.push(salaryCurrency);
      }
      if (employmentType !== undefined) {
        updateFields.push(`employment_type = $${paramCount++}`);
        params.push(employmentType);
      }
      if (applicationUrl !== undefined) {
        updateFields.push(`application_url = $${paramCount++}`);
        params.push(applicationUrl);
      }
      if (expiresAt !== undefined) {
        updateFields.push(`expires_at = $${paramCount++}`);
        params.push(expiresAt ? new Date(expiresAt) : null);
      }
      if (status) {
        updateFields.push(`status = $${paramCount++}`);
        params.push(status);
      }

      if (updateFields.length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);

      const result = await pool.query(
        `UPDATE job_postings SET ${updateFields.join(", ")} WHERE id = $${paramCount} RETURNING *`,
        params,
      );

      // Invalidate cache
      await redisCache.invalidateUser(`job:${id}`);

      res.json(result.rows[0]);
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

// Delete job posting (employer only)
router.delete(
  "/:id",
  apiRateLimiter,
  requireEmployer,
  async (req: Request, res: Response, _next: () => void): Promise<void> => {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      const pool = (db as any).getPool();

      // Verify ownership
      const checkResult = await pool.query(
        `SELECT employer_id FROM job_postings WHERE id = $1`,
        [id],
      );

      if (checkResult.rows.length === 0) {
        res.status(404).json({ error: "Job posting not found" });
        return;
      }

      if (
        checkResult.rows[0].employer_id !== user.id &&
        user.userRole !== "admin"
      ) {
        res
          .status(403)
          .json({ error: "Not authorized to delete this job posting" });
        return;
      }

      await pool.query(`DELETE FROM job_postings WHERE id = $1`, [id]);

      // Invalidate cache
      await redisCache.invalidateUser(`job:${id}`);

      res.json({ success: true });
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

// Get employer's job postings
router.get(
  "/my-postings",
  apiRateLimiter,
  requireEmployer,
  async (req: Request, res: Response, _next: () => void): Promise<void> => {
    try {
      const user = (req as any).user;
      const pool = (db as any).getPool();

      const result = await pool.query(
        `SELECT j.*, 
       (SELECT COUNT(*) FROM job_applications WHERE job_posting_id = j.id) as application_count
       FROM job_postings j
       WHERE j.employer_id = $1
       ORDER BY j.created_at DESC`,
        [user.id],
      );

      res.json(result.rows);
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

export default router;
