# Architecture: Docker, Servers, and API Calls

This document describes how the codebase is structured: **Docker**, **server code**, and **API calls to the cloud**. It is intended for software engineers working on or integrating with this project.

---

## 1. High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              YOUR MACHINE                                     │
│  ┌──────────────┐     HTTP      ┌─────────────────────────────────────────┐   │
│  │ Resume CLI   │ ────────────►│ LangGraph API Server                    │   │
│  │ (src/cli/)   │   :54367     │ - Runs graphs (resume_agent, etc.)      │   │
│  └──────────────┘               │ - Spawns MCP server for Google Docs     │   │
│                                 │ - Can run in Docker or in-memory mode    │   │
│                                 └──────────────────┬──────────────────────┘   │
│                                                    │ stdio                    │
│                                 ┌──────────────────▼──────────────────────┐  │
│                                 │ MCP Google Docs Server (subprocess)      │  │
│                                 │ mcp-google-docs/server.ts                │  │
│                                 └──────────────────┬──────────────────────┘  │
└────────────────────────────────────────────────────┼─────────────────────────┘
                                                     │
         ┌───────────────────────────────────────────┼───────────────────────────────────────────┐
         │                         CLOUD / EXTERNAL APIs                                         │
         │  Google Docs/Drive │ Anthropic (Claude) │ LangSmith │ Firecrawl │ Arcade │ etc.     │
         └───────────────────────────────────────────┴───────────────────────────────────────────┘
```

---

## 2. Docker

### 2.1 How Docker Is Used

| Command                | What it does                                                                                                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run langgraph:up` | Runs **LangGraph API Server** in Docker: builds an image from the project, starts **PostgreSQL** (5432), **Redis** (6379), and the **LangGraph API Server** (published as **54367** on the host). Requires **LANGSMITH_API_KEY** (or license) in `.env`. |
| `npm run dev`          | Runs the **LangGraph API Server** in in-memory mode (`langgraphjs dev --port 54367`) **without Docker**. No LangSmith required.                                                                                                                          |

### 2.2 Docker Stack (when using `langgraph up`)

- **Config**: LangGraph CLI generates a Docker Compose setup from `langgraph.json` and project files.
- **Images**: Uses `langchain/langgraphjs-api:20` as base; builds a custom image that copies the repo and runs `npm ci`.
- **Containers**:
  - **PostgreSQL** – state/checkpoints (port **5432** on host).
    - Stores graph execution state (checkpoints)
    - Stores thread data (conversations/workflows)
    - Stores run history and metadata
    - Enables resumability: graphs can pause and resume from saved state
    - Example: Resume agent saves `originalResumeId`, `resumeContent`, `copiedResumeId` so you can create multiple resumes from one read
  - **Redis** – caching/sessions (port **6379** on host).
    - Fast in-memory cache for frequently accessed data
    - Caches session data and temporary state
    - Improves performance for repeated operations
    - Used by LangGraph API Server for quick lookups
  - **LangGraph API Server** – HTTP API for running graphs (port **54367** on host).
    - **Inside this container**: When graph nodes need Google Docs, they spawn the **MCP Google Docs Server** as a subprocess (not a separate container).
    - The MCP server executable (`mcp-google-docs/dist/server.js`) is built into the Docker image during build.
- **Env**: `langgraph.json` has `"env": ".env"` so variables from `.env` are passed into the API container.

### 2.3 Relevant Files

| File             | Role                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `langgraph.json` | Defines graphs, Node version, env file, dependencies; used by LangGraph CLI to build/run Docker stack.                         |
| `package.json`   | Scripts `langgraph:up` (= `langgraphjs up --watch --port 54367`) and `langgraph:in_mem:up` (= `langgraphjs dev --port 54367`). |

---

## 3. Server Code

### 3.1 LangGraph API Server

- **What**: HTTP API server that compiles and runs the graphs defined in `langgraph.json`. This is the main service that clients connect to on port **54367**.
- **Where**: Started by `langgraphjs up` (Docker mode) or `langgraphjs dev` (in-memory mode). Listens on **54367** (configurable via `--port`).
- **Entry**: No custom server file in this repo; the server is the **LangGraph CLI / LangGraph API** binary that loads:
  - `langgraph.json` (graphs, env)
  - Graph entry points, e.g. `./src/agents/resume-agent/resume-agent-graph.ts:resumeAgentGraph`.

**API usage (from this repo):**

- **Resume CLI** (`src/cli/resume-cli.ts`): `Client` from `@langchain/langgraph-sdk` with `apiUrl: LANGGRAPH_API_URL` (default `http://localhost:54367`). Calls:
  - `client.runs.create(GRAPH_ID, input)` – start a run (e.g. `resume_agent` with `originalResumeId`).
  - `client.runs.waitForRun(threadId, options)` – poll until run completes.
- **Other graphs** (e.g. supervisor, generate-post, ingest-data): Use `Client` with `apiUrl: process.env.LANGGRAPH_API_URL` to call other graphs (e.g. `generate_post`, `reflection`, `curated_post_interrupt`).

So: **LangGraph API Server** = the HTTP service on port 54367 (can run in Docker or in-memory mode); **clients** = CLI and in-graph `Client` usage.

### 3.2 MCP Google Docs Server

- **What**: Model Context Protocol (MCP) server that exposes Google Docs/Drive operations as tools.
- **Where**: `mcp-google-docs/server.ts` (built to `mcp-google-docs/dist/server.js`).
- **How it’s run**: **Not** a long-lived HTTP server. It’s spawned as a **subprocess** by the Resume Agent when a graph node needs Google Docs (e.g. read, copy, update, comments). Communication is over **stdio** (MCP protocol).
- **Who spawns it**: Resume agent nodes in `src/agents/resume-agent/` use `createMCPClient()` in `src/agents/resume-agent/utils/mcp-client.ts`, which uses `StdioClientTransport` with `command: "node", args: [serverPath]`.
- **Docker mode**: When LangGraph API Server runs in Docker, the MCP server runs **inside the same Docker container** as a subprocess (not a separate container). The MCP server is built into the Docker image during the build process (see `langgraph.json` `dockerfile_lines`).
- **Dev mode**: When LangGraph API Server runs in-memory (`npm run dev`), the MCP server runs as a subprocess on your local machine.

**MCP tools exposed:** `read_google_doc`, `copy_google_doc`, `update_google_doc`, `get_doc_comments`, `apply_comment_updates`.

### 3.3 Auth Server (OAuth)

- **What**: Express server for Twitter and LinkedIn OAuth (get tokens for direct API use).
- **Where**: `src/clients/auth-server.ts`.
- **How to run**: `npm run start:auth` (runs `tsx src/clients/auth-server.ts`). Listens on port **3000** by default.
- **Endpoints**: `/`, `/auth/twitter`, `/auth/twitter/callback`, `/auth/linkedin`, `/auth/linkedin/callback`. Used only during one-time (or re-auth) token setup, not by the Resume Agent.

### 3.4 Resume CLI

- **What**: Interactive CLI for resume actions (read, copy, update, comments) using natural language.
- **Where**: `src/cli/resume-cli.ts`.
- **How to run**: `npm run resume:cli`. Not a server; it’s a **client** that:
  1. Parses user input (with Claude via `ChatAnthropic`).
  2. Calls the **LangGraph API Server** at `LANGGRAPH_API_URL` (e.g. `http://localhost:54367`) to run the `resume_agent` graph.
  3. The graph runs on the server and, inside the container/process, spawns the **MCP Google Docs server** and calls Google APIs.

---

## 4. API Calls to the Cloud

Below are the **external/cloud APIs** used by this codebase, grouped by purpose.

### 4.1 Resume Agent Path (Google + LLM)

| API / Service          | Purpose                                        | Where it’s used                                                                 | Env / config                                                                              |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Google Docs API**    | Read/copy/update docs, list comments           | MCP server `mcp-google-docs/server.ts` via `google.docs()` and `google.drive()` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_REFRESH_TOKEN` |
| **Anthropic (Claude)** | LLM for resume updates and CLI command parsing | `src/agents/resume-agent/nodes/update-resume.ts`, `src/cli/resume-cli.ts`       | `ANTHROPIC_API_KEY`                                                                       |

### 4.2 LangGraph / Observability

| API / Service            | Purpose                                                                        | Where it’s used                                           | Env / config                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **LangGraph API Server** | Run graphs (resume_agent, generate_post, etc.)                                 | CLI and in-graph `Client` from `@langchain/langgraph-sdk` | `LANGGRAPH_API_URL` (e.g. `http://localhost:54367`)                                           |
| **LangSmith**            | Tracing / observability; **required for Docker LangGraph API** (license check) | LangGraph API server (when run via Docker)                | `LANGSMITH_API_KEY` (and optionally `LANGCHAIN_API_KEY` / `LANGSMITH_TRACING_V2` for tracing) |

### 4.3 Social Media Agent Path

| API / Service            | Purpose                                                      | Where it’s used                                                                                   | Env / config                                                                     |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Anthropic (Claude)**   | All LLM steps (generate post, condense, verify, route, etc.) | Multiple agents under `src/agents/` (generate-post, supervisor, verify-content, repurposer, etc.) | `ANTHROPIC_API_KEY`                                                              |
| **Firecrawl**            | Web scraping / markdown extraction                           | `FireCrawlLoader` in verify-general, verify-luma, get-url-contents, extract-ai-newsletter-content | `FIRECRAWL_API_KEY` (or Firecrawl API key via LangChain community loader config) |
| **Arcade**               | Post to Twitter/LinkedIn, fetch tweets; simplified auth      | `src/clients/twitter/client.ts`, `src/clients/linkedin.ts`, ingest-twitter, shared auth           | `ARCADE_API_KEY`                                                                 |
| **Twitter API (direct)** | Optional: upload media, direct API when not using Arcade     | `src/clients/twitter/client.ts`, upload-post                                                      | `TWITTER_API_KEY`, `TWITTER_API_KEY_SECRET`, etc.                                |
| **LinkedIn API**         | Post to LinkedIn, user info                                  | `src/clients/linkedin.ts`, upload-post, auth-server                                               | `LINKEDIN_*` or Arcade                                                           |
| **Slack**                | Ingest messages, send notifications                          | `src/clients/slack/`, ingest-slack, schedule-post                                                 | `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`                                            |
| **GitHub**               | Repo content, search code                                    | `src/utils/github-repo-contents.ts`, verify-github, curate-data loaders                           | `GITHUB_TOKEN`                                                                   |
| **Supabase**             | Image storage                                                | `src/utils/supabase.ts`, find-and-generate-images                                                 | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`                                      |
| **Reddit**               | Optional: Reddit post content                                | `src/clients/reddit/`, verify-reddit-post                                                         | Reddit app credentials / token                                                   |

### 4.4 Summary Table: Cloud API Calls

| Service               | Typical endpoint / SDK                            | Used by                                                       |
| --------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| **Anthropic**         | Claude API (via `@langchain/anthropic`)           | Resume agent (update, CLI parse), all social media LLM nodes  |
| **Google Docs/Drive** | `googleapis` (docs v1, drive v3)                  | MCP server only                                               |
| **LangSmith**         | LangSmith API (used by LangGraph API server)      | Docker LangGraph API (required for license), optional tracing |
| **Firecrawl**         | Firecrawl API (via `@langchain/community` loader) | Verify-general, verify-luma, repurposer, curate-data          |
| **Arcade**            | Arcade API (via `@arcadeai/arcadejs`)             | Twitter/LinkedIn posting, ingest, auth                        |
| **LinkedIn**          | `https://api.linkedin.com/v2/...` (fetch)         | LinkedIn client, upload-post                                  |
| **Slack**             | `@slack/web-api`                                  | Slack client, ingest, schedule-post                           |
| **GitHub**            | `@octokit/rest` (GitHub API)                      | github-repo-contents, verify-github, curate-data loaders      |
| **Supabase**          | `@supabase/supabase-js`                           | Image storage                                                 |
| **Twitter**           | Twitter API v2 / Arcade                           | Twitter client, upload-post, verify-tweet                     |

---

## 5. Request Flow Examples

### 5.1 Resume: “Read my resume from [Google Doc URL]”

1. **User** runs `npm run resume:cli` and types: `read my resume from https://docs.google.com/document/d/DOC_ID/edit`.
2. **Resume CLI** (`resume-cli.ts`): Uses **Anthropic** to parse the command → `action: "read"`, `resumeId: "DOC_ID"`.
3. **Resume CLI** calls **LangGraph API Server** (localhost:54367): `client.runs.create("resume_agent", { originalResumeId: "DOC_ID" })`.
4. **LangGraph API Server** runs the `resume_agent` graph; first node is **readResume**.
5. **readResume** node (`read-resume.ts`): Calls `createMCPClient()` → spawns **MCP Google Docs server** (node subprocess), then `callMCPTool(client, "read_google_doc", { documentId: "DOC_ID" })`.
6. **MCP server** uses **Google Docs API** (with `GOOGLE_*` env) to fetch the document and returns content.
7. Result flows back: MCP → graph state → LangGraph API → CLI. CLI prints the resume content and **saves the LangGraph thread ID** (and original doc ID) to `.resume-agent-context.json` in the project root so later “create for JD” commands reuse the same thread.

**Cloud APIs in this path:** Anthropic (CLI parsing), Google Docs (via MCP).

### 5.1.1 Read once, create resume for many JDs

The agent is designed so you **read your resume once**, then **create a new tailored resume for each job** without re-reading the doc.

**Architecture:**

1. **First time:** You run `read my resume from [Google Doc URL]`.

   - CLI creates a **new thread**, runs the graph (read → copy → getComments).
   - Graph state is **checkpointed** on the server: `originalResumeId`, `resumeContent`, `copiedResumeId`, etc.
   - CLI writes **`.resume-agent-context.json`** with `threadId` and `originalResumeId` (so the same thread is reused).

2. **Later:** You run `create resume for this job: [paste JD]` or `update resume for this job: [paste JD]` (no doc ID).

   - CLI loads **threadId** from `.resume-agent-context.json` and calls the API with that thread and input `{ jobDescription }` (no `originalResumeId`).
   - The graph **starts from checkpointed state** (it already has `resumeContent` and `originalResumeId`). A **START router** (`routeFromStart`) sends the run to **copyResume** (new Google Doc) → **updateResume** (tailor to JD) → **getComments** → END. So the agent does **not** re-read from Google; it uses the in-memory resume and creates a new doc per JD.

3. **Graph change:** The resume graph has a **conditional edge from START**:
   - If state has `resumeContent` and `jobDescription` (or `updateInstructions`) → go to **copyResume** (create new doc), then **updateResume**.
   - If state has `resumeContent` only → go to **getComments** then END.
   - If state has `originalResumeId` but no `resumeContent` → go to **readResume** (first-time read).

So: **one thread** holds your resume in state; **one context file** holds the thread ID; each “create for this JD” creates a **new run on that thread** with only `jobDescription`, and the graph creates a **new copy** and updates it for that JD.

### 5.2 Social Media: Generate post from URL

1. **User/script** invokes `generate_post` graph (e.g. via script or cron) with a URL.
2. **LangGraph API Server** runs `generate_post` graph. Nodes may call:
   - **Firecrawl** (or similar) to scrape the URL.
   - **Anthropic** for condense, generate, rewrite steps.
   - Optionally **LangGraph API Server** again (same host) for subgraphs (e.g. `reflection`, `curated_post_interrupt`).
3. Later, **upload_post** or scheduling may call **Arcade**, **LinkedIn**, **Twitter**, **Slack** APIs.

**Cloud APIs:** Anthropic, Firecrawl, Arcade/LinkedIn/Twitter/Slack as configured.

---

## 6. Environment Variables (Quick Reference)

- **Resume agent + Docker:** `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_REFRESH_TOKEN`, `LANGSMITH_API_KEY` (for Docker API).
- **LangGraph API Server URL:** `LANGGRAPH_API_URL` (default `http://localhost:54367`) for CLI and in-graph clients.
- **MCP server path (optional):** `MCP_SERVER_PATH` if the Google Docs MCP server is not at `mcp-google-docs/dist/server.js`.

For the full list of env vars (social media, Supabase, Slack, GitHub, etc.), see `.env.full.example` and the README.
