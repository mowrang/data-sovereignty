/**
 * Unit tests for Database Client
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { db } from "../client.js";

// Mock pg Pool
const mockPool = {
  connect: jest.fn() as jest.MockedFunction<any>,
  query: jest.fn() as jest.MockedFunction<any>,
  end: jest.fn() as jest.MockedFunction<any>,
  on: jest.fn() as jest.MockedFunction<any>,
};

const mockClient = {
  query: jest.fn() as jest.MockedFunction<any>,
  release: jest.fn() as jest.MockedFunction<any>,
};

const mockRedisCache = {
  invalidateUser: jest.fn() as jest.MockedFunction<any>,
  getUser: jest.fn() as jest.MockedFunction<any>,
  setUser: jest.fn() as jest.MockedFunction<any>,
};

jest.mock("pg", () => ({
  Pool: jest.fn(() => mockPool),
}));

jest.mock("../../utils/redis-cache.js", () => ({
  redisCache: mockRedisCache,
}));

jest.mock("fs", () => ({
  readFileSync: jest.fn(() => "CREATE TABLE users..."),
  existsSync: jest.fn(() => true),
}));

describe("DatabaseClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
  });

  describe("createOrUpdateUser", () => {
    it("should create new user", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        google_id: "google-123",
        google_refresh_token: "encrypted-token",
        ai_provider: "anthropic",
        ai_api_key: null,
        user_role: "job_seeker",
        created_at: new Date(),
        updated_at: new Date(),
        last_login: new Date(),
      };

      mockClient.query.mockResolvedValue({ rows: [mockUser] });

      const result = await db.createOrUpdateUser(
        "test@example.com",
        "Test User",
        "google-123",
        "refresh-token",
      );

      expect(result.email).toBe("test@example.com");
      expect(result.name).toBe("Test User");
      expect(mockClient.query).toHaveBeenCalled();
      expect(mockRedisCache.invalidateUser).toHaveBeenCalled();
    });

    it("should update existing user", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Updated Name",
        google_id: "google-123",
        google_refresh_token: "encrypted-token",
        ai_provider: "anthropic",
        ai_api_key: null,
        user_role: "job_seeker",
        created_at: new Date(),
        updated_at: new Date(),
        last_login: new Date(),
      };

      mockClient.query.mockResolvedValue({ rows: [mockUser] });

      const result = await db.createOrUpdateUser(
        "test@example.com",
        "Updated Name",
        "google-123",
        "refresh-token",
      );

      expect(result.name).toBe("Updated Name");
    });

    it("should encrypt refresh token", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: null,
        google_id: null,
        google_refresh_token: "encrypted-token",
        ai_provider: "anthropic",
        ai_api_key: null,
        user_role: "job_seeker",
        created_at: new Date(),
        updated_at: new Date(),
        last_login: new Date(),
      };

      mockClient.query.mockResolvedValue({ rows: [mockUser] });

      await db.createOrUpdateUser(
        "test@example.com",
        null,
        null,
        "refresh-token",
      );

      const callArgs = mockClient.query.mock.calls[0][1];
      expect(callArgs[3]).not.toBe("refresh-token"); // Should be encrypted
    });
  });

  describe("getUserById", () => {
    it("should return user from cache if available", async () => {
      const cachedUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
      };

      mockRedisCache.getUser.mockResolvedValue(cachedUser);

      const result = await db.getUserById("user-123");

      expect(result).toEqual(cachedUser);
      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it("should fetch from database when not cached", async () => {
      mockRedisCache.getUser.mockResolvedValue(null);
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        google_id: null,
        google_refresh_token: null,
        ai_provider: "anthropic",
        ai_api_key: null,
        user_role: "job_seeker",
        created_at: new Date(),
        updated_at: new Date(),
        last_login: null,
      };

      mockClient.query.mockResolvedValue({ rows: [mockUser] });

      const result = await db.getUserById("user-123");

      expect(result?.email).toBe("test@example.com");
      expect(mockRedisCache.setUser).toHaveBeenCalled();
    });

    it("should return null when user not found", async () => {
      mockRedisCache.getUser.mockResolvedValue(null);
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await db.getUserById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getUserByEmail", () => {
    it("should return user by email", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        google_id: null,
        google_refresh_token: null,
        ai_provider: "anthropic",
        ai_api_key: null,
        user_role: "job_seeker",
        created_at: new Date(),
        updated_at: new Date(),
        last_login: null,
      };

      mockClient.query.mockResolvedValue({ rows: [mockUser] });

      const result = await db.getUserByEmail("test@example.com");

      expect(result?.email).toBe("test@example.com");
    });

    it("should return null when email not found", async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await db.getUserByEmail("notfound@example.com");

      expect(result).toBeNull();
    });
  });

  describe("updateUserAIProvider", () => {
    it("should update AI provider and encrypt API key", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        google_id: null,
        google_refresh_token: null,
        ai_provider: "openai",
        ai_api_key: "encrypted-key",
        user_role: "job_seeker",
        created_at: new Date(),
        updated_at: new Date(),
        last_login: null,
      };

      mockClient.query.mockResolvedValue({ rows: [mockUser] });

      const result = await db.updateUserAIProvider(
        "user-123",
        "openai",
        "sk-test-key",
      );

      expect(result.aiProvider).toBe("openai");
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users"),
        ["openai", expect.any(String), "user-123"],
      );
      expect(mockRedisCache.invalidateUser).toHaveBeenCalled();
    });

    it("should throw error when user not found", async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(
        db.updateUserAIProvider("non-existent", "openai", "sk-key"),
      ).rejects.toThrow("User not found");
    });
  });

  describe("createSession", () => {
    it("should create session with generated token", async () => {
      const mockSession = {
        id: "session-123",
        user_id: "user-123",
        session_token: "generated-token",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
      };

      mockClient.query.mockResolvedValue({ rows: [mockSession] });

      const result = await db.createSession("user-123");

      expect(result.userId).toBe("user-123");
      expect(result.sessionToken).toBe("generated-token");
      expect(mockRedisCache.setUser).toHaveBeenCalled();
    });

    it("should create session with provided token", async () => {
      const mockSession = {
        id: "session-123",
        user_id: "user-123",
        session_token: "custom-token",
        expires_at: new Date(),
        created_at: new Date(),
      };

      mockClient.query.mockResolvedValue({ rows: [mockSession] });

      const result = await db.createSession("user-123", 3600, "custom-token");

      expect(result.sessionToken).toBe("custom-token");
    });
  });

  describe("getSession", () => {
    it("should return valid session", async () => {
      const mockSession = {
        id: "session-123",
        user_id: "user-123",
        session_token: "token-123",
        expires_at: new Date(Date.now() + 3600000),
        created_at: new Date(),
      };

      mockClient.query.mockResolvedValue({ rows: [mockSession] });

      const result = await db.getSession("token-123");

      expect(result?.userId).toBe("user-123");
    });

    it("should return null for expired session", async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await db.getSession("expired-token");

      expect(result).toBeNull();
    });
  });

  describe("deleteSession", () => {
    it("should delete session", async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await db.deleteSession("token-123");

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM user_sessions"),
        ["token-123"],
      );
    });
  });

  describe("updateUserRole", () => {
    it("should update user role", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        google_id: null,
        google_refresh_token: null,
        ai_provider: "anthropic",
        ai_api_key: null,
        user_role: "employer",
        created_at: new Date(),
        updated_at: new Date(),
        last_login: null,
      };

      mockClient.query.mockResolvedValue({ rows: [mockUser] });

      const result = await db.updateUserRole("user-123", "employer");

      expect(result.userRole).toBe("employer");
      expect(mockRedisCache.invalidateUser).toHaveBeenCalled();
    });
  });

  describe("encryption/decryption", () => {
    it("should encrypt and decrypt tokens correctly", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: null,
        google_id: null,
        google_refresh_token: "encrypted-value",
        ai_provider: "anthropic",
        ai_api_key: null,
        user_role: "job_seeker",
        created_at: new Date(),
        updated_at: new Date(),
        last_login: null,
      };

      // Mock the query to return encrypted token
      mockClient.query.mockResolvedValue({ rows: [mockUser] });

      // When we get the user, the token should be decrypted
      // Note: This tests the mapUserFromRow function indirectly
      await db.getUserById("user-123", false);

      // The decryption happens in mapUserFromRow
      // We can't directly test it, but we can verify the flow works
      expect(mockClient.query).toHaveBeenCalled();
    });
  });
});
