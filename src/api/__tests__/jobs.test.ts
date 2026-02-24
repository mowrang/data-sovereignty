/**
 * Unit tests for Jobs API Routes
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Request, Response } from "express";
import jobsRouter from "../jobs.js";

// Mock dependencies
const mockPool = {
  query: jest.fn() as jest.MockedFunction<any>,
};

const mockDb = {
  getPool: jest.fn(() => mockPool) as jest.MockedFunction<any>,
  getUserById: jest.fn() as jest.MockedFunction<any>,
};

const mockRedisCache = {
  invalidateUser: jest.fn() as jest.MockedFunction<any>,
};

jest.mock("../../db/client.js", () => ({
  db: mockDb,
}));

jest.mock("../../utils/redis-cache.js", () => ({
  redisCache: mockRedisCache,
}));

jest.mock("../../utils/rate-limiter.js", () => ({
  apiRateLimiter: (_req: Request, _res: Response, next: () => void) => next(),
}));

describe("Jobs API Routes", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      query: {},
      params: {},
      body: {},
      user: {
        id: "user-123",
        email: "test@example.com",
        userRole: "job_seeker",
      },
    };
    res = {
      json: jest.fn().mockReturnThis() as any,
      status: jest.fn().mockReturnThis() as any,
    };
  });

  describe("GET /", () => {
    it("should list active jobs with pagination", async () => {
      const mockJobs = [
        {
          id: "job-1",
          title: "Software Engineer",
          company: "Tech Corp",
          status: "active",
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockJobs })
        .mockResolvedValueOnce({ rows: [{ count: "1" }] });

      // Find the GET / route handler
      const route = jobsRouter.stack.find(
        (r: any) => r.route?.path === "/" && r.route?.methods?.get,
      );
      if (route && route.route) {
        await (route.route as any).stack[0].handle(
          req as Request,
          res as Response,
          () => {},
        );
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            jobs: mockJobs,
            pagination: expect.objectContaining({
              page: 1,
              limit: 20,
            }),
          }),
        );
      }
    });

    it("should filter by search query", async () => {
      req.query = { search: "engineer" };
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: "0" }] });

      const route = jobsRouter.stack.find(
        (r: any) => r.route?.path === "/" && r.route?.methods?.get,
      );
      if (route && route.route) {
        await (route.route as any).stack[0].handle(
          req as Request,
          res as Response,
          () => {},
        );
        const queryCall = mockPool.query.mock.calls[0][0];
        expect(queryCall).toContain("ILIKE");
      }
    });

    it("should filter by location", async () => {
      req.query = { location: "San Francisco" };
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: "0" }] });

      const route = jobsRouter.stack.find(
        (r: any) => r.route?.path === "/" && r.route?.methods?.get,
      );
      if (route && route.route) {
        await (route.route as any).stack[0].handle(
          req as Request,
          res as Response,
          () => {},
        );
        const queryCall = mockPool.query.mock.calls[0][0];
        expect(queryCall).toContain("location");
      }
    });

    it("should filter by remote", async () => {
      req.query = { remote: "true" };
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: "0" }] });

      const route = jobsRouter.stack.find(
        (r: any) => r.route?.path === "/" && r.route?.methods?.get,
      );
      if (route && route.route) {
        await (route.route as any).stack[0].handle(
          req as Request,
          res as Response,
          () => {},
        );
        const queryCall = mockPool.query.mock.calls[0][0];
        expect(queryCall).toContain("remote = true");
      }
    });
  });

  describe("POST /", () => {
    beforeEach(() => {
      req.user = {
        id: "employer-123",
        email: "employer@example.com",
        userRole: "employer",
      };
    });

    it("should create job posting for employer", async () => {
      req.body = {
        title: "Software Engineer",
        company: "Tech Corp",
        description: "Great opportunity",
        location: "San Francisco",
        remote: true,
      };

      const mockJob = {
        id: "job-123",
        ...req.body,
        employer_id: "employer-123",
        status: "active",
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValue({ rows: [mockJob] });

      const route = jobsRouter.stack.find(
        (r: any) => r.route?.path === "/" && r.route?.methods?.post,
      );
      if (route && route.route) {
        await (route.route as any).stack[0].handle(
          req as Request,
          res as Response,
          () => {},
        );
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            job: expect.objectContaining({
              title: "Software Engineer",
            }),
          }),
        );
      }
    });

    it("should reject non-employer users", async () => {
      req.user = {
        id: "user-123",
        userRole: "job_seeker",
      };

      const route = jobsRouter.stack.find(
        (r: any) => r.route?.path === "/" && r.route?.methods?.post,
      );
      if (route && route.route) {
        // Check middleware
        const middleware = (route.route as any).stack.find(
          (m: any) => m.name === "requireEmployer",
        );
        if (middleware) {
          middleware.handle(req as Request, res as Response, () => {});
          expect(res.status).toHaveBeenCalledWith(403);
        }
      }
    });
  });

  describe("GET /:id", () => {
    it("should get job by ID", async () => {
      req.params = { id: "job-123" };
      const mockJob = {
        id: "job-123",
        title: "Software Engineer",
        company: "Tech Corp",
      };

      mockPool.query.mockResolvedValue({ rows: [mockJob] });

      const route = jobsRouter.stack.find(
        (r: any) => r.route?.path === "/:id" && r.route?.methods?.get,
      );
      if (route && route.route) {
        await (route.route as any).stack[0].handle(
          req as Request,
          res as Response,
          () => {},
        );
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            job: mockJob,
          }),
        );
      }
    });

    it("should return 404 when job not found", async () => {
      req.params = { id: "non-existent" };
      mockPool.query.mockResolvedValue({ rows: [] });

      const route = jobsRouter.stack.find(
        (r: any) => r.route?.path === "/:id" && r.route?.methods?.get,
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
  });
});
