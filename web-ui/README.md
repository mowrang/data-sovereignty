# Resume Agent Web UI

A simple chatbot web interface for interacting with the Resume Agent.

## Features

- 💬 Chat-based interface
- 📖 Read resumes from Google Docs
- 📋 Create tailored resumes for job descriptions
- ✏️ Update resumes based on feedback
- 🎨 Modern, responsive design

## Prerequisites

- LangGraph API Server running (`npm run langgraph:up` or `npm run dev`)
- Node.js dependencies installed (`npm install`)

## Quick Start

### 1. Install Dependencies

Make sure `express` is installed:

```bash
npm install express
npm install -D @types/express
```

### 2. Start LangGraph API Server

In one terminal:

```bash
# Option A: Docker mode
npm run langgraph:up

# Option B: In-memory mode (no Docker)
npm run dev
```

### 3. Start Web UI

In another terminal:

```bash
npm run web-ui
```

### 4. Open Browser

Navigate to: **http://localhost:3001**

## Usage

### Read Resume

```
read my resume from https://docs.google.com/document/d/YOUR_DOC_ID/edit
```

### Create Resume for Job

```
create resume for this job: [paste job description]
```

### Update Resume

```
update resume for this job: [paste job description]
```

## Configuration

Set environment variables in `.env`:

```bash
# LangGraph API URL (default: http://localhost:54367)
LANGGRAPH_API_URL=http://localhost:54367

# Web UI Port (default: 3001)
WEB_UI_PORT=3001
```

### Running on Localhost (Default)

The web UI runs on `localhost:3001` by default. No configuration needed!

Just run:

```bash
npm run web-ui
```

Then open: **http://localhost:3001**

### Future: Running on a Domain

When you're ready to deploy to a domain, you'll need to:

1. **Set up reverse proxy** (nginx, Caddy, etc.) to forward requests to `localhost:3001`
2. **Update CORS settings** in `web-ui/server.ts` if needed
3. **Configure SSL/TLS** for HTTPS
4. **Update `LANGGRAPH_API_URL`** if LangGraph API is also on a domain

The current setup works perfectly for localhost development! 🚀

## Architecture

```
Browser (http://localhost:3001)
    ↓ HTTP POST /api/chat
Web UI Server (web-ui/server.ts)
    ↓ LangGraph SDK Client
LangGraph API Server (localhost:54367)
    ↓ Runs graph
Resume Agent Graph
    ↓ Spawns MCP
MCP Google Docs Server
    ↓ Google APIs
Google Docs/Drive
```

## Files

- `web-ui/server.ts` - Express server that proxies to LangGraph API
- `web-ui/public/index.html` - Chat interface HTML
- `web-ui/public/styles.css` - Styling
- `web-ui/public/app.js` - Frontend JavaScript

## Troubleshooting

### Web UI won't start

```bash
# Check if port 3001 is available
lsof -i :3001

# Or change port in .env
WEB_UI_PORT=3002
```

### Can't connect to LangGraph API

```bash
# Check if LangGraph server is running
curl http://localhost:54367/health

# Or check status
npm run test:docker:env
```

### Assistant not found

Make sure `resume_agent` is registered in `langgraph.json` and the server is running.

## Development

The web UI uses:

- **Express** - Backend server
- **LangGraph SDK** - Client for LangGraph API
- **Vanilla JavaScript** - Frontend (no framework needed)

To modify:

- Frontend: Edit `web-ui/public/*.html`, `*.css`, `*.js`
- Backend: Edit `web-ui/server.ts`
