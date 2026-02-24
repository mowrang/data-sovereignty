/**
 * Unit tests for Job Recommender Manager
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { JobRecommenderManager } from "../job-recommender-manager.js";
import {
  IJobRecommender,
  JobRecommendation,
  RecommendationOptions,
} from "../job-recommender-interface.js";

// Mock recommender
class MockRecommender implements IJobRecommender {
  readonly name: string;
  readonly enabled = true;

  constructor(name = "mock") {
    this.name = name;
  }

  async getRecommendations(
    _options: RecommendationOptions,
  ): Promise<JobRecommendation[]> {
    return [
      {
        jobId: "job-1",
        title: "Software Engineer",
        company: "Tech Corp",
        description: "Great opportunity",
        url: "https://example.com/job/1",
        matchScore: 85,
        reasons: ["Great match"],
        source: this.name,
      },
    ];
  }

  async getRecommendationsForJobDescription(
    userId: string,
    jobDescription: string,
    location?: string,
    limit?: number,
  ): Promise<JobRecommendation[]> {
    return this.getRecommendations({ userId, jobDescription, location, limit });
  }

  async getRecommendationsForAppliedJob(
    userId: string,
    appliedJobId: string,
    limit?: number,
  ): Promise<JobRecommendation[]> {
    return this.getRecommendations({ userId, appliedJobId, limit });
  }

  async getRecommendationsFromHistory(
    userId: string,
    limit?: number,
  ): Promise<JobRecommendation[]> {
    return this.getRecommendations({ userId, limit });
  }
}

class DisabledRecommender implements IJobRecommender {
  readonly name = "disabled";
  readonly enabled = false;

  async getRecommendations(
    _options: RecommendationOptions,
  ): Promise<JobRecommendation[]> {
    return [];
  }

  async getRecommendationsForJobDescription(
    _userId: string,
    _jobDescription: string,
    _location?: string,
    _limit?: number,
  ): Promise<JobRecommendation[]> {
    return [];
  }

  async getRecommendationsForAppliedJob(
    _userId: string,
    _appliedJobId: string,
    _limit?: number,
  ): Promise<JobRecommendation[]> {
    return [];
  }

  async getRecommendationsFromHistory(
    _userId: string,
    _limit?: number,
  ): Promise<JobRecommendation[]> {
    return [];
  }
}

describe("JobRecommenderManager", () => {
  let manager: JobRecommenderManager;

  beforeEach(() => {
    manager = new JobRecommenderManager();
    // Clear registered recommenders
    (manager as any).recommenders.clear();
  });

  describe("registerRecommender", () => {
    it("should register enabled recommender", () => {
      const recommender = new MockRecommender();
      manager.registerRecommender(recommender);

      expect((manager as any).recommenders.has("mock")).toBe(true);
    });

    it("should skip disabled recommender", () => {
      const recommender = new DisabledRecommender();
      manager.registerRecommender(recommender);

      expect((manager as any).recommenders.has("disabled")).toBe(false);
    });
  });

  describe("getRecommendations", () => {
    it("should aggregate recommendations from multiple recommenders", async () => {
      const recommender1 = new MockRecommender("recommender1");
      const recommender2 = new MockRecommender("recommender2");

      manager.registerRecommender(recommender1);
      manager.registerRecommender(recommender2);

      const recommendations = await manager.getRecommendations({
        userId: "user-123",
        jobDescription: "Software Engineer",
        limit: 10,
      });

      expect(recommendations.length).toBeGreaterThan(0);
    });

    it("should deduplicate recommendations", async () => {
      const recommender1 = new MockRecommender("recommender1");
      const recommender2 = new MockRecommender("recommender2");

      manager.registerRecommender(recommender1);
      manager.registerRecommender(recommender2);

      const recommendations = await manager.getRecommendations({
        userId: "user-123",
        jobDescription: "Software Engineer",
        limit: 10,
      });

      // Should deduplicate based on title + company
      const uniqueTitles = new Set(
        recommendations.map((r) => `${r.title}_${r.company}`),
      );
      expect(recommendations.length).toBe(uniqueTitles.size);
    });

    it("should sort by match score descending", async () => {
      const recommender = new MockRecommender();
      // @ts-expect-error - Jest mock type inference issue
      const mockFn = jest.fn().mockResolvedValue([
        {
          jobId: "job-1",
          title: "Job 1",
          company: "Company 1",
          description: "Desc 1",
          url: "https://example.com/1",
          matchScore: 60,
          reasons: [],
          source: "mock",
        },
        {
          jobId: "job-2",
          title: "Job 2",
          company: "Company 2",
          description: "Desc 2",
          url: "https://example.com/2",
          matchScore: 90,
          reasons: [],
          source: "mock",
        },
      ] as any) as jest.MockedFunction<any>;
      (recommender.getRecommendations as jest.MockedFunction<any>) = mockFn;

      manager.registerRecommender(recommender);

      const recommendations = await manager.getRecommendations({
        userId: "user-123",
        limit: 10,
      });

      expect(recommendations[0].matchScore).toBeGreaterThanOrEqual(
        recommendations[1]?.matchScore || 0,
      );
    });

    it("should respect limit", async () => {
      const recommender = new MockRecommender();
      const mockFn = jest.fn().mockResolvedValue(
        // @ts-expect-error - Jest mock type inference issue
        Array.from({ length: 20 }, (_, i) => ({
          jobId: `job-${i}`,
          title: `Job ${i}`,
          company: `Company ${i}`,
          description: "Desc",
          url: `https://example.com/${i}`,
          matchScore: 80 - i,
          reasons: [],
          source: "mock",
        })),
      ) as jest.MockedFunction<any>;
      (recommender.getRecommendations as jest.MockedFunction<any>) = mockFn;

      manager.registerRecommender(recommender);

      const recommendations = await manager.getRecommendations({
        userId: "user-123",
        limit: 5,
      });

      expect(recommendations.length).toBe(5);
    });

    it("should handle errors gracefully", async () => {
      const recommender = new MockRecommender();
      const mockFn = jest
        .fn()
        // @ts-expect-error - Jest mock type inference issue
        .mockRejectedValue(new Error("API error")) as jest.MockedFunction<any>;
      (recommender.getRecommendations as jest.MockedFunction<any>) = mockFn;

      manager.registerRecommender(recommender);

      const recommendations = await manager.getRecommendations({
        userId: "user-123",
        limit: 10,
      });

      // Should return empty array instead of throwing
      expect(recommendations).toEqual([]);
    });
  });

  describe("getRecommendationsForJobDescription", () => {
    it("should get recommendations for job description", async () => {
      const recommender = new MockRecommender();
      manager.registerRecommender(recommender);

      const recommendations = await manager.getRecommendationsForJobDescription(
        "user-123",
        "Software Engineer position",
        "San Francisco",
        10,
      );

      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("getRecommendationsForAppliedJob", () => {
    it("should get recommendations for applied job", async () => {
      const recommender = new MockRecommender();
      manager.registerRecommender(recommender);

      const recommendations = await manager.getRecommendationsForAppliedJob(
        "user-123",
        "applied-job-123",
        10,
      );

      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("getRecommendationsFromHistory", () => {
    it("should get recommendations from history", async () => {
      const recommender = new MockRecommender();
      manager.registerRecommender(recommender);

      const recommendations = await manager.getRecommendationsFromHistory(
        "user-123",
        10,
      );

      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("getRecommendationsFromSource", () => {
    it("should get recommendations from specific source", async () => {
      const recommender = new MockRecommender();
      manager.registerRecommender(recommender);

      const recommendations = await manager.getRecommendationsFromSource(
        "mock",
        {
          userId: "user-123",
          limit: 10,
        },
      );

      expect(recommendations.length).toBeGreaterThan(0);
    });

    it("should throw error for unknown source", async () => {
      await expect(
        manager.getRecommendationsFromSource("unknown", {
          userId: "user-123",
          limit: 10,
        }),
      ).rejects.toThrow("Recommender 'unknown' not found");
    });
  });

  describe("getEnabledRecommenders", () => {
    it("should return list of enabled recommenders", () => {
      const recommender1 = new MockRecommender("recommender1");
      const recommender2 = new MockRecommender("recommender2");

      manager.registerRecommender(recommender1);
      manager.registerRecommender(recommender2);

      const enabled = manager.getEnabledRecommenders();

      expect(enabled).toContain("recommender1");
      expect(enabled).toContain("recommender2");
    });
  });
});
