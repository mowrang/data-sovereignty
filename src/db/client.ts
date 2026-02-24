/**
 * PostgreSQL Database Client for User Management
 *
 * Connects to the same PostgreSQL instance used by LangGraph
 * but manages user authentication and preferences separately
 */

import { Pool } from "pg";
import * as crypto from "crypto";
import { redisCache } from "../utils/redis-cache.js";

// Encryption key for sensitive data (should be in env)
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
const ALGORITHM = "aes-256-gcm";

interface User {
  id: string;
  email: string;
  name: string | null;
  googleId: string | null;
  googleRefreshToken: string | null;
  aiProvider: string;
  aiApiKey: string | null;
  userRole?: string; // 'job_seeker', 'employer', 'admin'
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
}

interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  expiresAt: Date;
  createdAt: Date;
}

// Simple encryption/decryption helpers
function encrypt(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.slice(0, 32), "hex"),
    iv,
  );
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  const parts = encryptedText.split(":");
  if (parts.length !== 3) return encryptedText; // Not encrypted, return as-is
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.slice(0, 32), "hex"),
    iv,
  );
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

class DatabaseClient {
  private pool: Pool | null = null;

  public getPool(): Pool {
    if (!this.pool) {
      // Configure connection pool for scalability
      const maxConnections = parseInt(
        process.env.POSTGRES_MAX_CONNECTIONS || "20",
      );
      const connectionTimeout = parseInt(
        process.env.POSTGRES_CONNECTION_TIMEOUT || "10000",
      );

      this.pool = new Pool({
        host: process.env.POSTGRES_HOST || "localhost",
        port: parseInt(process.env.POSTGRES_PORT || "5432"),
        database: process.env.POSTGRES_DB || "langgraph",
        user: process.env.POSTGRES_USER || "langgraph",
        password: process.env.POSTGRES_PASSWORD || "changeme",
        ssl:
          process.env.POSTGRES_SSL === "true"
            ? { rejectUnauthorized: false }
            : false,
        // Connection pool settings
        max: maxConnections, // Maximum number of clients in the pool
        min: 2, // Minimum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: connectionTimeout, // Return error after 10 seconds if connection cannot be established
        // Query timeout
        query_timeout: 30000, // 30 seconds
        // Statement timeout
        statement_timeout: 30000, // 30 seconds
      });

      // Handle pool errors
      this.pool.on("error", (err) => {
        console.error("Unexpected error on idle client", err);
      });
    }
    return this.pool;
  }

  async initializeSchema(): Promise<void> {
    const client = await this.getPool().connect();
    try {
      const fs = await import("fs");
      const path = await import("path");
      const url = await import("url");
      const __filename = url.fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      // Initialize main user schema
      const schemaPath = path.join(__dirname, "schema.sql");
      const schema = fs.readFileSync(schemaPath, "utf-8");
      await client.query(schema);
      console.log("✅ User management schema initialized");

      // Initialize user history schema
      await this.initializeUserHistorySchema();
    } catch (error: any) {
      console.error("❌ Failed to initialize schema:", error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async createOrUpdateUser(
    email: string,
    name: string | null,
    googleId: string | null,
    googleRefreshToken: string | null,
  ): Promise<User> {
    const client = await this.getPool().connect();
    try {
      const encryptedToken = googleRefreshToken
        ? encrypt(googleRefreshToken)
        : null;

      const result = await client.query(
        `INSERT INTO users (email, name, google_id, google_refresh_token, last_login)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (email) 
         DO UPDATE SET 
           name = COALESCE(EXCLUDED.name, users.name),
           google_id = COALESCE(EXCLUDED.google_id, users.google_id),
           google_refresh_token = COALESCE(EXCLUDED.google_refresh_token, users.google_refresh_token),
           last_login = CURRENT_TIMESTAMP
         RETURNING *`,
        [email, name, googleId, encryptedToken],
      );

      const user = this.mapUserFromRow(result.rows[0]);

      // Invalidate cache
      await redisCache.invalidateUser(user.id);

      return user;
    } finally {
      client.release();
    }
  }

  async getUserById(userId: string, useCache = true): Promise<User | null> {
    // Try cache first
    if (useCache) {
      const cached = await redisCache.getUser(userId);
      if (cached) {
        return cached;
      }
    }

    // Fallback to database
    const client = await this.getPool().connect();
    try {
      const result = await client.query("SELECT * FROM users WHERE id = $1", [
        userId,
      ]);
      if (result.rows.length === 0) return null;
      const user = this.mapUserFromRow(result.rows[0]);

      // Cache the user data (don't cache sensitive tokens in cache)
      if (useCache && user) {
        const cacheableUser = {
          ...user,
          googleRefreshToken: null,
          aiApiKey: null,
        };
        await redisCache.setUser(userId, cacheableUser, 3600); // Cache for 1 hour
      }

      return user;
    } finally {
      client.release();
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        "SELECT * FROM users WHERE email = $1",
        [email],
      );
      if (result.rows.length === 0) return null;
      return this.mapUserFromRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getUserByGoogleId(googleId: string): Promise<User | null> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        "SELECT * FROM users WHERE google_id = $1",
        [googleId],
      );
      if (result.rows.length === 0) return null;
      return this.mapUserFromRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async updateUserAIProvider(
    userId: string,
    provider: string,
    apiKey: string | null,
  ): Promise<User> {
    const client = await this.getPool().connect();
    try {
      const encryptedKey = apiKey ? encrypt(apiKey) : null;
      const result = await client.query(
        `UPDATE users 
         SET ai_provider = $1, ai_api_key = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [provider, encryptedKey, userId],
      );
      if (result.rows.length === 0) {
        throw new Error(`User not found: ${userId}`);
      }
      const user = this.mapUserFromRow(result.rows[0]);

      // Invalidate cache
      await redisCache.invalidateUser(userId);

      return user;
    } finally {
      client.release();
    }
  }

  async createSession(
    userId: string,
    expiresInSeconds: number = 7 * 24 * 60 * 60,
    sessionToken?: string,
  ): Promise<UserSession> {
    const client = await this.getPool().connect();
    try {
      const token = sessionToken || crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

      const result = await client.query(
        `INSERT INTO user_sessions (user_id, session_token, expires_at)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, token, expiresAt],
      );

      const session = {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        sessionToken: result.rows[0].session_token,
        expiresAt: result.rows[0].expires_at,
        createdAt: result.rows[0].created_at,
      };

      // Also cache in Redis (optional - can use Redis only)
      await redisCache.setSession(
        token,
        {
          userId: session.userId,
          createdAt: session.createdAt.toISOString(),
        },
        expiresInSeconds,
      );

      return session;
    } finally {
      client.release();
    }
  }

  async getSession(sessionToken: string): Promise<UserSession | null> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `SELECT * FROM user_sessions 
         WHERE session_token = $1 AND expires_at > CURRENT_TIMESTAMP`,
        [sessionToken],
      );
      if (result.rows.length === 0) return null;

      return {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        sessionToken: result.rows[0].session_token,
        expiresAt: result.rows[0].expires_at,
        createdAt: result.rows[0].created_at,
      };
    } finally {
      client.release();
    }
  }

  async deleteSession(sessionToken: string): Promise<void> {
    const client = await this.getPool().connect();
    try {
      await client.query("DELETE FROM user_sessions WHERE session_token = $1", [
        sessionToken,
      ]);
    } finally {
      client.release();
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    const client = await this.getPool().connect();
    try {
      await client.query(
        "DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP",
      );
    } finally {
      client.release();
    }
  }

  private mapUserFromRow(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      googleId: row.google_id,
      googleRefreshToken: row.google_refresh_token
        ? decrypt(row.google_refresh_token)
        : null,
      aiProvider: row.ai_provider || "anthropic",
      aiApiKey: row.ai_api_key ? decrypt(row.ai_api_key) : null,
      userRole: row.user_role || "job_seeker",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login,
    };
  }

  async initializeJobsSchema(): Promise<void> {
    const client = await this.getPool().connect();
    try {
      const fs = await import("fs");
      const path = await import("path");
      const url = await import("url");
      const __filename = url.fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const schemaPath = path.join(__dirname, "jobs-schema.sql");

      if (!fs.existsSync(schemaPath)) {
        console.warn("⚠️ Jobs schema file not found, skipping...");
        return;
      }

      const schema = fs.readFileSync(schemaPath, "utf-8");
      await client.query(schema);
      console.log("✅ Jobs schema initialized");
    } catch (error: any) {
      console.error("❌ Failed to initialize jobs schema:", error.message);
      // Don't throw - allow app to continue if jobs schema fails
      console.warn("⚠️ Continuing without jobs schema...");
    } finally {
      client.release();
    }
  }

  async updateUserRole(
    userId: string,
    role: "job_seeker" | "employer" | "admin",
  ): Promise<User> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `UPDATE users SET user_role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [role, userId],
      );
      if (result.rows.length === 0) {
        throw new Error(`User not found: ${userId}`);
      }
      const user = this.mapUserFromRow(result.rows[0]);

      // Invalidate cache
      await redisCache.invalidateUser(userId);

      return user;
    } finally {
      client.release();
    }
  }

  /**
   * Save user's job description history
   */
  async saveJobDescription(
    userId: string,
    jobDescription: string,
    location?: string,
    resumeUpdated = false,
    resumeDocumentId?: string,
  ): Promise<string> {
    const client = await this.getPool().connect();
    try {
      // Extract keywords from job description (simple extraction)
      const keywords = this.extractKeywords(jobDescription);

      const result = await client.query(
        `INSERT INTO user_job_descriptions 
         (user_id, job_description, location, extracted_keywords, resume_updated, resume_document_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          userId,
          jobDescription,
          location || null,
          keywords,
          resumeUpdated,
          resumeDocumentId || null,
        ],
      );

      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  /**
   * Get user's job description history
   */
  async getUserJobDescriptions(
    userId: string,
    limit = 10,
  ): Promise<
    Array<{
      id: string;
      jobDescription: string;
      location: string | null;
      keywords: string[];
      resumeUpdated: boolean;
      createdAt: Date;
    }>
  > {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `SELECT id, job_description, location, extracted_keywords, resume_updated, created_at
         FROM user_job_descriptions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit],
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        jobDescription: row.job_description,
        location: row.location,
        keywords: row.extracted_keywords || [],
        resumeUpdated: row.resume_updated,
        createdAt: row.created_at,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Save resume update history
   */
  async saveResumeUpdate(
    userId: string,
    originalResumeId: string,
    updatedResumeId: string,
    jobDescriptionId?: string,
    updateType = "job_description",
  ): Promise<string> {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `INSERT INTO user_resume_updates
         (user_id, job_description_id, original_resume_id, updated_resume_id, update_type)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          userId,
          jobDescriptionId || null,
          originalResumeId,
          updatedResumeId,
          updateType,
        ],
      );

      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  /**
   * Get user's resume update history
   */
  async getUserResumeUpdates(
    userId: string,
    limit = 10,
  ): Promise<
    Array<{
      id: string;
      jobDescriptionId: string | null;
      originalResumeId: string;
      updatedResumeId: string;
      updateType: string;
      createdAt: Date;
    }>
  > {
    const client = await this.getPool().connect();
    try {
      const result = await client.query(
        `SELECT id, job_description_id, original_resume_id, updated_resume_id, update_type, created_at
         FROM user_resume_updates
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit],
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        jobDescriptionId: row.job_description_id,
        originalResumeId: row.original_resume_id,
        updatedResumeId: row.updated_resume_id,
        updateType: row.update_type,
        createdAt: row.created_at,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Extract keywords from job description (simple implementation)
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP
    const commonWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "is",
      "are",
      "was",
      "were",
      "be",
      "been",
      "being",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "should",
      "could",
      "may",
      "might",
      "must",
      "can",
      "this",
      "that",
      "these",
      "those",
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !commonWords.has(word));

    // Get unique words, limit to top 20
    const uniqueWords = Array.from(new Set(words));
    return uniqueWords.slice(0, 20);
  }

  /**
   * Initialize user history schema
   */
  async initializeUserHistorySchema(): Promise<void> {
    const client = await this.getPool().connect();
    try {
      const fs = await import("fs");
      const path = await import("path");
      const url = await import("url");
      const __filename = url.fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const schemaPath = path.join(__dirname, "user-history-schema.sql");

      if (!fs.existsSync(schemaPath)) {
        console.warn("⚠️ User history schema file not found, skipping...");
        return;
      }

      const schema = fs.readFileSync(schemaPath, "utf-8");
      await client.query(schema);
      console.log("✅ User history schema initialized");
    } catch (error: any) {
      console.error(
        "❌ Failed to initialize user history schema:",
        error.message,
      );
      // Don't throw - allow app to continue if history schema fails
      console.warn("⚠️ Continuing without user history schema...");
    } finally {
      client.release();
    }
  }

  /**
   * Initialize PostgreSQL permissions for LangGraph monitoring
   * Grants permissions to monitor long-running queries and database statistics
   */
  async initializePermissions(): Promise<void> {
    const client = await this.getPool().connect();
    try {
      const fs = await import("fs");
      const path = await import("path");
      const url = await import("url");
      const __filename = url.fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const permissionsPath = path.join(__dirname, "permissions.sql");

      if (!fs.existsSync(permissionsPath)) {
        console.warn("⚠️ Permissions file not found, skipping...");
        return;
      }

      const permissions = fs.readFileSync(permissionsPath, "utf-8");
      
      // Try to execute permissions grant
      // Note: This may fail if user doesn't have superuser privileges
      // That's okay - we'll log a warning but continue
      try {
        await client.query(permissions);
        console.log("✅ PostgreSQL permissions initialized for LangGraph monitoring");
      } catch (error: any) {
        // If permissions can't be granted (e.g., not superuser), log warning but continue
        // The app will still work, just without monitoring capabilities
        console.warn(
          "⚠️ Could not grant monitoring permissions (this is okay if not running as superuser):",
          error.message,
        );
        console.warn(
          "⚠️ LangGraph will work normally but may show monitoring errors in logs",
        );
        console.warn(
          "⚠️ To fix manually, run: npm run fix:postgres-permissions",
        );
      }
    } catch (error: any) {
      console.error(
        "❌ Failed to initialize permissions:",
        error.message,
      );
      // Don't throw - allow app to continue if permissions fail
      console.warn("⚠️ Continuing without monitoring permissions...");
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

export const db = new DatabaseClient();
export type { User, UserSession };
