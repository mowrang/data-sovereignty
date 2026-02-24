/**
 * Unit tests for Job Recommender Interface
 */

import { describe, it, expect } from "@jest/globals";
import {
  IJobRecommender,
  JobRecommendation,
  RecommendationOptions,
} from "../job-recommender-interface.js";

// Test implementation
class TestRecommender implements IJobRecommender {
  readonly name = "test";
  readonly enabled = true;

  async getRecommendations(
    _options: RecommendationOptions,
  ): Promise<JobRecommendation[]> {
    return [
      {
        jobId: "job-1",
        title: "Test Job",
        company: "Test Company",
        description: "Test description",
        url: "https://example.com/job/1",
        matchScore: 80,
        reasons: ["Test reason"],
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

describe("IJobRecommender Interface", () => {
  it("should have required properties", () => {
    const recommender = new TestRecommender();

    expect(recommender.name).toBe("test");
    expect(recommender.enabled).toBe(true);
  });

  it("should implement getRecommendations", async () => {
    const recommender = new TestRecommender();
    const _options: RecommendationOptions = {
      userId: "user-123",
      jobDescription: "Software Engineer",
      limit: 10,
    };

    const recommendations = await recommender.getRecommendations(_options);

    expect(recommendations).toBeInstanceOf(Array);
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0]).toHaveProperty("jobId");
    expect(recommendations[0]).toHaveProperty("title");
    expect(recommendations[0]).toHaveProperty("matchScore");
    expect(recommendations[0]).toHaveProperty("source");
  });

  it("should implement getRecommendationsForJobDescription", async () => {
    const recommender = new TestRecommender();

    const recommendations =
      await recommender.getRecommendationsForJobDescription(
        "user-123",
        "Software Engineer",
        "San Francisco",
        10,
      );

    expect(recommendations).toBeInstanceOf(Array);
  });

  it("should implement getRecommendationsForAppliedJob", async () => {
    const recommender = new TestRecommender();

    const recommendations = await recommender.getRecommendationsForAppliedJob(
      "user-123",
      "applied-job-123",
      10,
    );

    expect(recommendations).toBeInstanceOf(Array);
  });

  it("should implement getRecommendationsFromHistory", async () => {
    const recommender = new TestRecommender();

    const recommendations = await recommender.getRecommendationsFromHistory(
      "user-123",
      10,
    );

    expect(recommendations).toBeInstanceOf(Array);
  });

  it("should return JobRecommendation objects with required fields", async () => {
    const recommender = new TestRecommender();
    const recommendations = await recommender.getRecommendations({
      userId: "user-123",
      limit: 10,
    });

    const job = recommendations[0];
    expect(job).toHaveProperty("jobId");
    expect(job).toHaveProperty("title");
    expect(job).toHaveProperty("company");
    expect(job).toHaveProperty("description");
    expect(job).toHaveProperty("url");
    expect(job).toHaveProperty("matchScore");
    expect(job).toHaveProperty("reasons");
    expect(job).toHaveProperty("source");
    expect(typeof job.matchScore).toBe("number");
    expect(job.matchScore).toBeGreaterThanOrEqual(0);
    expect(job.matchScore).toBeLessThanOrEqual(100);
  });
});
