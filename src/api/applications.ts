/**
 * Job Application API Endpoints
 *
 * Handles job applications and resume tailoring
 */

import { Router, Request, Response } from "express";
import { db } from "../db/client.js";
import { Client } from "@langchain/langgraph-sdk";
import { apiRateLimiter, chatRateLimiter } from "../utils/rate-limiter.js";

const router = Router();

const LANGGRAPH_API_URL =
  process.env.LANGGRAPH_API_URL || "http://localhost:54367";
const langgraphClient = new Client({ apiUrl: LANGGRAPH_API_URL });

// Middleware to check if user is employer
function requireEmployer(req: Request, res: Response, next: () => void): void {
  const user = (req as any).user;
  if (!user || (user.userRole !== "employer" && user.userRole !== "admin")) {
    res.status(403).json({ error: "Employer access required" });
    return;
  }
  next();
}

// Apply to a job (creates tailored resume)
router.post(
  "/jobs/:jobId/apply",
  chatRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const { jobId } = req.params;
      const { coverLetter } = req.body;

      // Get job posting
      const pool = (db as any).getPool();
      const jobResult = await pool.query(
        `SELECT * FROM job_postings WHERE id = $1 AND status = 'active'`,
        [jobId],
      );

      if (jobResult.rows.length === 0) {
        res.status(404).json({ error: "Job posting not found or not active" });
        return;
      }

      const job = jobResult.rows[0];

      // Check if already applied
      const existingApp = await pool.query(
        `SELECT id FROM job_applications WHERE job_posting_id = $1 AND applicant_id = $2`,
        [jobId, user.id],
      );

      if (existingApp.rows.length > 0) {
        res.status(400).json({ error: "Already applied to this job" });
        return;
      }

      // Get user's resume thread (they need to have read their resume first)
      // For now, we'll create a new thread or use existing one
      // In production, you'd want to store the thread ID per user

      // Create tailored resume using LangGraph
      const assistantId = await getResumeAgentAssistantId();
      const thread = await langgraphClient.threads.create();

      // Run resume agent with job description
      const state = (await langgraphClient.runs.wait(
        thread.thread_id,
        assistantId,
        {
          input: {
            originalResumeId: "", // User needs to provide this or we get from their profile
            jobDescription: `${job.title} at ${job.company}\n\n${job.description}\n\nRequirements:\n${job.requirements || "N/A"}`,
          },
          config: {
            configurable: {
              userId: user.id,
            },
          },
        },
      )) as any;

      if (state?.error) {
        res
          .status(500)
          .json({ error: `Failed to create tailored resume: ${state.error}` });
        return;
      }

      // Fetch Adzuna recommendations in background (don't wait)
      import("../utils/adzuna-recommender.js")
        .then(({ adzunaRecommender }) => {
          adzunaRecommender
            .getRecommendationsForAppliedJob(user.id, jobId, 10)
            .then((recommendations) => {
              console.log(
                `Found ${recommendations.length} Adzuna recommendations for job ${jobId}`,
              );
            })
            .catch((error) => {
              console.error("Error fetching Adzuna recommendations:", error);
            });
        })
        .catch(() => {
          // Adzuna not available, that's okay
        });

      // Create application record
      const applicationResult = await pool.query(
        `INSERT INTO job_applications (
        job_posting_id, applicant_id, resume_doc_id, resume_url, cover_letter, status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *`,
        [
          jobId,
          user.id,
          state.copiedResumeId || null,
          state.copiedResumeId
            ? `https://docs.google.com/document/d/${state.copiedResumeId}/edit`
            : null,
          coverLetter || null,
        ],
      );

      res.status(201).json({
        application: applicationResult.rows[0],
        resumeUrl: state.copiedResumeId
          ? `https://docs.google.com/document/d/${state.copiedResumeId}/edit`
          : null,
        message: "Application submitted successfully",
      });
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

// Get applications for a job (employer only)
router.get(
  "/jobs/:jobId/applications",
  apiRateLimiter,
  requireEmployer,
  async (req: Request, res: Response, _next: () => void): Promise<void> => {
    try {
      const user = (req as any).user;
      const { jobId } = req.params;

      const pool = (db as any).getPool();

      // Verify job ownership
      const jobResult = await pool.query(
        `SELECT employer_id FROM job_postings WHERE id = $1`,
        [jobId],
      );

      if (jobResult.rows.length === 0) {
        res.status(404).json({ error: "Job posting not found" });
        return;
      }

      if (
        jobResult.rows[0].employer_id !== user.id &&
        user.userRole !== "admin"
      ) {
        res.status(403).json({ error: "Not authorized" });
        return;
      }

      const result = await pool.query(
        `SELECT a.*, u.name as applicant_name, u.email as applicant_email
       FROM job_applications a
       JOIN users u ON a.applicant_id = u.id
       WHERE a.job_posting_id = $1
       ORDER BY a.applied_at DESC`,
        [jobId],
      );

      res.json(result.rows);
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

// Get user's applications
router.get(
  "/my",
  apiRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const pool = (db as any).getPool();

      const result = await pool.query(
        `SELECT a.*, j.title as job_title, j.company as job_company, j.status as job_status
       FROM job_applications a
       JOIN job_postings j ON a.job_posting_id = j.id
       WHERE a.applicant_id = $1
       ORDER BY a.applied_at DESC`,
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

// Update application status (employer only)
router.put(
  "/:id/status",
  apiRateLimiter,
  requireEmployer,
  async (req: Request, res: Response, _next: () => void): Promise<void> => {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = [
        "pending",
        "reviewed",
        "interview",
        "rejected",
        "accepted",
      ];
      if (!status || !validStatuses.includes(status)) {
        res
          .status(400)
          .json({
            error: `Status must be one of: ${validStatuses.join(", ")}`,
          });
        return;
      }

      const pool = (db as any).getPool();

      // Verify job ownership through application
      const appResult = await pool.query(
        `SELECT a.*, j.employer_id
       FROM job_applications a
       JOIN job_postings j ON a.job_posting_id = j.id
       WHERE a.id = $1`,
        [id],
      );

      if (appResult.rows.length === 0) {
        res.status(404).json({ error: "Application not found" });
        return;
      }

      if (
        appResult.rows[0].employer_id !== user.id &&
        user.userRole !== "admin"
      ) {
        res.status(403).json({ error: "Not authorized" });
        return;
      }

      const result = await pool.query(
        `UPDATE job_applications 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
        [status, id],
      );

      res.json(result.rows[0]);
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  },
);

// Helper function to get resume agent assistant ID
let resumeAgentAssistantId: string | null = null;

async function getResumeAgentAssistantId(): Promise<string> {
  if (resumeAgentAssistantId) {
    return resumeAgentAssistantId;
  }

  try {
    const assistants = await langgraphClient.assistants.search({});
    const resumeAgent = assistants.find(
      (a: any) => a.graph_id === "resume_agent",
    );

    if (!resumeAgent) {
      throw new Error("resume_agent not found");
    }

    resumeAgentAssistantId = resumeAgent.assistant_id;
    return resumeAgentAssistantId;
  } catch (error: any) {
    throw new Error(`Failed to find resume_agent: ${error.message}`);
  }
}

export default router;
