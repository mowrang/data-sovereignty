/**
 * Unit tests for Rate Limiter Middleware
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Request, Response, NextFunction } from "express";
import {
  rateLimiter,
  authRateLimiter,
  apiRateLimiter,
  chatRateLimiter,
} from "../rate-limiter.js";

// Mock redis cache
const mockRedisCache = {
  checkRateLimit: jest.fn() as jest.MockedFunction<any>,
};

jest.mock("../redis-cache.js", () => ({
  redisCache: mockRedisCache,
}));

describe("rateLimiter", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" } as any,
      path: "/api/test",
    };

    res = {
      setHeader: jest.fn().mockReturnThis() as any,
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
      send: jest.fn().mockReturnThis() as any,
      statusCode: 200,
    };

    next = jest.fn();
  });

  it("should allow request when under limit", async () => {
    mockRedisCache.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetAt: Date.now() + 60000,
    });

    const middleware = rateLimiter({ windowMs: 60000, max: 10 });
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", "10");
    expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", "5");
  });

  it("should deny request when over limit", async () => {
    mockRedisCache.checkRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 30000,
    });

    const middleware = rateLimiter({ windowMs: 60000, max: 10 });
    await middleware(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Too many requests, please try again later",
        retryAfter: expect.any(Number),
      }),
    );
  });

  it("should use custom error message", async () => {
    mockRedisCache.checkRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 30000,
    });

    const middleware = rateLimiter({
      windowMs: 60000,
      max: 10,
      message: "Custom error message",
    });
    await middleware(req as Request, res as Response, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Custom error message",
      }),
    );
  });

  it("should generate key from userId and IP", async () => {
    (req as any).userId = "user-123";
    mockRedisCache.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetAt: Date.now() + 60000,
    });

    const middleware = rateLimiter({ windowMs: 60000, max: 10 });
    await middleware(req as Request, res as Response, next);

    expect(mockRedisCache.checkRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("user-123"),
      10,
      60,
    );
  });

  it("should use anonymous when userId not available", async () => {
    mockRedisCache.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetAt: Date.now() + 60000,
    });

    const middleware = rateLimiter({ windowMs: 60000, max: 10 });
    await middleware(req as Request, res as Response, next);

    expect(mockRedisCache.checkRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("anonymous"),
      10,
      60,
    );
  });

  it("should fail open on Redis errors", async () => {
    mockRedisCache.checkRateLimit.mockRejectedValue(new Error("Redis error"));

    const middleware = rateLimiter({ windowMs: 60000, max: 10 });
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled(); // Should allow request
  });

  it("should convert windowMs to seconds correctly", async () => {
    mockRedisCache.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetAt: Date.now() + 90000,
    });

    const middleware = rateLimiter({ windowMs: 90000, max: 10 });
    await middleware(req as Request, res as Response, next);

    expect(mockRedisCache.checkRateLimit).toHaveBeenCalledWith(
      expect.any(String),
      10,
      90,
    );
  });
});

describe("Pre-configured rate limiters", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { ip: "127.0.0.1", path: "/api/test" };
    res = {
      setHeader: jest.fn() as jest.MockedFunction<any>,
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
      statusCode: 200,
    } as any;
    next = jest.fn();
  });

  it("authRateLimiter should have correct limits", async () => {
    mockRedisCache.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 3,
      resetAt: Date.now() + 900000,
    });

    await authRateLimiter(req as Request, res as Response, next);

    expect(mockRedisCache.checkRateLimit).toHaveBeenCalledWith(
      expect.any(String),
      5,
      900, // 15 minutes = 900 seconds
    );
  });

  it("apiRateLimiter should have correct limits", async () => {
    mockRedisCache.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 50,
      resetAt: Date.now() + 60000,
    });

    await apiRateLimiter(req as Request, res as Response, next);

    expect(mockRedisCache.checkRateLimit).toHaveBeenCalledWith(
      expect.any(String),
      60,
      60, // 1 minute = 60 seconds
    );
  });

  it("chatRateLimiter should have correct limits", async () => {
    mockRedisCache.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetAt: Date.now() + 60000,
    });

    await chatRateLimiter(req as Request, res as Response, next);

    expect(mockRedisCache.checkRateLimit).toHaveBeenCalledWith(
      expect.any(String),
      10,
      60, // 1 minute = 60 seconds
    );
  });
});
