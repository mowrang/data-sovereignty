/**
 * Test script to verify Docker container has environment variables from .env
 *
 * Usage:
 *   npm run test:docker:env
 *
 * This script checks if the LangGraph Docker container has access to
 * the environment variables from your .env file.
 */

import { Client } from "@langchain/langgraph-sdk";

async function testDockerEnv() {
  console.log("🧪 Testing Docker Environment Variables...\n");

  const apiUrl = process.env.LANGGRAPH_API_URL || "http://localhost:54367";
  console.log(`📡 Connecting to LangGraph API: ${apiUrl}\n`);

  try {
    const client = new Client({ apiUrl });

    // Test 1: Check if server is running
    console.log("1️⃣ Checking if LangGraph server is running...");
    try {
      const assistants = await client.assistants.search({});
      console.log(
        `   ✅ Server is running (found ${assistants.length} assistants)\n`,
      );
    } catch (error: any) {
      console.error(`   ❌ Cannot connect to server: ${error.message}`);
      console.error(
        `   💡 Make sure LangGraph server is running: npm run langgraph:up\n`,
      );
      process.exit(1);
    }

    // Test 2: Try to create a test run that uses environment variables
    // We'll use the resume_agent which needs GOOGLE_REFRESH_TOKEN
    console.log(
      "2️⃣ Testing if resume_agent can access environment variables...",
    );
    console.log(
      "   (This will fail if GOOGLE_REFRESH_TOKEN is missing in Docker)\n",
    );

    // Find the resume_agent assistant
    const assistants = await client.assistants.search({});
    const resumeAgent = assistants.find(
      (a: any) => a.graph_id === "resume_agent",
    );

    if (!resumeAgent) {
      console.error(
        "   ❌ resume_agent not found. Make sure it's registered in langgraph.json",
      );
      process.exit(1);
    }

    console.log(`   Found resume_agent: ${resumeAgent.assistant_id}\n`);

    // Create a test thread
    const thread = await client.threads.create();
    console.log(`   Created test thread: ${thread.thread_id}\n`);

    // Try to run with a test document ID (this will fail if env vars are missing)
    console.log("3️⃣ Attempting to read a test document...");
    console.log(
      "   (Using a dummy doc ID - this will test MCP server initialization)\n",
    );

    try {
      const run = await client.runs.create(
        thread.thread_id,
        resumeAgent.assistant_id,
        {
          input: {
            originalResumeId: "TEST_DOC_ID_FOR_ENV_CHECK",
          },
        },
      );

      // Wait a bit to see if it fails early due to missing env vars
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const runStatus = await client.runs.get(thread.thread_id, run.run_id);

      if ((runStatus as any).status === "failed") {
        const errorMsg = (runStatus as any).error || "Unknown error";
        if (
          errorMsg.includes("GOOGLE_REFRESH_TOKEN") ||
          errorMsg.includes("authentication") ||
          errorMsg.includes("Connection closed")
        ) {
          console.error(`   ❌ MCP server failed: ${errorMsg}`);
          console.error(
            `   💡 This suggests environment variables are NOT available in Docker\n`,
          );
          console.error(`   🔧 Solutions:`);
          console.error(`      1. Check langgraph.json has "env": ".env"`);
          console.error(`      2. Verify .env file exists in project root`);
          console.error(`      3. Restart Docker: npm run langgraph:up`);
          console.error(
            `      4. Check Docker logs: docker logs langgraph-api-1\n`,
          );
        } else {
          console.log(`   ⚠️  Run failed with: ${errorMsg}`);
          console.log(`   (This might be expected - we used a dummy doc ID)\n`);
        }
      } else {
        console.log(
          `   ✅ Run started successfully (status: ${runStatus.status})`,
        );
        console.log(
          `   This suggests environment variables ARE available in Docker\n`,
        );
      }
    } catch (error: any) {
      console.error(`   ❌ Error creating run: ${error.message}\n`);
    }

    console.log("\n✅ Environment variable test completed!");
    console.log("\n📋 Next steps:");
    console.log("   • Check Docker logs for MCP server errors:");
    console.log(
      "     docker logs langgraph-api-1 | grep -i 'google\\|mcp\\|env'",
    );
    console.log("   • Or inspect the container directly:");
    console.log("     docker exec langgraph-api-1 env | grep GOOGLE");
  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  }
}

testDockerEnv();
