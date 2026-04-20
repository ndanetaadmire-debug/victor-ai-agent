import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import type { AgentGraph } from "../agent/graph.js";
import { redact } from "../guardrails/redact.js";
import { TokenBucket } from "./rateLimit.js";
import { SessionStore } from "./sessionStore.js";

export interface ServerDeps {
  agent: AgentGraph;
  logLevel?: string;
}

const ChatBody = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(4000),
});

export function buildServer(deps: ServerDeps): FastifyInstance {
  const app = Fastify({
    logger: { level: deps.logLevel ?? "info", redact: ["req.headers.authorization"] },
    bodyLimit: 1_048_576,
  });
  const sessions = new SessionStore();
  const limiter = new TokenBucket(10, 0.5);

  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => {
    try {
      done(null, { raw: body, json: body.length ? JSON.parse(body.toString("utf8")) : {} });
    } catch (err) {
      (err as Error & { statusCode?: number }).statusCode = 400;
      done(err as Error, undefined);
    }
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  app.post("/v1/chat", async (req, reply) => {
    if (!limiter.take(req.ip)) return reply.code(429).send({ error: "rate_limited" });
    const parsed = ChatBody.safeParse((req.body as { json: unknown }).json);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request", issues: parsed.error.issues });

    const { sessionId, message } = parsed.data;
    const history = [...sessions.get(sessionId), { role: "user" as const, content: message }];
    const result = await deps.agent.invoke({ history }, { recursionLimit: 25 });
    sessions.set(sessionId, result.history);

    req.log.info({ sessionId, outcome: result.outcome, steps: result.steps, msg: redact(message) }, "chat_turn");
    return { reply: result.final, outcome: result.outcome, trace: result.trace };
  });

  /** Server-Sent Events: stream each graph step so the UI can show a live "thinking" trace. */
  app.post("/v1/chat/stream", async (req, reply) => {
    if (!limiter.take(req.ip)) return reply.code(429).send({ error: "rate_limited" });
    const parsed = ChatBody.safeParse((req.body as { json: unknown }).json);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_request" });

    const { sessionId, message } = parsed.data;
    const history = [...sessions.get(sessionId), { role: "user" as const, content: message }];

    reply.hijack();
    reply.raw.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" });
    const send = (event: string, data: unknown) => reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    let finalHistory = history;
    try {
      for await (const update of await deps.agent.stream({ history }, { streamMode: "updates", recursionLimit: 25 })) {
        for (const [node, delta] of Object.entries(update as Record<string, { trace?: unknown[]; final?: string; history?: typeof history }>)) {
          for (const t of delta?.trace ?? []) send("step", { node, ...(t as object) });
          if (delta?.history) finalHistory = finalHistory.concat(delta.history);
          if (delta?.final) send("final", { reply: delta.final });
        }
      }
      sessions.set(sessionId, finalHistory);
    } catch (err) {
      req.log.error({ err }, "stream_failed");
      send("error", { error: "internal_error" });
    } finally {
      send("done", {});
      reply.raw.end();
    }
  });

  return app;
}
