# Fix: Auth Server Express Types Error

## Error
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/dist/src/types/express.js' 
imported from /app/dist/src/auth/auth-server.js
```

## Cause
The `auth-server.ts` was trying to import a type declaration file (`.d.ts`) as a runtime module. Type declaration files don't compile to JavaScript - they're only used during TypeScript compilation for type checking.

## Solution

The import has been removed from `auth-server.ts`. Type declaration files with `declare global` are automatically picked up by TypeScript - they don't need to be explicitly imported.

### Rebuild the Docker Container

Since the Docker container has the old compiled code, you need to rebuild it:

```bash
# Rebuild just the auth-server container
docker compose -f docker-compose.dev.yml build auth-server-dev

# Or rebuild all containers
docker compose -f docker-compose.dev.yml build

# Then restart
docker compose -f docker-compose.dev.yml up -d
```

### Verify the Fix

Check that the import is removed in `src/auth/auth-server.ts`:
- Line 13 should be a comment: `// Express type extensions are automatically loaded via src/types/express.d.ts`
- There should be NO `import "../types/express.js";` statement

### How It Works

1. `src/types/express.d.ts` contains `declare global` which extends Express types
2. TypeScript automatically processes `.d.ts` files listed in `tsconfig.json` include
3. The types are available globally without needing an import
4. No JavaScript is generated from `.d.ts` files - they're compile-time only

## Alternative: Reference Directive (if needed)

If TypeScript isn't picking up the types automatically, you can add a triple-slash directive at the top of `auth-server.ts`:

```typescript
/// <reference types="../types/express" />
```

But this shouldn't be necessary since `tsconfig.json` already includes `src/types/**/*.d.ts`.
