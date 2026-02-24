import { Annotation } from "@langchain/langgraph";
import { ResumeAgentAnnotation } from "./state.js";

// Input annotation - same as state annotation (all fields can be input)
export const ResumeAgentInputAnnotation = ResumeAgentAnnotation;

// Configurable annotation - for runtime configuration
export const ResumeAgentConfigurableAnnotation = Annotation.Root({});

export type ResumeAgentInput = typeof ResumeAgentInputAnnotation.State;
export type ResumeAgentConfigurable =
  typeof ResumeAgentConfigurableAnnotation.State;
