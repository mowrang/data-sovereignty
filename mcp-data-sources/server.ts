#!/usr/bin/env node
/**
 * MCP Server for Multi-Source Data Sources
 * Provides tools for reading, copying, and updating documents from multiple sources
 * Uses DataSourceManager internally while maintaining MCP interface
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from project root
const rootEnv = path.join(__dirname, "..", "..", ".env");
const cwdEnv = path.join(process.cwd(), ".env");
for (const p of [rootEnv, cwdEnv]) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: false });
    break;
  }
}

// Import DataSourceManager (will be available after initialization)
let dataSourceManager: any;
let db: any;

// Lazy load to avoid circular dependencies
async function getDataSourceManager() {
  if (!dataSourceManager) {
    // @ts-expect-error - Dynamic import path resolution
    const managerModule = await import(
      "../../src/utils/data-source-manager.js"
    );
    dataSourceManager = managerModule.dataSourceManager;

    // Also import db for user token retrieval
    // @ts-expect-error - Dynamic import path resolution
    const dbModule = await import("../../src/db/client.js");
    db = dbModule.db;
  }
  return dataSourceManager;
}

class MultiSourceMCPServer {
  private server: Server;
  private userId: string | null = null;

  private requireStringArg(args: Record<string, unknown>, key: string): string {
    const value = args[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Missing or invalid argument: ${key}`);
    }
    return value;
  }

  private optionalStringArg(
    args: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = args[key];
    if (value === undefined || value === null) return undefined;
    if (typeof value !== "string") {
      throw new Error(`Invalid argument type for ${key}; expected string`);
    }
    return value;
  }

  private async getConfig(provider?: string): Promise<any> {
    // Get user ID from environment (set by parent process)
    const userId = process.env.MCP_USER_ID || this.userId;

    // Get user's refresh token for the specified provider
    let refreshToken: string | undefined;
    if (userId && db) {
      try {
        const user = await db.getUserById(userId);
        if (provider === "google" && user?.googleRefreshToken) {
          refreshToken = user.googleRefreshToken;
        } else if (
          provider === "microsoft" &&
          (user as any)?.microsoftRefreshToken
        ) {
          refreshToken = (user as any).microsoftRefreshToken;
        }
      } catch (error) {
        console.warn("Failed to get user token:", error);
      }
    }

    // Fallback to environment variable
    if (!refreshToken) {
      if (provider === "google") {
        refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
      } else if (provider === "microsoft") {
        refreshToken = process.env.MICROSOFT_REFRESH_TOKEN;
      }
    }

    return {
      userId: userId || undefined,
      provider: provider || "google",
      refreshToken,
    };
  }

  constructor() {
    this.server = new Server(
      {
        name: "multi-source-mcp-server",
        version: "0.2.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "read_document",
          description:
            "Read the content of a document from any supported source (Google Docs, Microsoft OneDrive, etc.)",
          inputSchema: {
            type: "object",
            properties: {
              documentId: {
                type: "string",
                description: "The document ID (provider-specific)",
              },
              documentUrl: {
                type: "string",
                description: "The document URL (for auto-detecting provider)",
              },
              provider: {
                type: "string",
                description:
                  "The data source provider (google, microsoft, local). Auto-detected from URL if not provided.",
                enum: ["google", "microsoft", "local"],
              },
            },
            required: ["documentId"],
          },
        },
        {
          name: "copy_document",
          description: "Create a copy of a document from any supported source",
          inputSchema: {
            type: "object",
            properties: {
              documentId: {
                type: "string",
                description: "The source document ID",
              },
              title: {
                type: "string",
                description: "Title for the copied document",
              },
              provider: {
                type: "string",
                description: "The data source provider",
                enum: ["google", "microsoft", "local"],
              },
            },
            required: ["documentId", "title"],
          },
        },
        {
          name: "update_document",
          description:
            "Update the content of a document based on instructions, preserving formatting",
          inputSchema: {
            type: "object",
            properties: {
              documentId: {
                type: "string",
                description: "The document ID to update",
              },
              instructions: {
                type: "string",
                description:
                  "Natural language instructions for how to update the document",
              },
              currentContent: {
                type: "string",
                description:
                  "The current content of the document (optional, will be fetched if not provided)",
              },
              provider: {
                type: "string",
                description: "The data source provider",
                enum: ["google", "microsoft", "local"],
              },
            },
            required: ["documentId", "instructions"],
          },
        },
        {
          name: "format_text",
          description:
            "Format text in a document (bold, italic, font size, font family, color, etc.)",
          inputSchema: {
            type: "object",
            properties: {
              documentId: {
                type: "string",
                description: "The document ID",
              },
              startIndex: {
                type: "number",
                description: "Start index of text to format (0-based)",
              },
              endIndex: {
                type: "number",
                description: "End index of text to format (exclusive)",
              },
              bold: {
                type: "boolean",
                description: "Make text bold",
              },
              italic: {
                type: "boolean",
                description: "Make text italic",
              },
              fontSize: {
                type: "number",
                description: "Font size in points (e.g., 12, 14, 16)",
              },
              fontFamily: {
                type: "string",
                description:
                  "Font family name (e.g., 'Arial', 'Times New Roman', 'Calibri')",
              },
              foregroundColor: {
                type: "object",
                description:
                  "Text color as RGB object {red: 0-1, green: 0-1, blue: 0-1}",
                properties: {
                  red: { type: "number", minimum: 0, maximum: 1 },
                  green: { type: "number", minimum: 0, maximum: 1 },
                  blue: { type: "number", minimum: 0, maximum: 1 },
                },
              },
              provider: {
                type: "string",
                description: "The data source provider",
                enum: ["google", "microsoft", "local"],
              },
            },
            required: ["documentId", "startIndex", "endIndex"],
          },
        },
        {
          name: "get_doc_comments",
          description: "Get all comments from a document",
          inputSchema: {
            type: "object",
            properties: {
              documentId: {
                type: "string",
                description: "The document ID",
              },
              provider: {
                type: "string",
                description: "The data source provider",
                enum: ["google", "microsoft", "local"],
              },
            },
            required: ["documentId"],
          },
        },
        // Legacy tools for backward compatibility
        {
          name: "read_google_doc",
          description:
            "[Legacy] Read the content of a Google Doc by document ID",
          inputSchema: {
            type: "object",
            properties: {
              documentId: {
                type: "string",
                description: "The Google Doc ID (from the URL)",
              },
            },
            required: ["documentId"],
          },
        },
        {
          name: "copy_google_doc",
          description: "[Legacy] Create a copy of a Google Doc",
          inputSchema: {
            type: "object",
            properties: {
              documentId: {
                type: "string",
                description: "The source Google Doc ID",
              },
              title: {
                type: "string",
                description: "Title for the copied document",
              },
            },
            required: ["documentId", "title"],
          },
        },
        {
          name: "update_google_doc",
          description:
            "[Legacy] Update the content of a Google Doc based on instructions",
          inputSchema: {
            type: "object",
            properties: {
              documentId: {
                type: "string",
                description: "The Google Doc ID to update",
              },
              instructions: {
                type: "string",
                description:
                  "Natural language instructions for how to update the document",
              },
              currentContent: {
                type: "string",
                description:
                  "The current content of the document (optional, will be fetched if not provided)",
              },
            },
            required: ["documentId", "instructions"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name } = request.params;
      const args = request.params.arguments;

      if (!args || typeof args !== "object") {
        throw new Error("Tool arguments are required");
      }

      try {
        const manager = await getDataSourceManager();

        switch (name) {
          case "read_document": {
            const documentId = this.requireStringArg(
              args as Record<string, unknown>,
              "documentId",
            );
            const documentUrl = this.optionalStringArg(
              args as Record<string, unknown>,
              "documentUrl",
            );
            const provider = this.optionalStringArg(
              args as Record<string, unknown>,
              "provider",
            );

            const config = await this.getConfig(provider || undefined);
            const doc = await manager.readDocument(
              documentId,
              documentUrl ||
                `https://docs.google.com/document/d/${documentId}/edit`,
              config,
            );

            return {
              content: [
                {
                  type: "text",
                  text: doc.content,
                },
              ],
            };
          }

          case "copy_document": {
            const documentId = this.requireStringArg(
              args as Record<string, unknown>,
              "documentId",
            );
            const title = this.requireStringArg(
              args as Record<string, unknown>,
              "title",
            );
            const provider = this.optionalStringArg(
              args as Record<string, unknown>,
              "provider",
            );

            const config = await this.getConfig(provider || undefined);
            const doc = await manager.copyDocument(documentId, title, config);

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      documentId: doc.id,
                      url: doc.url,
                      title: doc.title,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          case "update_document": {
            const documentId = this.requireStringArg(
              args as Record<string, unknown>,
              "documentId",
            );
            const instructions = this.requireStringArg(
              args as Record<string, unknown>,
              "instructions",
            );
            const currentContent = this.optionalStringArg(
              args as Record<string, unknown>,
              "currentContent",
            );
            const provider = this.optionalStringArg(
              args as Record<string, unknown>,
              "provider",
            );

            const config = await this.getConfig(provider || undefined);
            const doc = await manager.updateDocument(
              documentId,
              currentContent || instructions,
              instructions,
              config,
            );

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      documentId: doc.id,
                      message: "Document updated successfully",
                      url: doc.url,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          case "format_text": {
            const documentId = this.requireStringArg(
              args as Record<string, unknown>,
              "documentId",
            );
            const startIndex = args.startIndex as number;
            const endIndex = args.endIndex as number;
            const provider = this.optionalStringArg(
              args as Record<string, unknown>,
              "provider",
            );

            if (
              typeof startIndex !== "number" ||
              typeof endIndex !== "number"
            ) {
              throw new Error("startIndex and endIndex must be numbers");
            }

            const config = await this.getConfig(provider || undefined);
            await manager.formatText(
              documentId,
              startIndex,
              endIndex,
              {
                bold: args.bold as boolean | undefined,
                italic: args.italic as boolean | undefined,
                fontSize: args.fontSize as number | undefined,
                fontFamily: args.fontFamily as string | undefined,
                foregroundColor: args.foregroundColor as
                  | { red: number; green: number; blue: number }
                  | undefined,
              },
              config,
            );

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      documentId,
                      message: "Text formatted successfully",
                      range: { startIndex, endIndex },
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          case "get_doc_comments": {
            const documentId = this.requireStringArg(
              args as Record<string, unknown>,
              "documentId",
            );
            const provider = this.optionalStringArg(
              args as Record<string, unknown>,
              "provider",
            );

            const config = await this.getConfig(provider || undefined);
            const comments = await manager.getComments(documentId, config);

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(comments, null, 2),
                },
              ],
            };
          }

          // Legacy handlers for backward compatibility
          case "read_google_doc": {
            const documentId = this.requireStringArg(
              args as Record<string, unknown>,
              "documentId",
            );
            const config = await this.getConfig("google");
            const doc = await manager.readDocument(
              documentId,
              `https://docs.google.com/document/d/${documentId}/edit`,
              config,
            );

            return {
              content: [
                {
                  type: "text",
                  text: doc.content,
                },
              ],
            };
          }

          case "copy_google_doc": {
            const documentId = this.requireStringArg(
              args as Record<string, unknown>,
              "documentId",
            );
            const title = this.requireStringArg(
              args as Record<string, unknown>,
              "title",
            );
            const config = await this.getConfig("google");
            const doc = await manager.copyDocument(documentId, title, config);

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      documentId: doc.id,
                      url: doc.url,
                      title: doc.title,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          case "update_google_doc": {
            const documentId = this.requireStringArg(
              args as Record<string, unknown>,
              "documentId",
            );
            const instructions = this.requireStringArg(
              args as Record<string, unknown>,
              "instructions",
            );
            const currentContent = this.optionalStringArg(
              args as Record<string, unknown>,
              "currentContent",
            );
            const config = await this.getConfig("google");
            const doc = await manager.updateDocument(
              documentId,
              currentContent || instructions,
              instructions,
              config,
            );

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      documentId: doc.id,
                      message: "Document updated successfully",
                      url: doc.url,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "document://source",
          name: "Document",
          description: "Access documents from multiple sources",
          mimeType: "text/plain",
        },
      ],
    }));

    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const uri = request.params.uri;
        const match = uri.match(/^document:\/\/(.+)$/);
        if (!match) {
          throw new Error(`Invalid resource URI: ${uri}`);
        }
        const documentId = match[1];
        const manager = await getDataSourceManager();
        const config = await this.getConfig();
        const doc = await manager.readDocument(
          documentId,
          `https://docs.google.com/document/d/${documentId}/edit`,
          config,
        );
        return {
          contents: [
            {
              uri,
              mimeType: "text/plain",
              text: doc.content,
            },
          ],
        };
      },
    );
  }

  async run() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error("Multi-source MCP server running on stdio");
    } catch (error: any) {
      console.error("Failed to start MCP server:", error);
      process.exit(1);
    }
  }
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception in MCP server:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection in MCP server:", reason);
  process.exit(1);
});

const server = new MultiSourceMCPServer();
server.run().catch((error) => {
  console.error("Error running MCP server:", error);
  process.exit(1);
});
