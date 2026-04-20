import { z } from "zod";
import type { ToolSpec } from "../ports/planner.js";
import { bookMeeting, listAvailability, sendCv } from "./actions.js";
import { analyzeJobFit } from "./jobFit.js";
import { getExperience, getProfile, searchProjects } from "./knowledge.js";
import { estimateScope } from "./scope.js";
import type { ToolContext, ToolDefinition, ToolOutcome } from "./types.js";

export const TOOLS = {
  get_profile: getProfile,
  get_experience: getExperience,
  search_projects: searchProjects,
  analyze_job_fit: analyzeJobFit,
  estimate_scope: estimateScope,
  list_availability: listAvailability,
  send_cv: sendCv,
  book_meeting: bookMeeting,
} as const satisfies Record<string, ToolDefinition<any, any>>;

export type ToolName = keyof typeof TOOLS;
export const TOOL_NAMES = Object.keys(TOOLS) as ToolName[];
export const isToolName = (n: string): n is ToolName => n in TOOLS;

export function toolSpecs(): ToolSpec[] {
  return TOOL_NAMES.map((name) => ({
    name,
    description: TOOLS[name].description,
    parameters: z.toJSONSchema(TOOLS[name].schema, { io: "input" }) as Record<string, unknown>,
  }));
}

export async function runTool(name: string, rawArgs: unknown, ctx: ToolContext): Promise<ToolOutcome> {
  if (!isToolName(name)) return { ok: false, error: `Unknown tool "${name}"`, retryable: true };
  const tool = TOOLS[name] as ToolDefinition;
  const parsed = tool.schema.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    return { ok: false, error: `Invalid arguments: ${parsed.error.issues.map((i) => `${i.path.join(".") || "args"}: ${i.message}`).join("; ")}`, retryable: true };
  }
  try {
    return await tool.execute(parsed.data, ctx);
  } catch (err) {
    return { ok: false, error: `Upstream error: ${(err as Error).message}`, retryable: true };
  }
}
