# PostgreSQL and Redis: What Are They For?

## Quick Answer

**PostgreSQL** = Persistent storage for graph state, checkpoints, and threads  
**Redis** = Fast in-memory cache for performance optimization

---

## PostgreSQL

### Purpose

PostgreSQL is a **relational database** that stores persistent data for LangGraph workflows.

### What It Stores

1. **Graph State / Checkpoints**

   - The state of each graph execution at various points
   - Allows graphs to pause and resume from saved state
   - Example: Resume agent saves `originalResumeId`, `resumeContent`, `copiedResumeId`

2. **Threads**

   - Conversation/workflow threads
   - Each thread represents a unique workflow instance
   - Threads persist across multiple runs

3. **Run History**

   - Metadata about each graph execution
   - Run IDs, status, timestamps
   - Input/output data

4. **Checkpoints**
   - Snapshots of graph state at specific points
   - Enables "read once, create many" pattern
   - Allows resuming from any checkpoint

### Example: Resume Agent

When you run:

```bash
npm run cli:resume -- read YOUR_DOC_ID
```

PostgreSQL stores:

- **Thread**: A unique conversation/workflow ID
- **Checkpoint**: State including `originalResumeId`, `resumeContent`
- **Run**: Metadata about this execution

Later, when you run:

```bash
npm run cli:resume -- update --job-description "JD..."
```

PostgreSQL:

- Retrieves the saved thread and checkpoint
- Graph resumes from saved state (doesn't re-read resume)
- Creates new checkpoint with updated state

### Why PostgreSQL?

- **Persistent**: Data survives container restarts
- **Reliable**: ACID transactions ensure data integrity
- **Structured**: Can query and analyze workflow data
- **Scalable**: Handles concurrent workflows

---

## Redis

### Purpose

Redis is an **in-memory data store** used for fast caching and temporary data.

### What It Stores

1. **Session Data**

   - Temporary session information
   - Quick access to active workflows

2. **Cache**

   - Frequently accessed data
   - Reduces database queries
   - Speeds up repeated operations

3. **Temporary State**
   - Short-lived data that doesn't need persistence
   - Fast lookups for performance

### Why Redis?

- **Fast**: In-memory access (microseconds vs milliseconds)
- **Efficient**: Reduces load on PostgreSQL
- **Temporary**: Perfect for cache/session data
- **Scalable**: Handles high-frequency operations

---

## How They Work Together

```
┌─────────────────────────────────────────┐
│      LangGraph API Server               │
│                                         │
│  ┌──────────────┐    ┌──────────────┐ │
│  │   Redis      │    │  PostgreSQL  │ │
│  │  (Cache)     │◄───┤  (Storage)   │ │
│  │  Fast reads  │    │  Persistent  │ │
│  └──────────────┘    └──────────────┘ │
│       ▲                    ▲           │
│       │                    │           │
│       └────────┬───────────┘           │
│                │                       │
│         Graph Execution                │
└─────────────────────────────────────────┘
```

**Flow:**

1. Graph needs data → Check Redis first (fast)
2. If not in Redis → Query PostgreSQL (slower but persistent)
3. Store frequently used data in Redis for next time
4. Important state always saved to PostgreSQL

---

## Real-World Example: Resume Agent

### Scenario: "Read once, create many resumes"

**Step 1: Read Resume**

```
User: read my resume from DOC_ID
→ Graph reads from Google Docs
→ PostgreSQL saves:
   - Thread ID: "thread_123"
   - Checkpoint: { originalResumeId: "DOC_ID", resumeContent: "..." }
→ Redis caches: thread metadata for quick access
```

**Step 2: Create Resume for JD #1**

```
User: create resume for JD #1
→ Redis: Quick lookup of thread_123
→ PostgreSQL: Load checkpoint (has resumeContent)
→ Graph: Uses cached resumeContent (no re-read!)
→ PostgreSQL: Save new checkpoint with copiedResumeId
```

**Step 3: Create Resume for JD #2**

```
User: create resume for JD #2
→ Redis: Quick lookup of thread_123
→ PostgreSQL: Load checkpoint (still has resumeContent)
→ Graph: Uses cached resumeContent again
→ PostgreSQL: Save new checkpoint with new copiedResumeId
```

**Without PostgreSQL:**

- ❌ Would need to re-read resume every time
- ❌ No way to resume from saved state
- ❌ Can't track thread history

**Without Redis:**

- ⚠️ Every lookup hits PostgreSQL (slower)
- ⚠️ More database load
- ⚠️ Slower response times

---

## Data Storage Examples

### PostgreSQL Stores:

**Threads Table:**

```
thread_id: "thread_123"
created_at: "2026-01-30 10:00:00"
metadata: {...}
```

**Checkpoints Table:**

```
checkpoint_id: "ckpt_456"
thread_id: "thread_123"
state: {
  originalResumeId: "DOC_ID",
  resumeContent: "Maryam Owrang...",
  copiedResumeId: "NEW_DOC_ID"
}
timestamp: "2026-01-30 10:05:00"
```

**Runs Table:**

```
run_id: "run_789"
thread_id: "thread_123"
status: "completed"
input: {...}
output: {...}
```

### Redis Stores:

**Session Cache:**

```
key: "session:thread_123"
value: { last_access: "2026-01-30 10:05:00", ... }
TTL: 1 hour
```

**Frequently Accessed Data:**

```
key: "thread:thread_123:metadata"
value: { graph_id: "resume_agent", ... }
TTL: 30 minutes
```

---

## When Data Goes Where

| Data Type       | Storage    | Why                                   |
| --------------- | ---------- | ------------------------------------- |
| Graph state     | PostgreSQL | Must persist across restarts          |
| Checkpoints     | PostgreSQL | Need to resume from saved state       |
| Thread metadata | PostgreSQL | Long-term workflow tracking           |
| Run history     | PostgreSQL | Audit trail and debugging             |
| Session data    | Redis      | Temporary, fast access needed         |
| Cache           | Redis      | Performance optimization              |
| Temporary state | Redis      | Short-lived, doesn't need persistence |

---

## In Your Project

### PostgreSQL Usage:

- ✅ Resume agent: Stores `originalResumeId`, `resumeContent`, `copiedResumeId`
- ✅ All graphs: Store execution state and checkpoints
- ✅ Thread management: Track conversations/workflows
- ✅ "Read once, create many": Enabled by checkpoint persistence

### Redis Usage:

- ✅ Session caching: Fast thread lookups
- ✅ Performance: Reduces PostgreSQL queries
- ✅ Temporary data: Short-lived cache entries

---

## Ports

- **PostgreSQL**: Port **5432** (standard PostgreSQL port)
- **Redis**: Port **6379** (standard Redis port)

Both are exposed on the host machine, but typically only accessed by the LangGraph API Server container.

---

## Summary

**PostgreSQL** = The filing cabinet (permanent storage)

- Stores everything important
- Survives restarts
- Can query and analyze

**Redis** = The desk drawer (quick access)

- Fast temporary storage
- Improves performance
- Cleared on restart (usually)

Together, they enable:

- ✅ Persistent workflows (PostgreSQL)
- ✅ Fast performance (Redis)
- ✅ Resumable graphs (checkpoints)
- ✅ Scalable architecture
