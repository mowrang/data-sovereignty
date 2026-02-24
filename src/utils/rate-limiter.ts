/**
 * Rate Limiting Middleware
 *
 * Protects API endpoints from abuse and DoS attacks
 */

import { Request, Response, NextFunction } from "express";
import { redisCache } from "./redis-cache.js";

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export function rateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = "Too many requests, please try again later",
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // Generate rate limit key based on IP and user ID if available
    const userId = (req as any).userId || "anonymous";
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `ratelimit:${userId}:${ip}:${req.path}`;

    try {
      const { allowed, remaining, resetAt } = await redisCache.checkRateLimit(
        key,
        max,
        windowSeconds,
      );

      // Set rate limit headers
      res.setHeader("X-RateLimit-Limit", max.toString());
      res.setHeader("X-RateLimit-Remaining", remaining.toString());
      res.setHeader("X-RateLimit-Reset", new Date(resetAt).toISOString());

      if (!allowed) {
        res.status(429).json({
          error: message,
          retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
        });
        return;
      }

      // Store response status to check if we should skip counting
      const originalSend = res.send;
      res.send = function (body: any) {
        const statusCode = res.statusCode;

        // Only count if we should track this status
        if (skipSuccessfulRequests && statusCode < 400) {
          // Don't count successful requests
        } else if (skipFailedRequests && statusCode >= 400) {
          // Don't count failed requests
        } else {
          // Count this request (already counted in checkRateLimit)
        }

        return originalSend.call(this, body);
      };

      next();
      return;
    } catch (error) {
      // Fail open - allow request if rate limiting fails
      next();
      return;
      console.error("Rate limiter error:", error);
      next();
    }
  };
}

// Pre-configured rate limiters
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: "Too many authentication attempts, please try again later",
});

export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: "Too many API requests, please slow down",
});

export const chatRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 chat requests per minute (expensive operations)
  message: "Too many chat requests, please wait a moment",
});
