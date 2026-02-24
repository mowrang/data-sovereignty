import { END, START, StateGraph } from "@langchain/langgraph";
import { ResumeAgentAnnotation, ResumeAgentState } from "./state.js";
import { ResumeAgentConfigurableAnnotation } from "./types.js";
import { readResumeNode } from "./nodes/read-resume.js";
import { copyResumeNode } from "./nodes/copy-resume.js";
import { updateResumeNode } from "./nodes/update-resume.js";
import { getCommentsNode } from "./nodes/get-comments.js";

/**
 * Conditional edge to determine next step after reading
 */
function afterReadResume(state: ResumeAgentState): "copyResume" | typeof END {
  if (state.error) {
    return END;
  }
  if (state.resumeContent) {
    return "copyResume";
  }
  return END;
}

/**
 * Conditional edge after copying
 */
function afterCopyResume(
  state: ResumeAgentState,
): "updateResume" | "getComments" | typeof END {
  if (state.error) {
    return END;
  }
  if (state.copiedResumeId) {
    // Check if we have job description or should check for comments
    if (state.jobDescription || state.updateInstructions) {
      return "updateResume";
    }
    return "getComments";
  }
  return END;
}

/**
 * Conditional edge after updating
 */
function afterUpdateResume(
  state: ResumeAgentState,
): "getComments" | typeof END {
  if (state.error) {
    return END;
  }
  return "getComments";
}

/**
 * Route at START: reuse known resume for new JD, or read from doc.
 * - Already have resumeContent + jobDescription/instructions → copy (new doc) then update.
 * - Already have resumeContent only → getComments then END.
 * - No resumeContent → read from Google (requires originalResumeId).
 */
function routeFromStart(
  state: ResumeAgentState,
): "readResume" | "copyResume" | "getComments" | typeof END {
  if (state.error) return END;
  if (
    state.resumeContent &&
    (state.jobDescription || state.updateInstructions)
  ) {
    return "copyResume"; // create new copy for this JD, then update
  }
  if (state.resumeContent) {
    return "getComments"; // resume already loaded, no JD → show comments then end
  }
  if (state.originalResumeId) {
    return "readResume"; // first time: read from Google
  }
  return END; // need originalResumeId
}

const resumeAgentBuilder = new StateGraph(
  ResumeAgentAnnotation,
  ResumeAgentConfigurableAnnotation,
)
  .addNode("readResume", readResumeNode)
  .addNode("copyResume", copyResumeNode)
  .addNode("updateResume", updateResumeNode)
  .addNode("getComments", getCommentsNode)

  .addConditionalEdges(START, routeFromStart)
  .addConditionalEdges("readResume", afterReadResume)
  .addConditionalEdges("copyResume", afterCopyResume)
  .addConditionalEdges("updateResume", afterUpdateResume)
  .addEdge("getComments", END);

export const resumeAgentGraph = resumeAgentBuilder.compile();
resumeAgentGraph.name = "JobHunting";
