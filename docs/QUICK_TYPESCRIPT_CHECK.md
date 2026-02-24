# Quick TypeScript Compilation Check

## Method 1: Check Single File (Fastest)

```bash
# Navigate to project root
cd "/Users/maryam/Documents/005 Engineering/JobHunting2026/social-media-agent"

# Check just the test file
npx tsc --noEmit src/auth/__tests__/auth-server.test.ts

# Or check the auth-server file
npx tsc --noEmit src/auth/auth-server.ts
```

## Method 2: Check Without Emitting Files

```bash
# Type-check without generating files (fast)
npx tsc --noEmit

# This checks all TypeScript files but doesn't create dist/
```

## Method 3: Check Specific Directory

```bash
# Check only auth directory
npx tsc --noEmit src/auth/**/*.ts

# Check only test files
npx tsc --noEmit **/__tests__/**/*.ts
```

## Method 4: Use TypeScript Watch Mode

```bash
# Watch mode - shows errors as you save files
npx tsc --noEmit --watch

# Press Ctrl+C to stop
```

## Method 5: Check in Your IDE

Most IDEs (VS Code, Cursor) show TypeScript errors in real-time:

- Open the file: `src/auth/__tests__/auth-server.test.ts`
- Errors will show with red squiggles
- Hover over errors to see details

## Method 6: Quick Build Test (Still Fast)

```bash
# Build only TypeScript (no Docker)
npm run build

# This is faster than Docker build because:
# - No Docker overhead
# - No dependency installation
# - Just TypeScript compilation
```

## Method 7: Check Specific Errors

```bash
# Check for specific error types
npx tsc --noEmit | grep "auth-server.test.ts"

# Or check for unused variables
npx tsc --noEmit | grep "TS6133"
```

## Recommended: Quick Check Workflow

```bash
# 1. Check the specific file that had errors
npx tsc --noEmit src/auth/__tests__/auth-server.test.ts

# 2. If no errors, check the whole project
npx tsc --noEmit

# 3. If still no errors, you're good! Then rebuild Docker
docker compose -f docker-compose.dev.yml build web-ui-dev
```

## What Each Method Does

| Method                     | Speed         | What It Checks               |
| -------------------------- | ------------- | ---------------------------- |
| `npx tsc --noEmit file.ts` | ⚡ Fastest    | Single file                  |
| `npx tsc --noEmit`         | ⚡⚡ Fast     | All files                    |
| `npm run build`            | ⚡⚡⚡ Medium | All files + generates dist/  |
| Docker build               | 🐌 Slowest    | Everything + Docker overhead |

## Quick Reference

```bash
# Fastest: Check single file
npx tsc --noEmit src/auth/__tests__/auth-server.test.ts

# Fast: Check all without building
npx tsc --noEmit

# Medium: Build locally
npm run build

# Slow: Build Docker (only after local checks pass)
docker compose -f docker-compose.dev.yml build web-ui-dev
```
