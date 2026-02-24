/**
 * Microsoft OneDrive Data Source Implementation
 *
 * Uses Microsoft Graph API to interact with OneDrive and Word Online documents
 */

import {
  IDataSource,
  ResumeDocument,
  DataSourceConfig,
} from "../data-source-interface.js";
import { db } from "../../db/client.js";

/**
 * Microsoft OneDrive Data Source Implementation
 *
 * Supports:
 * - OneDrive files (.docx)
 * - SharePoint Online documents
 * - Word Online documents
 */
export class MicrosoftOneDriveDataSource implements IDataSource {
  readonly name = "microsoft";
  readonly displayName = "Microsoft OneDrive / Word Online";
  readonly enabled: boolean;

  constructor() {
    // Enable if Microsoft OAuth credentials are configured
    this.enabled = !!(
      process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
    );
  }

  private async getAccessToken(config: DataSourceConfig): Promise<string> {
    // Try to get from config first
    if (config.accessToken) {
      return config.accessToken;
    }

    // Get from user's stored refresh token
    if (config.userId && config.refreshToken) {
      try {
        const refreshed = await this.refreshAccessToken(config.refreshToken);
        return refreshed.accessToken;
      } catch (error) {
        console.warn("Failed to refresh Microsoft token:", error);
      }
    }

    // Try to get from database
    if (config.userId) {
      try {
        const user = await db.getUserById(config.userId);
        // Note: You'll need to add microsoftRefreshToken to the users table
        // For now, we'll use a placeholder
        if ((user as any)?.microsoftRefreshToken) {
          const refreshed = await this.refreshAccessToken(
            (user as any).microsoftRefreshToken,
          );
          return refreshed.accessToken;
        }
      } catch (error) {
        console.warn("Failed to get user Microsoft token:", error);
      }
    }

    throw new Error(
      "Microsoft access token not found. Please authenticate with Microsoft.",
    );
  }

  private async makeGraphRequest(
    endpoint: string,
    method = "GET",
    body?: any,
    config: DataSourceConfig = {} as DataSourceConfig,
  ): Promise<any> {
    const accessToken = await this.getAccessToken(config);

    const response = await fetch(
      `https://graph.microsoft.com/v1.0${endpoint}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(body ? {} : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft Graph API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  async readDocument(
    documentId: string,
    config: DataSourceConfig,
  ): Promise<ResumeDocument> {
    // Microsoft Graph uses item IDs, not document IDs
    // The documentId here is the drive item ID

    // Get file metadata
    const file = await this.makeGraphRequest(
      `/me/drive/items/${documentId}`,
      "GET",
      undefined,
      config,
    );

    // Get file content (for .docx files, we need to download and parse)
    let content = "";

    try {
      // Download file content
      const contentResponse = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/${documentId}/content`,
        {
          headers: {
            Authorization: `Bearer ${await this.getAccessToken(config)}`,
          },
        },
      );

      if (contentResponse.ok) {
        const buffer = await contentResponse.arrayBuffer();
        const fileExtension = file.name.split(".").pop()?.toLowerCase();

        if (fileExtension === "docx") {
          // Parse .docx file using mammoth
          try {
            const mammoth = await import("mammoth");
            const result = await mammoth.extractRawText({
              arrayBuffer: buffer,
            });
            content = result.value;

            // Also extract formatting information if needed
            // const htmlResult = await mammoth.convertToHtml({ arrayBuffer: buffer });
            // This can be used to preserve formatting
          } catch (parseError: any) {
            console.warn("Failed to parse .docx file:", parseError.message);
            content = "[Failed to parse Word document]";
          }
        } else if (fileExtension === "txt" || fileExtension === "md") {
          // Plain text files
          content = Buffer.from(buffer).toString("utf-8");
        } else if (fileExtension === "pdf") {
          // PDF files - would need pdf-parse library
          try {
            const pdfParseModule = await import("pdf-parse");
            const pdfParse = pdfParseModule.default || pdfParseModule;
            const pdfData = await pdfParse(Buffer.from(buffer));
            content = pdfData.text;
          } catch (parseError: any) {
            console.warn("Failed to parse PDF file:", parseError.message);
            content = "[Failed to parse PDF document]";
          }
        } else {
          content = "[Unsupported file format]";
        }
      }
    } catch (error: any) {
      console.warn("Failed to get document content:", error.message);
      content = `[Error reading document: ${error.message}]`;
    }

    return {
      id: documentId,
      title: file.name,
      content: content,
      url: file.webUrl,
      provider: this.name,
      createdAt: file.createdDateTime
        ? new Date(file.createdDateTime)
        : undefined,
      updatedAt: file.lastModifiedDateTime
        ? new Date(file.lastModifiedDateTime)
        : undefined,
    };
  }

  async createDocument(
    title: string,
    content: string,
    config: DataSourceConfig,
  ): Promise<ResumeDocument> {
    // Create a new Word document in OneDrive
    // Note: Microsoft Graph doesn't have a direct "create Word doc with content" API
    // We'd need to create an empty file and then update it, or use a template

    // For now, create a simple text file that can be opened in Word
    const fileName = `${title}.docx`;

    // Convert content to a format that can be uploaded
    // In a real implementation, you'd use a library to create a proper .docx file
    const fileContent = Buffer.from(content, "utf-8");

    const file = await this.makeGraphRequest(
      `/me/drive/root:/${fileName}:/content`,
      "PUT",
      fileContent,
      config,
    );

    return {
      id: file.id,
      title: file.name,
      content: content,
      url: file.webUrl,
      provider: this.name,
    };
  }

  async copyDocument(
    documentId: string,
    newTitle: string,
    config: DataSourceConfig,
  ): Promise<ResumeDocument> {
    const copiedFile = await this.makeGraphRequest(
      `/me/drive/items/${documentId}/copy`,
      "POST",
      {
        name: newTitle,
      },
      config,
    );

    // The copy operation is async, so we need to wait for it
    // For now, return the original document ID
    // In a real implementation, you'd poll for the copy to complete

    return {
      id: copiedFile.id || documentId,
      title: newTitle,
      content: "",
      url: copiedFile.webUrl || "",
      provider: this.name,
    };
  }

  async updateDocument(
    _documentId: string,
    _content: string,
    _instructions?: string,
    _config?: DataSourceConfig,
  ): Promise<ResumeDocument> {
    // Placeholder implementation - not yet supported

    // Microsoft Graph doesn't have a direct "update Word doc content" API
    // We'd need to:
    // 1. Download the current file
    // 2. Parse it (using mammoth or similar)
    // 3. Modify it
    // 4. Re-upload it

    // For now, this is a placeholder
    throw new Error(
      "Direct document content update not yet implemented for Microsoft OneDrive. " +
        "Please use the Microsoft Word Online API or download/modify/re-upload workflow.",
    );
  }

  async formatText(
    _documentId: string,
    _startIndex: number,
    _endIndex: number,
    _formatting: {
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

    // Microsoft Graph doesn't have a direct text formatting API for Word documents
    // This would require using the Word Online API or Office.js
    throw new Error(
      "Text formatting not yet implemented for Microsoft OneDrive. " +
        "Please use Microsoft Word Online API for formatting operations.",
    );
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
    const comments = await this.makeGraphRequest(
      `/me/drive/items/${documentId}/comments`,
      "GET",
      undefined,
      config,
    );

    return (comments.value || []).map((c: any) => ({
      id: c.id,
      content: c.content || "",
      author: c.author?.user?.displayName || "Unknown",
      createdTime: c.createdDateTime || "",
    }));
  }

  extractDocumentId(url: string): string | null {
    // Extract OneDrive/SharePoint item ID from various URL formats
    const patterns = [
      /\/items\/([a-zA-Z0-9-_!]+)/,
      /id=([a-zA-Z0-9-_!]+)/,
      /onedrive\.live\.com\/redir[^?]*resid=([^&]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }

    return null;
  }

  getOAuthUrl(redirectUri: string, state?: string): string {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) {
      throw new Error("MICROSOFT_CLIENT_ID not configured");
    }

    const scopes = [
      "Files.ReadWrite",
      "Files.ReadWrite.All",
      "Sites.ReadWrite.All", // For SharePoint
      "User.Read",
    ].join(" ");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes,
      response_mode: "query",
      ...(state ? { state } : {}),
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeOAuthCode(
    code: string,
    redirectUri: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
  }> {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Microsoft OAuth credentials not configured");
    }

    const response = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
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
      },
    );

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
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Microsoft OAuth credentials not configured");
    }

    const response = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
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
      },
    );

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
export const microsoftOneDriveDataSource = new MicrosoftOneDriveDataSource();
