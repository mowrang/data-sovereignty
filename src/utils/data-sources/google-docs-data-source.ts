/**
 * Google Docs Data Source Implementation
 *
 * Wraps the existing MCP Google Docs server functionality
 * to implement the IDataSource interface
 */

import {
  IDataSource,
  ResumeDocument,
  DataSourceConfig,
} from "../data-source-interface.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";
import * as url from "url";
import * as fs from "fs";
import { db } from "../../db/client.js";

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

  const possiblePaths = [
    "/deps/social-media-agent/mcp-google-docs/dist/server.js",
    path.join(process.cwd(), "mcp-google-docs", "dist", "server.js"),
    path.resolve(
      __dirname,
      "../../../../",
      "mcp-google-docs",
      "dist",
      "server.js",
    ),
    path.resolve(__dirname, "../../../../../mcp-google-docs/dist/server.js"),
  ];

  for (const serverPath of possiblePaths) {
    if (fs.existsSync(serverPath)) {
      return serverPath;
    }
  }

  return (
    possiblePaths[1] ||
    path.join(process.cwd(), "mcp-google-docs", "dist", "server.js")
  );
}

/**
 * Create an MCP client for Google Docs operations
 */
async function createMCPClient(config: DataSourceConfig): Promise<Client> {
  const serverPath = getMCPServerPath();

  // Get user's Google refresh token
  let googleRefreshToken: string | undefined = config.refreshToken;

  if (!googleRefreshToken && config.userId) {
    try {
      const user = await db.getUserById(config.userId);
      if (user?.googleRefreshToken) {
        googleRefreshToken = user.googleRefreshToken;
      }
    } catch (error) {
      console.warn("Failed to get user Google token:", error);
    }
  }

  // Fallback to environment variable
  if (!googleRefreshToken) {
    googleRefreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  }

  if (!googleRefreshToken) {
    throw new Error(
      "Google refresh token not found. Please authenticate with Google.",
    );
  }

  const env = {
    ...process.env,
    GOOGLE_REFRESH_TOKEN: googleRefreshToken,
    ...(config.userId ? { MCP_USER_ID: config.userId } : {}),
  };

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    env,
  });

  const client = new Client(
    {
      name: "google-docs-data-source",
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
async function callMCPTool(
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

/**
 * Google Docs Data Source Implementation
 */
export class GoogleDocsDataSource implements IDataSource {
  readonly name = "google";
  readonly displayName = "Google Docs";
  readonly enabled: boolean;

  constructor() {
    // Enable if Google OAuth credentials are configured
    this.enabled = !!(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    );
  }

  async readDocument(
    documentId: string,
    config: DataSourceConfig,
  ): Promise<ResumeDocument> {
    const client = await createMCPClient(config);
    try {
      const result = await callMCPTool(client, "read_google_doc", {
        documentId,
      });
      const content = result.content?.[0];

      if (content?.type === "text") {
        return {
          id: documentId,
          title: "", // MCP doesn't return title, would need separate call
          content: content.text,
          url: `https://docs.google.com/document/d/${documentId}/edit`,
          provider: this.name,
        };
      }

      throw new Error("Unexpected response format from Google Docs");
    } finally {
      await client.close();
    }
  }

  async createDocument(
    _title: string,
    _content: string,
    _config: DataSourceConfig,
  ): Promise<ResumeDocument> {
    // Google Docs doesn't have a direct create API via MCP
    // We'll need to create via Drive API or use a template
    // For now, throw an error suggesting to use copyDocument with a template
    throw new Error(
      "Direct document creation not supported. Please use copyDocument with a template document.",
    );
  }

  async copyDocument(
    documentId: string,
    newTitle: string,
    config: DataSourceConfig,
  ): Promise<ResumeDocument> {
    const client = await createMCPClient(config);
    try {
      const result = await callMCPTool(client, "copy_google_doc", {
        documentId,
        title: newTitle,
      });

      const content = result.content?.[0];
      if (content?.type === "text") {
        const data = JSON.parse(content.text);
        return {
          id: data.documentId,
          title: newTitle,
          content: "", // Would need to read separately
          url: data.url,
          provider: this.name,
        };
      }

      throw new Error("Unexpected response format from Google Docs");
    } finally {
      await client.close();
    }
  }

  async updateDocument(
    documentId: string,
    content: string,
    instructions?: string,
    config?: DataSourceConfig,
  ): Promise<ResumeDocument> {
    if (!config) {
      throw new Error("DataSourceConfig is required");
    }

    const client = await createMCPClient(config);
    try {
      await callMCPTool(client, "update_google_doc", {
        documentId,
        instructions: instructions || "Update document content",
        currentContent: content,
      });

      return {
        id: documentId,
        title: "", // Would need separate call to get title
        content: content,
        url: `https://docs.google.com/document/d/${documentId}/edit`,
        provider: this.name,
      };
    } finally {
      await client.close();
    }
  }

  async formatText(
    documentId: string,
    startIndex: number,
    endIndex: number,
    formatting: {
      bold?: boolean;
      italic?: boolean;
      fontSize?: number;
      fontFamily?: string;
      foregroundColor?: { red: number; green: number; blue: number };
    },
    config?: DataSourceConfig,
  ): Promise<void> {
    if (!config) {
      throw new Error("DataSourceConfig is required");
    }

    const client = await createMCPClient(config);
    try {
      await callMCPTool(client, "format_text", {
        documentId,
        startIndex,
        endIndex,
        ...formatting,
      });
    } finally {
      await client.close();
    }
  }

  async getComments(
    documentId: string,
    config: DataSourceConfig,
  ): Promise<
    Array<{
      id: string;
      content: string;
      author: string;
      createdTime: string;
    }>
  > {
    const client = await createMCPClient(config);
    try {
      const result = await callMCPTool(client, "get_doc_comments", {
        documentId,
      });
      const content = result.content?.[0];

      if (content?.type === "text") {
        const comments = JSON.parse(content.text);
        return comments.map((c: any) => ({
          id: c.id,
          content: c.content || "",
          author: c.author?.displayName || "Unknown",
          createdTime: c.createdTime || "",
        }));
      }

      return [];
    } finally {
      await client.close();
    }
  }

  extractDocumentId(url: string): string | null {
    // Extract Google Docs ID from various URL formats
    const patterns = [
      /\/document\/d\/([a-zA-Z0-9-_]+)/,
      /id=([a-zA-Z0-9-_]+)/,
      /\/d\/([a-zA-Z0-9-_]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  getOAuthUrl(redirectUri: string, state?: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error("GOOGLE_CLIENT_ID not configured");
    }

    const scopes = [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive",
    ].join(" ");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes,
      access_type: "offline",
      prompt: "consent",
      ...(state ? { state } : {}),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeOAuthCode(
    code: string,
    redirectUri: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
  }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth credentials not configured");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange OAuth code: ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn?: number;
  }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth credentials not configured");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh access token: ${error}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }
}

// Export singleton instance
export const googleDocsDataSource = new GoogleDocsDataSource();
