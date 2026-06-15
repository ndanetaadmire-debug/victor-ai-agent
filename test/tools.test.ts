import { describe, expect, it } from "vitest";
import { InMemoryCalendar, InMemoryMailer } from "../src/ports/services.js";
import { analyzeFit, extractSkills } from "../src/tools/jobFit.js";
import { runTool, toolSpecs } from "../src/tools/registry.js";
import { estimate } from "../src/tools/scope.js";
import { NOW, SLOTS } from "./helpers.js";

const ctx = (userText = "") => ({ calendar: new InMemoryCalendar([...SLOTS]), mailer: new InMemoryMailer(), now: () => NOW, userText });

describe("knowledge tools", () => {
  it("exposes 8 JSON-schema tools", () => {
    expect(toolSpecs()).toHaveLength(8);
  });
  it("answers from the knowledge base only", async () => {
    expect(await runTool("get_experience", { company: "gerko" }, ctx())).toMatchObject({ ok: true, data: { roles: [{ company: "Gerko" }] } });
    expect(await runTool("get_experience", { company: "Google" }, ctx())).toMatchObject({ ok: false });
    const r = await runTool("search_projects", { query: "go ledger" }, ctx());
    expect(r.ok && (r.data as { projects: Array<{ slug: string }> }).projects[0]?.slug).toBe("financeflow");
  });
});

describe("job fit", () => {
  it("extracts skills with word boundaries (go ≠ good, c# and .net recognised)", () => {
    expect(extractSkills("Good communication, strong React and Node; C#/.NET a plus")).toEqual(expect.arrayContaining(["React", "Node.js", "C#/.NET"]));
    expect(extractSkills("good teamwork")).not.toContain("Go");
    expect(extractSkills("Backend in Golang and Go services")).toContain("Go");
  });

  it("cites evidence for matches and states gaps honestly", () => {
    const r = analyzeFit("Senior engineer: TypeScript, React, PostgreSQL, LLM agents, Kubernetes, Rust.");
    expect(r.matched.find((m) => m.skill === "LangGraph.js")?.evidence.length).toBeGreaterThan(0);
    expect(r.gaps.sort()).toEqual(["Kubernetes", "Rust"]);
    expect(r.score).toBe(67);
    expect(r.verdict).toBe("good");
  });
});

describe("scope estimate", () => {
  it("returns ranges with foundations and buffer, deduping features", () => {
    const e = estimate(["auth", "payments", "auth"], { newProduct: true });
    expect(e.features).toEqual(["auth", "payments"]);
    expect(e.engineerDays).toEqual({ low: Math.ceil((3 + 5 + 3) * 1.2), high: Math.ceil((5 + 10 + 5) * 1.2) });
    expect(e.calendarWeeks.low).toBeLessThanOrEqual(e.calendarWeeks.high);
  });
  it("rejects unknown features", async () => {
    expect(await runTool("estimate_scope", { features: ["teleportation"] }, ctx())).toMatchObject({ ok: false, retryable: true });
  });
});

describe("action tools verify user-supplied contact details", () => {
  it("won't send a CV to an address the user never typed", async () => {
    const c = ctx("hi, can I get his CV?");
    expect(await runTool("send_cv", { email: "guessed@corp.com" }, c)).toMatchObject({ ok: false });
    expect(c.mailer.sent).toEqual([]);
    const c2 = ctx("send it to Jane.Doe@corp.com please");
    expect(await runTool("send_cv", { email: "jane.doe@corp.com" }, c2)).toMatchObject({ ok: true });
  });

  it("books only verified people into genuinely open slots", async () => {
    const c = ctx("I'm Thandi Mokoena, thandi@hire.co — Monday 10:00 works");
    const args = { name: "Thandi Mokoena", email: "thandi@hire.co", slotIso: SLOTS[0], topic: "Senior role" };
    expect(await runTool("book_meeting", { ...args, email: "other@hire.co" }, c)).toMatchObject({ ok: false });
    expect(await runTool("book_meeting", { ...args, slotIso: "2026-11-16T03:00:00.000Z" }, c)).toMatchObject({ ok: false });
    expect(await runTool("book_meeting", args, c)).toMatchObject({ ok: true, data: { slotIso: SLOTS[0] } });
    expect(await runTool("book_meeting", args, c)).toMatchObject({ ok: false }); // slot now taken
  });
});
