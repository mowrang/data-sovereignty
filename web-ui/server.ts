/**
 * Web UI Server for Resume Agent
 *
 * Provides a simple chatbot interface to interact with the Resume Agent
 *
 * Usage:
 *   npm run web-ui
 */

import express, { Request, Response } from "express";
import { Client } from "@langchain/langgraph-sdk";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";
import cookieParser from "cookie-parser";
import { db } from "../src/db/client.js";
import { redisCache } from "../src/utils/redis-cache.js";
import { chatRateLimiter } from "../src/utils/rate-limiter.js";
import jobRecommendationsRouter from "../src/api/job-recommendations.js";
import applicationsRouter from "../src/api/applications.js";
import jobsRouter from "../src/api/jobs.js";
import fileUploadRouter from "../src/api/file-upload.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
// When running from dist/web-ui/server.js, go up two levels to project root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const PORT = Number(process.env.WEB_UI_PORT) || 3001;
const LANGGRAPH_API_URL =
  process.env.LANGGRAPH_API_URL || "http://localhost:54367";
const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || "http://localhost:3000";

// For localhost development - bind to localhost only
const HOST = process.env.WEB_UI_HOST || "localhost";

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS configuration for production
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [
        process.env.WEB_UI_URL || "https://abirad.com",
        process.env.WEB_UI_URL?.replace("https://", "https://www.") ||
          "https://www.abirad.com",
      ]
    : [
        "http://localhost:3001",
        "http://localhost:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3000",
      ];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else if (process.env.NODE_ENV !== "production") {
    // Allow all in development
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

// Authentication middleware
async function authenticate(
  req: Request,
  res: Response,
  next: () => void,
): Promise<void> {
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

    (req as any).user = user;
    (req as any).userId = user.id;
    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Optional authentication - doesn't fail if not authenticated
async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: () => void,
): Promise<void> {
  const sessionToken =
    req.cookies?.session_token ||
    req.headers.authorization?.replace("Bearer ", "");

  if (sessionToken) {
    try {
      const session = await db.getSession(sessionToken);
      if (session) {
        const user = await db.getUserById(session.userId);
        if (user) {
          (req as any).user = user;
          (req as any).userId = user.id;
        }
      }
    } catch (error) {
      // Ignore auth errors for optional auth
    }
  }
  next();
}

// Static files: when compiled, __dirname is dist/web-ui, and public is copied to dist/web-ui/public
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

// Serve index.html for root route with injected config
app.get("/", (_req: Request, res: Response): void => {
  const indexPath = path.join(publicPath, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");

  // Inject AUTH_SERVER_URL into HTML
  const authServerUrl =
    process.env.AUTH_SERVER_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://abirad.com"
      : "http://localhost:3000");

  html = html.replace(
    "<head>",
    `<head>\n    <meta name="auth-server-url" content="${authServerUrl}">`,
  );

  res.send(html);
});

// LangGraph client
const langgraphClient = new Client({ apiUrl: LANGGRAPH_API_URL });

// Cache for assistant ID
let resumeAgentAssistantId: string | null = null;

async function getResumeAgentAssistantId(): Promise<string> {
  if (resumeAgentAssistantId) {
    return resumeAgentAssistantId;
  }

  try {
    const assistants = await langgraphClient.assistants.search({});
    const resumeAgent = assistants.find(
      (a: any) => a.graph_id === "resume_agent",
    );

    if (!resumeAgent) {
      throw new Error(
        "resume_agent not found. Make sure it's registered in langgraph.json",
      );
    }

    resumeAgentAssistantId = resumeAgent.assistant_id;
    return resumeAgentAssistantId;
  } catch (error: any) {
    throw new Error(`Failed to find resume_agent: ${error.message}`);
  }
}

// Auth endpoints
app.get(
  "/api/auth/status",
  optionalAuthenticate,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    if (user) {
      res.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          aiProvider: user.aiProvider,
          hasGoogleToken: !!user.googleRefreshToken,
          hasAIKey: !!user.aiApiKey,
        },
      });
    } else {
      res.json({
        authenticated: false,
        authUrl: `${AUTH_SERVER_URL}/auth/google`,
      });
    }
  },
);

app.get(
  "/api/auth/logout",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const sessionToken = req.cookies?.session_token;
    if (sessionToken) {
      await db.deleteSession(sessionToken);
    }
    res.clearCookie("session_token");
    res.json({ success: true });
  },
);

// Chat API endpoint - requires authentication and rate limiting
app.post(
  "/api/chat",
  chatRateLimiter,
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { message } = req.body;
      const userId = (req as any).userId;

      if (!message || typeof message !== "string") {
        res.status(400).json({ error: "Message is required" });
        return;
      }

      // Parse the message to determine action
      const messageLower = message.toLowerCase().trim();

      // Check if it's a read command
      if (messageLower.includes("read") && messageLower.includes("resume")) {
        // Extract document ID from URL or direct ID
        const urlMatch = message.match(
          /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
        );
        const directIdMatch = message.match(/([a-zA-Z0-9_-]{20,})/);
        const docId = urlMatch
          ? urlMatch[1]
          : directIdMatch
            ? directIdMatch[1]
            : null;

        if (!docId) {
          res.json({
            response:
              "❌ Please provide a Google Doc ID or URL.\n\nExample: `read my resume from https://docs.google.com/document/d/YOUR_DOC_ID/edit`",
            status: "Need document ID",
          });
          return;
        }

        try {
          const assistantId = await getResumeAgentAssistantId();
          const thread = await langgraphClient.threads.create();
          const state = (await langgraphClient.runs.wait(
            thread.thread_id,
            assistantId,
            {
              input: { originalResumeId: docId },
              config: {
                configurable: {
                  userId: userId, // Pass user ID for per-user Google token
                },
              },
            },
          )) as any;

          if (state?.error) {
            res.json({
              response: `❌ Error: ${state.error}`,
              status: "Failed",
              error: state.error,
            });
            return;
          }

          const preview = state?.resumeContent?.substring(0, 500) || "";
          res.json({
            response: `✅ Resume read successfully!\n\n**Preview:**\n${preview}${state?.resumeContent?.length > 500 ? "..." : ""}\n\n**Status:** ${state?.status || "Success"}\n\nYou can now create tailored resumes for job descriptions!`,
            status: "Success",
          });
          return;
        } catch (error: any) {
          res.json({
            response: `❌ Error reading resume: ${error.message}`,
            status: "Error",
            error: error.message,
          });
          return;
        }
      }

      // Check if it's an update/create command
      if (
        (messageLower.includes("create") || messageLower.includes("update")) &&
        messageLower.includes("resume")
      ) {
        // Try to extract job description
        const jdMatch =
          message.match(/job description[:\s]+(.+)/i) ||
          message.match(/for this job[:\s]+(.+)/i) ||
          message.match(/JD[:\s]+(.+)/i);

        const jobDescription = jdMatch ? jdMatch[1].trim() : null;

        if (!jobDescription) {
          res.json({
            response:
              "❌ Please provide a job description.\n\nExample: `create resume for this job: [paste job description]`",
            status: "Need job description",
          });
          return;
        }

        try {
          const assistantId = await getResumeAgentAssistantId();

          // Try to get saved thread context
          // When compiled, __dirname is dist/web-ui, so go up two levels
          const contextPath = path.resolve(
            __dirname,
            "../../.resume-agent-context.json",
          );
          let threadId: string | null = null;

          if (fs.existsSync(contextPath)) {
            try {
              const context = JSON.parse(fs.readFileSync(contextPath, "utf-8"));
              threadId = context.threadId || null;
            } catch (e) {
              // Context file exists but invalid, create new thread
            }
          }

          // Create new thread if no saved context
          const originalResumeIdFromThread = "";
          if (!threadId) {
            const thread = await langgraphClient.threads.create();
            threadId = thread.thread_id;
          }

          const state = (await langgraphClient.runs.wait(
            threadId,
            assistantId,
            {
              input: { jobDescription },
              config: {
                configurable: {
                  userId: userId, // Pass user ID for per-user Google token and AI key
                },
              },
            },
          )) as any;

          if (state?.error) {
            res.json({
              response: `❌ Error: ${state.error}`,
              status: "Failed",
              error: state.error,
            });
            return;
          }

          const url = state?.copiedResumeId
            ? `https://docs.google.com/document/d/${state.copiedResumeId}/edit`
            : null;

          // Extract location from job description if available (for better recommendations)
          let location: string | undefined;
          const locationMatch = jobDescription.match(
            /(?:in|at|location)[:\s]+([A-Z][a-zA-Z\s,]+)/i,
          );
          if (locationMatch) {
            location = locationMatch[1].trim();
          }

          // Save job description to user history (for future recommendations)
          try {
            const jobDescId = await db.saveJobDescription(
              userId,
              jobDescription,
              location,
              true, // resumeUpdated = true
              state?.copiedResumeId || undefined,
            );

            // Save resume update history
            if (state?.copiedResumeId) {
              // Get original resume ID from state or thread checkpoint
              const originalResumeId =
                state?.originalResumeId || originalResumeIdFromThread || "";

              await db.saveResumeUpdate(
                userId,
                originalResumeId,
                state.copiedResumeId,
                jobDescId,
                "job_description",
              );
            }
          } catch (error: any) {
            // Don't fail the request if history saving fails
            console.warn("Failed to save user history:", error.message);
          }

          res.json({
            response: `✅ Resume created/updated successfully!\n\n**Status:** ${state?.status || "Success"}\n${url ? `\n**View updated resume:** ${url}` : ""}\n\n${state?.updatedResumeContent ? `\n**Updated content preview:**\n${state.updatedResumeContent.substring(0, 300)}...` : ""}\n\n💡 Check out related jobs below!`,
            status: "Success",
            url,
            jobDescription: jobDescription, // Include job description for related jobs
            location: location, // Extracted location if found
            resumeUpdated: true, // Flag to indicate resume was updated
          });
          return;
        } catch (error: any) {
          res.json({
            response: `❌ Error creating resume: ${error.message}\n\n💡 Make sure you've read your resume first: "read my resume from [Google Doc URL]"`,
            status: "Error",
            error: error.message,
          });
          return;
        }
      }

      // Default: provide help
      res.json({
        response: `🤖 I'm the Resume Agent! Here's what I can do:\n\n**📖 Read Resume:**\n"read my resume from https://docs.google.com/document/d/YOUR_DOC_ID/edit"\n\n**📋 Create Resume for Job:**\n"create resume for this job: [paste job description]"\n\n**✏️ Update Resume:**\n"update resume for this job: [paste job description]"\n\n**💬 Get Comments:**\n"get comments from my resume"\n\nTry one of these commands!`,
        status: "Help",
      });
      return;
    } catch (error: any) {
      console.error("Chat API error:", error);
      res.status(500).json({
        error: error.message || "Internal server error",
        response: `❌ Server error: ${error.message}`,
      });
      return;
    }
  },
);

// User settings endpoint
app.get(
  "/api/settings",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    res.json({
      aiProvider: user.aiProvider,
      hasAIKey: !!user.aiApiKey,
      hasGoogleToken: !!user.googleRefreshToken,
    });
  },
);

app.post(
  "/api/settings/ai",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { provider, apiKey } = req.body;
    const user = (req as any).user;

    if (
      !provider ||
      !["anthropic", "openai", "azure_openai"].includes(provider)
    ) {
      res
        .status(400)
        .json({
          error:
            "Invalid AI provider. Must be one of: anthropic, openai, azure_openai",
        });
      return;
    }

    if (!apiKey || apiKey.trim().length === 0) {
      res.status(400).json({ error: "API key is required" });
      return;
    }

    try {
      const updatedUser = await db.updateUserAIProvider(
        user.id,
        provider,
        apiKey.trim(),
      );
      res.json({
        success: true,
        aiProvider: updatedUser.aiProvider,
        hasAIKey: !!updatedUser.aiApiKey,
        message: "AI settings saved successfully",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Job-related API routes
app.use("/api/job-recommendations", authenticate, jobRecommendationsRouter);
app.use("/api/applications", authenticate, applicationsRouter);
app.use("/api/jobs", authenticate, jobsRouter);
app.use("/api/file-upload", fileUploadRouter);

// Health check
app.get("/api/health", async (_req: Request, res: Response): Promise<void> => {
  try {
    const assistants = await langgraphClient.assistants.search({});
    res.json({
      status: "ok",
      langgraphConnected: true,
      assistantsCount: assistants.length,
      langgraphUrl: LANGGRAPH_API_URL,
    });
    return;
  } catch (error: any) {
    res.status(503).json({
      status: "error",
      langgraphConnected: false,
      error: error.message,
    });
    return;
  }
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`\n🚀 Resume Agent Web UI running at:`);
  console.log(`   http://${HOST}:${PORT}\n`);
  console.log(`📡 Connecting to LangGraph API: ${LANGGRAPH_API_URL}\n`);
  console.log(
    `💡 For domain deployment, set WEB_UI_HOST and configure reverse proxy\n`,
  );
});
