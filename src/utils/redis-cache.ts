/**
 * Redis Cache Utility for User Data and Sessions
 *
 * Provides caching layer to reduce database load
 */

import { createClient, RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;

function getRedisClient(): RedisClientType {
  if (!redisClient) {
    const redisUrl =
      process.env.REDIS_URL ||
      `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}`;
    redisClient = createClient({
      url: redisUrl,
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    redisClient.connect().catch(console.error);
  }
  return redisClient;
}

export class RedisCache {
  private client: RedisClientType;

  constructor() {
    this.client = getRedisClient();
  }

  // User data caching
  async getUser(userId: string): Promise<any | null> {
    try {
      const cached = await this.client.get(`user:${userId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error("Redis getUser error:", error);
      return null;
    }
  }

  async setUser(
    userId: string,
    userData: any,
    ttlSeconds = 3600,
  ): Promise<void> {
    try {
      await this.client.setEx(
        `user:${userId}`,
        ttlSeconds,
        JSON.stringify(userData),
      );
    } catch (error) {
      console.error("Redis setUser error:", error);
    }
  }

  async invalidateUser(userId: string): Promise<void> {
    try {
      await this.client.del(`user:${userId}`);
    } catch (error) {
      console.error("Redis invalidateUser error:", error);
    }
  }

  // Session caching (alternative to PostgreSQL sessions)
  async getSession(sessionToken: string): Promise<any | null> {
    try {
      const cached = await this.client.get(`session:${sessionToken}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error("Redis getSession error:", error);
      return null;
    }
  }

  async setSession(
    sessionToken: string,
    sessionData: any,
    ttlSeconds: number = 7 * 24 * 60 * 60,
  ): Promise<void> {
    try {
      await this.client.setEx(
        `session:${sessionToken}`,
        ttlSeconds,
        JSON.stringify(sessionData),
      );
    } catch (error) {
      console.error("Redis setSession error:", error);
    }
  }

  async deleteSession(sessionToken: string): Promise<void> {
    try {
      await this.client.del(`session:${sessionToken}`);
    } catch (error) {
      console.error("Redis deleteSession error:", error);
    }
  }

  // Rate limiting
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    try {
      const current = await this.client.incr(`ratelimit:${key}`);

      if (current === 1) {
        await this.client.expire(`ratelimit:${key}`, windowSeconds);
      }

      const ttl = await this.client.ttl(`ratelimit:${key}`);
      const resetAt = Date.now() + ttl * 1000;

      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetAt,
      };
    } catch (error) {
      console.error("Redis rate limit error:", error);
      // Fail open - allow request if Redis fails
      return {
        allowed: true,
        remaining: limit,
        resetAt: Date.now() + windowSeconds * 1000,
      };
    }
  }

  async close(): Promise<void> {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
    }
  }
}

export const redisCache = new RedisCache();
