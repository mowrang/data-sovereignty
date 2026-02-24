import { ResumeAgentState } from "../state.js";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { createMCPClient, callMCPTool } from "../utils/mcp-client.js";

/**
 * Node to copy the resume to a new Google Doc
 */
export const copyResumeNode = async (
  state: ResumeAgentState,
  config?: LangGraphRunnableConfig,
): Promise<Partial<ResumeAgentState>> => {
  const { originalResumeId } = state;

  if (!originalResumeId) {
    return {
      error: "No resume document ID provided",
      status: "Failed to copy resume",
    };
  }

  let client;
  try {
    client = await createMCPClient(config);

    const title = `Resume - Updated ${new Date().toISOString().split("T")[0]}`;
    const result = await callMCPTool(client, "copy_google_doc", {
      documentId: originalResumeId,
      title,
    });

    const content = result.content?.[0];
    if (content?.type === "text") {
      const data = JSON.parse(content.text);
      return {
        copiedResumeId: data.documentId,
        status: `Resume copied successfully. New document: ${data.url}`,
      };
    }

    throw new Error("Unexpected response format from MCP server");
  } catch (error: any) {
    return {
      error: error.message || "Failed to copy resume",
      status: "Error copying resume",
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
};
