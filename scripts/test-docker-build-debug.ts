/**
 * Test Docker build with debug output
 *
 * Usage:
 *   npm run test:docker:build:debug
 *
 * This will:
 * - Build Docker image with verbose output
 * - Show MCP server build steps
 * - Test environment variables in the built container
 * - Provide detailed error messages if build fails
 */

import { execSync } from "child_process";
import * as dotenv from "dotenv";
import * as path from "path";
import * as url from "url";
import * as fs from "fs";

// Load .env
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

function runCommand(
  command: string,
  description: string,
  options: { cwd?: string; stdio?: any } = {},
): { success: boolean; output: string } {
  try {
    console.log(`\n📋 ${description}`);
    console.log(`   Running: ${command}\n`);
    const output = execSync(command, {
      encoding: "utf-8",
      stdio: options.stdio || "inherit",
      cwd: options.cwd || path.resolve(__dirname, ".."),
    });
    return { success: true, output: output || "" };
  } catch (error: any) {
    const output = error.stdout || error.stderr || error.message || "";
    return { success: false, output };
  }
}

async function testDockerBuildDebug() {
  console.log("🔍 Testing Docker Build with Debug Output...\n");
  console.log(
    "This will build the Docker image and test environment variables.\n",
  );

  // Step 1: Check prerequisites
  console.log("1️⃣ Checking prerequisites...");

  const dockerCheck = runCommand("docker --version", "Check Docker", {
    stdio: "pipe",
  });
  if (!dockerCheck.success) {
    console.error("❌ Docker not found. Install Docker first.");
    process.exit(1);
  }
  console.log(`   ✅ ${dockerCheck.output.trim()}`);

  const envPath = path.resolve(__dirname, "../.env");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env file not found");
    process.exit(1);
  }
  console.log("   ✅ .env file exists\n");

  // Step 2: Stop any existing containers
  console.log("2️⃣ Stopping existing containers...");
  runCommand("docker compose down", "Stop containers", { stdio: "pipe" });
  console.log("   ✅ Containers stopped\n");

  // Step 3: Test local MCP build first
  console.log("3️⃣ Testing local MCP build (pre-flight check)...");
  const localBuild = runCommand("npm run mcp:build", "Build MCP locally");
  if (!localBuild.success) {
    console.error("\n❌ Local MCP build failed!");
    console.error("   Fix local build issues before testing Docker.\n");
    console.error("   Output:", localBuild.output);
    process.exit(1);
  }
  console.log("   ✅ Local build successful\n");

  // Step 4: Start LangGraph server with verbose output
  console.log("4️⃣ Starting LangGraph server (this will build Docker image)...");
  console.log("   Watch for MCP build steps in the output below:\n");
  console.log("   " + "=".repeat(60));

  // Start the server in the background and capture output
  runCommand("npm run langgraph:up", "Start LangGraph server", {
    stdio: "inherit",
  });

  // Give it some time to start building
  console.log("\n   Waiting for Docker build to start...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Step 5: Check if container is building/running
  console.log("\n5️⃣ Checking Docker container status...");
  const containerCheck = runCommand(
    "docker ps -a --filter 'name=langgraph' --format '{{.Names}}\t{{.Status}}'",
    "Check containers",
    { stdio: "pipe" },
  );

  if (containerCheck.success && containerCheck.output.trim()) {
    console.log("   Container status:");
    containerCheck.output
      .trim()
      .split("\n")
      .forEach((line) => {
        if (line.trim()) console.log(`     ${line}`);
      });
  } else {
    console.log("   ⚠️  No containers found yet (still building?)");
  }

  // Step 6: Check Docker build logs for MCP errors
  console.log("\n6️⃣ Checking Docker build logs for MCP build...");
  const logsCheck = runCommand(
    "docker logs langgraph-api-1 2>&1 | tail -50",
    "Get recent logs",
    { stdio: "pipe" },
  );

  if (logsCheck.success && logsCheck.output) {
    const logs = logsCheck.output;

    // Look for MCP-related output
    if (
      logs.includes("Building MCP server") ||
      logs.includes("mcp-google-docs")
    ) {
      console.log("   ✅ Found MCP build output in logs");

      // Extract MCP build section
      const mcpSection = logs
        .split("mcp-google-docs")
        .slice(-1)[0]
        ?.substring(0, 500);
      if (mcpSection) {
        console.log("\n   MCP Build Output:");
        console.log("   " + "-".repeat(60));
        console.log(
          mcpSection
            .split("\n")
            .map((l: string) => `   ${l}`)
            .join("\n"),
        );
        console.log("   " + "-".repeat(60));
      }
    }

    // Check for errors
    if (logs.includes("ERROR") || logs.includes("error")) {
      console.log("\n   ⚠️  Found errors in logs:");
      const errorLines = logs
        .split("\n")
        .filter(
          (l: string) =>
            l.toLowerCase().includes("error") || l.includes("ERROR"),
        );
      errorLines.slice(0, 5).forEach((line: string) => {
        console.log(`     ${line.substring(0, 100)}`);
      });
    }
  } else {
    console.log("   ⚠️  Cannot get logs (container might not exist yet)");
  }

  // Step 7: Wait a bit more and test environment variables
  console.log(
    "\n7️⃣ Waiting for build to complete, then testing environment...",
  );
  console.log("   (This may take 1-2 minutes for first build)\n");

  await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds

  // Check if container is running
  const runningCheck = runCommand(
    "docker ps --filter 'name=langgraph-api-1' --format '{{.Names}}'",
    "Check if container is running",
    { stdio: "pipe" },
  );

  if (runningCheck.success && runningCheck.output.trim()) {
    console.log("   ✅ Container is running!\n");

    // Test environment variables
    console.log("8️⃣ Testing environment variables in container...");
    const envCheck = runCommand(
      "docker exec langgraph-api-1 env | grep -E 'GOOGLE|ANTHROPIC|LANGSMITH' | head -10",
      "Check env vars",
      { stdio: "pipe" },
    );

    if (envCheck.success && envCheck.output.trim()) {
      console.log("   ✅ Environment variables found:");
      envCheck.output
        .trim()
        .split("\n")
        .forEach((line) => {
          const [key] = line.split("=");
          console.log(`     - ${key}`);
        });
    } else {
      console.log("   ⚠️  Could not read environment variables");
    }

    // Check if MCP server was built
    console.log("\n9️⃣ Checking if MCP server was built in container...");
    const mcpCheck = runCommand(
      "docker exec langgraph-api-1 ls -la /deps/social-media-agent/mcp-google-docs/dist/server.js 2>&1",
      "Check MCP server",
      { stdio: "pipe" },
    );

    if (mcpCheck.success && !mcpCheck.output.includes("No such file")) {
      console.log("   ✅ MCP server found in container!");
      console.log(`   ${mcpCheck.output.trim()}`);
    } else {
      console.log("   ❌ MCP server NOT found in container");
      console.log(`   Output: ${mcpCheck.output}`);
      console.log("\n   💡 This means the Docker build step for MCP failed.");
      console.log("   Check the build logs above for errors.");
    }
  } else {
    console.log("   ⚠️  Container is not running yet");
    console.log("   The build might still be in progress.");
    console.log("   Check logs with: docker logs langgraph-api-1\n");
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Debug test completed!\n");

  console.log("📊 Summary:");
  console.log("   - Local MCP build: ✅");
  console.log("   - Docker build: Check logs above");
  console.log("   - Container status: Check output above");
  console.log("   - Environment vars: Check output above");
  console.log("   - MCP server in Docker: Check output above\n");

  console.log("💡 Next steps:");
  console.log("   - If build failed, check the error messages above");
  console.log("   - See docs/DOCKER_BUILD_TROUBLESHOOTING.md for solutions");
  console.log("   - Check full logs: docker logs langgraph-api-1");
  console.log("   - Test env vars: npm run test:docker:env\n");
}

testDockerBuildDebug().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
