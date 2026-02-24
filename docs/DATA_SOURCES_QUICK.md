# Data Sources Quick Reference

## Available Data Sources

| Provider               | Status        | Features                                | OAuth Required |
| ---------------------- | ------------- | --------------------------------------- | -------------- |
| **Google Docs**        | ✅ Production | Read, Copy, Update, Format, Comments    | Yes            |
| **Microsoft OneDrive** | ⚠️ Partial    | Read, Copy (Update needs Word parsing)  | Yes            |
| **Local File Upload**  | ✅ Basic      | Read, Create, Copy, Update (plain text) | No             |

## Other Options for Resume Storage

### Cloud Storage Providers

- **Dropbox** - Planned
- **Box** - Planned
- **AWS S3** - Planned
- **Azure Blob Storage** - Planned

### Version Control

- **GitHub Gists** - Planned (for markdown resumes)

### Document Platforms

- **Notion** - Possible (via API)
- **Confluence** - Possible (for enterprise)

## Quick Usage

```typescript
import { dataSourceManager } from "./utils/data-source-manager.js";

// Auto-detect provider from URL
const doc = await dataSourceManager.readDocument(
  docId,
  "https://docs.google.com/document/d/123/edit",
  { userId: "user-123" },
);

// Use specific provider
const newDoc = await dataSourceManager.createDocument("Resume", "Content...", {
  userId: "user-123",
  provider: "microsoft",
});
```

## Configuration

### Google Docs

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Microsoft OneDrive

```env
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
```

### Local Files

```env
LOCAL_FILE_UPLOAD_DIR=./uploads/resumes  # Optional
```

## Adding a New Provider

1. Create `src/utils/data-sources/{provider}-data-source.ts`
2. Implement `IDataSource` interface
3. Register in `data-source-manager.ts`
4. Add URL detection pattern

See `docs/DATA_SOURCES.md` for detailed guide.
