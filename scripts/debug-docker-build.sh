#!/bin/bash
# Debug script to test Docker build locally
# This helps identify issues with the MCP server build in Docker

set -e

echo "🔍 Debugging Docker Build for MCP Server..."
echo ""

# Check if mcp-google-docs exists
if [ ! -d "mcp-google-docs" ]; then
  echo "❌ mcp-google-docs directory not found!"
  exit 1
fi

echo "✅ mcp-google-docs directory exists"
echo ""

# Test local build first
echo "1️⃣ Testing local MCP build..."
cd mcp-google-docs

if [ ! -f "package.json" ]; then
  echo "❌ package.json not found in mcp-google-docs"
  exit 1
fi

echo "✅ package.json found"
echo ""

# Try npm install
echo "2️⃣ Testing npm install..."
if npm install; then
  echo "✅ npm install succeeded"
else
  echo "❌ npm install failed"
  exit 1
fi
echo ""

# Try npm run build
echo "3️⃣ Testing npm run build..."
if npm run build; then
  echo "✅ npm run build succeeded"
else
  echo "❌ npm run build failed"
  exit 1
fi
echo ""

# Check if dist/server.js exists
if [ -f "dist/server.js" ]; then
  echo "✅ dist/server.js exists"
else
  echo "❌ dist/server.js not found after build"
  exit 1
fi

cd ..

echo ""
echo "✅ All local build tests passed!"
echo ""
echo "💡 If Docker build still fails, check:"
echo "   1. Docker build context includes mcp-google-docs"
echo "   2. Docker has network access for npm install"
echo "   3. Check Docker logs: docker logs langgraph-api-1"
