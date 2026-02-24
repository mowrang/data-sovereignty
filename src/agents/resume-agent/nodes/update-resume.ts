import { ResumeAgentState } from "../state.js";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { createMCPClient, callMCPTool } from "../utils/mcp-client.js";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { db } from "../../../db/client.js";

/**
 * Get LLM instance based on user's AI provider preference
 */
async function getUserLLM(config?: LangGraphRunnableConfig) {
  const userId = config?.configurable?.userId;

  if (userId) {
    try {
      const user = await db.getUserById(userId);
      if (user?.aiProvider === "openai" && user?.aiApiKey) {
        return new ChatOpenAI({
          modelName: "gpt-4",
          temperature: 0.3,
          openAIApiKey: user.aiApiKey,
        });
      }
      // Add more providers as needed (Azure OpenAI, etc.)
    } catch (error) {
      console.warn("Failed to get user AI preferences, using default:", error);
    }
  }

  // Default to Anthropic
  return new ChatAnthropic({
    model: "claude-sonnet-4-5",
    temperature: 0.3,
  });
}

/**
 * Node to update the resume based on job description or comments
 */
export const updateResumeNode = async (
  state: ResumeAgentState,
  config?: LangGraphRunnableConfig,
): Promise<Partial<ResumeAgentState>> => {
  const { resumeContent, jobDescription, updateInstructions, copiedResumeId } =
    state;

  if (!copiedResumeId) {
    return {
      error: "No copied resume document ID available",
      status: "Please copy the resume first",
    };
  }

  try {
    // Use user's preferred LLM
    const llm = await getUserLLM(config);

    const instructions =
      updateInstructions ||
      (jobDescription
        ? `Update this resume to better match the following job description:\n\n${jobDescription}\n\nMake the resume more relevant to the job requirements while keeping all truthful information.`
        : "Please review and improve the resume.");

    const prompt = `You are a professional resume writer. Your task is to update a resume based on the provided instructions.

Current Resume:
${resumeContent}

Instructions:
${instructions}

Please provide the updated resume content with the following requirements:
1. Preserve the original structure and formatting (sections, headings, bullet points, line breaks)
2. Keep the same general layout and organization
3. Maintain professional formatting with clear sections separated by blank lines
4. Use consistent formatting for headings (e.g., all caps or bold-like formatting)
5. Preserve bullet points and list structures
6. Update the content to match the instructions while keeping all information truthful and accurate
7. Ensure proper spacing between sections (use double line breaks between major sections)

Format the output exactly as a well-formatted resume should appear, with clear sections, proper spacing, and professional structure.`;

    const response = await llm.invoke(prompt);
    const updatedContent = response.content as string;

    // Update the Google Doc using MCP with the actual updated content
    // Pass config to get user's Google refresh token
    let mcpClient;
    try {
      mcpClient = await createMCPClient(config);

      // Pass the updated content to actually update the document
      await callMCPTool(mcpClient, "update_google_doc", {
        documentId: copiedResumeId,
        instructions: instructions,
        currentContent: updatedContent, // Pass the LLM-generated updated content
      });
    } catch (mcpError: any) {
      // Log but don't fail - the updated content is still available
      console.warn("MCP update call failed:", mcpError.message);
    } finally {
      if (mcpClient) {
        await mcpClient.close();
      }
    }

    return {
      updatedResumeContent: updatedContent,
      status: "Resume updated successfully",
    };
  } catch (error: any) {
    return {
      error: error.message || "Failed to update resume",
      status: "Error updating resume",
    };
  }
};
