/**
 * MCP Client Helper
 * Provides a reusable MCP client connection for Google Docs operations
 *
 * Now supports per-user Google refresh tokens via user context
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import * as path from "path";
import * as url from "url";
import * as fs from "fs";
import { db } from "../../../db/client.js";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the path to the MCP server
 */
function getMCPServerPath(): string {
  const envPath = process.env.MCP_SERVER_PATH;
  if (envPath) {
    return envPath;
  }

  // Try multiple possible paths (works in both local dev and Docker)
  const possiblePaths = [
    // Docker path
    "/deps/social-media-agent/mcp-google-docs/dist/server.js",
    // From project root (if cwd is project root)
    path.join(process.cwd(), "mcp-google-docs", "dist", "server.js"),
    // From src/agents/resume-agent/utils/ (go up 4 levels to project root)
    path.resolve(
      __dirname,
      "../../../../",
      "mcp-google-docs",
      "dist",
      "server.js",
    ),
    // From project root relative to this file's location
    path.resolve(__dirname, "../../../../../mcp-google-docs/dist/server.js"),
  ];

  for (const serverPath of possiblePaths) {
    if (fs.existsSync(serverPath)) {
      return serverPath;
    }
  }

  // If none found, return the most likely path and let it fail with a clear error
  return (
    possiblePaths[1] ||
    path.join(process.cwd(), "mcp-google-docs", "dist", "server.js")
  );
}

/**
 * Get user ID from LangGraph config
 */
function getUserIdFromConfig(config?: LangGraphRunnableConfig): string | null {
  return config?.configurable?.userId || null;
}

/**
 * Create and connect an MCP client with user context
 *
 * @param config Optional LangGraph config containing userId
 */
export async function createMCPClient(
  config?: LangGraphRunnableConfig,
): Promise<Client> {
  const serverPath = getMCPServerPath();
  const userId = getUserIdFromConfig(config);

  // Get user's Google refresh token if userId is provided
  let googleRefreshToken: string | undefined;
  if (userId) {
    try {
      const user = await db.getUserById(userId);
      if (user?.googleRefreshToken) {
        googleRefreshToken = user.googleRefreshToken;
      }
    } catch (error) {
      console.warn("Failed to get user Google token:", error);
    }
  }

  // Fallback to environment variable if no user token
  if (!googleRefreshToken) {
    googleRefreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  }

  // Set environment variable for the MCP server subprocess
  const env = {
    ...process.env,
    ...(googleRefreshToken ? { GOOGLE_REFRESH_TOKEN: googleRefreshToken } : {}),
    ...(userId ? { MCP_USER_ID: userId } : {}),
  };

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    env,
  });

  const client = new Client(
    {
      name: "resume-agent",
      version: "0.1.0",
    },
    {
      capabilities: {},
    },
  );

  await client.connect(transport);
  return client;
}

/**
 * Call an MCP tool and return the result
 */
export async function callMCPTool(
  client: Client,
  toolName: string,
  args: Record<string, any>,
): Promise<any> {
  const result = await client.callTool({
    name: toolName,
    arguments: args,
  });

  if (result.isError) {
    const content = result.content || [];
    const errorText = Array.isArray(content)
      ? content.find((c: any) => c.type === "text")?.text
      : undefined;
    throw new Error(errorText || `Error calling tool ${toolName}`);
  }

  return result;
}
