/**
 * Unit tests for Adzuna Recommender
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { AdzunaRecommender } from "../adzuna-recommender.js";

// Mock dependencies
const mockPool = {
  query: jest.fn() as jest.MockedFunction<any>,
};

const mockDb = {
  getPool: jest.fn(() => mockPool) as jest.MockedFunction<any>,
  getUserById: jest.fn() as jest.MockedFunction<any>,
};

const mockJobBoardIntegrator = {
  searchAdzuna: jest.fn() as jest.MockedFunction<any>,
  importJobsToDatabase: jest.fn() as jest.MockedFunction<any>,
};

const mockJobMatcher = {
  calculateMatchScore: jest.fn() as jest.MockedFunction<any>,
};

jest.mock("../integrations/job-boards.js", () => ({
  jobBoardIntegrator: mockJobBoardIntegrator,
}));

jest.mock("../db/client.js", () => ({
  db: mockDb,
}));

jest.mock("../job-matcher.js", () => ({
  getJobMatcherForUser: jest.fn(() => Promise.resolve(mockJobMatcher)),
}));

describe("AdzunaRecommender", () => {
  let recommender: AdzunaRecommender;

  beforeEach(() => {
    jest.clearAllMocks();
    recommender = new AdzunaRecommender();
  });

  describe("getRecommendationsForAppliedJob", () => {
    it("should return empty array when job not found", async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await recommender.getRecommendationsForAppliedJob(
        "user-123",
        "non-existent-job",
        10,
      );

      expect(result).toEqual([]);
    });

    it("should fetch and match Adzuna jobs", async () => {
      const appliedJob = {
        id: "applied-job-123",
        title: "Software Engineer",
        company: "Tech Corp",
        description: "Looking for React developer",
        location: "San Francisco",
      };

      const adzunaJobs = [
        {
          id: "adzuna-1",
          title: "Senior Software Engineer",
          company: "Another Corp",
          description: "React and Node.js",
          location: "San Francisco",
          salary: "$120k-$150k",
          affiliateUrl: "https://adzuna.com/job/1",
        },
      ];

      const dbJob = {
        id: "db-job-1",
        external_id: "adzuna-1",
        source: "adzuna",
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [appliedJob] }) // Get applied job
        .mockResolvedValueOnce({ rows: [dbJob] }); // Get imported job

      mockJobBoardIntegrator.searchAdzuna.mockResolvedValue(adzunaJobs);
      mockJobBoardIntegrator.importJobsToDatabase.mockResolvedValue(undefined);
      mockJobMatcher.calculateMatchScore.mockResolvedValue({
        score: 85,
        reasons: ["Strong React experience", "Good match"],
      });

      // Mock getUserProfile
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await recommender.getRecommendationsForAppliedJob(
        "user-123",
        "applied-job-123",
        10,
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].matchScore).toBe(85);
      expect(mockJobBoardIntegrator.searchAdzuna).toHaveBeenCalled();
    });

    it("should filter jobs with match score <= 50", async () => {
      const appliedJob = {
        id: "applied-job-123",
        title: "Software Engineer",
        company: "Tech Corp",
        description: "Looking for React developer",
        location: "San Francisco",
      };

      const adzunaJobs = [
        {
          id: "adzuna-1",
          title: "Unrelated Job",
          company: "Other Corp",
          description: "Completely different",
          affiliateUrl: "https://adzuna.com/job/1",
        },
      ];

      const dbJob = {
        id: "db-job-1",
        external_id: "adzuna-1",
        source: "adzuna",
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [appliedJob] })
        .mockResolvedValueOnce({ rows: [dbJob] });

      mockJobBoardIntegrator.searchAdzuna.mockResolvedValue(adzunaJobs);
      mockJobBoardIntegrator.importJobsToDatabase.mockResolvedValue(undefined);
      mockJobMatcher.calculateMatchScore.mockResolvedValue({
        score: 30,
        reasons: ["Low match"],
      });
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await recommender.getRecommendationsForAppliedJob(
        "user-123",
        "applied-job-123",
        10,
      );

      expect(result).toEqual([]);
    });

    it("should extract search query from applied job", async () => {
      const appliedJob = {
        id: "applied-job-123",
        title: "Senior Software Engineer - React",
        company: "Tech Corp",
        description: "Looking for React developer",
        location: "San Francisco",
      };

      mockPool.query.mockResolvedValueOnce({ rows: [appliedJob] });
      mockJobBoardIntegrator.searchAdzuna.mockResolvedValue([]);
      mockPool.query.mockResolvedValue({ rows: [] });

      await recommender.getRecommendationsForAppliedJob(
        "user-123",
        "applied-job-123",
        10,
      );

      expect(mockJobBoardIntegrator.searchAdzuna).toHaveBeenCalledWith(
        expect.stringContaining("Software Engineer"),
        "San Francisco",
        20,
      );
    });
  });

  describe("getRecommendationsFromHistory", () => {
    it("should return recommendations based on user's application history", async () => {
      const appliedJobs = [
        {
          id: "applied-1",
          title: "Software Engineer",
          company: "Tech Corp",
          applied_at: new Date(),
        },
      ];

      const adzunaJobs = [
        {
          id: "adzuna-1",
          title: "Senior Software Engineer",
          company: "Another Corp",
          description: "React developer",
          affiliateUrl: "https://adzuna.com/job/1",
        },
      ];

      const dbJob = {
        id: "db-job-1",
        external_id: "adzuna-1",
        source: "adzuna",
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: appliedJobs }) // Get applied jobs
        .mockResolvedValueOnce({ rows: [dbJob] }); // Get imported job

      mockJobBoardIntegrator.searchAdzuna.mockResolvedValue(adzunaJobs);
      mockJobBoardIntegrator.importJobsToDatabase.mockResolvedValue(undefined);
      mockJobMatcher.calculateMatchScore.mockResolvedValue({
        score: 80,
        reasons: ["Good match"],
      });
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await recommender.getRecommendationsFromHistory(
        "user-123",
        10,
      );

      expect(result.length).toBeGreaterThan(0);
    });

    it("should return empty array when user has no applications", async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await recommender.getRecommendationsFromHistory(
        "user-123",
        10,
      );

      expect(result).toEqual([]);
    });
  });
});
