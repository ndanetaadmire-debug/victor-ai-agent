import { END, START, StateGraph } from "@langchain/langgraph";
import { enforceOutputPolicy } from "../guardrails/outputGuard.js";
import { inspectInput } from "../guardrails/inputGuard.js";
import type { Planner } from "../ports/planner.js";
import { runTool, toolSpecs } from "../tools/registry.js";
import type { ToolContext } from "../tools/types.js";
import { AgentState, type AgentStateType } from "./state.js";

export interface AgentDeps {
  planner: Planner;
  tools: Omit<ToolContext, "userText">;
  maxToolSteps: number;
}

const HANDOFF_MESSAGE =
  "I couldn't complete that reliably, so I've stopped rather than guess. You can reach Admire directly at the email on his portfolio.";

/**
 * guard ─▶ plan ─┬─▶ act ─▶ plan (bounded loop)
 *                ├─▶ finalize ─▶ END
 *                └─▶ handoff  ─▶ END
 */
export function buildAgentGraph(deps: AgentDeps) {
  const specs = toolSpecs();

  const guard = async (s: AgentStateType) => {
    const last = s.history.at(-1);
    const verdict = inspectInput(last?.role === "user" ? last.content : "");
    if (verdict.allowed) return { trace: [{ kind: "guard" as const, allowed: true }] };
    return {
      trace: [{ kind: "guard" as const, allowed: false, reason: verdict.reason }],
      final: verdict.message,
      outcome: "blocked" as const,
    };
  };

  const plan = async (s: AgentStateType) => {
    try {
      const decision = await deps.planner.decide({ history: s.history, toolSpecs: specs });
      return {
        pending: decision,
        trace: [
          decision.type === "tool"
            ? { kind: "plan" as const, decision: "tool" as const, tool: decision.tool, rationale: decision.rationale }
            : { kind: "plan" as const, decision: "answer" as const },
        ],
      };
    } catch (err) {
      return { pending: null, trace: [{ kind: "fallback" as const, reason: `planner_error: ${(err as Error).message}` }] };
    }
  };

  const act = async (s: AgentStateType) => {
    const d = s.pending;
    if (!d || d.type !== "tool") return {};
    const started = performance.now();
    const userText = s.history.filter((t) => t.role === "user").map((t) => t.content).join("\n");
    const outcome = await runTool(d.tool, d.args, { ...deps.tools, userText });
    const durationMs = Math.round(performance.now() - started);
    const record = outcome.ok
      ? { tool: d.tool, args: d.args, ok: true, data: outcome.data, durationMs }
      : { tool: d.tool, args: d.args, ok: false, error: outcome.error, durationMs };
    return {
      steps: 1,
      pending: null,
      ledger: [record],
      trace: [{ kind: "tool" as const, tool: d.tool, ok: outcome.ok, durationMs }],
      history: [{ role: "tool" as const, toolName: d.tool, content: JSON.stringify(outcome.ok ? outcome.data : { error: outcome.error }) }],
    };
  };

  const finalize = async (s: AgentStateType) => {
    const draft = s.pending?.type === "answer" ? s.pending.content : "";
    const verdict = enforceOutputPolicy(draft, s.ledger);
    return {
      final: verdict.content,
      outcome: "answered" as const,
      history: [{ role: "assistant" as const, content: verdict.content }],
      trace: verdict.corrected ? [{ kind: "output_guard" as const, violations: verdict.violations }] : [],
    };
  };

  const handoff = async (s: AgentStateType) => ({
    final: HANDOFF_MESSAGE,
    outcome: "handoff" as const,
    history: [{ role: "assistant" as const, content: HANDOFF_MESSAGE }],
    trace: s.pending ? [{ kind: "fallback" as const, reason: "max_tool_steps" }] : [],
  });

  return new StateGraph(AgentState)
    .addNode("guard", guard)
    .addNode("plan", plan)
    .addNode("act", act)
    .addNode("finalize", finalize)
    .addNode("handoff", handoff)
    .addEdge(START, "guard")
    .addConditionalEdges("guard", (s) => (s.outcome === "blocked" ? END : "plan"), ["plan", END])
    .addConditionalEdges(
      "plan",
      (s) => {
        if (!s.pending) return "handoff"; // planner failed
        if (s.pending.type === "answer") return "finalize";
        return s.steps < deps.maxToolSteps ? "act" : "handoff";
      },
      ["act", "finalize", "handoff"],
    )
    .addEdge("act", "plan")
    .addEdge("finalize", END)
    .addEdge("handoff", END)
    .compile();
}

export type AgentGraph = ReturnType<typeof buildAgentGraph>;
