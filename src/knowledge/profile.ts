/**
 * The agent's single source of truth about its owner. Tools read from here;
 * the model never "remembers" facts on its own, so it cannot invent a job,
 * a metric or a skill. Update this file, not the prompt.
 */
export interface Role {
  company: string;
  title: string;
  start: string; // YYYY-MM
  end: string | null;
  sector: string;
  highlights: string[];
  stack: string[];
}

export interface Project {
  slug: string;
  name: string;
  summary: string;
  stack: string[];
  tags: string[];
  repo?: string;
  live?: string;
}

export const PROFILE = {
  name: "Admire T. Ndaneta",
  headline: "Senior Full-Stack Engineer · AI & Agentic Systems",
  location: "Johannesburg, South Africa (remote)",
  yearsExperience: 6,
  education: "BSc Computer Science, IU International University (expected 2027)",
  portfolio: "https://admire-portfolio.vercel.app",
  openTo: ["Senior full-stack roles", "AI / agentic engineering roles", "Client builds"],
  metrics: ["35% faster page loads at Gerko", "20% gain in team delivery velocity", "15% fewer regressions", "99.9% uptime delivered", "3 developers led and mentored"],
};

export const ROLES: Role[] = [
  {
    company: "Gerko", title: "Senior Full-Stack Engineer, Product Owner & Tech Lead", start: "2023-06", end: null, sector: "Healthcare SaaS",
    highlights: [
      "Leads product and architecture of a multi-tenant practice-management SaaS; reports to the CTO",
      "Co-architected Scribe, the AI clinical co-pilot that turns consultation speech into structured notes",
      "Cut page loads by 35% and regressions by 15%; leads and mentors three developers",
    ],
    stack: ["React", "TypeScript", "Node.js", "Fastify", "PostgreSQL", "Redis", "WebSockets", "C#/.NET", "Azure OpenAI", "AWS"],
  },
  {
    company: "Sasol", title: "React Full-Stack Developer", start: "2021-01", end: "2023-05", sector: "Energy",
    highlights: ["Built internal operations platforms in React and Node.js", "Delivered C# microservice features end to end"],
    stack: ["React", "TypeScript", "Node.js", "C#/.NET", "SQL Server", "Azure"],
  },
  {
    company: "Tata Consultancy Services", title: "Junior Full-Stack Developer", start: "2020-01", end: "2020-12", sector: "Financial services consulting",
    highlights: ["Shipped C# and JavaScript features for enterprise clients"],
    stack: ["C#/.NET", "JavaScript", "SQL"],
  },
];

const GH = "https://github.com/ndanetaadmire-debug";
export const PROJECTS: Project[] = [
  { slug: "victor", name: "Victor (this agent)", summary: "Autonomous AI representative with a deterministic security gate, typed tools and verified booking.", stack: ["TypeScript", "LangGraph.js", "Zod", "Fastify", "SSE"], tags: ["ai", "agents", "guardrails"], repo: `${GH}/victor-ai-agent` },
  { slug: "commerce-ops-agent", name: "Commerce Ops Agent", summary: "E-commerce operations agent: stock, order tracking, delivery ETAs, human-in-the-loop refunds; ledger-checked output guard.", stack: ["TypeScript", "LangGraph.js", "Shopify GraphQL", "Fastify"], tags: ["ai", "agents", "e-commerce", "shopify"], repo: `${GH}/commerce-ops-agent` },
  { slug: "finance-workflow-engine", name: "Finance Workflow Engine", summary: "AP automation: extraction with confidence, fraud checks, 3-way matching, bank reconciliation, hash-chained audit log.", stack: ["Python", "FastAPI", "PostgreSQL"], tags: ["fintech", "automation", "workflow"], repo: `${GH}/finance-workflow-engine` },
  { slug: "financeflow", name: "FinanceFlow", summary: "Double-entry ledger in Go: optimistic concurrency, idempotent transfers, immutable history, race-tested.", stack: ["Go", "PostgreSQL"], tags: ["fintech", "backend", "ledger"], repo: `${GH}/financeflow` },
  { slug: "shopsphere", name: "ShopSphere", summary: "Checkout backend: VAT-correct pricing, oversell-proof reservations, payment saga, transactional outbox.", stack: ["TypeScript", "Fastify"], tags: ["e-commerce", "backend", "payments"], repo: `${GH}/shopsphere` },
  { slug: "fleetflow", name: "FleetFlow", summary: "Real-time dispatch: regret-2 assignment, event-sourced jobs, geofenced arrivals, resumable WebSockets.", stack: ["TypeScript", "WebSockets", "Event sourcing"], tags: ["logistics", "real-time", "algorithms"], repo: `${GH}/fleetflow` },
  { slug: "propmanage", name: "PropManage", summary: "Property management: leases with proration and escalation, payment allocation, arrears ageing, SLA maintenance.", stack: ["Python", "SQLAlchemy", "FastAPI"], tags: ["proptech", "backend"], repo: `${GH}/propmanage` },
  { slug: "learnhub", name: "LearnHub", summary: "Accessible React course player with SM-2 spaced repetition and partial-credit grading.", stack: ["React", "TypeScript", "Vite"], tags: ["frontend", "edtech", "accessibility"], repo: `${GH}/learnhub` },
  { slug: "scribe", name: "Scribe (Gerko)", summary: "AI clinical co-pilot turning consultation speech into structured clinical notes in real time.", stack: ["Node.js", "Fastify", "Redis", "WebSockets", "Azure OpenAI"], tags: ["ai", "healthcare", "real-time"] },
  { slug: "lwazi-hair", name: "Lwazi Hair", summary: "Live Shopify store with a custom wig and bundle builder and live pricing.", stack: ["Shopify", "Liquid", "JavaScript"], tags: ["e-commerce", "shopify", "client"], live: "https://lwazihair.co.za" },
];

/** Canonical skill names and the aliases recruiters write in job specs. */
export const SKILL_ALIASES: Record<string, string[]> = {
  "TypeScript": ["typescript", "ts"],
  "JavaScript": ["javascript", "js", "es6"],
  "React": ["react", "react.js", "reactjs"],
  "Next.js": ["next.js", "nextjs", "next"],
  "Node.js": ["node", "node.js", "nodejs"],
  "Fastify": ["fastify"],
  "Python": ["python"],
  "Go": ["golang", "go"],
  "C#/.NET": ["c#", ".net", "dotnet", "asp.net"],
  "PostgreSQL": ["postgres", "postgresql"],
  "Redis": ["redis"],
  "AWS": ["aws", "amazon web services"],
  "Azure": ["azure"],
  "LangGraph.js": ["langgraph", "langchain", "agents", "agentic", "llm", "rag", "genai", "generative ai"],
  "WebSockets": ["websocket", "websockets", "real-time", "realtime"],
  "Shopify": ["shopify", "liquid"],
  "CI/CD": ["ci/cd", "github actions", "devops", "pipelines"],
  "Docker": ["docker", "containers"],
  "Kubernetes": ["kubernetes", "k8s"],
  "Java": ["java", "spring"],
  "Rust": ["rust"],
};

export function allEvidence(): Map<string, string[]> {
  const ev = new Map<string, string[]>();
  const add = (skill: string, where: string) => ev.set(skill, [...(ev.get(skill) ?? []), where]);
  for (const r of ROLES) for (const s of r.stack) add(s, `${r.title} at ${r.company}`);
  for (const p of PROJECTS) for (const s of p.stack) add(s, p.name);
  add("CI/CD", "GitHub Actions pipelines across all portfolio repos");
  add("Docker", "Multi-stage, non-root images across portfolio repos");
  return ev;
}
