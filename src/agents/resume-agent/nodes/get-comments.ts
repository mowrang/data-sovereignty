import { ResumeAgentState } from "../state.js";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { createMCPClient, callMCPTool } from "../utils/mcp-client.js";

/**
 * Node to get comments from the Google Doc
 */
export const getCommentsNode = async (
  state: ResumeAgentState,
  config?: LangGraphRunnableConfig,
): Promise<Partial<ResumeAgentState>> => {
  const { copiedResumeId, originalResumeId } = state;
  const documentId = copiedResumeId || originalResumeId;

  if (!documentId) {
    return {
      error: "No document ID available",
      status: "Failed to get comments",
    };
  }

  let client;
  try {
    client = await createMCPClient(config);

    const result = await callMCPTool(client, "get_doc_comments", {
      documentId,
    });

    const content = result.content?.[0];
    if (content?.type === "text") {
      const commentsData = JSON.parse(content.text);
      const formattedComments = commentsData.map((comment: any) => ({
        id: comment.id,
        content: comment.content || comment.suggestedContent || "",
        author: comment.author?.displayName || "Unknown",
        createdTime: comment.createdTime || new Date().toISOString(),
      }));

      return {
        comments: formattedComments,
        updateInstructions: formattedComments
          .map((c: any) => `Comment from ${c.author}: ${c.content}`)
          .join("\n\n"),
        status: `Found ${formattedComments.length} comment(s)`,
      };
    }

    throw new Error("Unexpected response format from MCP server");
  } catch (error: any) {
    return {
      error: error.message || "Failed to get comments",
      status: "Error getting comments",
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
};
