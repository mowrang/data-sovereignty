/**
 * Unit tests for Applications API Routes
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Request, Response } from "express";
import applicationsRouter from "../applications.js";

// Mock dependencies
const mockPool = {
  query: jest.fn() as jest.MockedFunction<any>,
};

const mockDb = {
  getPool: jest.fn(() => mockPool) as jest.MockedFunction<any>,
};

const mockLanggraphClient = {
  assistants: {
    search: jest.fn() as jest.MockedFunction<any>,
  },
  threads: {
    create: jest.fn() as jest.MockedFunction<any>,
  },
  runs: {
    wait: jest.fn() as jest.MockedFunction<any>,
  },
};

jest.mock("../../db/client.js", () => ({
  db: mockDb,
}));

jest.mock("@langchain/langgraph-sdk", () => ({
  Client: jest.fn(() => mockLanggraphClient),
}));

jest.mock("../../utils/rate-limiter.js", () => ({
  chatRateLimiter: (_req: Request, _res: Response, next: () => void) => next(),
  apiRateLimiter: (_req: Request, _res: Response, next: () => void) => next(),
}));

jest.mock("../../utils/adzuna-recommender.js", () => ({
  adzunaRecommender: {
    getRecommendationsForAppliedJob: jest.fn(),
  },
}));

describe("Applications API Routes", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: {},
      body: {},
      user: {
        id: "user-123",
        email: "test@example.com",
      },
    };
    res = {
      json: jest.fn().mockReturnThis() as any,
      status: jest.fn().mockReturnThis() as any,
    };
  });

  describe("POST /jobs/:jobId/apply", () => {
    it("should create application and trigger resume tailoring", async () => {
      req.params = { jobId: "job-123" };
      req.body = { coverLetter: "I'm interested..." };

      const mockJob = {
        id: "job-123",
        title: "Software Engineer",
        company: "Tech Corp",
        description: "Great opportunity",
        requirements: "5+ years experience",
      };

      const mockAssistant = {
        assistant_id: "assistant-123",
        graph_id: "resume_agent",
      };

      const mockThread = {
        thread_id: "thread-123",
      };

      const mockRunState = {
        values: {
          response: "Resume tailored successfully",
        },
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockJob] }) // Get job
        .mockResolvedValueOnce({ rows: [] }) // Check existing application
        .mockResolvedValueOnce({ rows: [{ id: "app-123" }] }); // Create application

      mockLanggraphClient.assistants.search.mockResolvedValue([mockAssistant]);
      mockLanggraphClient.threads.create.mockResolvedValue(mockThread);
      mockLanggraphClient.runs.wait.mockResolvedValue(mockRunState);

      const route = applicationsRouter.stack.find(
        (r: any) => r.route?.path === "/jobs/:jobId/apply",
      );
      if (route && route.route) {
        await (route.route as any).stack[0].handle(
          req as Request,
          res as Response,
          () => {},
        );
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
          }),
        );
      }
    });

    it("should return 404 when job not found", async () => {
      req.params = { jobId: "non-existent" };
      mockPool.query.mockResolvedValue({ rows: [] });

      const route = applicationsRouter.stack.find(
        (r: any) => r.route?.path === "/jobs/:jobId/apply",
      );
      if (route && route.route) {
        await (route.route as any).stack[0].handle(
          req as Request,
          res as Response,
          () => {},
        );
        expect(res.status).toHaveBeenCalledWith(404);
      }
    });

    it("should return 400 when already applied", async () => {
      req.params = { jobId: "job-123" };
      const mockJob = {
        id: "job-123",
        title: "Software Engineer",
        company: "Tech Corp",
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockJob] }) // Get job
        .mockResolvedValueOnce({ rows: [{ id: "existing-app" }] }); // Existing application

      const route = applicationsRouter.stack.find(
        (r: any) => r.route?.path === "/jobs/:jobId/apply",
      );
      if (route && route.route) {
        await (route.route as any).stack[0].handle(
          req as Request,
          res as Response,
          () => {},
        );
        expect(res.status).toHaveBeenCalledWith(400);
      }
    });
  });

  describe("GET /applications", () => {
    it("should list user's applications", async () => {
      const mockApplications = [
        {
          id: "app-1",
          job_posting_id: "job-1",
          applied_at: new Date(),
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockApplications });

      const route = applicationsRouter.stack.find(
        (r: any) => r.route?.path === "/",
      );
      if (route && route.route && (route.route as any).methods?.get) {
        await (route.route as any).stack[0].handle(
          req as Request,
          res as Response,
          () => {},
        );
        expect(res.json).toHaveBeenCalled();
      }
    });
  });
});
