/**
 * MCP Client Helper
 * Provides a reusable MCP client connection for Google Docs operations
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";
import * as url from "url";
import * as fs from "fs";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Get the path to the MCP server
 */
function getMCPServerPath() {
  const envPath = process.env.MCP_SERVER_PATH;
  if (envPath) {
    return envPath;
  }
  // Try multiple possible paths (works in both local dev and Docker)
  const possiblePaths = [
    // Docker path
    "/deps/social-media-agent/mcp-google-docs/dist/server.js",
    // From project root (if cwd is project root)
    path.join(process.cwd(), "mcp-google-docs", "dist", "server.js"),
    // From src/agents/resume-agent/utils/ (go up 4 levels to project root)
    path.resolve(
      __dirname,
      "../../../../",
      "mcp-google-docs",
      "dist",
      "server.js",
    ),
    // From project root relative to this file's location
    path.resolve(__dirname, "../../../../../mcp-google-docs/dist/server.js"),
  ];
  for (const serverPath of possiblePaths) {
    if (fs.existsSync(serverPath)) {
      return serverPath;
    }
  }
  // If none found, return the most likely path and let it fail with a clear error
  return (
    possiblePaths[1] ||
    path.join(process.cwd(), "mcp-google-docs", "dist", "server.js")
  );
}
/**
 * Create and connect an MCP client
 */
export async function createMCPClient() {
  const serverPath = getMCPServerPath();
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
  });
  const client = new Client(
    {
      name: "resume-agent",
      version: "0.1.0",
    },
    {
      capabilities: {},
    },
  );
  await client.connect(transport);
  return client;
}
/**
 * Call an MCP tool and return the result
 */
export async function callMCPTool(client, toolName, args) {
  const result = await client.callTool({
    name: toolName,
    arguments: args,
  });
  if (result.isError) {
    const errorText = result.content?.find((c) => c.type === "text")?.text;
    throw new Error(errorText || `Error calling tool ${toolName}`);
  }
  return result;
}
//# sourceMappingURL=mcp-client.js.map
