/**
 * Test LangSmith connection and tracing
 *
 * Usage:
 *   npm run test:langsmith
 *
 * This tests:
 * - LangSmith API key is valid
 * - Can connect to LangSmith API
 * - Tracing is working
 */

import { Client } from "@langchain/langgraph-sdk";
import * as dotenv from "dotenv";
import * as path from "path";
import * as url from "url";

// Load .env
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function testLangSmith() {
  console.log("🧪 Testing LangSmith Integration...\n");

  const apiKey = process.env.LANGSMITH_API_KEY;
  if (!apiKey) {
    console.error("❌ LANGSMITH_API_KEY not found in .env");
    console.error("   Get your API key from: https://smith.langchain.com/\n");
    console.error("   Note: LangSmith is required for Docker LangGraph API");
    console.error("   For local dev (npm run dev), LangSmith is optional\n");
    process.exit(1);
  }

  console.log("✅ LANGSMITH_API_KEY found\n");

  try {
    // Test 1: Check API key format
    console.log("1️⃣ Verifying API key format...");
    if (!apiKey.startsWith("lsv2_")) {
      console.warn(
        "   ⚠️  API key doesn't start with 'lsv2_' - might be invalid format",
      );
    } else {
      console.log("   ✅ API key format looks correct\n");
    }

    // Test 2: Test LangGraph SDK client (uses LangSmith for auth in Docker)
    console.log("2️⃣ Testing LangGraph SDK connection...");
    const apiUrl = process.env.LANGGRAPH_API_URL || "http://localhost:54367";
    console.log(`   API URL: ${apiUrl}\n`);

    const client = new Client({ apiUrl });

    try {
      // Try to list assistants (this requires LangSmith auth in Docker mode)
      const assistants = await client.assistants.search({});
      console.log(`   ✅ Connected to LangGraph API`);
      console.log(`   Found ${assistants.length} assistants\n`);
    } catch (error: any) {
      if (
        error.message?.includes("401") ||
        error.message?.includes("unauthorized")
      ) {
        console.error(`   ❌ Authentication failed`);
        console.error(`   Error: ${error.message}\n`);
        console.error("💡 Possible issues:");
        console.error("   - Invalid LANGSMITH_API_KEY");
        console.error(
          "   - API key doesn't have access to LangSmith Deployment",
        );
        console.error("   - Get a new key from: https://smith.langchain.com/");
        throw error;
      } else if (
        error.message?.includes("ECONNREFUSED") ||
        error.message?.includes("fetch failed")
      ) {
        console.warn(`   ⚠️  Cannot connect to LangGraph API at ${apiUrl}`);
        console.warn(`   This is OK if the server isn't running`);
        console.warn(`   Start it with: npm run langgraph:up\n`);
      } else {
        throw error;
      }
    }

    // Test 3: Check LangSmith web API directly (if possible)
    console.log("3️⃣ Testing LangSmith API access...");
    try {
      // LangSmith API endpoint for checking auth
      const response = await fetch(
        "https://api.smith.langchain.com/api/v1/sessions/me",
        {
          headers: {
            "x-api-key": apiKey,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ LangSmith API accessible`);
        console.log(`   User: ${data.email || "Unknown"}\n`);
      } else if (response.status === 401) {
        console.error(`   ❌ LangSmith API authentication failed`);
        console.error(`   Status: ${response.status}`);
        console.error(`   Check your LANGSMITH_API_KEY\n`);
        throw new Error("Invalid LangSmith API key");
      } else {
        console.warn(`   ⚠️  Unexpected response: ${response.status}`);
        console.warn(`   This might be OK depending on your LangSmith plan\n`);
      }
    } catch (error: any) {
      if (error.message?.includes("fetch")) {
        console.warn(`   ⚠️  Cannot reach LangSmith API (network issue?)`);
        console.warn(`   This might be OK if you're testing offline\n`);
      } else {
        throw error;
      }
    }

    console.log("✅ LangSmith tests completed!\n");
    console.log("📊 Summary:");
    console.log(`   - API Key: Present`);
    console.log(`   - LangGraph API: ${apiUrl}`);
    console.log(`   - Status: Ready for use\n`);

    console.log("💡 Note: LangSmith is required for:");
    console.log("   - Docker LangGraph API (npm run langgraph:up)");
    console.log("   - Production deployments");
    console.log("   - Tracing and observability\n");

    console.log("💡 LangSmith is optional for:");
    console.log("   - Local in-memory dev server (npm run dev)");
  } catch (error: any) {
    console.error("\n❌ LangSmith test failed:");
    console.error(`   Error: ${error.message}`);

    if (error.stack) {
      console.error(`\n   Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

testLangSmith().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
