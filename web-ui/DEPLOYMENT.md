# Web UI Deployment Guide

## Current Setup: Localhost

The web UI is configured to run on **localhost** by default:

- **URL**: http://localhost:3001
- **Host**: localhost (only accessible from your machine)
- **Port**: 3001

### Run on Localhost

```bash
# Start LangGraph API Server
npm run langgraph:up  # or npm run dev

# Start Web UI (in another terminal)
npm run web-ui
```

Then open: **http://localhost:3001**

---

## Future: Deploy to Domain

When you're ready to deploy to a domain, here's what you'll need:

### Option 1: Simple Deployment (Recommended)

**Use a reverse proxy** (nginx, Caddy, Cloudflare Tunnel, etc.):

1. **Keep web UI on localhost** (or internal network)
2. **Set up reverse proxy** to forward domain → localhost:3001
3. **Configure SSL/TLS** (HTTPS)

**Example nginx config:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Direct Domain Binding

Update `.env`:

```bash
# Bind to all interfaces (0.0.0.0) for domain access
WEB_UI_HOST=0.0.0.0
WEB_UI_PORT=3001

# Update LangGraph API URL if it's also on a domain
LANGGRAPH_API_URL=http://your-domain.com:54367
```

**⚠️ Security Note**: When binding to `0.0.0.0`, make sure to:

- Use a reverse proxy with SSL
- Set up firewall rules
- Consider authentication

### Option 3: Cloud Deployment

Deploy to platforms like:

- **Vercel** / **Netlify** (for frontend)
- **Railway** / **Render** (for full stack)
- **AWS** / **GCP** / **Azure**

---

## Environment Variables for Domain

When deploying to a domain, update `.env`:

```bash
# Web UI Configuration
WEB_UI_HOST=0.0.0.0  # or specific IP
WEB_UI_PORT=3001

# LangGraph API (if also on domain)
LANGGRAPH_API_URL=http://your-domain.com:54367
# or keep localhost if API is on same server
LANGGRAPH_API_URL=http://localhost:54367
```

---

## CORS Configuration

The current setup allows all origins (for development). For production, update `web-ui/server.ts`:

```typescript
// Current (development)
res.header("Access-Control-Allow-Origin", "*");

// Production (replace with your domain)
res.header("Access-Control-Allow-Origin", "https://your-domain.com");
```

---

## SSL/HTTPS Setup

For production, you'll need HTTPS:

1. **Get SSL certificate** (Let's Encrypt, Cloudflare, etc.)
2. **Configure reverse proxy** with SSL
3. **Update frontend** to use HTTPS URLs

---

## Quick Checklist for Domain Deployment

- [ ] Set `WEB_UI_HOST` in `.env` (if needed)
- [ ] Configure reverse proxy (nginx/Caddy/etc.)
- [ ] Set up SSL/TLS certificate
- [ ] Update CORS settings in `server.ts`
- [ ] Update `LANGGRAPH_API_URL` if API is on domain
- [ ] Test from domain URL
- [ ] Set up firewall rules
- [ ] Consider adding authentication

---

## Current Status

✅ **Ready for localhost** - Works out of the box!

⏳ **Domain deployment** - When you provide the domain, we'll configure:

- Reverse proxy setup
- SSL configuration
- CORS updates
- Environment variables

For now, just run `npm run web-ui` and access at **http://localhost:3001** 🚀
