/**
 * MCP Client Helper
 * Provides a reusable MCP client connection for Google Docs operations
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
/**
 * Create and connect an MCP client
 */
export declare function createMCPClient(): Promise<Client>;
/**
 * Call an MCP tool and return the result
 */
export declare function callMCPTool(
  client: Client,
  toolName: string,
  args: Record<string, any>,
): Promise<any>;
//# sourceMappingURL=mcp-client.d.ts.map
