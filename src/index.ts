import { OpenAiCompatiblePlanner } from "./adapters/openAiCompatiblePlanner.js";
import { buildAgentGraph } from "./agent/graph.js";
import { loadConfig } from "./config.js";
import { buildServer } from "./http/server.js";
import { InMemoryCalendar, InMemoryMailer } from "./ports/services.js";

const config = loadConfig();

// Demo availability: weekdays 10:00 and 14:00 SAST for the next two weeks.
const slots: string[] = [];
const start = new Date();
for (let d = 1; d <= 14; d++) {
  const day = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + d));
  if (day.getUTCDay() === 0 || day.getUTCDay() === 6) continue;
  for (const h of [8, 12]) slots.push(new Date(day.getTime() + h * 3_600_000).toISOString());
}

const agent = buildAgentGraph({
  planner: new OpenAiCompatiblePlanner({ baseUrl: config.LLM_BASE_URL, apiKey: config.LLM_API_KEY, model: config.LLM_MODEL }),
  tools: { calendar: new InMemoryCalendar(slots), mailer: new InMemoryMailer(), now: () => new Date() },
  maxToolSteps: config.MAX_TOOL_STEPS,
});

const app = buildServer({ agent, logLevel: config.LOG_LEVEL });
for (const sig of ["SIGTERM", "SIGINT"] as const) process.on(sig, () => void app.close().then(() => process.exit(0)));
await app.listen({ port: config.PORT, host: "0.0.0.0" });
