# Domain Setup Guide

## Checking Domain Availability

### AbiConnect.com

**To check if AbiConnect.com is available:**

1. **Namecheap** (Recommended): https://www.namecheap.com/domains/registration/results/?domain=AbiConnect.com
2. **GoDaddy**: https://www.godaddy.com/en-us/domains/search
3. **Google Domains**: https://domains.google.com/registrar
4. **Porkbun**: https://porkbun.com/checkout/search?q=AbiConnect.com

**Quick Check:**

- Go to any registrar above
- Search "AbiConnect.com"
- See if it's available and pricing

---

## Domain Name Suggestions

Based on your app (job hunting, resume agent, job matching), here are domain suggestions:

### Option 1: AbiConnect.com ✅

**Pros:**

- Professional sounding
- Generic enough for multiple uses
- Easy to remember
- "Connect" suggests networking/matching

**Cons:**

- Not immediately clear it's for jobs
- May need branding/marketing

**Best for:** If you want a brandable name

---

### Option 2: Job-Focused Domains

**Available options to check:**

- `ResumeMatch.com` - Clear purpose
- `JobTailor.com` - Matches your resume tailoring feature
- `ResumeAI.com` - Emphasizes AI features
- `JobConnect.ai` - Modern, AI-focused
- `ResumeGenius.com` - Professional
- `JobMatchAI.com` - Clear value proposition
- `TailoredResumes.com` - Descriptive
- `ResumeForge.com` - Strong brand
- `JobCraft.ai` - Modern, creative
- `ResumeBuilder.ai` - Clear purpose

**Check availability:** Use Namecheap or GoDaddy search

---

### Option 3: Brandable Names

- `AbiConnect.com` ✅ (your choice)
- `ResumeHub.com`
- `JobFlow.com`
- `ResumeLab.com`
- `CareerCraft.com`
- `JobForge.com`

---

## Domain Registration Guide

### Step 1: Choose Registrar

**Recommended Registrars:**

1. **Namecheap** ⭐ **RECOMMENDED**

   - Price: ~$10-15/year for .com
   - Free WHOIS privacy
   - Free email forwarding
   - Easy to use
   - Good customer support

2. **Porkbun**

   - Price: ~$8-10/year
   - Very competitive pricing
   - Free privacy
   - Modern interface

3. **Google Domains** (Now Squarespace)

   - Price: ~$12/year
   - Simple interface
   - Good integration with Google services

4. **GoDaddy**
   - Price: ~$12-15/year (first year), higher renewal
   - Most popular
   - Lots of upsells
   - ⚠️ Watch renewal prices

---

### Step 2: Register Domain

**Using Namecheap (Recommended):**

1. Go to: https://www.namecheap.com/
2. Search for "AbiConnect.com"
3. If available, click "Add to Cart"
4. Choose registration period (1-10 years)
5. Add WHOIS privacy (usually free)
6. Complete checkout
7. Verify email

**Cost:** ~$10-15/year for .com domain

---

### Step 3: Configure DNS

After registering, you'll need to configure DNS:

**For AWS Deployment:**

1. **Get your AWS Load Balancer DNS name**

   - From AWS Console → EC2 → Load Balancers
   - Copy DNS name (e.g., `your-alb-123456.us-east-1.elb.amazonaws.com`)

2. **Configure DNS Records in Namecheap:**

   **Option A: Use Namecheap DNS**

   - Go to Namecheap → Domain List → Manage → Advanced DNS
   - Add A Record:
     - Host: `@`
     - Type: `A Record`
     - Value: Your server IP (if using EC2 directly)
     - TTL: Automatic
   - OR Add CNAME Record (if using load balancer):
     - Host: `@`
     - Type: `CNAME Record`
     - Value: `your-alb-123456.us-east-1.elb.amazonaws.com`
     - TTL: Automatic

   **Option B: Use AWS Route 53** (Recommended for AWS)

   - Create hosted zone in Route 53
   - Update nameservers in Namecheap to Route 53 nameservers
   - Configure records in Route 53

3. **Add Subdomains (if needed):**
   - `api.AbiConnect.com` → LangGraph API
   - `auth.AbiConnect.com` → Auth server
   - `www.AbiConnect.com` → Web UI (or redirect to main domain)

---

### Step 4: SSL Certificate

**Free SSL Options:**

1. **Let's Encrypt** (via Certbot)

   - Free
   - 90-day certificates (auto-renew)
   - Works with nginx/Apache

2. **Cloudflare** (Free tier)

   - Free SSL
   - CDN included
   - Easy setup

3. **AWS Certificate Manager** (if using AWS)
   - Free SSL certificates
   - Auto-renewal
   - Works with ALB/CloudFront

**Setup with Cloudflare (Easiest):**

1. Sign up: https://www.cloudflare.com/
2. Add your domain
3. Update nameservers in Namecheap to Cloudflare nameservers
4. Enable SSL (automatic)
5. Done! SSL is now active

---

## Domain Configuration for Your App

### Update Environment Variables

After getting domain, update `.env`:

```bash
# Domain configuration
DOMAIN=AbiConnect.com
WEB_UI_HOST=0.0.0.0
WEB_UI_PORT=3001

# URLs
AUTH_SERVER_URL=https://AbiConnect.com/auth
# OR use subdomain:
# AUTH_SERVER_URL=https://auth.AbiConnect.com

LANGGRAPH_API_URL=https://api.AbiConnect.com
# OR if same domain:
# LANGGRAPH_API_URL=https://AbiConnect.com/api/langgraph

# Google OAuth (update redirect URI)
GOOGLE_REDIRECT_URI=https://AbiConnect.com/auth/google/callback
```

---

## DNS Records Setup

### Basic Setup (Single Domain)

```
A Record:
  @ → Your server IP (or CNAME to load balancer)

CNAME Records:
  www → AbiConnect.com (redirect)
  api → Your API server
  auth → Your auth server (optional)
```

### Advanced Setup (Subdomains)

```
A/CNAME Records:
  @ → Main web UI (AbiConnect.com)
  www → AbiConnect.com (redirect)
  api → LangGraph API (api.AbiConnect.com)
  auth → Auth server (auth.AbiConnect.com) [optional]
```

---

## Cost Breakdown

### Domain Registration

- **.com domain**: $10-15/year
- **WHOIS privacy**: Usually free
- **Total**: ~$12/year

### DNS Hosting

- **Namecheap DNS**: Free (included)
- **AWS Route 53**: $0.50/month per hosted zone + $0.40 per million queries
- **Cloudflare**: Free (recommended)

### SSL Certificate

- **Let's Encrypt**: Free
- **Cloudflare**: Free
- **AWS ACM**: Free (if using AWS)

**Total Annual Cost: ~$12-15/year** (just domain)

---

## Quick Setup Checklist

- [ ] Check AbiConnect.com availability
- [ ] Register domain (Namecheap recommended)
- [ ] Set up DNS records
- [ ] Configure SSL (Cloudflare easiest)
- [ ] Update environment variables
- [ ] Test domain access
- [ ] Update Google OAuth redirect URI
- [ ] Deploy app to domain

---

## Alternative Domain Names

If AbiConnect.com is taken, consider:

**Job-Focused:**

- ResumeMatch.com
- JobTailor.com
- ResumeAI.com
- JobConnect.ai

**Brandable:**

- ResumeHub.com
- JobFlow.com
- ResumeLab.com
- CareerCraft.com

**Check all at once:** Use Namecheap bulk search

---

## Next Steps After Domain Registration

1. **Set up DNS** (see above)
2. **Configure SSL** (Cloudflare recommended)
3. **Update app configuration** (environment variables)
4. **Deploy to domain** (AWS, Vercel, etc.)
5. **Test everything** (HTTPS, OAuth, API calls)

---

## Summary

**To check AbiConnect.com:**

1. Go to: https://www.namecheap.com/domains/registration/results/?domain=AbiConnect.com
2. See if available and price
3. Register if available (~$12/year)

**Recommended Setup:**

- Domain: Namecheap ($12/year)
- DNS: Cloudflare (free, includes SSL)
- SSL: Cloudflare (automatic, free)

**Total Cost: ~$12/year** for domain + free SSL

See deployment guides for AWS setup after domain registration!
