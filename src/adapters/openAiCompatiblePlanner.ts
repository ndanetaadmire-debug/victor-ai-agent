import type { ChatTurn, Planner, PlannerDecision, ToolSpec } from "../ports/planner.js";
import { isToolName } from "../tools/registry.js";

export const SYSTEM_PROMPT = `You are Victor, the AI representative of Admire T. Ndaneta, a senior full-stack and AI engineer.
You talk to recruiters, hiring managers and potential clients on his behalf.

Rules:
- Every fact about Admire must come from a tool (get_profile, get_experience, search_projects). Never invent employers, dates, metrics or skills.
- For a pasted job description, call analyze_job_fit and present matches WITH their evidence and gaps honestly.
- For client builds, use estimate_scope and present a range with its assumptions. It is not a quote.
- To send a CV or book a call you need details the person has typed themselves. Ask for them; never guess an email.
- Only say a call is booked or a CV is sent after the tool succeeded.
- Call at most one tool per step. Be warm, concise and specific; link projects when relevant.`;

interface Options {
  baseUrl: string;
  apiKey: string;
  model: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Planner backed by any OpenAI-compatible chat completions endpoint
 * (Groq, Azure OpenAI, OpenAI, vLLM). Uses native tool calling and degrades
 * gracefully when open-weight models emit malformed tool-call JSON.
 */
export class OpenAiCompatiblePlanner implements Planner {
  private readonly fetchImpl: typeof fetch;
  constructor(private readonly opts: Options) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async decide({ history, toolSpecs }: { history: ChatTurn[]; toolSpecs: ToolSpec[] }): Promise<PlannerDecision> {
    const res = await this.fetchImpl(`${this.opts.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.opts.apiKey}` },
      signal: AbortSignal.timeout(this.opts.timeoutMs ?? 20_000),
      body: JSON.stringify({
        model: this.opts.model,
        temperature: 0.2,
        parallel_tool_calls: false,
        tool_choice: "auto",
        tools: toolSpecs.map((t) => ({ type: "function", function: t })),
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...toMessages(history)],
      }),
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const body = (await res.json()) as {
      choices: Array<{ message: { content: string | null; tool_calls?: Array<{ function: { name: string; arguments: string } }> } }>;
    };
    return parseDecision(body.choices[0]?.message);
  }
}

export function parseDecision(message: { content: string | null; tool_calls?: Array<{ function: { name: string; arguments: string } }> } | undefined): PlannerDecision {
  const call = message?.tool_calls?.[0];
  if (call && isToolName(call.function.name)) {
    return { type: "tool", tool: call.function.name, args: safeJson(call.function.arguments), rationale: message?.content ?? "" };
  }
  // Some open models write the call into content instead of tool_calls.
  const inline = message?.content?.match(/<function=(\w+)>\s*(\{[\s\S]*?\})\s*<\/function>/);
  if (inline?.[1] && isToolName(inline[1])) {
    return { type: "tool", tool: inline[1], args: safeJson(inline[2] ?? "{}"), rationale: "recovered inline tool call" };
  }
  return { type: "answer", content: (message?.content ?? "").trim() || "Sorry, could you rephrase that?" };
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return { __malformed: s }; // fails schema validation → reported back to the planner
  }
}

function toMessages(history: ChatTurn[]) {
  // Tool results are replayed as compact user-visible context; this keeps the
  // transcript provider-agnostic (no provider-specific tool_call_id bookkeeping).
  return history.map((t) =>
    t.role === "tool" ? { role: "user", content: `[tool:${t.toolName} result] ${t.content}` } : { role: t.role, content: t.content },
  );
}
