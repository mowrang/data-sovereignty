/**
 * Local File Data Source Implementation
 *
 * Allows users to upload resume files directly
 * Supports: .docx, .pdf, .txt, .md files
 */

import {
  IDataSource,
  ResumeDocument,
  DataSourceConfig,
} from "../data-source-interface.js";
import * as fs from "fs";
import * as path from "path";

/**
 * Local File Data Source Implementation
 *
 * Stores uploaded files in a configured directory
 * Note: This is a simplified implementation. In production, you'd want to:
 * - Store files in S3 or similar cloud storage
 * - Parse .docx files properly (using mammoth or similar)
 * - Parse .pdf files (using pdf-parse or similar)
 * - Handle file versioning
 */
export class LocalFileDataSource implements IDataSource {
  readonly name = "local";
  readonly displayName = "Local File Upload";
  readonly enabled: boolean;

  private uploadDir: string;

  constructor() {
    // Enable if upload directory is configured
    this.uploadDir =
      process.env.LOCAL_FILE_UPLOAD_DIR ||
      path.join(process.cwd(), "uploads", "resumes");
    this.enabled = true; // Always enabled for local files

    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private getFilePath(documentId: string, userId: string): string {
    // Store files in user-specific subdirectories
    const userDir = path.join(this.uploadDir, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    return path.join(userDir, `${documentId}.txt`); // Store as text for now
  }

  private getMetadataPath(documentId: string, userId: string): string {
    return this.getFilePath(documentId, userId) + ".meta.json";
  }

  async readDocument(
    documentId: string,
    config: DataSourceConfig,
  ): Promise<ResumeDocument> {
    if (!config.userId) {
      throw new Error("userId is required for local file data source");
    }

    const filePath = this.getFilePath(documentId, config.userId);
    const metaPath = this.getMetadataPath(documentId, config.userId);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    let metadata: any = {};

    if (fs.existsSync(metaPath)) {
      metadata = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    }

    return {
      id: documentId,
      title: metadata.title || `Resume ${documentId}`,
      content: content,
      url: `/uploads/resumes/${config.userId}/${documentId}`, // Relative URL
      provider: this.name,
      createdAt: metadata.createdAt ? new Date(metadata.createdAt) : undefined,
      updatedAt: metadata.updatedAt ? new Date(metadata.updatedAt) : undefined,
    };
  }

  async createDocument(
    title: string,
    content: string,
    config: DataSourceConfig,
  ): Promise<ResumeDocument> {
    if (!config.userId) {
      throw new Error("userId is required for local file data source");
    }

    const documentId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const filePath = this.getFilePath(documentId, config.userId);
    const metaPath = this.getMetadataPath(documentId, config.userId);

    // Write content
    fs.writeFileSync(filePath, content, "utf-8");

    // Write metadata
    const metadata = {
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), "utf-8");

    return {
      id: documentId,
      title,
      content,
      url: `/uploads/resumes/${config.userId}/${documentId}`,
      provider: this.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async copyDocument(
    documentId: string,
    newTitle: string,
    config: DataSourceConfig,
  ): Promise<ResumeDocument> {
    const original = await this.readDocument(documentId, config);

    return this.createDocument(newTitle, original.content, config);
  }

  async updateDocument(
    documentId: string,
    content: string,
    _instructions?: string,
    config?: DataSourceConfig,
  ): Promise<ResumeDocument> {
    if (!config) {
      throw new Error("DataSourceConfig is required");
    }

    if (!config.userId) {
      throw new Error("userId is required for local file data source");
    }

    const filePath = this.getFilePath(documentId, config.userId);
    const metaPath = this.getMetadataPath(documentId, config.userId);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Update content
    fs.writeFileSync(filePath, content, "utf-8");

    // Update metadata
    let metadata: any = {};
    if (fs.existsSync(metaPath)) {
      metadata = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    }
    metadata.updatedAt = new Date().toISOString();
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), "utf-8");

    return {
      id: documentId,
      title: metadata.title || `Resume ${documentId}`,
      content,
      url: `/uploads/resumes/${config.userId}/${documentId}`,
      provider: this.name,
      createdAt: metadata.createdAt ? new Date(metadata.createdAt) : undefined,
      updatedAt: new Date(),
    };
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
    _config?: DataSourceConfig,
  ): Promise<void> {
    // Local files are plain text, so formatting is not supported
    // In a real implementation, you'd need to:
    // 1. Parse the file format (.docx, .pdf, etc.)
    // 2. Apply formatting
    // 3. Save back in the same format

    console.warn("Text formatting not supported for local file data source");
  }

  async getComments(
    _documentId: string,
    _config: DataSourceConfig,
  ): Promise<
    Array<{
      id: string;
      content: string;
      author: string;
      createdTime: string;
    }>
  > {
    // Local files don't have comments
    return [];
  }

  extractDocumentId(url: string): string | null {
    // Extract document ID from local file URL
    // Format: /uploads/resumes/{userId}/{documentId}
    const match = url.match(/\/uploads\/resumes\/[^/]+\/([^/]+)/);
    return match ? match[1] : null;
  }

  getOAuthUrl(_redirectUri: string, _state?: string): string {
    // Local files don't require OAuth
    throw new Error("OAuth not required for local file data source");
  }

  async exchangeOAuthCode(
    _code: string,
    _redirectUri: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
  }> {
    throw new Error("OAuth not required for local file data source");
  }

  async refreshAccessToken(_refreshToken: string): Promise<{
    accessToken: string;
    expiresIn?: number;
  }> {
    throw new Error("OAuth not required for local file data source");
  }
}

// Export singleton instance
export const localFileDataSource = new LocalFileDataSource();
