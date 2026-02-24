import { ResumeAgentState } from "../state.js";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { createMCPClient, callMCPTool } from "../utils/mcp-client.js";

/**
 * Node to read the resume from Google Docs using MCP
 */
export const readResumeNode = async (
  state: ResumeAgentState,
  config?: LangGraphRunnableConfig,
): Promise<Partial<ResumeAgentState>> => {
  const { originalResumeId } = state;

  if (!originalResumeId) {
    return {
      error: "No resume document ID provided",
      status: "Failed to read resume",
    };
  }

  let client;
  try {
    client = await createMCPClient(config);

    const result = await callMCPTool(client, "read_google_doc", {
      documentId: originalResumeId,
    });

    const content = result.content?.[0];
    if (content?.type === "text") {
      return {
        resumeContent: content.text,
        status: "Resume read successfully",
      };
    }

    throw new Error("Unexpected response format from MCP server");
  } catch (error: any) {
    return {
      error: error.message || "Failed to read resume",
      status: "Error reading resume",
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
};
