/**
 * Test LangChain/Anthropic API connection
 *
 * Usage:
 *   npm run test:langchain
 *
 * This tests:
 * - Anthropic API key is valid
 * - Can make API calls to Claude
 * - Model responses are working
 */

import { ChatAnthropic } from "@langchain/anthropic";
import * as dotenv from "dotenv";
import * as path from "path";
import * as url from "url";

// Load .env
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function testLangChain() {
  console.log("🧪 Testing LangChain/Anthropic Integration...\n");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("❌ ANTHROPIC_API_KEY not found in .env");
    console.error("   Get your API key from: https://console.anthropic.com/\n");
    process.exit(1);
  }

  console.log("✅ ANTHROPIC_API_KEY found\n");

  try {
    // Test 1: Initialize ChatAnthropic
    console.log("1️⃣ Initializing ChatAnthropic client...");
    const llm = new ChatAnthropic({
      model: "claude-sonnet-4-5",
      temperature: 0.3,
      apiKey: apiKey,
    });
    console.log("   ✅ Client initialized\n");

    // Test 2: Simple completion
    console.log("2️⃣ Testing simple completion...");
    const testPrompt = "Say 'Hello, LangChain!' in one sentence.";
    console.log(`   Prompt: "${testPrompt}"\n`);

    const startTime = Date.now();
    const response = await llm.invoke(testPrompt);
    const duration = Date.now() - startTime;

    const content =
      typeof response.content === "string"
        ? response.content
        : Array.isArray(response.content) && response.content[0]?.text
          ? response.content[0].text
          : JSON.stringify(response.content);

    const contentStr = String(content);
    console.log(`   ✅ Response received (${duration}ms)`);
    console.log(
      `   Response: ${contentStr.substring(0, 100)}${contentStr.length > 100 ? "..." : ""}\n`,
    );

    // Test 3: Streaming (optional)
    console.log("3️⃣ Testing streaming response...");
    const streamPrompt = "Count from 1 to 3, one number per line.";
    console.log(`   Prompt: "${streamPrompt}"\n`);

    const streamStartTime = Date.now();
    const stream = await llm.stream(streamPrompt);
    let streamedContent = "";

    for await (const chunk of stream) {
      const chunkText =
        typeof chunk.content === "string"
          ? chunk.content
          : Array.isArray(chunk.content) && chunk.content[0]?.text
            ? chunk.content[0].text
            : String(chunk.content || "");
      streamedContent += chunkText;
      const textToWrite = String(chunkText);
      if (textToWrite) {
        process.stdout.write(textToWrite);
      }
    }
    const streamDuration = Date.now() - streamStartTime;
    console.log(`\n   ✅ Stream completed (${streamDuration}ms)\n`);

    // Test 4: Check model availability
    console.log("4️⃣ Verifying model availability...");
    console.log(`   Model: claude-sonnet-4-5`);
    console.log(`   ✅ Model is accessible\n`);

    console.log("✅ All LangChain tests passed!\n");
    console.log("📊 Summary:");
    console.log(`   - API Key: Valid`);
    console.log(`   - Model: claude-sonnet-4-5`);
    console.log(`   - Simple completion: ${duration}ms`);
    console.log(`   - Streaming: ${streamDuration}ms`);
  } catch (error: any) {
    console.error("\n❌ LangChain test failed:");
    console.error(`   Error: ${error.message}`);

    if (
      error.message?.includes("401") ||
      error.message?.includes("authentication")
    ) {
      console.error("\n💡 Possible issues:");
      console.error("   - Invalid ANTHROPIC_API_KEY");
      console.error("   - API key expired or revoked");
      console.error("   - Get a new key from: https://console.anthropic.com/");
    } else if (
      error.message?.includes("429") ||
      error.message?.includes("rate limit")
    ) {
      console.error("\n💡 Rate limit exceeded. Wait a moment and try again.");
    } else if (error.message?.includes("model")) {
      console.error(
        "\n💡 Model not found. Check if 'claude-sonnet-4-5' is available.",
      );
      console.error(
        "   Try: claude-3-5-sonnet-20241022 or claude-3-opus-20240229",
      );
    }

    if (error.stack) {
      console.error(`\n   Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

testLangChain().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
