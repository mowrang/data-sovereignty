# Resume Agent

An intelligent agent for managing and updating resumes stored in Google Docs. The agent can read resumes, create copies, update them based on job descriptions, and process comments for iterative improvements.

## Features

- 📖 **Read Resumes**: Read content from Google Docs
- 📋 **Copy Resumes**: Create copies for job-specific versions
- ✏️ **Update Resumes**: Automatically tailor resumes to job descriptions
- 💬 **Comment Processing**: Read and apply updates based on document comments

## Architecture

The Resume Agent uses:

- **LangGraph**: For orchestrating the agent workflow
- **MCP Server**: For Google Docs API integration
- **Claude (Anthropic)**: For intelligent resume updates
- **Web UI**: Browser-based chat interface (recommended)
- **CLI**: Command-line interface for terminal users

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Google OAuth

See the [MCP Server README](../mcp-google-docs/README.md) for Google OAuth setup.

### 3. Build MCP Server

```bash
npm run mcp:build
```

### 4. Start LangGraph Server

```bash
npm run langgraph:in_mem:up
```

### 5. Use the Resume Agent

You can interact with the Resume Agent in two ways:

#### Option A: Web UI (Recommended)

```bash
npm run web-ui
```

Then open **http://localhost:3001** in your browser for a user-friendly chat interface.

#### Option B: CLI

```bash
npm run resume:cli
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

```bash
# Start the CLI
npm run resume:cli

# Natural language commands:
resume> read my resume from https://docs.google.com/document/d/abc123/edit
resume> copy my resume abc123
resume> update resume abc123 for this job: [paste job description]
resume> show comments from abc123
```

### Using the Agent Programmatically

```typescript
import { Client } from "@langchain/langgraph-sdk";

const client = new Client({
  apiUrl: "http://localhost:54367",
});

// Read and update a resume
const threadId = await client.runs.create("resume_agent", {
  originalResumeId: "your-document-id",
  jobDescription: "Job description text...",
});

const run = await client.runs.waitForRun(threadId);
console.log(run.state);
```

## Workflow

1. **Read Resume**: Fetches the current resume content from Google Docs
2. **Copy Resume**: Creates a new document copy for job-specific customization
3. **Update Resume**: Uses LLM to tailor the resume to the job description
4. **Get Comments**: Retrieves comments from the document for iterative improvements

## Environment Variables

```bash
# Google OAuth (for MCP server)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback

# MCP Server Path
MCP_SERVER_PATH=./mcp-google-docs/dist/server.js

# LangGraph API
LANGGRAPH_API_URL=http://localhost:54367

# Anthropic API (for resume updates)
ANTHROPIC_API_KEY=your-api-key
```

## State Schema

The agent maintains the following state:

- `originalResumeId`: The source document ID
- `copiedResumeId`: The copied document ID (if created)
- `jobDescription`: Job description text
- `resumeContent`: Current resume content
- `updatedResumeContent`: Updated resume content
- `comments`: Comments from the document
- `updateInstructions`: Instructions for updates
- `status`: Status messages
- `error`: Error messages
