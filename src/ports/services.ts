/** Outbound side effects live behind ports so tests can assert them and providers can change. */
export interface Calendar {
  availableSlots(fromIso: string, days: number): Promise<string[]>;
  book(input: { name: string; email: string; slotIso: string; topic: string }): Promise<{ bookingId: string; slotIso: string }>;
}

export interface Mailer {
  sendCv(to: string): Promise<{ messageId: string }>;
}

export class InMemoryCalendar implements Calendar {
  readonly bookings: Array<{ bookingId: string; name: string; email: string; slotIso: string; topic: string }> = [];
  constructor(private readonly slots: string[]) {}
  async availableSlots(fromIso: string, days: number) {
    const from = Date.parse(fromIso);
    const to = from + days * 86_400_000;
    const taken = new Set(this.bookings.map((b) => b.slotIso));
    return this.slots.filter((s) => Date.parse(s) >= from && Date.parse(s) < to && !taken.has(s));
  }
  async book(input: { name: string; email: string; slotIso: string; topic: string }) {
    if (this.bookings.some((b) => b.slotIso === input.slotIso)) throw new Error("slot taken");
    const b = { bookingId: `bk_${this.bookings.length + 1}`, ...input };
    this.bookings.push(b);
    return { bookingId: b.bookingId, slotIso: b.slotIso };
  }
}

export class InMemoryMailer implements Mailer {
  readonly sent: string[] = [];
  async sendCv(to: string) {
    this.sent.push(to);
    return { messageId: `msg_${this.sent.length}` };
  }
}
