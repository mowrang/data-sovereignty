# Scalable Data Sources Architecture

## Overview

The application now supports multiple resume storage providers through a scalable data source architecture. Users can choose their preferred data source (Google Docs, Microsoft OneDrive, local file upload, etc.) and the system will automatically handle the differences.

## Architecture

### Core Components

1. **`IDataSource` Interface** (`src/utils/data-source-interface.ts`)

   - Defines the contract that all data sources must implement
   - Includes methods for reading, creating, copying, updating, formatting, and OAuth

2. **`DataSourceManager`** (`src/utils/data-source-manager.ts`)

   - Manages multiple data source implementations
   - Provides a unified interface for document operations
   - Auto-detects provider from URLs
   - Routes requests to the appropriate data source

3. **Concrete Implementations**
   - `GoogleDocsDataSource` - Google Docs via MCP
   - `MicrosoftOneDriveDataSource` - Microsoft OneDrive/Word Online via Graph API
   - `LocalFileDataSource` - Local file uploads

## Supported Data Sources

### 1. Google Docs ✅ (Fully Implemented)

**Display Name:** Google Docs  
**Provider ID:** `google`  
**Status:** Production-ready

**Features:**

- ✅ Read documents
- ✅ Copy documents
- ✅ Update documents
- ✅ Format text (bold, italic, font size, color)
- ✅ Get comments
- ✅ OAuth authentication
- ✅ Automatic heading formatting

**Configuration:**

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

**URL Formats Supported:**

- `https://docs.google.com/document/d/{DOCUMENT_ID}/edit`
- `https://drive.google.com/file/d/{DOCUMENT_ID}/view`

**OAuth Scopes:**

- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`
- `https://www.googleapis.com/auth/documents`
- `https://www.googleapis.com/auth/drive`

### 2. Microsoft OneDrive ⚠️ (Partially Implemented)

**Display Name:** Microsoft OneDrive / Word Online  
**Provider ID:** `microsoft`  
**Status:** Basic implementation (needs Word document parsing)

**Features:**

- ✅ Read documents (metadata)
- ✅ Copy documents
- ⚠️ Update documents (placeholder - needs Word parsing)
- ❌ Format text (not yet implemented)
- ✅ Get comments
- ✅ OAuth authentication

**Configuration:**

```env
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback
```

**URL Formats Supported:**

- `https://onedrive.live.com/redir?resid={ITEM_ID}`
- `https://{tenant}.sharepoint.com/.../items/{ITEM_ID}`
- `https://{tenant}.office.com/.../items/{ITEM_ID}`

**OAuth Scopes:**

- `Files.ReadWrite`
- `Files.ReadWrite.All`
- `Sites.ReadWrite.All` (for SharePoint)
- `User.Read`

**Limitations:**

- Word document content parsing requires additional libraries (e.g., `mammoth` for .docx)
- Text formatting requires Microsoft Word Online API or Office.js
- Direct content updates need download → parse → modify → upload workflow

**Future Enhancements:**

- Integrate `mammoth` library for .docx parsing
- Use Microsoft Word Online API for formatting
- Support SharePoint Online documents

### 3. Local File Upload ✅ (Basic Implementation)

**Display Name:** Local File Upload  
**Provider ID:** `local`  
**Status:** Basic implementation (stores as plain text)

**Features:**

- ✅ Read documents
- ✅ Create documents
- ✅ Copy documents
- ✅ Update documents
- ❌ Format text (not supported for plain text)
- ❌ Get comments (not applicable)
- ❌ OAuth (not required)

**Configuration:**

```env
LOCAL_FILE_UPLOAD_DIR=./uploads/resumes  # Optional, defaults to ./uploads/resumes
```

**File Storage:**

- Files are stored in user-specific subdirectories: `{UPLOAD_DIR}/{userId}/{documentId}.txt`
- Metadata stored in: `{UPLOAD_DIR}/{userId}/{documentId}.txt.meta.json`

**Limitations:**

- Currently stores files as plain text
- No support for .docx, .pdf parsing
- No formatting support
- Files stored on server filesystem (not scalable for production)

**Future Enhancements:**

- Integrate file parsing libraries (mammoth for .docx, pdf-parse for .pdf)
- Store files in cloud storage (S3, Azure Blob, etc.)
- Support file versioning
- Add file upload UI endpoint

## Other Data Source Options

### 4. Dropbox (Not Yet Implemented)

**Display Name:** Dropbox  
**Provider ID:** `dropbox`  
**Status:** Planned

**Features Needed:**

- Dropbox API integration
- OAuth 2.0 authentication
- File read/write operations
- Document ID extraction from Dropbox URLs

**URL Format:**

- `https://www.dropbox.com/s/{file_id}/{filename}`

### 5. Box (Not Yet Implemented)

**Display Name:** Box  
**Provider ID:** `box`  
**Status:** Planned

**Features Needed:**

- Box API integration
- OAuth 2.0 authentication
- File read/write operations

### 6. AWS S3 (Not Yet Implemented)

**Display Name:** AWS S3  
**Provider ID:** `s3`  
**Status:** Planned

**Features Needed:**

- S3 SDK integration
- AWS IAM authentication
- File read/write operations
- Support for .docx, .pdf files

### 7. GitHub Gists (Not Yet Implemented)

**Display Name:** GitHub Gists  
**Provider ID:** `github`  
**Status:** Planned

**Features Needed:**

- GitHub API integration
- OAuth authentication
- Markdown support
- Version control integration

## Usage Examples

### Using DataSourceManager

```typescript
import { dataSourceManager } from "./utils/data-source-manager.js";

// Read a document (auto-detects provider from URL)
const document = await dataSourceManager.readDocument(
  documentId,
  "https://docs.google.com/document/d/123/edit",
  {
    userId: "user-123",
    provider: "google", // Optional, auto-detected from URL
  },
);

// Create a document using a specific provider
const newDoc = await dataSourceManager.createDocument(
  "My Resume",
  "Resume content here...",
  {
    userId: "user-123",
    provider: "microsoft", // Use Microsoft OneDrive
  },
);

// Copy a document
const copied = await dataSourceManager.copyDocument(
  originalDocumentId,
  "Resume - Updated",
  {
    userId: "user-123",
    provider: "google",
  },
);

// Update a document
const updated = await dataSourceManager.updateDocument(
  documentId,
  "Updated content...",
  "Update the experience section",
  {
    userId: "user-123",
    provider: "google",
  },
);

// Format text
await dataSourceManager.formatText(
  documentId,
  0,
  50,
  {
    bold: true,
    fontSize: 14,
  },
  {
    userId: "user-123",
    provider: "google",
  },
);

// Get enabled data sources
const sources = dataSourceManager.getEnabledDataSources();
// Returns: [{ name: "google", displayName: "Google Docs" }, ...]
```

### Direct Data Source Usage

```typescript
import { googleDocsDataSource } from "./utils/data-sources/google-docs-data-source.js";

// Use Google Docs directly
const doc = await googleDocsDataSource.readDocument(documentId, {
  userId: "user-123",
  provider: "google",
});
```

## Database Schema Updates

To support multiple data sources, you may need to update the database schema:

```sql
-- Add provider preference to users table
ALTER TABLE users ADD COLUMN preferred_data_source VARCHAR(50) DEFAULT 'google';

-- Add Microsoft refresh token (if supporting Microsoft)
ALTER TABLE users ADD COLUMN microsoft_refresh_token TEXT;

-- Add other provider tokens as needed
ALTER TABLE users ADD COLUMN dropbox_refresh_token TEXT;
```

## Migration from MCP to DataSourceManager

The resume agent currently uses MCP directly. To migrate to DataSourceManager:

1. **Update resume agent nodes** to use `dataSourceManager` instead of `createMCPClient`
2. **Update `read-resume.ts`**:

   ```typescript
   // Old:
   const client = await createMCPClient(config);
   const result = await callMCPTool(client, "read_google_doc", { documentId });

   // New:
   const doc = await dataSourceManager.readDocument(documentId, documentUrl, {
     userId: config.configurable?.userId,
     provider: "google",
   });
   ```

3. **Update `copy-resume.ts`** and `update-resume.ts` similarly

## Adding a New Data Source

To add a new data source:

1. **Create a new file** in `src/utils/data-sources/`:

   ```typescript
   import { IDataSource, ResumeDocument, DataSourceConfig } from "../data-source-interface.js";

   export class MyNewDataSource implements IDataSource {
     readonly name = "mynew";
     readonly displayName = "My New Service";
     readonly enabled: boolean;

     // Implement all required methods
     async readDocument(...) { ... }
     async createDocument(...) { ... }
     // ... etc
   }

   export const myNewDataSource = new MyNewDataSource();
   ```

2. **Register it** in `data-source-manager.ts`:

   ```typescript
   import("./data-sources/my-new-data-source.js").then((module) => {
     dataSourceManager.registerDataSource(module.myNewDataSource);
   });
   ```

3. **Add URL detection** in `detectProviderFromUrl()`:

   ```typescript
   if (url.includes("mynewservice.com")) {
     return "mynew";
   }
   ```

4. **Update environment variables** if needed:

   ```env
   MYNEW_CLIENT_ID=...
   MYNEW_CLIENT_SECRET=...
   ```

5. **Add OAuth endpoints** in `auth-server.ts` if needed

## Best Practices

1. **Always use DataSourceManager** instead of direct data source access for consistency
2. **Handle errors gracefully** - different providers may have different error formats
3. **Cache provider detection** - URL parsing can be expensive
4. **Support fallbacks** - if preferred provider fails, try default provider
5. **Store user preferences** - allow users to set their preferred data source
6. **Validate document IDs** - ensure they match the expected format for each provider

## Testing

Unit tests should be created for each data source:

```typescript
// src/utils/data-sources/__tests__/google-docs-data-source.test.ts
describe("GoogleDocsDataSource", () => {
  it("should extract document ID from URL", () => {
    const source = new GoogleDocsDataSource();
    const id = source.extractDocumentId(
      "https://docs.google.com/document/d/123/edit",
    );
    expect(id).toBe("123");
  });

  // ... more tests
});
```

## Production Considerations

1. **Cloud Storage**: For local file uploads, use S3/Azure Blob/GCS instead of filesystem
2. **Rate Limiting**: Implement rate limiting per provider
3. **Error Handling**: Provider-specific error handling and retries
4. **Monitoring**: Track usage per provider for analytics
5. **Costs**: Monitor API usage costs for each provider
6. **Security**: Encrypt stored refresh tokens
7. **Scalability**: Consider caching document content for frequently accessed files

## Summary

The scalable data source architecture allows the application to support multiple resume storage providers while maintaining a consistent interface. Currently, Google Docs is fully implemented, Microsoft OneDrive is partially implemented, and local file uploads provide a basic option. The architecture makes it easy to add new providers in the future.
