import { z } from "zod";
import { allEvidence, SKILL_ALIASES } from "../knowledge/profile.js";
import { defineTool } from "./types.js";

export interface FitReport {
  score: number; // 0..100
  matched: Array<{ skill: string; evidence: string[] }>;
  gaps: string[];
  verdict: "strong" | "good" | "partial" | "weak";
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Find canonical skills a job description mentions. Word-boundary aware so "go" ≠ "good". */
export function extractSkills(jd: string): string[] {
  const text = ` ${jd.toLowerCase()} `;
  return Object.entries(SKILL_ALIASES)
    .filter(([, aliases]) => aliases.some((a) => new RegExp(`(^|[^a-z0-9+#.])${escape(a)}($|[^a-z0-9+#])`).test(text)))
    .map(([canonical]) => canonical);
}

/**
 * Deterministic, evidence-backed fit analysis. Every matched skill cites where it
 * was used; every gap is stated plainly. Honesty is the feature: a recruiter who
 * catches one inflated claim stops trusting the rest.
 */
export function analyzeFit(jd: string): FitReport {
  const wanted = extractSkills(jd);
  const evidence = allEvidence();
  const matched = wanted.filter((s) => evidence.has(s)).map((s) => ({ skill: s, evidence: [...new Set(evidence.get(s))].slice(0, 3) }));
  const gaps = wanted.filter((s) => !evidence.has(s));
  const score = wanted.length === 0 ? 0 : Math.round((matched.length / wanted.length) * 100);
  const verdict = score >= 85 ? "strong" : score >= 65 ? "good" : score >= 40 ? "partial" : "weak";
  return { score, matched, gaps, verdict };
}

export const analyzeJobFit = defineTool({
  name: "analyze_job_fit",
  description: "Map a pasted job description to concrete evidence from his career. Returns matched skills with evidence, honest gaps and a score.",
  schema: z.object({ jobDescription: z.string().trim().min(40).max(12_000) }),
  async execute({ jobDescription }) {
    const report = analyzeFit(jobDescription);
    if (report.matched.length + report.gaps.length === 0) {
      return { ok: false, error: "No recognisable technical requirements in that text. Ask for the requirements section.", retryable: false };
    }
    return { ok: true, data: report };
  },
});
