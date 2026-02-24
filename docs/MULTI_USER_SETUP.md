# Multi-User Architecture Setup Guide

This guide explains how to set up and use the multi-user architecture that allows multiple users to:

- Login with their Google account (for accessing their Google Docs)
- Configure their preferred AI provider (Anthropic, OpenAI, etc.)
- Use the service independently with their own credentials

## Architecture Overview

The multi-user architecture consists of:

1. **User Database** (PostgreSQL) - Stores user accounts, Google refresh tokens, and AI provider preferences
2. **Authentication Server** - Handles Google OAuth login and session management
3. **MCP Google Docs Server** - Uses per-user Google refresh tokens to access documents
4. **LangGraph API** - Passes user context through graph execution
5. **Web UI** - Provides login/logout and user settings management

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

This will install the new dependencies:

- `pg` - PostgreSQL client for user management
- `cookie-parser` - For session cookie handling

### 2. Initialize Database Schema

Run the database initialization script to create the users and sessions tables:

```bash
npm run db:init
```

This creates:

- `users` table - Stores user accounts, Google tokens, and AI preferences
- `user_sessions` table - Manages authentication sessions

### 3. Configure Environment Variables

Add these to your `.env` file:

```bash
# Google OAuth (for user login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Session security
SESSION_SECRET=your-random-secret-key-change-this-in-production

# Encryption key for sensitive data (tokens, API keys)
ENCRYPTION_KEY=your-32-byte-hex-encryption-key

# Auth server URL (for redirects)
AUTH_SERVER_URL=http://localhost:3000

# PostgreSQL connection (uses same DB as LangGraph)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=langgraph
POSTGRES_USER=langgraph
POSTGRES_PASSWORD=changeme
```

**Important Security Notes:**

- `SESSION_SECRET` should be a random string (at least 32 characters)
- `ENCRYPTION_KEY` should be a 32-byte hex string (64 hex characters)
- Generate encryption key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 4. Start the Authentication Server

In one terminal, start the auth server:

```bash
npm run start:auth:multi
```

This starts the auth server on port 3000 (default). Users will login at:

- `http://localhost:3000/auth/google`

### 5. Start the LangGraph API Server

In another terminal, start the LangGraph API server:

```bash
npm run langgraph:up
# or for in-memory mode:
npm run dev
```

### 6. Start the Web UI

In another terminal, start the web UI:

```bash
npm run web-ui
```

The web UI will run on port 3001 (default).

## User Flow

### First-Time User

1. User visits the web UI at `http://localhost:3001`
2. User clicks "Login with Google"
3. User is redirected to Google OAuth consent screen
4. User grants permissions for:
   - Email and profile access
   - Google Docs access
   - Google Drive access
5. User is redirected back with a session cookie
6. User can now use the service with their own Google Docs

### Configuring AI Provider

Users can configure their preferred AI provider:

1. Go to Settings in the web UI
2. Select AI provider (Anthropic, OpenAI, Azure OpenAI)
3. Enter API key for the selected provider
4. Save settings

The system will use the user's preferred AI provider for all resume operations.

### Using the Service

Once logged in, users can:

- Read their resumes from Google Docs
- Create tailored resumes for job descriptions
- Update resumes based on comments
- All operations use their own Google account and AI provider

## API Endpoints

### Authentication Server (`http://localhost:3000`)

- `GET /auth/google` - Initiate Google OAuth login
- `GET /auth/google/callback` - OAuth callback (handled automatically)
- `GET /auth/me` - Get current user info (requires authentication)
- `POST /auth/logout` - Logout (requires authentication)
- `POST /auth/settings/ai` - Update AI provider and API key (requires authentication)

### Web UI (`http://localhost:3001`)

- `GET /api/auth/status` - Check authentication status
- `GET /api/auth/logout` - Logout
- `GET /api/settings` - Get user settings
- `POST /api/settings/ai` - Update AI provider settings
- `POST /api/chat` - Chat with resume agent (requires authentication)

## How It Works

### User Context Flow

1. **Web UI** receives user request with session cookie
2. **Web UI** authenticates user and gets `userId`
3. **Web UI** calls LangGraph API with `userId` in `config.configurable.userId`
4. **LangGraph** passes config to graph nodes
5. **MCP Client** reads `userId` from config and fetches user's Google refresh token from database
6. **MCP Server** receives refresh token via environment variable and authenticates with Google
7. **Resume Agent Nodes** use user's AI API key from database

### Data Storage

- **Google Refresh Tokens**: Encrypted and stored in `users.google_refresh_token`
- **AI API Keys**: Encrypted and stored in `users.ai_api_key`
- **Sessions**: Stored in `user_sessions` table with expiration

### Security

- All sensitive data (tokens, API keys) is encrypted at rest using AES-256-GCM
- Sessions expire after 7 days (configurable)
- Session tokens are cryptographically random
- HTTPS should be used in production

## Migration from Single-User Mode

If you're migrating from single-user mode:

1. Your existing `GOOGLE_REFRESH_TOKEN` in `.env` will still work as a fallback
2. Users who login will have their own tokens stored in the database
3. The system checks user tokens first, then falls back to environment variable

## Troubleshooting

### "User not authenticated" errors

- Make sure the auth server is running
- Check that session cookies are being set
- Verify `SESSION_SECRET` is set correctly

### "Google authentication failed" errors

- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Verify `GOOGLE_REDIRECT_URI` matches your Google Cloud Console settings
- Ensure user has granted all required permissions

### Database connection errors

- Verify PostgreSQL is running
- Check connection settings in `.env`
- Ensure database schema is initialized (`npm run db:init`)

### MCP server errors

- Verify user has a valid Google refresh token
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- User may need to re-authenticate if token expired

## Production Deployment

For production:

1. Use HTTPS for all services
2. Set strong `SESSION_SECRET` and `ENCRYPTION_KEY`
3. Use environment variables for all secrets (never commit to git)
4. Set up proper CORS policies
5. Use secure cookie settings (`secure: true`, `sameSite: "strict"`)
6. Regularly rotate encryption keys
7. Set up database backups
8. Monitor session expiration and cleanup

## Support

For issues or questions, check:

- Architecture documentation: `docs/ARCHITECTURE.md`
- Database documentation: `docs/POSTGRESQL_REDIS_PURPOSE.md`
