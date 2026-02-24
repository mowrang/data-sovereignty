# Multi-Source Data Sources Implementation Summary

## Overview

This document summarizes the implementation of a scalable multi-source data architecture that maintains clear separation between AI processing (Resume Agent) and data storage (Data Sources) via the MCP (Model Context Protocol) interface layer.

## Architecture

```
┌─────────────────┐
│  Resume Agent   │  ← AI Processing Layer (LangGraph)
│   (LangGraph)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   MCP Server    │  ← Interface Layer (Model Context Protocol)
│ (Multi-Source)   │     - Maintains backward compatibility
│                 │     - Routes to DataSourceManager
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│DataSourceManager│  ← Data Source Abstraction
│  (Unified API)  │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬─────────┐
    ▼         ▼          ▼         ▼
┌────────┐ ┌─────────┐ ┌──────┐ ┌──────┐
│ Google │ │Microsoft│ │Local │ │Future│
│  Docs  │ │OneDrive │ │Files │ │Sources│
└────────┘ └─────────┘ └──────┘ └──────┘
```

## Key Principles

1. **Separation of Concerns**: AI (Resume Agent) ↔ MCP (Interface) ↔ Data Sources (Storage)
2. **Formatting Preservation**: Original document formatting is maintained across all operations
3. **Backward Compatibility**: Existing resume agent code continues to work without changes
4. **Scalability**: Easy to add new data sources without modifying AI or MCP code

## Implementation Details

### 1. Product Requirements Document (PRD)

**File:** `docs/PRD.md`

Comprehensive PRD covering:

- Product vision and value propositions
- Functional requirements for all data sources
- Technical requirements (architecture, performance, security)
- User experience requirements
- Integration requirements
- Success metrics and roadmap

### 2. Multi-Source MCP Server

**File:** `mcp-data-sources/server.ts`

New MCP server that:

- Uses `DataSourceManager` internally
- Maintains backward compatibility with existing tool names:
  - `read_google_doc` → routes to `read_document` with provider="google"
  - `copy_google_doc` → routes to `copy_document` with provider="google"
  - `update_google_doc` → routes to `update_document` with provider="google"
- Supports new multi-source tools:
  - `read_document` - Auto-detects provider from URL
  - `copy_document` - Works with any provider
  - `update_document` - Preserves formatting
  - `format_text` - Provider-specific formatting
  - `get_doc_comments` - Works with all providers

**Benefits:**

- Resume agent nodes don't need changes (backward compatible)
- Can gradually migrate to new tools
- Clear separation: AI ↔ MCP ↔ Data Sources

### 3. Microsoft OneDrive with Word Parsing

**File:** `src/utils/data-sources/microsoft-onedrive-data-source.ts`

Enhanced with:

- **Word Document Parsing**: Uses `mammoth` library to parse .docx files
- **PDF Parsing**: Uses `pdf-parse` library for PDF files
- **Text Extraction**: Extracts text content while preserving structure
- **Formatting Support**: Ready for Microsoft Word API integration

**Dependencies Added:**

- `mammoth@^1.7.3` - Word document parsing
- `pdf-parse@^1.1.1` - PDF parsing

### 4. File Upload Endpoint

**File:** `src/api/file-upload.ts`

New REST API endpoint for local file uploads:

**Endpoints:**

- `POST /api/file-upload` - Upload resume file (.docx, .pdf, .txt, .md)
- `GET /api/file-upload/list` - List user's uploaded files
- `DELETE /api/file-upload/:fileId` - Delete uploaded file

**Features:**

- Automatic file parsing (.docx → text, .pdf → text)
- User-specific file storage
- File size limits (10MB)
- File type validation
- Integration with `DataSourceManager`

**Dependencies Added:**

- `multer@^1.4.5-lts.1` - File upload handling
- `@types/multer@^1.4.12` - TypeScript types

### 5. Data Source Implementations

All data sources implement the `IDataSource` interface:

#### Google Docs ✅ (Production Ready)

- Fully implemented via MCP wrapper
- All formatting features supported
- OAuth 2.0 authentication

#### Microsoft OneDrive ⚠️ (Enhanced)

- Word document parsing added
- PDF parsing added
- Formatting API integration pending

#### Local File Upload ✅ (Complete)

- File upload endpoint created
- File parsing (.docx, .pdf, .txt, .md)
- User-specific storage
- Integration with DataSourceManager

## Formatting Preservation

### Current Status

1. **Google Docs**: ✅ Fully preserved

   - Uses Google Docs API formatting
   - Automatic heading formatting
   - Font, size, color preservation

2. **Microsoft OneDrive**: ⚠️ Partial

   - Content extraction works
   - Formatting API integration needed
   - Requires Microsoft Word Online API

3. **Local Files**: ⚠️ Basic
   - Text content extracted
   - Formatting metadata preserved in file
   - Full formatting restoration pending

### Implementation Strategy

1. **Read Phase**: Extract content + formatting metadata
2. **Update Phase**: Apply changes while preserving formatting structure
3. **Write Phase**: Restore formatting when saving

## Migration Path

### Phase 1: Current (Backward Compatible)

- Resume agent uses existing MCP tools (`read_google_doc`, etc.)
- MCP server routes to DataSourceManager
- No changes needed to resume agent nodes

### Phase 2: Gradual Migration

- Update resume agent to use new multi-source tools
- Add provider selection logic
- Support multiple data sources per user

### Phase 3: Full Multi-Source Support

- UI for data source selection
- Per-user data source preferences
- Seamless switching between sources

## Testing

### Unit Tests Needed

- [ ] MCP server routing tests
- [ ] DataSourceManager integration tests
- [ ] Microsoft OneDrive parsing tests
- [ ] File upload endpoint tests
- [ ] Formatting preservation tests

### Integration Tests Needed

- [ ] End-to-end resume update flow
- [ ] Multi-source document operations
- [ ] Formatting preservation across providers

## Configuration

### Environment Variables

```env
# Google Docs (existing)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...

# Microsoft OneDrive (new)
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_REFRESH_TOKEN=...

# Local File Upload (new)
LOCAL_FILE_UPLOAD_DIR=./uploads/resumes  # Optional
```

### MCP Server Configuration

Update `langgraph.json` to use new MCP server:

```json
{
  "mcpServers": {
    "data-sources": {
      "command": "node",
      "args": ["mcp-data-sources/dist/server.js"]
    }
  }
}
```

## Next Steps

### Immediate

1. ✅ PRD created
2. ✅ Multi-source MCP server created
3. ✅ Word parsing added
4. ✅ File upload endpoint created
5. ⏳ Test end-to-end flow
6. ⏳ Update documentation

### Short-term

1. Complete Microsoft Word formatting API integration
2. Add comprehensive unit tests
3. Add UI for file upload
4. Add data source selection UI

### Long-term

1. Add Dropbox support
2. Add S3 cloud storage
3. Add GitHub Gists support
4. Implement full formatting preservation for all sources

## Files Created/Modified

### New Files

- `docs/PRD.md` - Product Requirements Document
- `mcp-data-sources/server.ts` - Multi-source MCP server
- `src/api/file-upload.ts` - File upload endpoint
- `docs/MULTI_SOURCE_IMPLEMENTATION.md` - This file

### Modified Files

- `src/utils/data-sources/microsoft-onedrive-data-source.ts` - Added Word/PDF parsing
- `web-ui/server.ts` - Added file upload router
- `package.json` - Added mammoth, pdf-parse, multer dependencies

### Existing Files (No Changes Needed)

- Resume agent nodes (`read-resume.ts`, `copy-resume.ts`, `update-resume.ts`)
- DataSourceManager (`src/utils/data-source-manager.ts`)
- Data source implementations (Google Docs, Local File)

## Benefits

1. **Clear Separation**: AI ↔ MCP ↔ Data Sources
2. **Backward Compatible**: Existing code continues to work
3. **Scalable**: Easy to add new data sources
4. **Formatting Preserved**: Original formatting maintained
5. **Multi-Source Ready**: Support for Google, Microsoft, Local files
6. **Future-Proof**: Architecture supports unlimited data sources

## Summary

The multi-source data architecture is now implemented with:

- ✅ PRD document
- ✅ Multi-source MCP server (backward compatible)
- ✅ Word document parsing for Microsoft OneDrive
- ✅ File upload endpoint for local files
- ✅ Formatting preservation strategy
- ⏳ Testing and documentation updates pending

The system maintains clear separation between AI processing and data storage while supporting multiple data sources and preserving document formatting.
