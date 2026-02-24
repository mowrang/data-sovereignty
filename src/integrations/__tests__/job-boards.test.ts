/**
 * Unit tests for Job Boards Integration
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { JobBoardIntegrator } from "../job-boards.js";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("JobBoardIntegrator", () => {
  let integrator: JobBoardIntegrator;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.ADZUNA_APP_ID;
    delete process.env.ADZUNA_API_KEY;
    delete process.env.ADZUNA_ENABLED;
    delete process.env.ADZUNA_APP_ID_1;
    delete process.env.ADZUNA_API_KEY_1;
    integrator = new JobBoardIntegrator();
  });

  describe("loadConfigs", () => {
    it("should load Adzuna config when enabled", () => {
      process.env.ADZUNA_ENABLED = "true";
      process.env.ADZUNA_APP_ID = "test-app-id";
      process.env.ADZUNA_API_KEY = "test-api-key";

      const newIntegrator = new JobBoardIntegrator();
      expect(newIntegrator).toBeInstanceOf(JobBoardIntegrator);
    });

    it("should load multiple Adzuna keys", () => {
      process.env.ADZUNA_ENABLED = "true";
      process.env.ADZUNA_APP_ID_1 = "app-id-1";
      process.env.ADZUNA_API_KEY_1 = "api-key-1";
      process.env.ADZUNA_APP_ID_2 = "app-id-2";
      process.env.ADZUNA_API_KEY_2 = "api-key-2";

      const newIntegrator = new JobBoardIntegrator();
      expect(newIntegrator).toBeInstanceOf(JobBoardIntegrator);
    });
  });

  describe("searchAdzuna", () => {
    beforeEach(() => {
      process.env.ADZUNA_ENABLED = "true";
      process.env.ADZUNA_APP_ID = "test-app-id";
      process.env.ADZUNA_API_KEY = "test-api-key";
      integrator = new JobBoardIntegrator();
    });

    it("should search Adzuna API successfully", async () => {
      const mockResponse = {
        data: {
          results: [
            {
              id: "job-1",
              title: "Software Engineer",
              company: { display_name: "Tech Corp" },
              description: "Great opportunity",
              location: [{ display_name: "San Francisco" }],
              salary_min: 100000,
              salary_max: 150000,
              redirect_url: "https://adzuna.com/job/1",
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const jobs = await integrator.searchAdzuna(
        "software engineer",
        "United States",
        10,
      );

      expect(jobs.length).toBeGreaterThan(0);
      expect(jobs[0].title).toBe("Software Engineer");
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      mockedAxios.get.mockRejectedValue(new Error("API error"));

      const jobs = await integrator.searchAdzuna(
        "software engineer",
        "United States",
        10,
      );

      expect(jobs).toEqual([]);
    });

    it("should use round-robin for multiple API keys", async () => {
      process.env.ADZUNA_APP_ID_1 = "app-id-1";
      process.env.ADZUNA_API_KEY_1 = "api-key-1";
      process.env.ADZUNA_APP_ID_2 = "app-id-2";
      process.env.ADZUNA_API_KEY_2 = "api-key-2";

      const newIntegrator = new JobBoardIntegrator();
      const mockResponse = { data: { results: [] } };

      mockedAxios.get.mockResolvedValue(mockResponse);

      await newIntegrator.searchAdzuna("test", "US", 10);
      await newIntegrator.searchAdzuna("test", "US", 10);

      // Should use different keys
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it("should retry with next key on rate limit", async () => {
      process.env.ADZUNA_APP_ID_1 = "app-id-1";
      process.env.ADZUNA_API_KEY_1 = "api-key-1";
      process.env.ADZUNA_APP_ID_2 = "app-id-2";
      process.env.ADZUNA_API_KEY_2 = "api-key-2";

      const newIntegrator = new JobBoardIntegrator();

      // First call returns 429
      mockedAxios.get
        .mockRejectedValueOnce({
          response: { status: 429, statusText: "Too Many Requests" },
        })
        .mockResolvedValueOnce({ data: { results: [] } });

      await newIntegrator.searchAdzuna("test", "US", 10);

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it("should cache search results", async () => {
      const mockResponse = { data: { results: [] } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await integrator.searchAdzuna("test query", "US", 10);
      await integrator.searchAdzuna("test query", "US", 10);

      // Should only call API once due to caching
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe("getNextAdzunaKey", () => {
    beforeEach(() => {
      process.env.ADZUNA_ENABLED = "true";
      process.env.ADZUNA_APP_ID_1 = "app-id-1";
      process.env.ADZUNA_API_KEY_1 = "api-key-1";
      process.env.ADZUNA_APP_ID_2 = "app-id-2";
      process.env.ADZUNA_API_KEY_2 = "api-key-2";
      integrator = new JobBoardIntegrator();
    });

    it("should rotate keys in round-robin fashion", () => {
      const key1 = (integrator as any).getNextAdzunaKey();
      const key2 = (integrator as any).getNextAdzunaKey();
      const key3 = (integrator as any).getNextAdzunaKey();

      expect(key1.appId).toBe("app-id-1");
      expect(key2.appId).toBe("app-id-2");
      expect(key3.appId).toBe("app-id-1"); // Should wrap around
    });

    it("should track usage count", () => {
      const key1 = (integrator as any).getNextAdzunaKey();
      expect(key1.usageCount).toBe(0);

      const key2 = (integrator as any).getNextAdzunaKey();
      expect(key2.usageCount).toBe(1);
    });
  });

  describe("importJobsToDatabase", () => {
    const mockPool = {
      query: jest.fn() as jest.MockedFunction<any>,
    };

    beforeEach(() => {
      (integrator as any).pool = mockPool;
    });

    it("should import jobs to database", async () => {
      const mockJobs = [
        {
          id: "external-1",
          title: "Software Engineer",
          company: "Tech Corp",
          description: "Great job",
          location: "San Francisco",
          salary: "$100k-$150k",
          url: "https://example.com/job/1",
          affiliateUrl: "https://adzuna.com/job/1",
          source: "adzuna",
        },
      ];

      mockPool.query.mockResolvedValue({ rows: [] });

      await integrator.importJobsToDatabase(mockJobs, "user-123");

      expect(mockPool.query).toHaveBeenCalled();
    });

    it("should skip duplicate jobs", async () => {
      const mockJobs = [
        {
          id: "external-1",
          title: "Software Engineer",
          company: "Tech Corp",
          description: "Great job",
          url: "https://example.com/job/1",
          affiliateUrl: "https://adzuna.com/job/1",
          source: "adzuna",
        },
      ];

      // Job already exists
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: "existing-job" }] });

      await integrator.importJobsToDatabase(mockJobs, "user-123");

      // Should not insert duplicate
      const insertCalls = mockPool.query.mock.calls.filter((call: any[]) =>
        call[0].includes("INSERT"),
      );
      expect(insertCalls.length).toBe(0);
    });
  });
});
