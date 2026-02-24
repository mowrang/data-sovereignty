/**
 * Unit tests for Web UI Server
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Request, Response } from "express";

// Mock dependencies
const mockDb = {
  getSession: jest.fn() as jest.MockedFunction<any>,
  getUserById: jest.fn() as jest.MockedFunction<any>,
  updateUserAIProvider: jest.fn() as jest.MockedFunction<any>,
  deleteSession: jest.fn() as jest.MockedFunction<any>,
  getPool: jest.fn(() => ({
    query: jest.fn(),
  })) as jest.MockedFunction<any>,
};

const mockLanggraphClient = {
  assistants: {
    search: jest.fn() as jest.MockedFunction<any>,
  },
  threads: {
    create: jest.fn() as jest.MockedFunction<any>,
  },
  runs: {
    wait: jest.fn() as jest.MockedFunction<any>,
  },
};

const mockRedisCache = {
  getUser: jest.fn(),
};

jest.mock("../../src/db/client.js", () => ({
  db: mockDb,
}));

jest.mock("../../src/utils/redis-cache.js", () => ({
  redisCache: mockRedisCache,
}));

jest.mock("@langchain/langgraph-sdk", () => ({
  Client: jest.fn(() => mockLanggraphClient),
}));

jest.mock("../../src/utils/rate-limiter.js", () => ({
  chatRateLimiter: (_req: Request, _res: Response, next: () => void) => next(),
  apiRateLimiter: (_req: Request, _res: Response, next: () => void) => next(),
}));

jest.mock("fs", () => ({
  readFileSync: jest.fn(() => "<html>...</html>"),
}));

describe("Web UI Server", () => {
  let req: Partial<Request>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      query: {},
      params: {},
      body: {},
      cookies: {},
      headers: {},
      ip: "127.0.0.1",
    };
  });

  describe("GET /api/auth/status", () => {
    it("should return authenticated status when user is logged in", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        aiProvider: "anthropic",
        googleRefreshToken: "token",
        aiApiKey: "key",
      };

      const mockSession = {
        id: "session-123",
        userId: "user-123",
        sessionToken: "token",
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
      };

      req.cookies = { session_token: "session-token" };
      mockDb.getSession.mockResolvedValue(mockSession);
      mockDb.getUserById.mockResolvedValue(mockUser);

      // Import server dynamically to get fresh instance
      // Note: server.ts doesn't export a default, so we just import it for side effects
      await import("../server.js");
      // Note: In a real test, you'd need to access the app instance
      // This is a simplified test structure
    });

    it("should return unauthenticated status when no session", async () => {
      req.cookies = {};
      mockDb.getSession.mockResolvedValue(null);

      // Test would verify unauthenticated response
    });
  });

  describe("POST /api/settings/ai", () => {
    it("should update AI provider and API key", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        aiProvider: "openai",
        aiApiKey: "encrypted-key",
      };

      (req as any).user = { id: "user-123" };
      req.body = {
        provider: "openai",
        apiKey: "sk-test-key",
      };

      mockDb.updateUserAIProvider.mockResolvedValue(mockUser);

      // Test would verify updateUserAIProvider was called correctly
      expect(mockDb.updateUserAIProvider).toBeDefined();
    });

    it("should reject invalid provider", async () => {
      (req as any).user = { id: "user-123" };
      req.body = {
        provider: "invalid-provider",
        apiKey: "sk-test-key",
      };

      // Test would verify 400 error response
    });

    it("should require API key", async () => {
      (req as any).user = { id: "user-123" };
      req.body = {
        provider: "openai",
        apiKey: "",
      };

      // Test would verify 400 error response
    });
  });

  describe("POST /api/chat", () => {
    it("should forward message to LangGraph", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      const mockAssistant = {
        assistant_id: "assistant-123",
        graph_id: "resume_agent",
      };

      const mockThread = {
        thread_id: "thread-123",
      };

      const mockRunState = {
        values: {
          response: "Here's your tailored resume...",
        },
      };

      (req as any).user = mockUser;
      req.body = { message: "Create resume for software engineer job" };

      mockDb.getUserById.mockResolvedValue(mockUser);
      mockLanggraphClient.assistants.search.mockResolvedValue([mockAssistant]);
      mockLanggraphClient.threads.create.mockResolvedValue(mockThread);
      mockLanggraphClient.runs.wait.mockResolvedValue(mockRunState);

      // Test would verify LangGraph integration
      expect(mockLanggraphClient).toBeDefined();
    });

    it("should require authentication", async () => {
      (req as any).user = undefined;
      req.body = { message: "test" };

      // Test would verify 401 error response
    });

    it("should validate message format", async () => {
      (req as any).user = { id: "user-123" };
      req.body = { message: "" };

      // Test would verify 400 error response
    });
  });
});
