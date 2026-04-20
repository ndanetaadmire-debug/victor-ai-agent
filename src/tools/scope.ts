import { z } from "zod";
import { defineTool } from "./types.js";

/** Effort in engineer-days (low, high) per feature, from past delivery. Deliberately ranges, not points. */
export const FEATURE_EFFORT = {
  auth: [3, 5], payments: [5, 10], admin_dashboard: [5, 10], ai_agent: [10, 20], realtime: [5, 10],
  integrations: [3, 8], ecommerce_store: [10, 20], mobile_responsive: [2, 4], analytics: [3, 6], cms: [3, 6],
} as const satisfies Record<string, readonly [number, number]>;

export type Feature = keyof typeof FEATURE_EFFORT;

export function estimate(features: Feature[], opts: { newProduct: boolean }) {
  const unique = [...new Set(features)];
  let low = 0;
  let high = 0;
  for (const f of unique) {
    low += FEATURE_EFFORT[f][0];
    high += FEATURE_EFFORT[f][1];
  }
  // Foundations (repo, CI/CD, environments, design system) for greenfield builds; 20% integration/QA buffer.
  if (opts.newProduct) {
    low += 3;
    high += 5;
  }
  low = Math.ceil(low * 1.2);
  high = Math.ceil(high * 1.2);
  return {
    features: unique,
    engineerDays: { low, high },
    calendarWeeks: { low: Math.ceil(low / 5), high: Math.ceil(high / 5) },
    assumptions: [
      "One senior engineer; designs supplied or kept simple",
      "Includes tests, CI/CD and deployment",
      "Third-party approvals (payment providers, app stores) can add calendar time",
    ],
  };
}

export const estimateScope = defineTool({
  name: "estimate_scope",
  description: "Rough effort range for a client build from a list of features. Always present as a range with assumptions, never a quote.",
  schema: z.object({
    features: z.array(z.enum(Object.keys(FEATURE_EFFORT) as [Feature, ...Feature[]])).min(1).max(10),
    newProduct: z.boolean().default(true),
  }),
  async execute({ features, newProduct }) {
    return { ok: true, data: estimate(features, { newProduct }) };
  },
});
