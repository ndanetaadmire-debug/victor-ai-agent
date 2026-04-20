import { z } from "zod";
import { defineTool, userSupplied } from "./types.js";

export const listAvailability = defineTool({
  name: "list_availability",
  description: "List open 30-minute interview/call slots in the next N days (ISO timestamps).",
  schema: z.object({ days: z.number().int().min(1).max(14).default(7) }),
  async execute({ days }, { calendar, now }) {
    const slots = await calendar.availableSlots(now().toISOString(), days);
    return slots.length ? { ok: true, data: { slots: slots.slice(0, 8) } } : { ok: false, error: "No open slots in that window.", retryable: false };
  },
});

export const sendCv = defineTool({
  name: "send_cv",
  description: "Email the CV. The email address must have been typed by the user in this conversation.",
  schema: z.object({ email: z.string().trim().toLowerCase().email() }),
  async execute({ email }, { mailer, userText }) {
    if (!userSupplied(email, userText)) {
      return { ok: false, error: "Ask the user to type the email address they want the CV sent to.", retryable: false };
    }
    const { messageId } = await mailer.sendCv(email);
    return { ok: true, data: { sentTo: email, messageId } };
  },
});

export const bookMeeting = defineTool({
  name: "book_meeting",
  description: "Book a call in an available slot. Name and email must have been typed by the user; slot must come from list_availability.",
  schema: z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email(),
    slotIso: z.string().datetime(),
    topic: z.string().trim().min(3).max(200),
  }),
  async execute({ name, email, slotIso, topic }, { calendar, now, userText }) {
    if (!userSupplied(email, userText) || !userSupplied(name.split(" ")[0]!, userText)) {
      return { ok: false, error: "Confirm the person's name and email by asking them to type both.", retryable: false };
    }
    const open = await calendar.availableSlots(now().toISOString(), 14);
    if (!open.includes(slotIso)) return { ok: false, error: "That slot is not available. Offer slots from list_availability.", retryable: true };
    const booking = await calendar.book({ name, email, slotIso, topic });
    return { ok: true, data: booking };
  },
});
