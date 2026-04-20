import type { ToolName } from "../tools/registry.js";

export interface ChatTurn {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: ToolName;
}

/** What the planner decides on each step. Either call exactly one tool, or answer. */
export type PlannerDecision =
  | { type: "tool"; tool: ToolName; args: unknown; rationale: string }
  | { type: "answer"; content: string };

/**
 * Port: the reasoning model. Keeping it behind a narrow interface lets us
 * swap providers, and lets tests drive the *real* graph with a scripted planner.
 */
export interface Planner {
  decide(input: { history: ChatTurn[]; toolSpecs: ToolSpec[] }): Promise<PlannerDecision>;
}

export interface ToolSpec {
  name: ToolName;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}
