# Fixing TypeScript Errors in auth-server-dev Container

## Common Causes

TypeScript declaration errors and type mismatches in `auth-server-dev` usually occur because:

1. **TypeScript compilation errors during Docker build**
2. **Missing type definitions** (`@types/*` packages)
3. **Type mismatches** between dependencies
4. **Build process not completing successfully**

## Diagnosis Steps

### Step 1: Check Docker Build Logs

```bash
# Rebuild the auth-server container and see the errors
docker compose -f docker-compose.dev.yml build auth-server-dev

# Or check existing logs
docker logs resume-agent-auth-dev
```

### Step 2: Test TypeScript Compilation Locally

```bash
# Navigate to project root
cd "/Users/maryam/Documents/005 Engineering/JobHunting2026/social-media-agent"

# Try building TypeScript locally
npm run build

# This will show you the actual TypeScript errors
```

### Step 3: Check for Missing Type Definitions

```bash
# Verify all @types packages are installed
npm list @types/express @types/node @types/cookie-parser
```

## Common Fixes

### Fix 1: Ensure All Type Definitions Are Installed

The auth-server needs these type definitions:

```bash
# Check if these are in package.json devDependencies
# They should already be there, but verify:
npm list @types/express @types/node @types/cookie-parser @types/express-session
```

If missing, add them:

```bash
npm install --save-dev @types/express @types/node @types/cookie-parser @types/express-session
```

### Fix 2: Update Dockerfile to Show Build Errors

The current Dockerfile might be hiding TypeScript errors. Update `Dockerfile.web-ui`:

```dockerfile
# Build TypeScript (with error output)
RUN npm run build 2>&1 | tee build.log || (cat build.log && exit 1)
```

### Fix 3: Fix Type Mismatches

Common type issues in `auth-server.ts`:

#### Issue: Express Request/Response Types

```typescript
// If you see errors about Request/Response types
import { Request, Response, NextFunction } from "express";

// Make sure @types/express is installed
```

#### Issue: Process.env Types

```typescript
// Type assertions for environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET as string;
```

#### Issue: Import Path Issues

```typescript
// Make sure imports use .js extension (for ES modules)
import { db, User } from "../db/client.js";
import { redisCache } from "../utils/redis-cache.js";
```

### Fix 4: Update tsconfig.json

Ensure `tsconfig.json` has proper settings:

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "skipLibCheck": true, // Add this to skip type checking in node_modules
    "types": ["node", "jest"]
  }
}
```

The `skipLibCheck: true` option can help avoid type errors from dependencies.

## Step-by-Step Fix Process

### Step 1: Fix Locally First

```bash
# 1. Navigate to project
cd "/Users/maryam/Documents/005 Engineering/JobHunting2026/social-media-agent"

# 2. Install/update dependencies
npm install

# 3. Try building TypeScript
npm run build

# 4. Fix any errors shown
# Common fixes:
# - Add missing type assertions
# - Fix import paths
# - Add missing @types packages
```

### Step 2: Update Dockerfile if Needed

If the build works locally but fails in Docker, the Dockerfile might need updates:

```dockerfile
# In Dockerfile.web-ui, ensure:
# 1. All source files are copied before build
# 2. TypeScript config is copied
# 3. Build shows errors (don't hide them)
```

### Step 3: Rebuild Docker Container

```bash
# Rebuild auth-server container
docker compose -f docker-compose.dev.yml build --no-cache auth-server-dev

# Check build output for errors
# Fix any TypeScript errors shown
```

### Step 4: Verify Build Output

```bash
# After successful build, verify files exist
docker run --rm resume-agent-auth-dev ls -la dist/src/auth/

# Should show:
# dist/src/auth/auth-server.js
# dist/src/auth/auth-server.d.ts (if declaration: true)
```

## Quick Fix: Add skipLibCheck

If errors are from dependencies (not your code), add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "skipLibCheck": true // Skip type checking of declaration files
    // ... other options
  }
}
```

This tells TypeScript to skip type checking in `node_modules/@types/*` which can resolve many false positives.

## Verify Fix

After fixing:

```bash
# 1. Build locally
npm run build

# 2. Rebuild Docker container
docker compose -f docker-compose.dev.yml build auth-server-dev

# 3. Start container
docker compose -f docker-compose.dev.yml up auth-server-dev

# 4. Check logs
docker logs resume-agent-auth-dev

# Should see: "Auth server running on port 3000" (or similar)
```

## Common Error Patterns

### Error: "Cannot find module '@types/...'"

**Fix:**

```bash
npm install --save-dev @types/<package-name>
```

### Error: "Property '...' does not exist on type '...'"

**Fix:** Add type assertion or fix the type:

```typescript
// Instead of:
const value = req.body.something;

// Use:
const value = req.body.something as string;
```

### Error: "Declaration file not found"

**Fix:** Ensure `declaration: true` in tsconfig.json and rebuild

### Error: "Module not found" (at runtime)

**Fix:** Check import paths use `.js` extension for ES modules:

```typescript
import { db } from "../db/client.js"; // ✅ Correct
import { db } from "../db/client"; // ❌ Wrong for ES modules
```

## Still Having Issues?

1. **Share the exact error message** - Run `npm run build` and share the output
2. **Check Docker build logs** - `docker compose build auth-server-dev`
3. **Verify tsconfig.json** - Ensure it matches the project structure
4. **Check package.json** - Ensure all @types packages are in devDependencies
