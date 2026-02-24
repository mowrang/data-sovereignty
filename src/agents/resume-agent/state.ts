import { Annotation } from "@langchain/langgraph";

export const ResumeAgentAnnotation = Annotation.Root({
  /**
   * The original resume document ID (set on first read; kept in thread for reuse)
   */
  originalResumeId: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  /**
   * The copied resume document ID
   */
  copiedResumeId: Annotation<string | null>({
    reducer: (_state, update) => update,
    default: () => null,
  }),
  /**
   * The job description text
   */
  jobDescription: Annotation<string>({
    reducer: (_state, update) => update,
    default: () => "",
  }),
  /**
   * The current content of the resume
   */
  resumeContent: Annotation<string>({
    reducer: (_state, update) => update,
    default: () => "",
  }),
  /**
   * The updated resume content
   */
  updatedResumeContent: Annotation<string>({
    reducer: (_state, update) => update,
    default: () => "",
  }),
  /**
   * Comments from the Google Doc
   */
  comments: Annotation<
    Array<{
      id: string;
      content: string;
      author: string;
      createdTime: string;
    }>
  >({
    reducer: (_state, update) => update,
    default: () => [],
  }),
  /**
   * Instructions for updates (from comments or user input)
   */
  updateInstructions: Annotation<string>({
    reducer: (_state, update) => update,
    default: () => "",
  }),
  /**
   * Status messages
   */
  status: Annotation<string>({
    reducer: (_state, update) => update,
    default: () => "",
  }),
  /**
   * Error messages
   */
  error: Annotation<string | null>({
    reducer: (_state, update) => update,
    default: () => null,
  }),
});

export type ResumeAgentState = typeof ResumeAgentAnnotation.State;
