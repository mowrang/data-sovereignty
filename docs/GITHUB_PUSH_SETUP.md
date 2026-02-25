# GitHub Push Setup - Permission Denied Fix

## Issue

You're getting:
```
remote: Permission to langchain-ai/social-media-agent.git denied to mowrang.
fatal: unable to access 'https://github.com/langchain-ai/social-media-agent/': The requested URL returned error: 403
```

## Why This Happens

The repository `langchain-ai/social-media-agent` belongs to the LangChain AI organization, and you don't have write permissions to it.

## Solutions

### Option 1: Push to Your Own Repository (Recommended)

Create a new repository on GitHub under your account, then change the remote:

```bash
# 1. Create a new repository on GitHub (via web interface)
#    Go to: https://github.com/new
#    Name it: social-media-agent (or any name you prefer)

# 2. Change the remote URL to your repository
git remote set-url origin https://github.com/YOUR_USERNAME/social-media-agent.git

# 3. Push to your repository
git push origin main
```

### Option 2: Fork the Repository

1. Go to https://github.com/langchain-ai/social-media-agent
2. Click "Fork" button (top right)
3. This creates a copy under your account
4. Update remote:
   ```bash
   git remote set-url origin https://github.com/YOUR_USERNAME/social-media-agent.git
   git push origin main
   ```

### Option 3: Use SSH Instead of HTTPS

If you have SSH keys set up with GitHub:

```bash
# Change to SSH URL
git remote set-url origin git@github.com:YOUR_USERNAME/social-media-agent.git

# Push
git push origin main
```

### Option 4: Keep Original as Upstream, Add Your Fork

If you want to keep the original repo as a reference:

```bash
# Rename original to upstream
git remote rename origin upstream

# Add your repository as origin
git remote add origin https://github.com/YOUR_USERNAME/social-media-agent.git

# Push to your repository
git push origin main
```

## Quick Setup Script

Replace `YOUR_USERNAME` with your GitHub username:

```bash
cd /Users/maryam/Documents/005\ Engineering/JobHunting2026/social-media-agent

# Set your repository as origin
git remote set-url origin https://github.com/YOUR_USERNAME/social-media-agent.git

# Push
git push -u origin main
```

## Verify Remote

After changing the remote, verify it:

```bash
git remote -v
```

Should show your repository URL, not `langchain-ai/social-media-agent`.

## Note

The commit is already created locally. You just need to push it to a repository you have access to.
