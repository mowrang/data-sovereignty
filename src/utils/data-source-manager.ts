/**
 * Data Source Manager
 *
 * Manages multiple resume storage providers and provides unified interface
 * Allows users to choose their preferred data source (Google, Microsoft, etc.)
 */

import {
  IDataSource,
  ResumeDocument,
  DataSourceConfig,
} from "./data-source-interface.js";

export class DataSourceManager {
  private dataSources: Map<string, IDataSource> = new Map();
  private defaultSource = "google"; // Default to Google for backward compatibility

  constructor() {
    // Data sources will be registered after import
  }

  /**
   * Register a new data source
   */
  registerDataSource(dataSource: IDataSource): void {
    if (dataSource.enabled) {
      this.dataSources.set(dataSource.name, dataSource);
      console.log(`✅ Registered data source: ${dataSource.displayName}`);
    } else {
      console.log(`⚠️ Skipping disabled data source: ${dataSource.name}`);
    }
  }

  /**
   * Get data source by name
   */
  getDataSource(name: string): IDataSource {
    const source = this.dataSources.get(name);
    if (!source) {
      throw new Error(`Data source '${name}' not found`);
    }
    return source;
  }

  /**
   * Get default data source
   */
  getDefaultDataSource(): IDataSource {
    return this.getDataSource(this.defaultSource);
  }

  /**
   * Set default data source
   */
  setDefaultDataSource(name: string): void {
    if (!this.dataSources.has(name)) {
      throw new Error(`Data source '${name}' not registered`);
    }
    this.defaultSource = name;
  }

  /**
   * Get list of enabled data sources
   */
  getEnabledDataSources(): Array<{ name: string; displayName: string }> {
    return Array.from(this.dataSources.values()).map((ds) => ({
      name: ds.name,
      displayName: ds.displayName,
    }));
  }

  /**
   * Read document using user's preferred data source
   */
  async readDocument(
    documentId: string,
    documentUrl: string,
    config: DataSourceConfig,
  ): Promise<ResumeDocument> {
    // Detect provider from URL or use user's preference
    const provider =
      this.detectProviderFromUrl(documentUrl) ||
      config.provider ||
      this.defaultSource;
    const source = this.getDataSource(provider);

    return source.readDocument(documentId, config);
  }

  /**
   * Create document using user's preferred data source
   */
  async createDocument(
    title: string,
    content: string,
    config: DataSourceConfig,
  ): Promise<ResumeDocument> {
    const provider = config.provider || this.defaultSource;
    const source = this.getDataSource(provider);

    return source.createDocument(title, content, config);
  }

  /**
   * Copy document using user's preferred data source
   */
  async copyDocument(
    documentId: string,
    newTitle: string,
    config: DataSourceConfig,
  ): Promise<ResumeDocument> {
    const provider = config.provider || this.defaultSource;
    const source = this.getDataSource(provider);

    return source.copyDocument(documentId, newTitle, config);
  }

  /**
   * Update document using user's preferred data source
   */
  async updateDocument(
    documentId: string,
    content: string,
    instructions: string | undefined,
    config: DataSourceConfig,
  ): Promise<ResumeDocument> {
    const provider = config.provider || this.defaultSource;
    const source = this.getDataSource(provider);

    return source.updateDocument(documentId, content, instructions, config);
  }

  /**
   * Format text in document
   */
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
    config: DataSourceConfig,
  ): Promise<void> {
    const provider = config.provider || this.defaultSource;
    const source = this.getDataSource(provider);

    return source.formatText(
      documentId,
      startIndex,
      endIndex,
      formatting,
      config,
    );
  }

  /**
   * Get comments from document
   */
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
    const provider = config.provider || this.defaultSource;
    const source = this.getDataSource(provider);

    return source.getComments(documentId, config);
  }

  /**
   * Extract document ID from URL (auto-detects provider)
   */
  extractDocumentId(
    url: string,
  ): { documentId: string; provider: string } | null {
    // Try each registered data source
    for (const source of this.dataSources.values()) {
      const docId = source.extractDocumentId(url);
      if (docId) {
        return { documentId: docId, provider: source.name };
      }
    }
    return null;
  }

  /**
   * Detect provider from URL
   */
  private detectProviderFromUrl(url: string): string | null {
    if (url.includes("docs.google.com") || url.includes("drive.google.com")) {
      return "google";
    }
    if (
      url.includes("onedrive.live.com") ||
      url.includes("sharepoint.com") ||
      url.includes("office.com")
    ) {
      return "microsoft";
    }
    if (url.includes("dropbox.com")) {
      return "dropbox";
    }
    return null;
  }
}

// Singleton instance
export const dataSourceManager = new DataSourceManager();

// Register all data sources (deferred to avoid circular dependencies)
setTimeout(() => {
  // Import and register Google Docs data source
  import("./data-sources/google-docs-data-source.js")
    .then((module) => {
      dataSourceManager.registerDataSource(module.googleDocsDataSource);
    })
    .catch((error) => {
      console.warn(
        "Failed to register Google Docs data source:",
        error.message,
      );
    });

  // Import and register Microsoft OneDrive data source
  import("./data-sources/microsoft-onedrive-data-source.js")
    .then((module) => {
      dataSourceManager.registerDataSource(module.microsoftOneDriveDataSource);
    })
    .catch((error) => {
      console.warn(
        "Failed to register Microsoft OneDrive data source:",
        error.message,
      );
    });

  // Import and register Local File data source
  import("./data-sources/local-file-data-source.js")
    .then((module) => {
      dataSourceManager.registerDataSource(module.localFileDataSource);
    })
    .catch((error) => {
      console.warn("Failed to register Local File data source:", error.message);
    });
}, 0);
