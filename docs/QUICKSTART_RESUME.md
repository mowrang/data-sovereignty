# Quick Start: Resume Agent

Get up and running with the Resume Agent in 5 minutes!

## Quick Setup

````bash
# 1. Install dependencies
npm install
npm run mcp:install

# 2. Set up Google OAuth (one-time setup)
# Add to .env:
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
# GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback

# 3. Get refresh token
npm run mcp:get-token
# Add the refresh token to .env:
# GOOGLE_REFRESH_TOKEN=...

# 4. Add Anthropic API key to .env
# ANTHROPIC_API_KEY=...

# 5. Build MCP server
npm run mcp:build

# 6. Start LangGraph server (in one terminal)
# Option A - In-memory (no Docker, no LangSmith required):
npm run dev
# Option B - Docker (requires LangSmith API key in .env):
# Add to .env: LANGSMITH_API_KEY=your-key (get from https://smith.langchain.com/)
npm run langgraph:up

# 7. Use the Resume Agent (choose one option)

## Option A: Web UI (Recommended - Easy to Use)

In another terminal:

```bash
npm run web-ui
````

Then open your browser to: **http://localhost:3001**

You'll see a chat interface where you can:

- Read resumes from Google Docs
- Create tailored resumes for job descriptions
- Update resumes based on feedback

Example commands in the Web UI:

```
read my resume from https://docs.google.com/document/d/YOUR_DOC_ID/edit
create resume for this job: [paste job description]
update resume for this job: [paste job description]
```

## Option B: CLI (Command Line)

In another terminal:

```bash
npm run resume:cli
```

Once the CLI is running, try these commands:

```
resume> read my resume from [your-google-doc-id]
resume> copy my resume [your-google-doc-id]
resume> update resume [your-google-doc-id] for this job: [paste job description]
resume> show comments from [your-google-doc-id]
```

## Getting Your Google Doc ID

From a Google Docs URL like:

```
https://docs.google.com/document/d/1a2b3c4d5e6f7g8h9i0j/edit
```

The document ID is: `1a2b3c4d5e6f7g8h9i0j`

You can use either the full URL or just the ID.

## Note on npm audit

Audit is disabled during `npm install` (see `.npmrc`) so installs don’t get stuck. The vulnerabilities reported by `npm audit` are in **optional** dependencies (Reddit, custom OAuth) used by the social-media agent, not by the Resume Agent. You can run `npm audit` yourself anytime; for resume-only use, those packages aren’t loaded.

## Running Web UI in Docker

If you prefer to run the Web UI in Docker:

```bash
# Start LangGraph API Server (if not already running)
npm run langgraph:up

# Start Web UI in Docker (separate container)
npm run web-ui:docker
```

Then open: **http://localhost:3001**

See [web-ui/DOCKER.md](../web-ui/DOCKER.md) for more Docker options.

## Need More Help?

- See [RESUME_AGENT_SETUP.md](./RESUME_AGENT_SETUP.md) for detailed setup instructions
- See [web-ui/README.md](../web-ui/README.md) for Web UI documentation
