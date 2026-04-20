/** Strip PII before anything reaches logs or traces. Logs are not a data store. */
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?:\+?27|0)(?:[\s-]?\d){9}\b/g;
const CARD = /\b(?:\d[ -]?){13,19}\b/g;

export function redact(text: string): string {
  return text.replace(EMAIL, "[email]").replace(CARD, "[card]").replace(PHONE, "[phone]");
}
