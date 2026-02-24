# Google Docs MCP Server

This MCP (Model Context Protocol) server provides tools for interacting with Google Docs through the Google Docs API.

## Setup

### 1. Install Dependencies

```bash
npm install
# or (from repo root)
npm --prefix mcp-google-docs install
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Docs API and Google Drive API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure the OAuth consent screen
6. Set the redirect URI to `http://localhost:3000/oauth2callback` (or your preferred URI)
7. Download the credentials and set the following environment variables:

```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

### 3. Get Refresh Token

To get a refresh token, you'll need to run an OAuth flow. You can use the provided script or manually authenticate:

```bash
# Run the OAuth flow script
npm run get-token
```

Or manually:

1. Visit the OAuth URL with your client ID
2. Authorize the application
3. Copy the refresh token from the callback

Set the refresh token in your `.env`:

```bash
GOOGLE_REFRESH_TOKEN=your-refresh-token
```

### 4. Build

```bash
npm run build
```

### 5. Run

The server runs on stdio and is typically invoked by MCP clients:

```bash
node dist/server.js
```

## Available Tools

- `read_google_doc`: Read content from a Google Doc
- `copy_google_doc`: Create a copy of a Google Doc
- `update_google_doc`: Update a Google Doc (instructions-based)
- `get_doc_comments`: Get all comments from a Google Doc
- `apply_comment_updates`: Apply updates based on comments

## Usage with Resume Agent

The MCP server is automatically used by the Resume Agent. Make sure the server is built and the path is correct in your environment variables:

```bash
MCP_SERVER_PATH=./mcp-google-docs/dist/server.js
```
