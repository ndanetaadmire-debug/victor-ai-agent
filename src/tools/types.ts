import type { z } from "zod";
import type { Calendar, Mailer } from "../ports/services.js";

export interface ToolContext {
  calendar: Calendar;
  mailer: Mailer;
  now: () => Date;
  /** Everything the *user* has typed in this conversation. Used to verify contact details. */
  userText: string;
}

export type ToolOutcome<T = unknown> = { ok: true; data: T } | { ok: false; error: string; retryable: boolean };

export interface ToolDefinition<S extends z.ZodType = z.ZodType, T = unknown> {
  name: string;
  description: string;
  schema: S;
  execute(args: z.infer<S>, ctx: ToolContext): Promise<ToolOutcome<T>>;
}

export const defineTool = <S extends z.ZodType, T>(d: ToolDefinition<S, T>) => d;

/**
 * The model must not book meetings or send email to an address it made up or
 * "inferred". A contact value is only usable if the user literally typed it.
 */
export function userSupplied(value: string, userText: string): boolean {
  return userText.toLowerCase().includes(value.trim().toLowerCase());
}
