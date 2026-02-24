#!/usr/bin/env node
/**
 * JobHunting CLI
 * Natural language interface for resume management
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { Client } from "@langchain/langgraph-sdk";
import * as readline from "readline";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const LANGGRAPH_API_URL =
  process.env.LANGGRAPH_API_URL || "http://localhost:54367";
const GRAPH_ID = "resume_agent";

const RESUME_CONTEXT_FILE = path.join(
  process.cwd(),
  ".resume-agent-context.json",
);

interface ResumeContext {
  threadId: string;
  originalResumeId?: string;
}

function getResumeContext(): ResumeContext | null {
  try {
    if (fs.existsSync(RESUME_CONTEXT_FILE)) {
      const data = JSON.parse(fs.readFileSync(RESUME_CONTEXT_FILE, "utf-8"));
      if (data?.threadId) return data as ResumeContext;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveResumeContext(ctx: ResumeContext): void {
  try {
    fs.writeFileSync(
      RESUME_CONTEXT_FILE,
      JSON.stringify(ctx, null, 2),
      "utf-8",
    );
  } catch (e) {
    console.warn("Could not save resume context:", (e as Error).message);
  }
}

interface ParsedCommand {
  action: "read" | "copy" | "update" | "comments" | "help" | "exit";
  resumeId?: string;
  jobDescription?: string;
  instructions?: string;
}

class ResumeCLI {
  private client: Client;
  private llm: ChatAnthropic;
  private rl: readline.Interface;
  private assistantIdCache: string | null = null;

  constructor() {
    this.client = new Client({
      apiUrl: LANGGRAPH_API_URL,
    });
    this.llm = new ChatAnthropic({
      model: "claude-sonnet-4-5",
      temperature: 0.1,
    });
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "jobhunting> ",
    });
  }

  /**
   * Parse natural language command using LLM
   */
  private async parseCommand(input: string): Promise<ParsedCommand> {
    const prompt = `You are a command parser for a resume management system. Parse the following user command and extract the action and parameters.

Available actions:
- read: Read a resume from Google Docs (requires resumeId). Do this once; then you can create resumes for many jobs without passing the doc again.
- copy: Copy a resume to a new document (requires resumeId)
- update: Update/create a resume for a job. Use when the user pastes a job description (JD). resumeId is optional if the user already ran "read my resume" earlier.
- comments: Get comments from a resume document (requires resumeId)
- help: Show help information
- exit: Exit the CLI

User command: "${input}"

Respond with a JSON object in this exact format:
{
  "action": "read" | "copy" | "update" | "comments" | "help" | "exit",
  "resumeId": "document-id-if-mentioned" | null,
  "jobDescription": "job-description-text-if-mentioned" | null,
  "instructions": "update-instructions-if-mentioned" | null
}

If the user mentions a Google Doc URL, extract the document ID from it. Google Doc URLs look like: https://docs.google.com/document/d/DOCUMENT_ID/edit

Only respond with the JSON object, no other text.`;

    try {
      const response = await this.llm.invoke(prompt);
      const jsonStr = response.content as string;
      // Extract JSON from response (in case LLM adds extra text)
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("Error parsing command:", error);
      return { action: "help" };
    }
  }

  /**
   * Extract document ID from Google Docs URL
   */
  private extractDocumentId(input: string): string | null {
    const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }

  /**
   * Resolve the resume_agent graph to the API's assistant_id (UUID).
   * The LangGraph API expects assistant_id, not the graph name.
   */
  private async getResumeAgentAssistantId(): Promise<string> {
    if (this.assistantIdCache) return this.assistantIdCache;
    const result = await this.client.assistants.search({
      graphId: GRAPH_ID,
      limit: 1,
    });
    const list = Array.isArray(result)
      ? result
      : ((result as { assistants?: { assistant_id: string }[] })?.assistants ??
        []);
    const assistant = list[0];
    if (
      !assistant ||
      typeof (assistant as { assistant_id?: string }).assistant_id !== "string"
    ) {
      throw new Error(
        `Could not find assistant for graph "${GRAPH_ID}". Is the LangGraph server running and has it loaded the graphs?`,
      );
    }
    this.assistantIdCache = (
      assistant as { assistant_id: string }
    ).assistant_id;
    return this.assistantIdCache;
  }

  /**
   * Run a command on the resume agent
   */
  private async runCommand(command: ParsedCommand): Promise<void> {
    switch (command.action) {
      case "read":
        if (!command.resumeId) {
          console.log("❌ Please provide a resume document ID or URL");
          return;
        }
        await this.readResume(command.resumeId);
        break;

      case "copy":
        if (!command.resumeId) {
          console.log("❌ Please provide a resume document ID or URL");
          return;
        }
        await this.copyResume(command.resumeId);
        break;

      case "update":
        if (!command.jobDescription && !command.instructions) {
          console.log(
            "❌ Please provide a job description or update instructions",
          );
          return;
        }
        if (!command.resumeId && !getResumeContext()) {
          console.log(
            "❌ Run 'read my resume from [your-google-doc]' first, or provide a resume ID/URL",
          );
          return;
        }
        await this.updateResume(
          command.resumeId ?? null,
          command.jobDescription,
          command.instructions,
        );
        break;

      case "comments":
        if (!command.resumeId) {
          console.log("❌ Please provide a resume document ID or URL");
          return;
        }
        await this.getComments(command.resumeId);
        break;

      case "help":
        this.showHelp();
        break;

      case "exit":
        console.log("👋 Goodbye!");
        process.exit(0);
        break;

      default:
        console.log("❌ Unknown command. Type 'help' for available commands.");
    }
  }

  private async readResume(resumeId: string): Promise<void> {
    const docId = this.extractDocumentId(resumeId) || resumeId;
    console.log(`📖 Reading resume: ${docId}...`);

    try {
      const assistantId = await this.getResumeAgentAssistantId();
      const thread = await this.client.threads.create();
      const state = (await this.client.runs.wait(
        thread.thread_id,
        assistantId,
        {
          input: { originalResumeId: docId },
        },
      )) as any;

      if (state?.error) {
        console.log(`\n❌ Error: ${state.error}`);
      } else {
        saveResumeContext({
          threadId: thread.thread_id,
          originalResumeId: docId,
        });
        console.log(
          "\n✅ Resume read successfully! (Saved for future “create for JD” commands.)",
        );
        console.log(
          `\nContent preview:\n${state?.resumeContent?.substring(0, 500) ?? ""}...`,
        );
        if (state?.status) {
          console.log(`\nStatus: ${state.status}`);
        }
      }
    } catch (error: any) {
      const msg = error.message || "";
      if (
        msg.toLowerCase().includes("fetch failed") ||
        msg.includes("ECONNREFUSED")
      ) {
        console.log(
          `\n❌ Cannot reach LangGraph server at ${LANGGRAPH_API_URL}`,
        );
        console.log(
          "   Make sure the server is running: npm run langgraph:up (Docker) or npm run dev",
        );
      } else {
        console.log(`\n❌ Error: ${msg}`);
      }
    }
  }

  private async copyResume(resumeId: string): Promise<void> {
    const docId = this.extractDocumentId(resumeId) || resumeId;
    console.log(`📋 Copying resume: ${docId}...`);

    try {
      const assistantId = await this.getResumeAgentAssistantId();
      const thread = await this.client.threads.create();
      const state = (await this.client.runs.wait(
        thread.thread_id,
        assistantId,
        {
          input: { originalResumeId: docId },
        },
      )) as any;

      if (state?.error) {
        console.log(`\n❌ Error: ${state.error}`);
      } else {
        console.log("\n✅ Resume copied successfully!");
        if (state?.copiedResumeId) {
          console.log(`\nNew document ID: ${state.copiedResumeId}`);
          console.log(
            `URL: https://docs.google.com/document/d/${state.copiedResumeId}/edit`,
          );
        }
        if (state?.status) {
          console.log(`\nStatus: ${state.status}`);
        }
      }
    } catch (error: any) {
      console.log(`\n❌ Error: ${error.message}`);
    }
  }

  private async updateResume(
    resumeId: string | null,
    jobDescription?: string | null,
    instructions?: string | null,
  ): Promise<void> {
    const docId = resumeId
      ? this.extractDocumentId(resumeId) || resumeId
      : null;
    const ctx = getResumeContext();
    const useStoredResume =
      ctx?.threadId && (!docId || docId === ctx.originalResumeId);

    if (!jobDescription && !instructions) {
      console.log(
        "❌ Please provide either a job description or update instructions",
      );
      return;
    }

    if (useStoredResume) {
      console.log(
        `✏️  Creating new resume for this job (using your saved resume)...`,
      );
    } else {
      console.log(`✏️  Updating resume: ${docId || "new"}...`);
    }

    try {
      const assistantId = await this.getResumeAgentAssistantId();
      const threadId = useStoredResume
        ? ctx!.threadId
        : (await this.client.threads.create()).thread_id;
      const input = useStoredResume
        ? {
            jobDescription: jobDescription || undefined,
            updateInstructions: instructions || undefined,
          }
        : {
            originalResumeId: docId!,
            jobDescription: jobDescription || undefined,
            updateInstructions: instructions || undefined,
          };

      const state = (await this.client.runs.wait(threadId, assistantId, {
        input,
      })) as any;

      if (state?.error) {
        console.log(`\n❌ Error: ${state.error}`);
      } else {
        console.log("\n✅ Resume updated successfully!");
        if (state?.copiedResumeId) {
          console.log(
            `\nNew document: https://docs.google.com/document/d/${state.copiedResumeId}/edit`,
          );
        }
        if (state?.updatedResumeContent) {
          console.log(
            `\nUpdated content preview:\n${state.updatedResumeContent.substring(0, 500)}...`,
          );
        }
        if (state?.status) {
          console.log(`\nStatus: ${state.status}`);
        }
      }
    } catch (error: any) {
      console.log(`\n❌ Error: ${error.message}`);
    }
  }

  private async getComments(resumeId: string): Promise<void> {
    const docId = this.extractDocumentId(resumeId) || resumeId;
    console.log(`💬 Getting comments from: ${docId}...`);

    try {
      const assistantId = await this.getResumeAgentAssistantId();
      const thread = await this.client.threads.create();
      const state = (await this.client.runs.wait(
        thread.thread_id,
        assistantId,
        {
          input: { originalResumeId: docId },
        },
      )) as any;

      if (state?.error) {
        console.log(`\n❌ Error: ${state.error}`);
      } else {
        console.log("\n✅ Comments retrieved!");
        if (state?.comments && state.comments.length > 0) {
          console.log(`\nFound ${state.comments.length} comment(s):\n`);
          state.comments.forEach((comment: any, index: number) => {
            console.log(`${index + 1}. [${comment.author}] ${comment.content}`);
            console.log(`   Time: ${comment.createdTime}\n`);
          });
        } else {
          console.log("\nNo comments found.");
        }
      }
    } catch (error: any) {
      console.log(`\n❌ Error: ${error.message}`);
    }
  }

  private showHelp(): void {
    console.log(`
📝 JobHunting CLI - Natural Language Interface

Available commands (use natural language):
  • Read a resume (once): "read my resume from [document-id or URL]"
  • Create resume for a job (reuses saved resume): "create resume for this job: [paste JD]" or "update resume for this job: [paste JD]"
  • Copy a resume: "copy my resume [document-id or URL]"
  • Get comments: "show comments from [document-id or URL]"
  • Help: "help" or "what can you do?"
  • Exit: "exit" or "quit"

Examples:
  • "read my resume from https://docs.google.com/document/d/abc123/edit"
  • "copy my resume abc123"
  • "update resume abc123 for this job: [paste job description]"
  • "show me comments from abc123"

Note: You can use either document IDs or full Google Docs URLs.
    `);
  }

  /**
   * Start the CLI interactive loop
   */
  async start(): Promise<void> {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║              JobHunting CLI - Natural Language           ║
╚═══════════════════════════════════════════════════════════╝

Type your commands in natural language. Type 'help' for more info.
    `);

    this.rl.prompt();

    this.rl.on("line", (input: string) => {
      void (async () => {
        const trimmed = input.trim();
        if (!trimmed) {
          this.rl.prompt();
          return;
        }

        const command = await this.parseCommand(trimmed);
        await this.runCommand(command);
        this.rl.prompt();
      })();
    });

    this.rl.on("close", () => {
      console.log("\n👋 Goodbye!");
      process.exit(0);
    });
  }
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new ResumeCLI();
  cli.start().catch(console.error);
}
