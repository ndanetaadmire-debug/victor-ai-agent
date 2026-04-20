import { z } from "zod";
import { PROFILE, PROJECTS, ROLES } from "../knowledge/profile.js";
import { defineTool } from "./types.js";

export const getProfile = defineTool({
  name: "get_profile",
  description: "Headline facts: name, title, location, years of experience, education, key metrics, what roles he is open to.",
  schema: z.object({}),
  async execute() {
    return { ok: true, data: PROFILE };
  },
});

export const getExperience = defineTool({
  name: "get_experience",
  description: "Employment history with highlights and stack. Optionally filter by company name.",
  schema: z.object({ company: z.string().trim().min(2).max(60).optional() }),
  async execute({ company }) {
    const roles = company ? ROLES.filter((r) => r.company.toLowerCase().includes(company.toLowerCase())) : ROLES;
    if (roles.length === 0) return { ok: false, error: `No role at "${company}" on record.`, retryable: false };
    return { ok: true, data: { roles } };
  },
});

export const searchProjects = defineTool({
  name: "search_projects",
  description: "Find projects by technology, domain or keyword (e.g. 'agents', 'fintech', 'Go', 'real-time'). Returns links.",
  schema: z.object({ query: z.string().trim().min(2).max(80), limit: z.number().int().min(1).max(8).default(4) }),
  async execute({ query, limit }) {
    const terms = query.toLowerCase().split(/[\s,]+/).filter((t) => t.length > 1);
    const scored = PROJECTS.map((p) => {
      // Whole-word matching: "go" must not match "algorithms" or "Google".
      const words = new Set([p.name, p.summary, ...p.stack, ...p.tags].join(" ").toLowerCase().split(/[^a-z0-9#+.]+/));
      return { p, score: terms.reduce((s, t) => s + (words.has(t) ? 1 : 0), 0) };
    })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    if (scored.length === 0) return { ok: false, error: `No projects match "${query}".`, retryable: false };
    return { ok: true, data: { projects: scored.map((x) => x.p) } };
  },
});
