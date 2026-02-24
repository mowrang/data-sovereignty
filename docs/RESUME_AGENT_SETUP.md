# Resume Agent Setup Guide

This guide will help you set up the Resume Agent with Google Docs integration using MCP (Model Context Protocol).

## Overview

The Resume Agent allows you to:

- 📖 Read resumes from Google Docs
- 📋 Create copies of resumes for job-specific versions
- ✏️ Update resumes based on job descriptions
- 💬 Process comments from Google Docs and apply updates

## Prerequisites

- Node.js 20+
- npm (comes with Node.js)
- Google Cloud account
- Anthropic API key (for Claude)

## Step 1: Install Dependencies

```bash
# Install main project dependencies
npm install

# Install MCP server dependencies
npm run mcp:install
```

## Step 2: Set Up Google OAuth

### 2.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Google Docs API
   - Google Drive API

### 2.2 Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Configure the OAuth consent screen (if not already done):
   - Choose **External** user type
   - Fill in required fields
   - Add scopes: `https://www.googleapis.com/auth/documents` and `https://www.googleapis.com/auth/drive.file`
4. Create OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3000/oauth2callback`
5. Download the credentials or copy the Client ID and Client Secret

### 2.3 Get Refresh Token

Add to your `.env` file:

```bash
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
```

Then run the OAuth token script:

```bash
cd mcp-google-docs
npm run get-token
```

This will:

1. Open a browser window for Google authentication
2. Ask you to authorize the application
3. Provide a refresh token

Add the refresh token to your `.env`:

```bash
GOOGLE_REFRESH_TOKEN=your-refresh-token-here
```

## Step 3: Configure Environment Variables

Add these to your `.env` file in the project root:

```bash
# Google OAuth (for MCP server)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback

# MCP Server Path (optional, defaults to ./mcp-google-docs/dist/server.js)
MCP_SERVER_PATH=./mcp-google-docs/dist/server.js

# LangGraph API (defaults to http://localhost:54367)
LANGGRAPH_API_URL=http://localhost:54367

# Anthropic API (for resume updates)
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## Step 4: Build the MCP Server

```bash
npm run mcp:build
```

This compiles the TypeScript MCP server to JavaScript.

## Step 5: Start the LangGraph Server

In one terminal:

```bash
npm run langgraph:in_mem:up
```

Wait for the server to start (you'll see a message indicating it's ready).

## Step 6: Use the Resume Agent

You have two options for interacting with the Resume Agent:

### Option A: Web UI (Recommended)

The Web UI provides a user-friendly chat interface in your browser.

**Start the Web UI:**

In another terminal:

```bash
npm run web-ui
```

Then open your browser to: **http://localhost:3001**

**Using the Web UI:**

Simply type your commands in the chat interface:

- `read my resume from https://docs.google.com/document/d/YOUR_DOC_ID/edit`
- `create resume for this job: [paste job description]`
- `update resume for this job: [paste job description]`
- `show comments from YOUR_DOC_ID`

The Web UI will display the agent's responses and status updates in real-time.

**Running Web UI in Docker:**

If you prefer to run the Web UI in a Docker container:

```bash
# Make sure LangGraph API Server is running first
npm run langgraph:up

# Start Web UI in Docker
npm run web-ui:docker
```

See [web-ui/DOCKER.md](../web-ui/DOCKER.md) for more Docker options.

### Option B: CLI (Command Line)

For command-line users, you can use the interactive CLI:

In another terminal:

```bash
npm run resume:cli
```

You'll see a prompt like:

```
resume>
```

## Usage Examples

### Using the Web UI

Open http://localhost:3001 and use natural language commands:

```
read my resume from https://docs.google.com/document/d/abc123/edit
create resume for this job: [paste job description]
update resume for this job: [paste job description]
```

### Using the CLI

### Read a Resume

```
resume> read my resume from https://docs.google.com/document/d/abc123/edit
```

or

```
resume> read my resume from abc123
```

### Copy a Resume

```
resume> copy my resume abc123
```

### Update Resume Based on Job Description

```
resume> update resume abc123 for this job: [paste job description here]
```

### Get Comments from Document

```
resume> show comments from abc123
```

### Get Help

```
resume> help
```

### Exit

```
resume> exit
```

## Troubleshooting

### MCP Server Not Found

If you get an error about the MCP server not being found:

1. Make sure you've built it: `npm run mcp:build`
2. Check that `dist/server.js` exists in `mcp-google-docs/`
3. Verify the `MCP_SERVER_PATH` environment variable is correct

### Google OAuth Errors

- Make sure all Google OAuth credentials are set in `.env`
- Verify the redirect URI matches what's configured in Google Cloud Console
- Try running `npm run mcp:get-token` again to get a fresh refresh token

### LangGraph Server Connection Issues

- Make sure the LangGraph server is running (`npm run langgraph:in_mem:up`)
- Check that `LANGGRAPH_API_URL` matches the server URL
- Verify the port (default: 54367) is not in use

### Document Access Issues

- Ensure the Google account used for OAuth has access to the document
- Check that the document ID is correct (extract from the Google Docs URL)

## Architecture

```
┌─────────────┐     ┌─────────────┐
│   Web UI    │     │   CLI       │ (User Interfaces)
│ (Browser)   │     │ (Terminal)  │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └──────────┬────────┘
                  │
                  ▼
         ┌─────────────┐
         │ LangGraph   │ (Resume Agent Graph)
         │   Server    │
         └──────┬──────┘
                │
                ▼
         ┌─────────────┐
         │ MCP Client  │ (Connects to MCP Server)
         └──────┬──────┘
                │
                ▼
         ┌─────────────┐
         │ MCP Server  │ (Google Docs API)
         └──────┬──────┘
                │
                ▼
         ┌─────────────┐
         │ Google Docs │
         │    API      │
         └─────────────┘
```

**Components:**

- **Web UI**: Browser-based chat interface (recommended for most users)
- **CLI**: Command-line interface for terminal users
- **LangGraph Server**: Orchestrates the resume agent workflow
- **MCP Server**: Handles Google Docs API interactions

## Next Steps

- Customize the resume update prompts in `src/agents/resume-agent/nodes/update-resume.ts`
- Add more MCP tools for advanced Google Docs operations
- Integrate with other document sources (PDF, Word, etc.)

## Support

For issues or questions, check:

- [Web UI README](../web-ui/README.md) - Web UI setup and usage
- [Web UI Docker Guide](../web-ui/DOCKER.md) - Running Web UI in Docker
- [MCP Server README](../mcp-google-docs/README.md) - MCP server documentation
- [Resume Agent README](../src/agents/resume-agent/README.md) - Agent implementation details
