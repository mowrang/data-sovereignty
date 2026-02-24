/**
 * Unit tests for Job Matcher Utility
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { JobMatcher, getJobMatcherForUser } from "../job-matcher.js";

// Mock dependencies
const mockPool = {
  query: jest.fn() as jest.MockedFunction<any>,
};

const mockDb = {
  getUserById: jest.fn() as jest.MockedFunction<any>,
  getPool: jest.fn(() => mockPool) as jest.MockedFunction<any>,
};

const mockRedisCache = {
  getUser: jest.fn() as jest.MockedFunction<any>,
  setUser: jest.fn() as jest.MockedFunction<any>,
};

const mockLLM = {
  invoke: jest.fn() as jest.MockedFunction<any>,
};

jest.mock("../db/client.js", () => ({
  db: mockDb,
}));

jest.mock("../redis-cache.js", () => ({
  redisCache: mockRedisCache,
}));

jest.mock("@langchain/anthropic", () => ({
  ChatAnthropic: jest.fn(() => mockLLM),
}));

jest.mock("@langchain/openai", () => ({
  ChatOpenAI: jest.fn(() => mockLLM),
}));

describe("JobMatcher", () => {
  let matcher: JobMatcher;

  beforeEach(() => {
    jest.clearAllMocks();
    matcher = new JobMatcher("anthropic");
  });

  describe("constructor", () => {
    it("should create Anthropic LLM by default", () => {
      const _m = new JobMatcher();
      expect(_m).toBeInstanceOf(JobMatcher);
    });

    it("should create OpenAI LLM when provider is openai", async () => {
      const { ChatOpenAI } = await import("@langchain/openai");
      new JobMatcher("openai", "sk-test-key");
      expect(ChatOpenAI).toHaveBeenCalledWith({
        modelName: "gpt-4",
        temperature: 0.3,
        openAIApiKey: "sk-test-key",
      });
    });
  });

  describe("calculateMatchScore", () => {
    const mockUserProfile = {
      userId: "user-123",
      resumeContent:
        "Experienced software engineer with 5 years in React and Node.js",
      appliedJobs: [],
      skills: ["React", "Node.js", "TypeScript"],
    };

    const mockJob = {
      id: "job-123",
      title: "Senior Software Engineer",
      company: "Tech Corp",
      description: "Looking for experienced React developer",
      requirements: "5+ years React, Node.js experience",
      location: "San Francisco",
      remote: true,
    };

    it("should return cached score if available", async () => {
      const cachedScore = { score: 85, reasons: ["Great match"] };
      mockRedisCache.getUser.mockResolvedValue(cachedScore);

      const result = await matcher.calculateMatchScore(
        mockUserProfile,
        mockJob,
      );

      expect(result).toEqual(cachedScore);
      expect(mockRedisCache.getUser).toHaveBeenCalledWith(
        `job_match:${mockUserProfile.userId}:${mockJob.id}`,
      );
      expect(mockLLM.invoke).not.toHaveBeenCalled();
    });

    it("should use AI to calculate score when not cached", async () => {
      mockRedisCache.getUser.mockResolvedValue(null);
      const aiResponse = {
        content: JSON.stringify({
          score: 90,
          reasons: ["Strong React experience", "Good match"],
        }),
      };
      mockLLM.invoke.mockResolvedValue(aiResponse);

      const result = await matcher.calculateMatchScore(
        mockUserProfile,
        mockJob,
      );

      expect(result.score).toBe(90);
      expect(result.reasons).toHaveLength(2);
      expect(mockLLM.invoke).toHaveBeenCalled();
      expect(mockRedisCache.setUser).toHaveBeenCalled();
    });

    it("should fallback to simple matching on AI error", async () => {
      mockRedisCache.getUser.mockResolvedValue(null);
      mockLLM.invoke.mockRejectedValue(new Error("AI error"));

      const result = await matcher.calculateMatchScore(
        mockUserProfile,
        mockJob,
      );

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.reasons).toBeInstanceOf(Array);
    });

    it("should handle invalid AI response format", async () => {
      mockRedisCache.getUser.mockResolvedValue(null);
      mockLLM.invoke.mockResolvedValue({ content: "Invalid response" });

      const result = await matcher.calculateMatchScore(
        mockUserProfile,
        mockJob,
      );

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.reasons).toBeInstanceOf(Array);
    });
  });

  describe("getRecommendedJobs", () => {
    it("should return empty array when no jobs available", async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await matcher.getRecommendedJobs("user-123");

      expect(result).toEqual([]);
    });

    it("should return jobs with match score > 50", async () => {
      const mockJobs = [
        { id: "job-1", title: "Job 1", company: "Company 1" },
        { id: "job-2", title: "Job 2", company: "Company 2" },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockJobs });
      mockRedisCache.getUser.mockResolvedValue(null);
      mockLLM.invoke.mockResolvedValue({
        content: JSON.stringify({ score: 75, reasons: ["Good match"] }),
      });

      // Mock getUserProfile
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await matcher.getRecommendedJobs("user-123", 10);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].matchScore).toBeGreaterThan(50);
    });

    it("should filter out jobs with score <= 50", async () => {
      const mockJobs = [{ id: "job-1", title: "Job 1", company: "Company 1" }];

      mockPool.query.mockResolvedValueOnce({ rows: mockJobs });
      mockRedisCache.getUser.mockResolvedValue(null);
      mockLLM.invoke.mockResolvedValue({
        content: JSON.stringify({ score: 30, reasons: ["Low match"] }),
      });
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await matcher.getRecommendedJobs("user-123");

      expect(result).toEqual([]);
    });

    it("should sort by match score descending", async () => {
      const mockJobs = [
        { id: "job-1", title: "Job 1", company: "Company 1" },
        { id: "job-2", title: "Job 2", company: "Company 2" },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockJobs });
      mockRedisCache.getUser.mockResolvedValue(null);
      mockLLM.invoke
        .mockResolvedValueOnce({
          content: JSON.stringify({ score: 60, reasons: ["Match"] }),
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({ score: 80, reasons: ["Better match"] }),
        });
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await matcher.getRecommendedJobs("user-123", 10);

      expect(result[0].matchScore).toBeGreaterThanOrEqual(
        result[1]?.matchScore || 0,
      );
    });
  });

  describe("getSimilarJobs", () => {
    it("should return empty array when user has no applications", async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await matcher.getSimilarJobs("user-123");

      expect(result).toEqual([]);
    });

    it("should find similar jobs based on applied jobs", async () => {
      const appliedJobs = [
        { id: "applied-1", title: "Software Engineer", company: "Tech Corp" },
      ];
      const similarJobs = [
        {
          id: "similar-1",
          title: "Senior Software Engineer",
          company: "Tech Corp",
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: appliedJobs })
        .mockResolvedValueOnce({ rows: similarJobs });
      mockDb.getUserById.mockResolvedValue({ id: "user-123" });
      mockRedisCache.getUser.mockResolvedValue(null);
      mockLLM.invoke.mockResolvedValue({
        content: JSON.stringify({ score: 70, reasons: ["Similar job"] }),
      });
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await matcher.getSimilarJobs("user-123");

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("updateJobMatches", () => {
    it("should update job matches in database", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockRedisCache.getUser.mockResolvedValue(null);
      mockLLM.invoke.mockResolvedValue({
        content: JSON.stringify({ score: 85, reasons: ["Great match"] }),
      });
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // getUserProfile
        .mockResolvedValueOnce(undefined) // DELETE
        .mockResolvedValueOnce(undefined); // INSERT

      await matcher.updateJobMatches("user-123");

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM job_matches"),
        ["user-123"],
      );
    });
  });
});

describe("getJobMatcherForUser", () => {
  it("should create matcher with user's AI provider", async () => {
    mockDb.getUserById.mockResolvedValue({
      id: "user-123",
      aiProvider: "openai",
      aiApiKey: "sk-test-key",
    });

    const matcher = await getJobMatcherForUser("user-123");

    expect(matcher).toBeInstanceOf(JobMatcher);
    expect(mockDb.getUserById).toHaveBeenCalledWith("user-123");
  });
});
