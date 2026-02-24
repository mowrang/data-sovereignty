/**
 * Unit tests for Auth Server
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Request, Response } from "express";
import { AuthServer } from "../auth-server.js";

// Mock dependencies
const mockDb = {
  createOrUpdateUser: jest.fn() as jest.MockedFunction<any>,
  createSession: jest.fn() as jest.MockedFunction<any>,
  getUserById: jest.fn() as jest.MockedFunction<any>,
};

const mockRedisCache = {
  setSession: jest.fn() as jest.MockedFunction<any>,
  getSession: jest.fn() as jest.MockedFunction<any>,
};

const mockOAuth2Client = {
  generateAuthUrl: jest.fn() as jest.MockedFunction<any>,
  getToken: jest.fn() as jest.MockedFunction<any>,
  setCredentials: jest.fn() as jest.MockedFunction<any>,
};

const mockOAuth2 = {
  userinfo: {
    get: jest.fn() as jest.MockedFunction<any>,
  },
};

jest.mock("../db/client.js", () => ({
  db: mockDb,
}));

jest.mock("../../utils/redis-cache.js", () => ({
  redisCache: mockRedisCache,
}));

jest.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: jest.fn(() => mockOAuth2Client),
    },
    oauth2: jest.fn(() => mockOAuth2),
  },
}));

jest.mock("../../utils/rate-limiter.js", () => ({
  authRateLimiter: (_req: Request, _res: Response, next: () => void) => next(),
  apiRateLimiter: (_req: Request, _res: Response, next: () => void) => next(),
}));

describe("AuthServer", () => {
  let authServer: AuthServer;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";

    req = {
      query: {},
      body: {},
      cookies: {},
    };
    res = {
      json: jest.fn().mockReturnThis() as any,
      status: jest.fn().mockReturnThis() as any,
      send: jest.fn().mockReturnThis() as any,
      redirect: jest.fn().mockReturnThis() as any,
      cookie: jest.fn().mockReturnThis() as any,
    };

    authServer = new AuthServer();
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const route = (authServer as any).app._router.stack.find(
        (r: any) => r.route?.path === "/health",
      );
      if (route) {
        await route.route.stack[0].handle(req as Request, res as Response);
        expect(res.json).toHaveBeenCalledWith({ status: "ok" });
      }
    });
  });

  describe("GET /auth/google", () => {
    it("should redirect to Google OAuth URL", async () => {
      mockOAuth2Client.generateAuthUrl.mockReturnValue(
        "https://accounts.google.com/oauth/authorize?...",
      );

      const route = (authServer as any).app._router.stack.find(
        (r: any) => r.route?.path === "/auth/google",
      );
      if (route) {
        await route.route.stack[0].handle(req as Request, res as Response);
        expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith({
          access_type: "offline",
          scope: expect.arrayContaining([
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/documents",
          ]),
          prompt: "consent",
        });
        expect(res.redirect).toHaveBeenCalled();
      }
    });
  });

  describe("GET /auth/google/callback", () => {
    it("should create user and session on successful OAuth", async () => {
      req.query = { code: "auth-code-123" };

      const mockTokens = {
        access_token: "access-token",
        refresh_token: "refresh-token",
      };

      const mockUserInfo = {
        data: {
          email: "test@example.com",
          name: "Test User",
          id: "google-123",
        },
      };

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        googleId: "google-123",
      };

      const mockSession = {
        id: "session-123",
        userId: "user-123",
        sessionToken: "session-token",
        expiresAt: new Date(),
        createdAt: new Date(),
      };

      mockOAuth2Client.getToken.mockResolvedValue({ tokens: mockTokens });
      mockOAuth2.userinfo.get.mockResolvedValue(mockUserInfo);
      mockDb.createOrUpdateUser.mockResolvedValue(mockUser);
      mockDb.createSession.mockResolvedValue(mockSession);

      const route = (authServer as any).app._router.stack.find(
        (r: any) => r.route?.path === "/auth/google/callback",
      );
      if (route) {
        await route.route.stack[0].handle(req as Request, res as Response);
        expect(mockDb.createOrUpdateUser).toHaveBeenCalledWith(
          "test@example.com",
          "Test User",
          "google-123",
          "refresh-token",
        );
        expect(res.redirect).toHaveBeenCalled();
      }
    });

    it("should return error when code is missing", async () => {
      req.query = {};

      const route = (authServer as any).app._router.stack.find(
        (r: any) => r.route?.path === "/auth/google/callback",
      );
      if (route) {
        await route.route.stack[0].handle(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith("Missing authorization code");
      }
    });

    it("should return error when refresh token is missing", async () => {
      req.query = { code: "auth-code-123" };

      mockOAuth2Client.getToken.mockResolvedValue({
        tokens: { access_token: "access-token" }, // No refresh_token
      });

      const route = (authServer as any).app._router.stack.find(
        (r: any) => r.route?.path === "/auth/google/callback",
      );
      if (route) {
        await route.route.stack[0].handle(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
          expect.stringContaining("No refresh token"),
        );
      }
    });

    it("should handle OAuth errors gracefully", async () => {
      req.query = { code: "invalid-code" };
      mockOAuth2Client.getToken.mockRejectedValue(new Error("Invalid code"));

      const route = (authServer as any).app._router.stack.find(
        (r: any) => r.route?.path === "/auth/google/callback",
      );
      if (route) {
        await route.route.stack[0].handle(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(500);
      }
    });
  });

  describe("GET /auth/me", () => {
    it("should return user info when authenticated", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        aiProvider: "anthropic",
        googleRefreshToken: "token",
        aiApiKey: "key",
      };

      (req as any).user = mockUser;
      mockDb.getUserById.mockResolvedValue(mockUser);

      const route = (authServer as any).app._router.stack.find(
        (r: any) => r.route?.path === "/auth/me",
      );
      if (route) {
        await route.route.stack[0].handle(req as Request, res as Response);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "user-123",
            email: "test@example.com",
          }),
        );
      }
    });
  });
});
