# ADR-001: Career facts live in a typed knowledge file, not the prompt

**Status:** Accepted

**Context.** Stuffing a CV into the system prompt invites the model to paraphrase, embellish and blend facts. Recruiters notice.

**Decision.** `src/knowledge/profile.ts` is the single source of truth. The model reaches it only through tools that return structured data, and the system prompt forbids stating facts not returned by a tool.

**Consequences.** Updating the agent is a code change with review and tests. Claims are traceable to a tool call in the step trace. Prompt size stays small and cheap.
