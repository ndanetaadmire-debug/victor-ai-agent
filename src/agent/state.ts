import { Annotation } from "@langchain/langgraph";
import type { ChatTurn, PlannerDecision } from "../ports/planner.js";
import type { ToolName } from "../tools/registry.js";

export interface ToolResultRecord {
  tool: ToolName | string;
  args: unknown;
  ok: boolean;
  data?: unknown;
  error?: string;
  durationMs: number;
}

export type TraceEvent =
  | { kind: "guard"; allowed: boolean; reason?: string }
  | { kind: "plan"; decision: "tool" | "answer"; tool?: string; rationale?: string }
  | { kind: "tool"; tool: string; ok: boolean; durationMs: number }
  | { kind: "output_guard"; violations: string[] }
  | { kind: "fallback"; reason: string };

const append = <T>(a: T[], b: T[]) => a.concat(b);

export const AgentState = Annotation.Root({
  history: Annotation<ChatTurn[]>({ reducer: append, default: () => [] }),
  ledger: Annotation<ToolResultRecord[]>({ reducer: append, default: () => [] }),
  trace: Annotation<TraceEvent[]>({ reducer: append, default: () => [] }),
  pending: Annotation<PlannerDecision | null>({ reducer: (_a, b) => b, default: () => null }),
  steps: Annotation<number>({ reducer: (a, b) => a + b, default: () => 0 }),
  final: Annotation<string | null>({ reducer: (_a, b) => b, default: () => null }),
  outcome: Annotation<"answered" | "blocked" | "handoff" | null>({ reducer: (_a, b) => b, default: () => null }),
});

export type AgentStateType = typeof AgentState.State;
