# LangGraph CLI Source Code

## Source Code Locations

### Main Repository
**GitHub:** https://github.com/langchain-ai/langgraph

This is the main LangGraph repository containing:
- LangGraph framework code
- CLI implementations (both Python and TypeScript)
- Documentation
- Examples

### CLI Implementations

#### 1. Python CLI (`langgraph-cli`)
- **Location:** `/libs/cli` directory in main repo
- **Package:** `langgraph-cli` (PyPI)
- **Install:** `pip install langgraph-cli`
- **Commands:** `langgraph new`, `langgraph dev`, `langgraph up`, etc.

#### 2. TypeScript/JavaScript CLI (`@langchain/langgraph-cli`)
- **Package:** `@langchain/langgraph-cli` (NPM)
- **Current Version:** `^1.1.11` (as of your package.json)
- **Install:** `npm install -g @langchain/langgraph-cli` or via `npx`
- **Commands:** `langgraphjs up`, `langgraphjs dev`, etc.

**Note:** The TypeScript CLI source may be in:
- The main repo under a different directory (e.g., `/packages/langgraph-cli` or `/packages/langgraphjs-cli`)
- A separate repository (check LangChain AI's GitHub org)
- Part of the LangGraph.js monorepo

## Finding the Source

### Method 1: Check NPM Package
```bash
npm info @langchain/langgraph-cli repository
```

This will show the repository URL for the NPM package.

### Method 2: Check node_modules
If installed locally:
```bash
cat node_modules/@langchain/langgraph-cli/package.json | grep repository
```

### Method 3: GitHub Search
Search for:
- `langchain-ai/langgraph` (main repo)
- `langchain-ai/langgraphjs` (if separate repo)
- `langchain-ai/langgraph-cli` (if separate CLI repo)

## Key Files in Your Project

### LangGraph Configuration
- `langgraph.json` - Configuration file read by CLI
- Defines graphs, Node version, env file, dependencies

### CLI Usage
- `package.json` - Scripts using `langgraphjs` command:
  - `langgraph:up` - Runs `langgraphjs up --watch --port 54367`
  - `langgraph:in_mem:up` - Runs `langgraphjs dev --port 54367`

### Docker Integration
- `Dockerfile.langgraph` - Custom Dockerfile (alternative to CLI-generated)
- Uses base image: `langchain/langgraphjs-api:20`

## CLI Commands Reference

### Development Mode (In-Memory)
```bash
langgraphjs dev --port 54367
```
- No Docker required
- No LangSmith required
- Fast startup
- No persistence

### Production Mode (Docker)
```bash
langgraphjs up --port 54367
```
- Uses Docker
- Requires LangSmith API key
- Persistent state
- Production-ready

### Other Commands
```bash
langgraphjs build          # Build Docker image
langgraphjs dockerfile     # Generate Dockerfile
langgraphjs --help         # Show all commands
```

## Base Docker Image

The CLI uses this base image:
- **Image:** `langchain/langgraphjs-api:20`
- **Source:** Likely built from LangGraph repository
- **Purpose:** Pre-built LangGraph API server runtime

## Contributing

If you want to contribute or understand the CLI:

1. **Check the main repo:** https://github.com/langchain-ai/langgraph
2. **Look for CLI directories:** `/libs/cli`, `/packages/langgraph-cli`, etc.
3. **Check package.json** in node_modules for repository links
4. **Read documentation:** https://langchain-ai.github.io/langgraph/cloud/reference/cli/

## Quick Links

- **Main Repo:** https://github.com/langchain-ai/langgraph
- **NPM Package:** https://www.npmjs.com/package/@langchain/langgraph-cli
- **PyPI Package:** https://pypi.org/project/langgraph-cli/
- **Documentation:** https://langchain-ai.github.io/langgraph/cloud/reference/cli/
