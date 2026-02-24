# Fixing package.json and package-lock.json Sync Issues

## Problem

When `package.json` and `package-lock.json` are out of sync, you'll see errors like:

```
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync.
```

## Solution: Update Lockfiles

### Step 1: Fix Main Project Lockfile

```bash
# Navigate to project root
cd "/Users/maryam/Documents/005 Engineering/JobHunting2026/social-media-agent"

# Update package-lock.json to match package.json
npm install

# This will:
# - Read package.json
# - Update package-lock.json to match
# - Install any missing dependencies
```

### Step 2: Fix mcp-google-docs Lockfile

```bash
# Navigate to mcp-google-docs directory
cd "/Users/maryam/Documents/005 Engineering/JobHunting2026/social-media-agent/mcp-google-docs"

# Update package-lock.json to match package.json
npm install

# Verify it works
npm ci --dry-run
```

### Step 3: Verify Sync

```bash
# In main project
cd "/Users/maryam/Documents/005 Engineering/JobHunting2026/social-media-agent"
npm ci --dry-run

# Should complete without errors
```

## Quick Fix Script

Run this to fix both:

```bash
#!/bin/bash
# Fix lockfiles for both main project and mcp-google-docs

PROJECT_ROOT="/Users/maryam/Documents/005 Engineering/JobHunting2026/social-media-agent"

# Fix main project
echo "🔧 Fixing main project lockfile..."
cd "$PROJECT_ROOT"
npm install

# Fix mcp-google-docs
echo "🔧 Fixing mcp-google-docs lockfile..."
cd "$PROJECT_ROOT/mcp-google-docs"
npm install

echo "✅ Lockfiles updated!"
```

## After Fixing

Once lockfiles are synced:

1. **Commit the changes:**

   ```bash
   git add package-lock.json mcp-google-docs/package-lock.json
   git commit -m "fix: sync package-lock.json with package.json"
   ```

2. **Docker builds will work:**

   ```bash
   npm run dev:up
   ```

3. **npm ci will work:**
   ```bash
   npm ci  # Should work without errors
   ```

## Prevention

To prevent this in the future:

1. **Always commit both files together:**

   ```bash
   git add package.json package-lock.json
   ```

2. **Run npm install after modifying package.json:**

   ```bash
   # After editing package.json
   npm install
   ```

3. **Use npm ci in CI/CD** (which you're already doing ✅)

4. **Don't manually edit package-lock.json** - let npm manage it

## Understanding the Files

- **package.json**: Defines your dependencies and their version ranges
- **package-lock.json**: Locks exact versions of all dependencies (including transitive)
- **npm-shrinkwrap.json**: Similar to package-lock.json but gets published with your package (you don't have this, which is fine)

## When Sync Issues Occur

Common causes:

- Manually edited `package.json` without running `npm install`
- Different npm versions between developers
- Git merge conflicts resolved incorrectly
- Dependencies updated manually

## Verification Commands

```bash
# Check if they're in sync (dry run)
npm ci --dry-run

# If it completes without errors, they're synced ✅
# If it errors, run npm install to fix
```
