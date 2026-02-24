/**
 * Unit tests for Redis Cache Utility
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { RedisCache } from "../redis-cache.js";

// Mock redis client
const mockRedisClient = {
  get: jest.fn() as jest.MockedFunction<any>,
  setEx: jest.fn() as jest.MockedFunction<any>,
  del: jest.fn() as jest.MockedFunction<any>,
  incr: jest.fn() as jest.MockedFunction<any>,
  expire: jest.fn() as jest.MockedFunction<any>,
  ttl: jest.fn() as jest.MockedFunction<any>,
  connect: (jest.fn() as jest.MockedFunction<any>).mockResolvedValue(undefined),
  quit: (jest.fn() as jest.MockedFunction<any>).mockResolvedValue(undefined),
  on: jest.fn() as jest.MockedFunction<any>,
};

jest.mock("redis", () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

describe("RedisCache", () => {
  let cache: RedisCache;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new RedisCache();
  });

  afterEach(async () => {
    await cache.close();
  });

  describe("getUser", () => {
    it("should return cached user data", async () => {
      const userId = "user-123";
      const userData = {
        id: userId,
        email: "test@example.com",
        name: "Test User",
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(userData));

      const result = await cache.getUser(userId);

      expect(result).toEqual(userData);
      expect(mockRedisClient.get).toHaveBeenCalledWith(`user:${userId}`);
    });

    it("should return null when user not cached", async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cache.getUser("user-123");

      expect(result).toBeNull();
    });

    it("should handle errors gracefully", async () => {
      mockRedisClient.get.mockRejectedValue(new Error("Redis error"));

      const result = await cache.getUser("user-123");

      expect(result).toBeNull();
    });
  });

  describe("setUser", () => {
    it("should cache user data with TTL", async () => {
      const userId = "user-123";
      const userData = { id: userId, email: "test@example.com" };
      const ttl = 3600;

      await cache.setUser(userId, userData, ttl);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `user:${userId}`,
        ttl,
        JSON.stringify(userData),
      );
    });

    it("should use default TTL if not provided", async () => {
      const userId = "user-123";
      const userData = { id: userId };

      await cache.setUser(userId, userData);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `user:${userId}`,
        3600,
        JSON.stringify(userData),
      );
    });

    it("should handle errors gracefully", async () => {
      mockRedisClient.setEx.mockRejectedValue(new Error("Redis error"));

      await expect(cache.setUser("user-123", {})).resolves.not.toThrow();
    });
  });

  describe("invalidateUser", () => {
    it("should delete user from cache", async () => {
      const userId = "user-123";

      await cache.invalidateUser(userId);

      expect(mockRedisClient.del).toHaveBeenCalledWith(`user:${userId}`);
    });

    it("should handle errors gracefully", async () => {
      mockRedisClient.del.mockRejectedValue(new Error("Redis error"));

      await expect(cache.invalidateUser("user-123")).resolves.not.toThrow();
    });
  });

  describe("getSession", () => {
    it("should return cached session data", async () => {
      const sessionToken = "session-123";
      const sessionData = {
        userId: "user-123",
        createdAt: "2024-01-01T00:00:00Z",
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));

      const result = await cache.getSession(sessionToken);

      expect(result).toEqual(sessionData);
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        `session:${sessionToken}`,
      );
    });

    it("should return null when session not cached", async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cache.getSession("session-123");

      expect(result).toBeNull();
    });
  });

  describe("setSession", () => {
    it("should cache session with default TTL", async () => {
      const sessionToken = "session-123";
      const sessionData = { userId: "user-123" };
      const defaultTTL = 7 * 24 * 60 * 60; // 7 days

      await cache.setSession(sessionToken, sessionData);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `session:${sessionToken}`,
        defaultTTL,
        JSON.stringify(sessionData),
      );
    });

    it("should cache session with custom TTL", async () => {
      const sessionToken = "session-123";
      const sessionData = { userId: "user-123" };
      const customTTL = 3600;

      await cache.setSession(sessionToken, sessionData, customTTL);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `session:${sessionToken}`,
        customTTL,
        JSON.stringify(sessionData),
      );
    });
  });

  describe("deleteSession", () => {
    it("should delete session from cache", async () => {
      const sessionToken = "session-123";

      await cache.deleteSession(sessionToken);

      expect(mockRedisClient.del).toHaveBeenCalledWith(
        `session:${sessionToken}`,
      );
    });
  });

  describe("checkRateLimit", () => {
    it("should allow request when under limit", async () => {
      const key = "ratelimit:test";
      const limit = 10;
      const windowSeconds = 60;

      mockRedisClient.incr.mockResolvedValue(5);
      mockRedisClient.ttl.mockResolvedValue(45);

      const result = await cache.checkRateLimit(key, limit, windowSeconds);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
      expect(mockRedisClient.incr).toHaveBeenCalledWith(`ratelimit:${key}`);
    });

    it("should set expiry on first request", async () => {
      const key = "ratelimit:test";
      const limit = 10;
      const windowSeconds = 60;

      mockRedisClient.incr.mockResolvedValue(1);
      mockRedisClient.ttl.mockResolvedValue(60);

      await cache.checkRateLimit(key, limit, windowSeconds);

      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        `ratelimit:${key}`,
        windowSeconds,
      );
    });

    it("should deny request when over limit", async () => {
      const key = "ratelimit:test";
      const limit = 10;
      const windowSeconds = 60;

      mockRedisClient.incr.mockResolvedValue(11);
      mockRedisClient.ttl.mockResolvedValue(30);

      const result = await cache.checkRateLimit(key, limit, windowSeconds);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should fail open on Redis errors", async () => {
      const key = "ratelimit:test";
      const limit = 10;
      const windowSeconds = 60;

      mockRedisClient.incr.mockRejectedValue(new Error("Redis error"));

      const result = await cache.checkRateLimit(key, limit, windowSeconds);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(limit);
    });

    it("should calculate resetAt correctly", async () => {
      const key = "ratelimit:test";
      const limit = 10;
      const windowSeconds = 60;

      mockRedisClient.incr.mockResolvedValue(5);
      mockRedisClient.ttl.mockResolvedValue(45);

      const before = Date.now();
      const result = await cache.checkRateLimit(key, limit, windowSeconds);
      const after = Date.now();

      expect(result.resetAt).toBeGreaterThanOrEqual(before + 45 * 1000);
      expect(result.resetAt).toBeLessThanOrEqual(after + 45 * 1000);
    });
  });
});
