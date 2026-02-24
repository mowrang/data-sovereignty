/**
 * Data Source Interface
 *
 * Defines a scalable interface for resume storage providers
 * Allows easy addition of new data sources (Google Docs, Microsoft OneDrive, Dropbox, etc.)
 */

export interface ResumeDocument {
  id: string; // Document ID (provider-specific)
  title: string;
  content: string;
  url: string; // View/edit URL
  provider: string; // 'google', 'microsoft', 'dropbox', 'local', etc.
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DataSourceConfig {
  userId: string;
  provider: string;
  accessToken?: string;
  refreshToken?: string;
  [key: string]: any; // Provider-specific config
}

/**
 * Interface that all data sources must implement
 */
export interface IDataSource {
  /**
   * Name of the data source (e.g., 'google', 'microsoft', 'dropbox')
   */
  readonly name: string;

  /**
   * Display name for UI (e.g., 'Google Docs', 'Microsoft OneDrive')
   */
  readonly displayName: string;

  /**
   * Whether this data source is enabled
   */
  readonly enabled: boolean;

  /**
   * Read a resume document
   */
  readDocument(
    documentId: string,
    config: DataSourceConfig,
  ): Promise<ResumeDocument>;

  /**
   * Create a new resume document
   */
  createDocument(
    title: string,
    content: string,
    config: DataSourceConfig,
  ): Promise<ResumeDocument>;

  /**
   * Copy an existing document
   */
  copyDocument(
    documentId: string,
    newTitle: string,
    config: DataSourceConfig,
  ): Promise<ResumeDocument>;

  /**
   * Update document content
   */
  updateDocument(
    documentId: string,
    content: string,
    instructions?: string,
    config?: DataSourceConfig,
  ): Promise<ResumeDocument>;

  /**
   * Format text in document (bold, italic, font size, etc.)
   */
  formatText(
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
  ): Promise<void>;

  /**
   * Get comments from document
   */
  getComments(
    documentId: string,
    config: DataSourceConfig,
  ): Promise<
    Array<{
      id: string;
      content: string;
      author: string;
      createdTime: string;
    }>
  >;

  /**
   * Extract document ID from URL
   */
  extractDocumentId(url: string): string | null;

  /**
   * Get OAuth URL for authentication
   */
  getOAuthUrl(redirectUri: string, state?: string): string;

  /**
   * Exchange OAuth code for tokens
   */
  exchangeOAuthCode(
    code: string,
    redirectUri: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
  }>;

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn?: number;
  }>;
}
