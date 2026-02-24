# LangChain vs LangGraph vs LangSmith: What's the Difference?

## Quick Answer

**LangChain** = Building blocks and tools for LLM applications  
**LangGraph** = Framework for building stateful, multi-step workflows (agents) on top of LangChain  
**LangSmith** = SaaS platform for observability, debugging, and evaluation (monitors LangChain/LangGraph apps)

Think of it this way:

- **LangChain** = The toolbox (chains, prompts, LLMs, tools)
- **LangGraph** = The blueprint/orchestrator (workflows, state management, multi-step processes)
- **LangSmith** = The monitoring dashboard (debugging, tracing, evaluation)

---

## Detailed Comparison

### LangChain

**What it is:**

- A framework/library for building LLM applications
- Provides abstractions for working with LLMs, prompts, chains, tools, and memory
- Focuses on **single-step or simple multi-step** operations

**Key Concepts:**

- **Chains**: Sequences of operations (e.g., prompt → LLM → parse)
- **LLMs**: Wrappers around language models (Anthropic, OpenAI, etc.)
- **Tools**: Functions that LLMs can call (e.g., Google Search, Calculator)
- **Memory**: Store conversation history
- **Prompts**: Templates for LLM inputs

**Example LangChain Usage:**

```typescript
import { ChatAnthropic } from "@langchain/anthropic";

const llm = new ChatAnthropic({ model: "claude-sonnet-4-5" });
const response = await llm.invoke("Say hello!");
// Simple: one call, one response
```

**When to use LangChain:**

- Simple LLM calls
- Basic chains (prompt → LLM → output)
- Tool calling (LLM + tools)
- Simple RAG (retrieval-augmented generation)

---

### LangGraph

**What it is:**

- A library built **on top of LangChain** for building **stateful, multi-actor agent workflows**
- Uses **graphs** to define complex workflows with conditional logic
- Manages **state** across multiple steps
- Supports **checkpointing** (save/restore state)
- Enables **human-in-the-loop** (interrupts, approvals)

**Key Concepts:**

- **StateGraph**: Defines nodes (steps) and edges (transitions)
- **State**: Shared data structure that flows through the graph
- **Nodes**: Individual steps/functions in the workflow
- **Edges**: Connections between nodes (can be conditional)
- **Checkpoints**: Save state at any point (enables resumability)
- **Threads**: Conversations/workflows that persist state

**Example LangGraph Usage:**

```typescript
import { StateGraph } from "@langchain/langgraph";

const graph = new StateGraph(StateAnnotation)
  .addNode("readResume", readResumeNode)
  .addNode("copyResume", copyResumeNode)
  .addNode("updateResume", updateResumeNode)
  .addConditionalEdges(START, routeFromStart)
  .addEdge("readResume", "copyResume")
  .addEdge("copyResume", "updateResume")
  .addEdge("updateResume", END);

const compiled = graph.compile();
// Complex: multiple steps, state management, conditional routing
```

**When to use LangGraph:**

- Multi-step workflows with conditional logic
- Stateful agents that need to remember context
- Complex routing (if/then logic)
- Human-in-the-loop workflows
- Long-running processes that need checkpointing
- Agents that call other agents (subgraphs)

---

## In This Project

### LangChain is Used For:

1. **LLM Calls**:

   ```typescript
   import { ChatAnthropic } from "@langchain/anthropic";
   const llm = new ChatAnthropic({ model: "claude-sonnet-4-5" });
   ```

2. **Tool Integration**:

   - Google Docs API (via MCP)
   - Firecrawl (web scraping)
   - Various APIs through LangChain community loaders

3. **Basic Operations**:
   - Parsing user commands in CLI
   - Simple LLM completions
   - Text processing

### LangGraph is Used For:

1. **Workflow Orchestration**:

   ```typescript
   // resume-agent-graph.ts
   const resumeAgentBuilder = new StateGraph(
     ResumeAgentAnnotation,
     ResumeAgentConfigurableAnnotation,
   )
     .addNode("readResume", readResumeNode)
     .addNode("copyResume", copyResumeNode)
     .addNode("updateResume", updateResumeNode);
   ```

2. **State Management**:

   - Resume content flows through: read → copy → update
   - State persists across steps: `originalResumeId`, `resumeContent`, `copiedResumeId`

3. **Conditional Routing**:

   ```typescript
   function routeFromStart(state) {
     if (state.resumeContent && state.jobDescription) {
       return "copyResume"; // Create new resume for JD
     }
     if (state.originalResumeId && !state.resumeContent) {
       return "readResume"; // First time read
     }
     return END;
   }
   ```

4. **Multi-Agent Systems**:
   - `supervisor` graph calls `generate_post` graph
   - `ingest_data` graph calls `generate_post` graph
   - Graphs can call other graphs (subgraphs)

---

## Visual Comparison

### LangChain Flow (Simple):

```
User Input → LLM → Response
```

### LangGraph Flow (Complex):

```
START → Node 1 → [Conditional] → Node 2 or Node 3
         ↓                           ↓
      State updates              State updates
         ↓                           ↓
      Checkpoint                Checkpoint
         ↓                           ↓
      END (or loop back)
```

---

## LangSmith

**What it is:**

- A **SaaS platform** (Software as a Service) by LangChain
- Provides **observability, debugging, and evaluation** for LLM applications
- Monitors and traces LangChain and LangGraph applications
- **Not a library** - it's a cloud service you connect to

**Key Features:**

- **Tracing**: See every LLM call, tool invocation, and step in your workflows
- **Debugging**: Identify where errors occur, see inputs/outputs at each step
- **Evaluation**: Test your prompts and workflows with datasets
- **Monitoring**: Track performance, costs, and usage
- **Datasets**: Store and manage test data

**Example LangSmith Usage:**

```typescript
// LangSmith automatically traces when you set:
process.env.LANGSMITH_API_KEY = "your-key";
process.env.LANGSMITH_TRACING_V2 = "true";

// All LangChain/LangGraph calls are automatically logged to LangSmith
const llm = new ChatAnthropic({ model: "claude-sonnet-4-5" });
await llm.invoke("Hello"); // ← Automatically traced in LangSmith dashboard
```

**When to use LangSmith:**

- ✅ Debugging LLM applications
- ✅ Monitoring production apps
- ✅ Evaluating prompt performance
- ✅ Tracking costs and usage
- ✅ Required for Docker LangGraph API (license check)

**In this project:**

- **Required** for Docker mode (`npm run langgraph:up`) - license verification
- **Optional** for in-memory mode (`npm run dev`) - can run without it
- Provides tracing/observability when enabled

---

## Relationship

**How they work together:**

```
┌─────────────────────────────────┐
│      LangSmith                  │
│  (Observability, Debugging)      │
│  ← Monitors & Traces             │
└──────────────┬──────────────────┘
               │ monitors
┌──────────────▼──────────────────┐
│      LangGraph                  │
│  (Workflows, State, Graphs)     │
└──────────────┬──────────────────┘
               │ uses
┌──────────────▼──────────────────┐
│      LangChain                  │
│  (LLMs, Prompts, Tools, Chains) │
└─────────────────────────────────┘
```

**In this project:**

- **LangChain** provides LLM calls and tools
- **LangGraph** orchestrates workflows
- **LangSmith** monitors and traces everything (when enabled)

---

## Key Differences Summary

| Aspect            | LangChain                        | LangGraph                            | LangSmith                          |
| ----------------- | -------------------------------- | ------------------------------------ | ---------------------------------- |
| **Type**          | Open-source library              | Open-source library                  | SaaS platform                      |
| **Purpose**       | LLM building blocks              | Stateful workflows                   | Observability & debugging          |
| **Complexity**    | Simple to moderate               | Moderate to complex                  | N/A (service)                      |
| **State**         | Stateless (or simple memory)     | Stateful (shared state object)       | N/A                                |
| **Flow**          | Linear chains                    | Graphs with conditional edges        | Traces all flows                   |
| **Checkpointing** | No                               | Yes (built-in)                       | N/A                                |
| **Multi-step**    | Basic chains                     | Complex workflows                    | Monitors all steps                 |
| **Human-in-loop** | Manual                           | Built-in interrupts                  | Can monitor                        |
| **Sub-agents**    | Manual coordination              | Native subgraph support              | Traces subgraphs                   |
| **Installation**  | `npm install @langchain/core`    | `npm install @langchain/langgraph`   | Sign up at smith.langchain.com     |
| **Best for**      | Single operations, simple chains | Multi-step agents, complex workflows | Debugging, monitoring, evaluation  |
| **Required?**     | Yes (core dependency)            | Yes (for workflows)                  | Optional (required for Docker API) |

---

## Real-World Analogy

**LangChain** = Individual tools in a workshop:

- Hammer (LLM)
- Screwdriver (Tool)
- Nails (Prompts)

**LangGraph** = A complete assembly line:

- Multiple stations (nodes)
- Conveyor belt (state)
- Quality checks (conditional edges)
- Can pause/resume (checkpoints)
- Multiple workers (subgraphs)

**LangSmith** = The monitoring system:

- Security cameras (tracing)
- Quality control dashboard (evaluation)
- Performance metrics (monitoring)
- Error logs (debugging)
- Watches everything happening in the workshop and assembly line

---

## In Your Resume Agent

**LangChain provides:**

- `ChatAnthropic` for LLM calls
- Integration with Google APIs

**LangGraph provides:**

- The workflow: read → copy → update → getComments
- State management: `resumeContent`, `copiedResumeId`, etc.
- Conditional routing: different paths based on state
- Checkpointing: resume from saved state
- Thread management: reuse same thread for multiple operations

---

## When to Use Which?

**Use LangChain when:**

- ✅ Simple LLM calls
- ✅ Basic tool usage
- ✅ Simple prompt chains
- ✅ One-off operations

**Use LangGraph when:**

- ✅ Multi-step workflows
- ✅ Need state management
- ✅ Conditional logic/routing
- ✅ Long-running processes
- ✅ Human approval needed
- ✅ Agents calling other agents
- ✅ Need checkpointing/resumability

**Use LangSmith when:**

- ✅ Debugging LLM applications
- ✅ Monitoring production apps
- ✅ Evaluating prompt performance
- ✅ Tracking costs and usage
- ✅ Required for Docker LangGraph API
- ✅ Need observability into your workflows

---

## All Three Work Together

In this project, you'll see:

```typescript
// LangChain for LLM
import { ChatAnthropic } from "@langchain/anthropic";

// LangGraph for workflow
import { StateGraph } from "@langchain/langgraph";

// LangSmith (configured via env vars)
process.env.LANGSMITH_API_KEY = "your-key";
process.env.LANGSMITH_TRACING_V2 = "true";

// Inside a LangGraph node, use LangChain
const llm = new ChatAnthropic({ model: "claude-sonnet-4-5" });
const response = await llm.invoke(prompt);
// ↑ This call is automatically traced in LangSmith!
```

**How they work together:**

1. **LangChain** makes the LLM call
2. **LangGraph** orchestrates the workflow
3. **LangSmith** traces and monitors everything (when enabled)

They complement each other perfectly! 🎯

---

## In Your Project Specifically

### LangChain

- Used in: `src/agents/resume-agent/nodes/update-resume.ts`
- Provides: `ChatAnthropic` for LLM calls
- Purpose: Generate updated resume content

### LangGraph

- Used in: `src/agents/resume-agent/resume-agent-graph.ts`
- Provides: Workflow orchestration (read → copy → update)
- Purpose: Manage state and route between nodes

### LangSmith

- Used in: Docker LangGraph API Server
- Provides: Observability and license verification
- Purpose:
  - **Required** for Docker mode (license check)
  - **Optional** for tracing/debugging
  - Get API key from: https://smith.langchain.com/

---

## Quick Reference

| What          | Type    | Required?     | Purpose                |
| ------------- | ------- | ------------- | ---------------------- |
| **LangChain** | Library | ✅ Yes        | LLM calls, tools       |
| **LangGraph** | Library | ✅ Yes        | Workflows, state       |
| **LangSmith** | SaaS    | ⚠️ For Docker | Observability, license |

**For Docker mode (`npm run langgraph:up`):**

- ✅ LangChain (dependency)
- ✅ LangGraph (dependency)
- ✅ LangSmith API key (required for license)

**For dev mode (`npm run dev`):**

- ✅ LangChain (dependency)
- ✅ LangGraph (dependency)
- ❌ LangSmith (optional, not required)
