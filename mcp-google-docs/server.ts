#!/usr/bin/env node
/**
 * MCP Server for Google Docs API
 * Provides tools for reading, copying, and updating Google Docs
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { google } from "googleapis";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from project root (parent of mcp-google-docs) or cwd
// Note: process.env takes precedence (important when running in Docker where env vars are passed from langgraph.json)
const rootEnv = path.join(__dirname, "..", "..", ".env");
const cwdEnv = path.join(process.cwd(), ".env");
for (const p of [rootEnv, cwdEnv]) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: false }); // Don't override existing process.env
    break;
  }
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth2callback";
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

class GoogleDocsMCPServer {
  private server: Server;
  private docs: any;
  private drive: any;

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

  constructor() {
    this.server = new Server(
      {
        name: "google-docs-mcp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    );

    this.setupHandlers();
    // Initialize Google APIs synchronously - errors will be caught when methods are called
    try {
      this.initializeGoogleAPIs();
    } catch (error: any) {
      console.error(
        "Warning: Google APIs initialization failed:",
        error.message,
      );
      // Don't throw - let methods handle the error when called
    }
  }

  private initializeGoogleAPIs() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      const msg =
        "Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env or as environment variables.";
      console.error(msg);
      throw new Error(msg);
    }

    // Refresh token can come from environment (set by parent process for multi-user)
    // or from process.env (for backward compatibility)
    const refreshToken =
      GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN;

    if (!refreshToken) {
      const msg =
        "GOOGLE_REFRESH_TOKEN not set. For multi-user mode, ensure user is authenticated. For single-user mode, run 'npm run mcp:get-token' to get a refresh token.";
      console.error(msg);
      throw new Error(msg);
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI,
      );

      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      this.docs = google.docs({ version: "v1", auth: oauth2Client });
      this.drive = google.drive({ version: "v3", auth: oauth2Client });
    } catch (error: any) {
      const msg = `Failed to initialize Google APIs: ${error.message}`;
      console.error(msg);
      throw new Error(msg);
    }
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "read_google_doc",
          description: "Read the content of a Google Doc by document ID",
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
          description: "Create a copy of a Google Doc",
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
            "Update the content of a Google Doc based on instructions",
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
        {
          name: "format_text",
          description:
            "Format text in a Google Doc (bold, italic, font size, font family, color, etc.)",
          inputSchema: {
            type: "object",
            properties: {
              documentId: {
                type: "string",
                description: "The Google Doc ID",
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
            },
            required: ["documentId", "startIndex", "endIndex"],
          },
        },
        {
          name: "get_doc_comments",
          description: "Get all comments from a Google Doc",
          inputSchema: {
            type: "object",
            properties: {
              documentId: {
                type: "string",
                description: "The Google Doc ID",
              },
            },
            required: ["documentId"],
          },
        },
        {
          name: "apply_comment_updates",
          description: "Apply updates to a Google Doc based on comments",
          inputSchema: {
            type: "object",
            properties: {
              documentId: {
                type: "string",
                description: "The Google Doc ID",
              },
              commentId: {
                type: "string",
                description:
                  "The comment ID to apply (optional, if not provided, applies all comments)",
              },
            },
            required: ["documentId"],
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
        switch (name) {
          case "read_google_doc": {
            const documentId = this.requireStringArg(
              args as Record<string, unknown>,
              "documentId",
            );
            return await this.readDocument(documentId);
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
            return await this.copyDocument(documentId, title);
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
            return await this.updateDocument(
              documentId,
              instructions,
              currentContent,
            );
          }
          case "get_doc_comments": {
            const documentId = this.requireStringArg(
              args as Record<string, unknown>,
              "documentId",
            );
            return await this.getComments(documentId);
          }
          case "apply_comment_updates": {
            const documentId = this.requireStringArg(
              args as Record<string, unknown>,
              "documentId",
            );
            const commentId = this.optionalStringArg(
              args as Record<string, unknown>,
              "commentId",
            );
            return await this.applyCommentUpdates(documentId, commentId);
          }
          case "format_text": {
            const documentId = this.requireStringArg(
              args as Record<string, unknown>,
              "documentId",
            );
            const startIndex = args.startIndex as number;
            const endIndex = args.endIndex as number;
            if (
              typeof startIndex !== "number" ||
              typeof endIndex !== "number"
            ) {
              throw new Error("startIndex and endIndex must be numbers");
            }
            return await this.formatText(
              documentId,
              startIndex,
              endIndex,
              args as Record<string, unknown>,
            );
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
          uri: "google-doc://document",
          name: "Google Doc",
          description: "Access Google Docs",
          mimeType: "application/vnd.google-apps.document",
        },
      ],
    }));

    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const uri = request.params.uri;
        const match = uri.match(/^google-doc:\/\/(.+)$/);
        if (!match) {
          throw new Error(`Invalid resource URI: ${uri}`);
        }
        const documentId = match[1];
        const result = await this.readDocument(documentId);
        return {
          contents: [
            {
              uri,
              mimeType: "text/plain",
              text: result.content[0].text,
            },
          ],
        };
      },
    );
  }

  private async readDocument(documentId: string) {
    if (!this.docs) {
      throw new Error(
        "Google Docs API not initialized. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env",
      );
    }

    try {
      const doc = await this.docs.documents.get({
        documentId,
      });

      const content = doc.data.body?.content || [];
      let text = "";

      for (const element of content) {
        if (element.paragraph) {
          const paragraph = element.paragraph;
          for (const textElement of paragraph.elements || []) {
            if (textElement.textRun) {
              text += textElement.textRun.content || "";
            }
          }
        }
      }

      return {
        content: [
          {
            type: "text",
            text: text.trim(),
          },
        ],
      };
    } catch (error: any) {
      if (
        error.code === 401 ||
        error.message?.includes("invalid_grant") ||
        error.message?.includes("token")
      ) {
        throw new Error(
          "Google authentication failed. Please check your GOOGLE_REFRESH_TOKEN in .env. Run 'npm run mcp:get-token' to get a new token.",
        );
      }
      throw error;
    }
  }

  private async copyDocument(documentId: string, title: string) {
    if (!this.drive) {
      throw new Error(
        "Google Drive API not initialized. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env",
      );
    }

    try {
      const copiedFile = await this.drive.files.copy({
        fileId: documentId,
        requestBody: {
          name: title,
        },
      });

      const newDocumentId = copiedFile.data.id || "";
      const url = `https://docs.google.com/document/d/${newDocumentId}/edit`;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                documentId: newDocumentId,
                url,
                title,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error(
          `File not found: ${documentId}. Make sure you have access to this document and the ID is correct.`,
        );
      }
      if (error.code === 403) {
        throw new Error(
          `Permission denied: You don't have permission to copy this document. Make sure you have edit access.`,
        );
      }
      throw error;
    }
  }

  private async updateDocument(
    documentId: string,
    instructions: string,
    currentContent?: string,
  ) {
    if (!this.docs) {
      throw new Error(
        "Google Docs API not initialized. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env",
      );
    }

    try {
      // Get the current document structure
      const doc = await this.docs.documents.get({
        documentId,
      });

      const body = doc.data.body;
      if (!body || !body.content) {
        throw new Error("Document structure is invalid");
      }

      // Find the end index of the document (before the final paragraph break)
      // The document always ends with a paragraph break at the end
      let endIndex = 1;
      for (const element of body.content) {
        if (element.endIndex) {
          endIndex = element.endIndex;
        }
      }

      // Use currentContent if provided (this is the LLM-generated updated content)
      // Otherwise fall back to instructions
      const updatedContent = currentContent || instructions;

      if (!updatedContent || updatedContent.trim().length === 0) {
        throw new Error("No content provided to update document");
      }

      // Prepare batch update requests
      const requests: any[] = [];

      // Delete all existing content except the final paragraph break
      // We keep index 0 (start) and the last character (paragraph break)
      if (endIndex > 1) {
        requests.push({
          deleteContentRange: {
            range: {
              startIndex: 1,
              endIndex: endIndex - 1, // Keep the final paragraph break
            },
          },
        });
      }

      // Insert the new content at the beginning
      // Preserve line breaks and paragraph structure
      const insertIndex = 1;
      requests.push({
        insertText: {
          location: {
            index: insertIndex,
          },
          text: updatedContent,
        },
      });

      // Execute batch update
      await this.docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests,
        },
      });

      // After inserting text, apply basic formatting to make it look professional
      // Format headings (lines that are ALL CAPS or start with specific patterns)
      if (updatedContent) {
        const lines = updatedContent.split("\n");
        let currentIndex = insertIndex;
        const formatRequests: any[] = [];

        for (const line of lines) {
          const lineLength = line.length;
          const nextIndex = currentIndex + lineLength + 1; // +1 for newline

          // Format headings (all caps lines, or lines that look like headings)
          if (
            line.trim().length > 0 &&
            line === line.toUpperCase() &&
            line.length < 50 &&
            /^[A-Z\s-]+$/.test(line.trim())
          ) {
            formatRequests.push({
              updateTextStyle: {
                range: {
                  startIndex: currentIndex,
                  endIndex: currentIndex + lineLength,
                },
                textStyle: {
                  bold: true,
                  fontSize: {
                    magnitude: 14,
                    unit: "PT",
                  },
                },
                fields: "bold,fontSize",
              },
            });
          }

          currentIndex = nextIndex;
        }

        // Apply formatting if any
        if (formatRequests.length > 0) {
          await this.docs.documents.batchUpdate({
            documentId,
            requestBody: {
              requests: formatRequests,
            },
          });
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                documentId,
                message: "Document updated successfully",
                url: `https://docs.google.com/document/d/${documentId}/edit`,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error(
          `File not found: ${documentId}. Make sure you have access to this document.`,
        );
      }
      if (error.code === 403) {
        throw new Error(
          `Permission denied: You don't have permission to update this document. Make sure you have edit access.`,
        );
      }
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }

  /**
   * Format text in a Google Doc
   */
  private async formatText(
    documentId: string,
    startIndex: number,
    endIndex: number,
    options: Record<string, unknown>,
  ) {
    if (!this.docs) {
      throw new Error("Google Docs API not initialized");
    }

    try {
      // Get document to verify indices are valid
      const doc = await this.docs.documents.get({ documentId });
      const body = doc.data.body;
      if (!body || !body.content) {
        throw new Error("Document structure is invalid");
      }

      // Find document end index
      let docEndIndex = 1;
      for (const element of body.content) {
        if (element.endIndex) {
          docEndIndex = element.endIndex;
        }
      }

      // Validate indices
      if (startIndex < 0 || endIndex > docEndIndex || startIndex >= endIndex) {
        throw new Error(
          `Invalid range: startIndex=${startIndex}, endIndex=${endIndex}, docEndIndex=${docEndIndex}`,
        );
      }

      // Build TextStyle object
      const textStyle: any = {};
      const fields: string[] = [];

      if (options.bold !== undefined) {
        textStyle.bold = Boolean(options.bold);
        fields.push("bold");
      }

      if (options.italic !== undefined) {
        textStyle.italic = Boolean(options.italic);
        fields.push("italic");
      }

      if (options.fontSize !== undefined) {
        textStyle.fontSize = {
          magnitude: Number(options.fontSize),
          unit: "PT",
        };
        fields.push("fontSize");
      }

      if (options.fontFamily !== undefined) {
        textStyle.weightedFontFamily = {
          fontFamily: String(options.fontFamily),
        };
        fields.push("weightedFontFamily");
      }

      if (options.foregroundColor !== undefined) {
        const color = options.foregroundColor as {
          red?: number;
          green?: number;
          blue?: number;
        };
        textStyle.foregroundColor = {
          color: {
            rgbColor: {
              red: color.red ?? 0,
              green: color.green ?? 0,
              blue: color.blue ?? 0,
            },
          },
        };
        fields.push("foregroundColor");
      }

      if (fields.length === 0) {
        throw new Error("No formatting options provided");
      }

      // Apply formatting
      await this.docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              updateTextStyle: {
                range: {
                  startIndex,
                  endIndex,
                },
                textStyle,
                fields: fields.join(","),
              },
            },
          ],
        },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                documentId,
                message: "Text formatted successfully",
                range: { startIndex, endIndex },
                appliedFormatting: fields,
                url: `https://docs.google.com/document/d/${documentId}/edit`,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error(`File not found: ${documentId}`);
      }
      if (error.code === 403) {
        throw new Error(
          `Permission denied: You don't have permission to format this document`,
        );
      }
      throw new Error(`Failed to format text: ${error.message}`);
    }
  }

  private async getComments(documentId: string) {
    if (!this.drive) {
      throw new Error(
        "Google Drive API not initialized. Check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env",
      );
    }

    try {
      // Comments are accessed via Drive API, not Docs API
      const comments = await this.drive.comments.list({
        fileId: documentId,
        fields: "comments(id,content,author,createdTime,modifiedTime,replies)",
      });

      const commentsList = comments.data.comments || [];

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(commentsList, null, 2),
          },
        ],
      };
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error(
          `File not found: ${documentId}. Make sure you have access to this document.`,
        );
      }
      if (error.code === 403) {
        throw new Error(
          `Permission denied: You don't have permission to view comments on this document.`,
        );
      }
      throw error;
    }
  }

  private async applyCommentUpdates(documentId: string, commentId?: string) {
    const comments = await this.getComments(documentId);
    const commentsData = JSON.parse(comments.content[0].text);

    const commentsToApply = commentId
      ? commentsData.filter((c: any) => c.id === commentId)
      : commentsData;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              documentId,
              comments: commentsToApply,
              message:
                "Comments retrieved. The agent will process these updates.",
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  async run() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error("Google Docs MCP server running on stdio");
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

const server = new GoogleDocsMCPServer();
server.run().catch((error) => {
  console.error("Error running MCP server:", error);
  process.exit(1);
});
