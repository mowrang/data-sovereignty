/**
 * Unit tests for Job Recommendations API
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Request, Response } from "express";
import jobRecommendationsRouter from "../job-recommendations.js";

// Mock dependencies
const mockJobRecommenderManager = {
  getRecommendationsForJobDescription: jest.fn() as jest.MockedFunction<any>,
  getRecommendationsForAppliedJob: jest.fn() as jest.MockedFunction<any>,
  getRecommendationsFromHistory: jest.fn() as jest.MockedFunction<any>,
  getEnabledRecommenders: jest.fn() as jest.MockedFunction<any>,
};

const mockJobClickTracker = {
  trackView: jest.fn() as jest.MockedFunction<any>,
  trackExternalLink: jest.fn() as jest.MockedFunction<any>,
};

jest.mock("../../utils/job-recommender-manager.js", () => ({
  jobRecommenderManager: mockJobRecommenderManager,
}));

jest.mock("../../utils/job-click-tracker.js", () => ({
  jobClickTracker: mockJobClickTracker,
}));

jest.mock("../../utils/rate-limiter.js", () => ({
  apiRateLimiter: (_req: Request, _res: Response, next: () => void) => next(),
}));

describe("Job Recommendations API", () => {
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
      },
    };
    res = {
      json: jest.fn().mockReturnThis() as any,
      status: jest.fn().mockReturnThis() as any,
    };
  });

  describe("GET /by-description", () => {
    it("should get recommendations based on job description", async () => {
      req.query = {
        description: "Software Engineer position",
        location: "San Francisco",
        limit: "10",
      };

      const mockRecommendations = [
        {
          jobId: "job-1",
          title: "Software Engineer",
          company: "Tech Corp",
          description: "Great opportunity",
          url: "https://example.com/job/1",
          matchScore: 85,
          reasons: ["Great match"],
          source: "adzuna",
        },
      ];

      mockJobRecommenderManager.getRecommendationsForJobDescription.mockResolvedValue(
        mockRecommendations,
      );
      mockJobRecommenderManager.getEnabledRecommenders.mockReturnValue([
        "adzuna",
      ]);

      const route = jobRecommendationsRouter.stack.find(
        (r: any) => r.route?.path === "/by-description",
      );
      if (route && route.route) {
        await (route.route as any).stack[0].handle(
          req as Request,
          res as Response,
          () => {},
        );
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            recommendations: mockRecommendations,
            count: 1,
            sources: ["adzuna"],
          }),
        );
        expect(mockJobClickTracker.trackView).toHaveBeenCalled();
      }
    });

    it("should return 400 when description is missing", async () => {
      req.query = { limit: "10" };

      const route = jobRecommendationsRouter.stack.find(
        (r: any) => r.route?.path === "/by-description",
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

    it("should handle errors gracefully", async () => {
      req.query = {
        description: "Software Engineer",
        limit: "10",
      };

      mockJobRecommenderManager.getRecommendationsForJobDescription.mockRejectedValue(
        new Error("API error"),
      );

      const route = jobRecommendationsRouter.stack.find(
        (r: any) => r.route?.path === "/by-description",
      );
      if (route && route.route) {
        await (route.route as any).stack[0].handle(
          req as Request,
          res as Response,
          () => {},
        );
        expect(res.status).toHaveBeenCalledWith(500);
      }
    });
  });

  describe("GET /adzuna", () => {
    it("should get recommendations for applied job when jobId provided", async () => {
      req.query = { jobId: "applied-job-123", limit: "10" };

      const mockRecommendations = [
        {
          jobId: "job-1",
          title: "Software Engineer",
          company: "Tech Corp",
          description: "Great opportunity",
          url: "https://example.com/job/1",
          matchScore: 85,
          reasons: ["Great match"],
          source: "adzuna",
        },
      ];

      mockJobRecommenderManager.getRecommendationsForAppliedJob.mockResolvedValue(
        mockRecommendations,
      );

      const route = jobRecommendationsRouter.stack.find(
        (r: any) => r.route?.path === "/adzuna",
      );
      if (route && route.route) {
        await (route.route as any).stack[0].handle(
          req as Request,
          res as Response,
          () => {},
        );
        expect(
          mockJobRecommenderManager.getRecommendationsForAppliedJob,
        ).toHaveBeenCalledWith("user-123", "applied-job-123", 10);
      }
    });

    it("should get recommendations from history when jobId not provided", async () => {
      req.query = { limit: "10" };

      const mockRecommendations = [
        {
          jobId: "job-1",
          title: "Software Engineer",
          company: "Tech Corp",
          description: "Great opportunity",
          url: "https://example.com/job/1",
          matchScore: 85,
          reasons: ["Great match"],
          source: "adzuna",
        },
      ];

      mockJobRecommenderManager.getRecommendationsFromHistory.mockResolvedValue(
        mockRecommendations,
      );

      const route = jobRecommendationsRouter.stack.find(
        (r: any) => r.route?.path === "/adzuna",
      );
      if (route && route.route) {
        await (route.route as any).stack[0].handle(
          req as Request,
          res as Response,
          () => {},
        );
        expect(
          mockJobRecommenderManager.getRecommendationsFromHistory,
        ).toHaveBeenCalledWith("user-123", 10);
      }
    });
  });

  describe("POST /:jobId/click", () => {
    it("should track job click", async () => {
      req.params = { jobId: "job-123" };
      req.body = { affiliateId: "affiliate-123" };

      mockJobClickTracker.trackExternalLink.mockResolvedValue(undefined);

      const route = jobRecommendationsRouter.stack.find(
        (r: any) => r.route?.path === "/:jobId/click" && r.route?.methods?.post,
      );
      if (route && route.route) {
        await (route.route as any).stack[0].handle(
          req as Request,
          res as Response,
          () => {},
        );
        expect(mockJobClickTracker.trackExternalLink).toHaveBeenCalledWith(
          "user-123",
          "job-123",
          "affiliate-123",
        );
        expect(res.json).toHaveBeenCalledWith({ success: true });
      }
    });
  });
});
