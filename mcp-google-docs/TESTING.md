# MCP Server Testing Guide

This document outlines comprehensive tests for the Google Docs MCP server to ensure reliability and proper error handling.

## Prerequisites

Before testing, ensure:

- ✅ MCP server is built: `cd mcp-google-docs && npm run build`
- ✅ Environment variables are set in `.env`:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REFRESH_TOKEN`
  - `GOOGLE_REDIRECT_URI`
- ✅ You have a test Google Doc ID ready
- ✅ LangGraph server is running (for integration tests)

## Test Categories

### 1. Basic Functionality Tests

#### ✅ Test 1.1: Read Google Doc

**Purpose**: Verify basic document reading works

**Test Steps**:

```bash
# Via CLI (if you have a test script)
npm run test:mcp:read -- --doc-id YOUR_DOC_ID

# Or via Resume Agent CLI
npm run cli:resume -- read YOUR_DOC_ID
```

**Expected Results**:

- ✅ Document content is returned as text
- ✅ No errors in console
- ✅ Content matches what's in Google Docs

**Edge Cases to Test**:

- Empty document (should return empty string or minimal content)
- Document with special characters (emojis, unicode)
- Very long document (>10k words)
- Document with tables/formatting (should extract text correctly)

---

#### ✅ Test 1.2: Copy Google Doc

**Purpose**: Verify document copying creates a new document

**Test Steps**:

```bash
npm run cli:resume -- read YOUR_DOC_ID
# Then check if copy was created in your Google Drive
```

**Expected Results**:

- ✅ New document is created with specified title
- ✅ Returns `documentId` and `url` for the new document
- ✅ New document has same content as original

**Edge Cases to Test**:

- Copy with very long title (>100 chars)
- Copy with special characters in title
- Copy when you don't have write permissions to Drive
- Copy a document you don't own (should still work if you have view access)

---

#### ✅ Test 1.3: Get Document Comments

**Purpose**: Verify comment retrieval works

**Test Steps**:

1. Add some comments to a test Google Doc
2. Run:

```bash
# Via Resume Agent
npm run cli:resume -- read YOUR_DOC_ID
# This should trigger get_comments if no JD is provided
```

**Expected Results**:

- ✅ Returns JSON array of comments
- ✅ Each comment has `id`, `author`, `content`, etc.
- ✅ Empty array if no comments exist

**Edge Cases to Test**:

- Document with no comments (should return `[]`)
- Document with many comments (>50)
- Comments with replies/threads
- Comments with mentions

---

#### ✅ Test 1.4: Update Google Doc

**Purpose**: Verify update instructions are received

**Test Steps**:

```bash
npm run cli:resume -- update YOUR_DOC_ID --job-description "Software Engineer role..."
```

**Expected Results**:

- ✅ Returns JSON with `documentId`, `instructions`, `currentContent`
- ✅ Instructions are preserved correctly
- ✅ Current content is fetched if not provided

**Edge Cases to Test**:

- Update with very long instructions (>1000 words)
- Update with empty instructions (should handle gracefully)
- Update when `currentContent` is provided vs. not provided

---

#### ✅ Test 1.5: Apply Comment Updates

**Purpose**: Verify comment-based updates work

**Test Steps**:

1. Add comments to a document
2. Run via Resume Agent workflow

**Expected Results**:

- ✅ Returns comments that will be applied
- ✅ Filters by `commentId` if provided
- ✅ Returns all comments if `commentId` not provided

---

### 2. Error Handling Tests

#### ✅ Test 2.1: Invalid Document ID

**Purpose**: Verify graceful handling of invalid IDs

**Test Steps**:

```bash
npm run cli:resume -- read INVALID_ID_12345
```

**Expected Results**:

- ✅ Returns clear error message
- ✅ Error mentions document ID issue
- ✅ No crash or unhandled exception

**Test Cases**:

- Completely invalid ID: `"invalid123"`
- Empty string: `""`
- Malformed ID: `"doc/123"`
- Non-existent but valid format ID

---

#### ✅ Test 2.2: Missing/Invalid Credentials

**Purpose**: Verify authentication error handling

**Test Steps**:

1. Temporarily remove `GOOGLE_REFRESH_TOKEN` from `.env`
2. Try to read a document
3. Restore token

**Expected Results**:

- ✅ Error message mentions `GOOGLE_REFRESH_TOKEN`
- ✅ Suggests running `npm run mcp:get-token`
- ✅ No silent failures

**Test Cases**:

- Missing `GOOGLE_REFRESH_TOKEN`
- Invalid/expired `GOOGLE_REFRESH_TOKEN`
- Missing `GOOGLE_CLIENT_ID`
- Missing `GOOGLE_CLIENT_SECRET`

---

#### ✅ Test 2.3: Permission Errors

**Purpose**: Verify handling of access denied scenarios

**Test Steps**:

1. Try to read a document you don't have access to
2. Try to copy a document you can't access

**Expected Results**:

- ✅ Clear error message about permissions
- ✅ Suggests checking document sharing settings
- ✅ No crash

---

#### ✅ Test 2.4: Network/API Errors

**Purpose**: Verify handling of Google API failures

**Test Steps**:

- Disconnect internet temporarily
- Try to read a document

**Expected Results**:

- ✅ Error message indicates network/API issue
- ✅ No infinite retries
- ✅ Graceful failure

---

### 3. Integration Tests

#### ✅ Test 3.1: End-to-End Resume Read Flow

**Purpose**: Test complete resume reading workflow

**Test Steps**:

```bash
npm run cli:resume -- read YOUR_RESUME_DOC_ID
```

**Expected Results**:

- ✅ MCP server spawns successfully
- ✅ Document is read
- ✅ Content is returned to Resume Agent
- ✅ Thread ID is saved to `.resume-agent-context.json`
- ✅ Status shows "Resume read successfully"

---

#### ✅ Test 3.2: End-to-End Resume Update Flow

**Purpose**: Test complete resume update workflow

**Test Steps**:

```bash
# First read (if not already done)
npm run cli:resume -- read YOUR_RESUME_DOC_ID

# Then update for a JD
npm run cli:resume -- update --job-description "Software Engineer at Tech Corp..."
```

**Expected Results**:

- ✅ Resume is copied to a new document
- ✅ LLM generates updated content
- ✅ New document is updated with new content
- ✅ Returns URL to updated document

---

#### ✅ Test 3.3: "Read Once, Create Many" Flow

**Purpose**: Test the new architecture feature

**Test Steps**:

```bash
# Step 1: Read resume once
npm run cli:resume -- read YOUR_RESUME_DOC_ID

# Step 2: Create resume for JD #1 (should reuse thread)
npm run cli:resume -- update --job-description "JD 1..."

# Step 3: Create resume for JD #2 (should reuse same thread)
npm run cli:resume -- update --job-description "JD 2..."
```

**Expected Results**:

- ✅ First `update` reuses the thread from `read`
- ✅ Second `update` also reuses the same thread
- ✅ Each creates a new copied document
- ✅ `.resume-agent-context.json` persists correctly

---

### 4. Docker Environment Tests

#### ✅ Test 4.1: MCP Server Path Resolution in Docker

**Purpose**: Verify server executable is found in Docker

**Test Steps**:

1. Start LangGraph server: `npm run langgraph:up`
2. Wait for Docker build to complete
3. Try to read a resume

**Expected Results**:

- ✅ Docker build includes MCP server build step
- ✅ `mcp-google-docs/dist/server.js` exists in container
- ✅ Path resolution finds the server at `/deps/social-media-agent/mcp-google-docs/dist/server.js`
- ✅ No "Cannot find module" errors

---

#### ✅ Test 4.2: Environment Variables in Docker

**Purpose**: Verify `.env` variables are passed to Docker

**Test Steps**:

1. Ensure `.env` has all Google credentials
2. Start LangGraph server: `npm run langgraph:up`
3. Check Docker logs: `docker logs langgraph-api-1`

**Expected Results**:

- ✅ No "GOOGLE_CLIENT_ID not found" errors
- ✅ No "GOOGLE_REFRESH_TOKEN not found" errors
- ✅ MCP server initializes successfully in Docker

**Note**: Docker Compose should pass `.env` variables. Check `langgraph.json` if issues occur.

---

#### ✅ Test 4.3: MCP Server Subprocess in Docker

**Purpose**: Verify MCP server spawns correctly as subprocess

**Test Steps**:

1. Run Resume Agent in Docker environment
2. Monitor Docker logs for MCP server output

**Expected Results**:

- ✅ MCP server process starts successfully
- ✅ No "Connection closed" errors (`-32000`)
- ✅ Server communicates via stdio correctly

---

### 5. Performance Tests

#### ✅ Test 5.1: Large Document Handling

**Purpose**: Verify performance with large documents

**Test Steps**:

1. Create a test document with 50+ pages of content
2. Read it via MCP server

**Expected Results**:

- ✅ Document reads successfully
- ✅ Response time is reasonable (<30 seconds)
- ✅ Memory usage doesn't spike excessively

---

#### ✅ Test 5.2: Concurrent Requests

**Purpose**: Verify handling of multiple simultaneous requests

**Test Steps**:

- Run multiple resume reads/updates in parallel (if supported)

**Expected Results**:

- ✅ Each request gets its own MCP client instance
- ✅ No race conditions
- ✅ All requests complete successfully

---

### 6. Manual Test Script

Create a simple test script to verify basic functionality:

```typescript
// mcp-google-docs/test-manual.ts
import {
  createMCPClient,
  callMCPTool,
} from "../src/agents/resume-agent/utils/mcp-client.js";

async function testMCP() {
  const client = await createMCPClient();

  try {
    // Test 1: List tools
    const tools = await client.listTools();
    console.log(
      "✅ Available tools:",
      tools.tools.map((t) => t.name),
    );

    // Test 2: Read document (replace with your test doc ID)
    const docId = process.env.TEST_DOC_ID || "YOUR_DOC_ID";
    console.log(`\n📖 Testing read_google_doc with ID: ${docId}`);
    const readResult = await callMCPTool(client, "read_google_doc", {
      documentId: docId,
    });
    console.log(
      "✅ Read result:",
      readResult.content[0].text.substring(0, 100) + "...",
    );

    // Test 3: Copy document
    console.log(`\n📋 Testing copy_google_doc...`);
    const copyResult = await callMCPTool(client, "copy_google_doc", {
      documentId: docId,
      title: `Test Copy ${Date.now()}`,
    });
    console.log("✅ Copy result:", copyResult.content[0].text);
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.close();
  }
}

testMCP();
```

Run with:

```bash
npx tsx mcp-google-docs/test-manual.ts
```

---

## Quick Test Checklist

Use this checklist for quick verification:

- [ ] **Build**: `cd mcp-google-docs && npm run build` succeeds
- [ ] **Standalone**: `node mcp-google-docs/dist/server.js` starts without errors
- [ ] **Read**: Can read a test Google Doc via Resume Agent CLI
- [ ] **Copy**: Can copy a document successfully
- [ ] **Update**: Can receive update instructions
- [ ] **Comments**: Can retrieve comments from a document
- [ ] **Error Handling**: Invalid doc ID returns clear error
- [ ] **Docker**: MCP server works when LangGraph runs in Docker
- [ ] **Context Persistence**: `.resume-agent-context.json` saves/loads correctly
- [ ] **"Read Once" Flow**: Can create multiple resumes from one read

---

## Common Issues & Solutions

### Issue: "Connection closed" (-32000)

**Solution**:

- Check `GOOGLE_REFRESH_TOKEN` is set in `.env`
- Verify MCP server builds successfully
- Check Docker logs for MCP server errors

### Issue: "Cannot find module '/deps/.../server.js'"

**Solution**:

- Ensure `langgraph.json` has `dockerfile_lines` to build MCP server
- Rebuild Docker image: `npm run langgraph:up`
- Check `getMCPServerPath()` in `mcp-client.ts` handles Docker paths

### Issue: "Google authentication failed"

**Solution**:

- Run `npm run mcp:get-token` to get a new refresh token
- Verify OAuth credentials in Google Cloud Console
- Check token hasn't expired

### Issue: MCP server crashes silently

**Solution**:

- Check for uncaught exceptions in `server.ts`
- Verify error handlers are in place
- Check Docker logs: `docker logs langgraph-api-1`

---

## Next Steps After Testing

Once all tests pass:

1. ✅ Document any edge cases discovered
2. ✅ Update error messages if needed
3. ✅ Add unit tests if time permits
4. ✅ Update `README.md` with any new findings
5. ✅ Consider adding retry logic for transient failures
