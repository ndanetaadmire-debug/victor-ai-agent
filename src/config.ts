import { z } from "zod";

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(8080),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    LLM_BASE_URL: z.string().url().default("https://api.groq.com/openai/v1"),
    LLM_API_KEY: z.string().default(""),
    LLM_MODEL: z.string().default("openai/gpt-oss-120b"),
    MAX_TOOL_STEPS: z.coerce.number().int().min(1).max(10).default(5),
    OWNER_TIMEZONE: z.string().default("Africa/Johannesburg"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && !env.LLM_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["LLM_API_KEY"], message: "LLM_API_KEY is required in production" });
    }
  });

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid configuration:\n${parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n")}`);
  }
  return parsed.data;
}
