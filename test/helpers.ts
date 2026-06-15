import { buildAgentGraph } from "../src/agent/graph.js";
import type { ChatTurn, Planner, PlannerDecision } from "../src/ports/planner.js";
import { InMemoryCalendar, InMemoryMailer } from "../src/ports/services.js";

export class ScriptedPlanner implements Planner {
  readonly seen: ChatTurn[][] = [];
  constructor(private readonly script: Array<PlannerDecision | Error>) {}
  async decide({ history }: { history: ChatTurn[] }) {
    this.seen.push(structuredClone(history));
    const next = this.script.shift();
    if (!next) throw new Error("script exhausted");
    if (next instanceof Error) throw next;
    return next;
  }
}

export const NOW = new Date("2026-11-13T08:00:00Z");
export const SLOTS = ["2026-11-16T08:00:00.000Z", "2026-11-16T12:00:00.000Z", "2026-11-17T08:00:00.000Z"];

export function makeAgent(script: Array<PlannerDecision | Error>, maxToolSteps = 5) {
  const calendar = new InMemoryCalendar([...SLOTS]);
  const mailer = new InMemoryMailer();
  const planner = new ScriptedPlanner(script);
  const agent = buildAgentGraph({ planner, tools: { calendar, mailer, now: () => NOW }, maxToolSteps });
  return { agent, planner, calendar, mailer };
}

export const user = (content: string): ChatTurn => ({ role: "user", content });
export const tool = (t: string, args: unknown = {}): PlannerDecision => ({ type: "tool", tool: t as never, args, rationale: "" });
export const answer = (content: string): PlannerDecision => ({ type: "answer", content });
