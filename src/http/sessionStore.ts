import type { ChatTurn } from "../ports/planner.js";

/** Bounded, TTL'd conversation memory. Only the last N turns are replayed to the model. */
export class SessionStore {
  private readonly sessions = new Map<string, { history: ChatTurn[]; expires: number }>();
  constructor(private readonly maxTurns = 20, private readonly ttlMs = 30 * 60 * 1000, private readonly now = () => Date.now()) {}

  get(id: string): ChatTurn[] {
    const s = this.sessions.get(id);
    if (!s || s.expires < this.now()) {
      this.sessions.delete(id);
      return [];
    }
    return s.history;
  }

  set(id: string, history: ChatTurn[]): void {
    this.sessions.set(id, { history: history.slice(-this.maxTurns), expires: this.now() + this.ttlMs });
  }
}
