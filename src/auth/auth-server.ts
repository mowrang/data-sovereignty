/**
 * Authentication Server for Multi-User Support
 *
 * Provides Google OAuth login for users to access their Google Docs
 * and configure their preferred AI provider
 */

import express, { Request, Response, NextFunction } from "express";
import { google } from "googleapis";
import { db } from "../db/client.js";
import type { User } from "../db/client.js";
import { redisCache } from "../utils/redis-cache.js";
// Express type extensions are automatically loaded via src/types/express.d.ts
import { authRateLimiter, apiRateLimiter } from "../utils/rate-limiter.js";
import * as crypto from "crypto";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  "http://localhost:3000/auth/google/callback";

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error(
    "❌ GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env",
  );
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
);

const scopes = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive",
];

export class AuthServer {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Health check
    this.app.get("/health", (_req: Request, res: Response): void => {
      res.json({ status: "ok" });
    });

    // Initiate Google OAuth login (with rate limiting)
    this.app.get(
      "/auth/google",
      authRateLimiter,
      (_req: Request, res: Response): void => {
        const authUrl = oauth2Client.generateAuthUrl({
          access_type: "offline",
          scope: scopes,
          prompt: "consent", // Force consent screen to get refresh token
        });
        res.redirect(authUrl);
      },
    );

    // Google OAuth callback
    this.app.get(
      "/auth/google/callback",
      async (req: Request, res: Response): Promise<void> => {
        const { code } = req.query;

        if (!code) {
          res.status(400).send("Missing authorization code");
          return;
        }

        try {
          // Exchange code for tokens
          const { tokens } = await oauth2Client.getToken(code as string);
          oauth2Client.setCredentials(tokens);

          if (!tokens.refresh_token) {
            res
              .status(400)
              .send(
                "No refresh token received. Please revoke access and try again.",
              );
            return;
          }

          // Get user info from Google
          const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
          const userInfo = await oauth2.userinfo.get();

          const email = userInfo.data.email;
          const name = userInfo.data.name || null;
          const googleId = userInfo.data.id || null;

          if (!email) {
            res.status(400).send("Could not retrieve email from Google");
            return;
          }

          // Create or update user in database
          const user = await db.createOrUpdateUser(
            email,
            name,
            googleId,
            tokens.refresh_token,
          );

          // Create session - use Redis for better scalability
          const sessionToken = crypto.randomBytes(32).toString("hex");
          const expiresInSeconds = 7 * 24 * 60 * 60; // 7 days

          // Store session in Redis (faster than PostgreSQL for high-traffic scenarios)
          await redisCache.setSession(
            sessionToken,
            {
              userId: user.id,
              email: user.email,
              createdAt: new Date().toISOString(),
            },
            expiresInSeconds,
          );

          // Also store in PostgreSQL for persistence (optional, can be removed if using Redis only)
          try {
            await db.createSession(user.id, expiresInSeconds, sessionToken);
          } catch (error) {
            // If PostgreSQL session creation fails, continue with Redis-only
            console.warn(
              "Failed to create PostgreSQL session, using Redis only:",
              error,
            );
          }

          // Set session cookie
          res.cookie("session_token", sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
            maxAge: expiresInSeconds * 1000,
          });

          // Redirect to web UI or return success
          const redirectUrl =
            process.env.AUTH_SUCCESS_REDIRECT_URL ||
            (process.env.NODE_ENV === "production"
              ? process.env.WEB_UI_URL || "https://abirad.com"
              : "http://localhost:3001");
          res.redirect(`${redirectUrl}?auth=success`);
          return;
        } catch (error: any) {
          console.error("Google OAuth error:", error);
          res.status(500).send(`Authentication failed: ${error.message}`);
          return;
        }
      },
    );

    // Get current user info (with rate limiting)
    this.app.get(
      "/auth/me",
      apiRateLimiter,
      this.authenticate,
      async (
        req: Request,
        res: Response,
        _next: NextFunction,
      ): Promise<void> => {
        const user = req.user as User;
        res.json({
          id: user.id,
          email: user.email,
          name: user.name,
          aiProvider: user.aiProvider,
          hasGoogleToken: !!user.googleRefreshToken,
          hasAIKey: !!user.aiApiKey,
        });
        return;
      },
    );

    // Logout
    this.app.post(
      "/auth/logout",
      apiRateLimiter,
      this.authenticate,
      async (
        req: Request,
        res: Response,
        _next: NextFunction,
      ): Promise<void> => {
        const sessionToken = req.cookies?.session_token;
        if (sessionToken) {
          // Delete from both Redis and PostgreSQL
          await redisCache.deleteSession(sessionToken);
          await db.deleteSession(sessionToken);
        }
        res.clearCookie("session_token");
        res.json({ success: true });
        return;
      },
    );

    // Update AI provider and API key (with rate limiting)
    this.app.post(
      "/auth/settings/ai",
      apiRateLimiter,
      this.authenticate,
      async (
        req: Request,
        res: Response,
        _next: NextFunction,
      ): Promise<void> => {
        const { provider, apiKey } = req.body;
        const user = req.user as User;

        if (
          !provider ||
          !["anthropic", "openai", "azure_openai"].includes(provider)
        ) {
          res.status(400).json({ error: "Invalid AI provider" });
          return;
        }

        try {
          const updatedUser = await db.updateUserAIProvider(
            user.id,
            provider,
            apiKey || null,
          );
          res.json({
            success: true,
            aiProvider: updatedUser.aiProvider,
            hasAIKey: !!updatedUser.aiApiKey,
          });
          return;
        } catch (error: any) {
          res.status(500).json({ error: error.message });
          return;
        }
      },
    );
  }

  // Middleware to authenticate requests
  private authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const sessionToken =
      req.cookies?.session_token ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!sessionToken) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      // Try Redis first (faster)
      const session = await redisCache.getSession(sessionToken);
      let userId: string | null = null;

      if (session) {
        userId = session.userId;
      } else {
        // Fallback to PostgreSQL
        const dbSession = await db.getSession(sessionToken);
        if (dbSession) {
          userId = dbSession.userId;
          // Cache in Redis for next time
          await redisCache.setSession(
            sessionToken,
            {
              userId: dbSession.userId,
              createdAt: dbSession.createdAt.toISOString(),
            },
            Math.floor((dbSession.expiresAt.getTime() - Date.now()) / 1000),
          );
        }
      }

      if (!userId) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }

      // Get user (with caching)
      const user = await db.getUserById(userId);
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      // Attach user to request
      (req as any).user = user;
      (req as any).userId = userId;
      next();
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
      return;
    }
  };

  // Export authenticate middleware for use in other servers
  public getAuthenticateMiddleware() {
    return this.authenticate;
  }

  async start(port = 3000): Promise<void> {
    // Initialize database schema
    try {
      await db.initializeSchema();
    } catch (error: any) {
      console.error("Failed to initialize database schema:", error.message);
      // Continue anyway - schema might already exist
    }

    // Cleanup expired sessions periodically
    setInterval(
      () => {
        void (async () => {
          try {
            await db.cleanupExpiredSessions();
          } catch (error) {
            console.error("Failed to cleanup expired sessions:", error);
          }
        })();
      },
      60 * 60 * 1000,
    ); // Every hour

    this.app.listen(port, () => {
      console.log(`\n🔐 Auth Server running at:`);
      console.log(`   http://localhost:${port}\n`);
      console.log(`📝 Google OAuth Login:`);
      console.log(`   http://localhost:${port}/auth/google\n`);
    });
  }
}

// Express Request type extension is handled in src/types/express.d.ts

// Run server if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new AuthServer();
  server.start().catch(console.error);
}
