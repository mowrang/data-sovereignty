/**
 * Manual test script for MCP Google Docs server
 *
 * Usage:
 *   TEST_DOC_ID=your_doc_id npx tsx test-manual.ts
 *
 * Or set TEST_DOC_ID in .env
 */

import {
  createMCPClient,
  callMCPTool,
} from "../src/agents/resume-agent/utils/mcp-client.js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as url from "url";

// Get __dirname equivalent for ES modules
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function testMCP() {
  console.log("🧪 Starting MCP Server Tests...\n");

  const docId = process.env.TEST_DOC_ID || process.argv[2];
  if (!docId) {
    console.error("❌ Please provide a test document ID:");
    console.error("   TEST_DOC_ID=your_doc_id npx tsx test-manual.ts");
    console.error("   or: npx tsx test-manual.ts your_doc_id");
    process.exit(1);
  }

  let client;
  try {
    console.log("1️⃣ Connecting to MCP server...");
    client = await createMCPClient();
    console.log("   ✅ Connected\n");

    // Test 1: List tools
    console.log("2️⃣ Testing listTools()...");
    const tools = await client.listTools();
    const toolNames = tools.tools.map((t) => t.name);
    console.log(
      `   ✅ Found ${toolNames.length} tools: ${toolNames.join(", ")}\n`,
    );

    // Test 2: Read document
    console.log(`3️⃣ Testing read_google_doc with ID: ${docId}...`);
    try {
      const readResult = await callMCPTool(client, "read_google_doc", {
        documentId: docId,
      });
      const content = readResult.content?.[0]?.text || "";
      const preview = content.substring(0, 200).replace(/\n/g, " ");
      console.log(`   ✅ Read successful (${content.length} chars)`);
      console.log(
        `   Preview: ${preview}${content.length > 200 ? "..." : ""}\n`,
      );
    } catch (error: any) {
      console.error(`   ❌ Read failed: ${error.message}\n`);
      throw error;
    }

    // Test 3: Copy document
    console.log("4️⃣ Testing copy_google_doc...");
    try {
      const copyTitle = `MCP Test Copy ${new Date().toISOString()}`;
      const copyResult = await callMCPTool(client, "copy_google_doc", {
        documentId: docId,
        title: copyTitle,
      });
      const copyData = JSON.parse(copyResult.content[0].text);
      console.log(`   ✅ Copy successful`);
      console.log(`   New Doc ID: ${copyData.documentId}`);
      console.log(`   URL: ${copyData.url}\n`);
    } catch (error: any) {
      console.error(`   ❌ Copy failed: ${error.message}\n`);
      // Don't throw - copy might fail due to permissions, but that's okay for testing
    }

    // Test 4: Get comments
    console.log("5️⃣ Testing get_doc_comments...");
    try {
      const commentsResult = await callMCPTool(client, "get_doc_comments", {
        documentId: docId,
      });
      const comments = JSON.parse(commentsResult.content[0].text);
      console.log(
        `   ✅ Comments retrieved: ${Array.isArray(comments) ? comments.length : 0} comments\n`,
      );
    } catch (error: any) {
      console.error(`   ❌ Get comments failed: ${error.message}\n`);
      // Don't throw - document might not have comments
    }

    // Test 5: Update document (instructions only, doesn't actually modify)
    console.log("6️⃣ Testing update_google_doc (instructions only)...");
    try {
      const updateResult = await callMCPTool(client, "update_google_doc", {
        documentId: docId,
        instructions: "Test instruction: Add a test sentence at the end.",
      });
      const updateData = JSON.parse(updateResult.content[0].text);
      console.log(`   ✅ Update instructions received`);
      console.log(
        `   Instructions: ${updateData.instructions.substring(0, 50)}...\n`,
      );
    } catch (error: any) {
      console.error(`   ❌ Update failed: ${error.message}\n`);
    }

    console.log("✅ All tests completed!\n");
  } catch (error: any) {
    console.error("\n❌ Test suite failed:");
    console.error(`   Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("🔌 MCP client closed");
    }
  }
}

// Run tests
testMCP().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
