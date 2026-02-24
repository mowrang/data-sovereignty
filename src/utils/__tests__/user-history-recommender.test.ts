/**
 * Unit tests for User History Recommender
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { UserHistoryRecommender } from "../user-history-recommender.js";

// Mock dependencies
const mockDb = {
  getUserJobDescriptions: jest.fn() as jest.MockedFunction<any>,
};

const mockJobRecommenderManager = {
  getRecommendationsForJobDescription: jest.fn() as jest.MockedFunction<any>,
};

jest.mock("../db/client.js", () => ({
  db: mockDb,
}));

jest.mock("../job-recommender-manager.js", () => ({
  jobRecommenderManager: mockJobRecommenderManager,
}));

describe("UserHistoryRecommender", () => {
  let recommender: UserHistoryRecommender;

  beforeEach(() => {
    jest.clearAllMocks();
    recommender = new UserHistoryRecommender();
  });

  describe("getRecommendationsFromHistory", () => {
    it("should return empty array when user has no history", async () => {
      mockDb.getUserJobDescriptions.mockResolvedValue([]);

      const result = await recommender.getRecommendationsFromHistory(
        "user-123",
        6,
      );

      expect(result).toEqual([]);
    });

    it("should get recommendations from user's job description history", async () => {
      const mockHistory = [
        {
          id: "jd-1",
          jobDescription: "Software Engineer at Tech Corp",
          location: "San Francisco",
          keywords: ["software", "engineer", "tech"],
          resumeUpdated: true,
          createdAt: new Date(),
        },
        {
          id: "jd-2",
          jobDescription: "Data Scientist at AI Startup",
          location: "New York",
          keywords: ["data", "scientist", "ai"],
          resumeUpdated: true,
          createdAt: new Date(),
        },
      ];

      const mockRecommendations1 = [
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

      const mockRecommendations2 = [
        {
          jobId: "job-2",
          title: "Data Scientist",
          company: "AI Startup",
          description: "AI role",
          url: "https://example.com/job/2",
          matchScore: 90,
          reasons: ["Perfect match"],
          source: "adzuna",
        },
      ];

      mockDb.getUserJobDescriptions.mockResolvedValue(mockHistory);
      mockJobRecommenderManager.getRecommendationsForJobDescription
        .mockResolvedValueOnce(mockRecommendations1)
        .mockResolvedValueOnce(mockRecommendations2);

      const result = await recommender.getRecommendationsFromHistory(
        "user-123",
        6,
      );

      expect(result.length).toBeGreaterThan(0);
      expect(
        mockJobRecommenderManager.getRecommendationsForJobDescription,
      ).toHaveBeenCalledTimes(2);
    });

    it("should only use job descriptions where resume was updated", async () => {
      const mockHistory = [
        {
          id: "jd-1",
          jobDescription: "Software Engineer",
          location: null,
          keywords: [],
          resumeUpdated: true,
          createdAt: new Date(),
        },
        {
          id: "jd-2",
          jobDescription: "Data Scientist",
          location: null,
          keywords: [],
          resumeUpdated: false, // Resume not updated
          createdAt: new Date(),
        },
      ];

      mockDb.getUserJobDescriptions.mockResolvedValue(mockHistory);
      mockJobRecommenderManager.getRecommendationsForJobDescription.mockResolvedValue(
        [],
      );

      await recommender.getRecommendationsFromHistory("user-123", 6);

      // Should only call for jd-1 (resumeUpdated = true)
      expect(
        mockJobRecommenderManager.getRecommendationsForJobDescription,
      ).toHaveBeenCalledTimes(1);
    });

    it("should deduplicate recommendations", async () => {
      const mockHistory = [
        {
          id: "jd-1",
          jobDescription: "Software Engineer",
          location: null,
          keywords: [],
          resumeUpdated: true,
          createdAt: new Date(),
        },
      ];

      const mockRecommendations = [
        {
          jobId: "job-1",
          title: "Software Engineer",
          company: "Tech Corp",
          description: "Desc",
          url: "https://example.com/1",
          matchScore: 85,
          reasons: [],
          source: "adzuna",
        },
        {
          jobId: "job-2",
          title: "Software Engineer", // Same title + company
          company: "Tech Corp",
          description: "Desc",
          url: "https://example.com/2",
          matchScore: 90, // Higher score
          reasons: [],
          source: "adzuna",
        },
      ];

      mockDb.getUserJobDescriptions.mockResolvedValue(mockHistory);
      mockJobRecommenderManager.getRecommendationsForJobDescription.mockResolvedValue(
        mockRecommendations,
      );

      const result = await recommender.getRecommendationsFromHistory(
        "user-123",
        6,
      );

      // Should deduplicate - only keep higher score
      expect(result.length).toBe(1);
      expect(result[0].matchScore).toBe(90);
    });

    it("should sort by match score descending", async () => {
      const mockHistory = [
        {
          id: "jd-1",
          jobDescription: "Software Engineer",
          location: null,
          keywords: [],
          resumeUpdated: true,
          createdAt: new Date(),
        },
      ];

      const mockRecommendations = [
        {
          jobId: "job-1",
          title: "Job 1",
          company: "Company 1",
          description: "Desc",
          url: "https://example.com/1",
          matchScore: 60,
          reasons: [],
          source: "adzuna",
        },
        {
          jobId: "job-2",
          title: "Job 2",
          company: "Company 2",
          description: "Desc",
          url: "https://example.com/2",
          matchScore: 90,
          reasons: [],
          source: "adzuna",
        },
      ];

      mockDb.getUserJobDescriptions.mockResolvedValue(mockHistory);
      mockJobRecommenderManager.getRecommendationsForJobDescription.mockResolvedValue(
        mockRecommendations,
      );

      const result = await recommender.getRecommendationsFromHistory(
        "user-123",
        6,
      );

      expect(result[0].matchScore).toBeGreaterThanOrEqual(
        result[1]?.matchScore || 0,
      );
    });
  });

  describe("getRecommendationsFromLatestJD", () => {
    it("should get recommendations from most recent job description", async () => {
      const mockHistory = [
        {
          id: "jd-1",
          jobDescription: "Software Engineer",
          location: "San Francisco",
          keywords: [],
          resumeUpdated: true,
          createdAt: new Date(),
        },
      ];

      mockDb.getUserJobDescriptions.mockResolvedValue(mockHistory);
      mockJobRecommenderManager.getRecommendationsForJobDescription.mockResolvedValue(
        [],
      );

      await recommender.getRecommendationsFromLatestJD("user-123", 6);

      expect(
        mockJobRecommenderManager.getRecommendationsForJobDescription,
      ).toHaveBeenCalledWith(
        "user-123",
        "Software Engineer",
        "San Francisco",
        6,
      );
    });

    it("should return empty array when no history", async () => {
      mockDb.getUserJobDescriptions.mockResolvedValue([]);

      const result = await recommender.getRecommendationsFromLatestJD(
        "user-123",
        6,
      );

      expect(result).toEqual([]);
    });
  });

  describe("getRecommendationsFromKeywords", () => {
    it("should extract keywords and get recommendations", async () => {
      const mockHistory = [
        {
          id: "jd-1",
          jobDescription: "Software Engineer",
          location: null,
          keywords: ["software", "engineer", "python"],
          resumeUpdated: true,
          createdAt: new Date(),
        },
        {
          id: "jd-2",
          jobDescription: "Data Scientist",
          location: null,
          keywords: ["data", "scientist", "machine"],
          resumeUpdated: true,
          createdAt: new Date(),
        },
      ];

      mockDb.getUserJobDescriptions.mockResolvedValue(mockHistory);
      mockJobRecommenderManager.getRecommendationsForJobDescription.mockResolvedValue(
        [],
      );

      await recommender.getRecommendationsFromKeywords("user-123", 6);

      // Should create search query from keywords
      expect(
        mockJobRecommenderManager.getRecommendationsForJobDescription,
      ).toHaveBeenCalled();
      const callArgs =
        mockJobRecommenderManager.getRecommendationsForJobDescription.mock
          .calls[0];
      expect(callArgs[1]).toContain("software"); // Should include keywords
    });

    it("should return empty array when no keywords", async () => {
      const mockHistory = [
        {
          id: "jd-1",
          jobDescription: "Test",
          location: null,
          keywords: [],
          resumeUpdated: true,
          createdAt: new Date(),
        },
      ];

      mockDb.getUserJobDescriptions.mockResolvedValue(mockHistory);
      mockJobRecommenderManager.getRecommendationsForJobDescription.mockResolvedValue(
        [],
      );

      const result = await recommender.getRecommendationsFromKeywords(
        "user-123",
        6,
      );

      expect(result).toEqual([]);
    });
  });
});
