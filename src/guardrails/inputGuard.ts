/**
 * Deterministic input guard. Runs BEFORE the model sees anything, so hostile
 * input costs zero tokens and can never be "talked around".
 *
 * It is intentionally conservative: it blocks clear instruction-override and
 * exfiltration attempts and caps size. Everything else is allowed through and
 * handled by tool contracts and output guards downstream (defence in depth).
 */
export type GuardVerdict =
  | { allowed: true; normalized: string }
  | { allowed: false; reason: "too_long" | "empty" | "prompt_injection" | "secret_exfiltration"; message: string };

export const MAX_INPUT_CHARS = 2_000;

const INJECTION_PATTERNS: RegExp[] = [
  /\bignore (all |any )?(the )?(previous|prior|above|earlier) (instructions|rules|prompts?)\b/,
  /\bdisregard (your|the|all) (rules|instructions|guidelines|system prompt)\b/,
  /\byou are now\b.{0,40}\b(dan|developer mode|jailbroken|unrestricted)\b/,
  /\b(reveal|print|show|repeat|output) (me )?(your|the) (system|hidden|initial) (prompt|instructions)\b/,
  /\bact as (an? )?(admin|administrator|root|system)\b/,
  /<\s*\/?\s*(system|assistant)\s*>/,
  /\[\s*(system|inst)\s*\]/,
];

const EXFIL_PATTERNS: RegExp[] = [
  /\b(api[_ -]?key|access[_ -]?token|admin[_ -]?token|secret|password|env(ironment)? variables?)\b.{0,30}\b(show|give|send|print|list|what is)\b/,
  /\b(show|give|send|print|list|what is)\b.{0,30}\b(api[_ -]?key|access[_ -]?token|admin[_ -]?token|webhook secret|env(ironment)? variables?)\b/,
  /\b(all|every|list (of )?)\s*(customers?|orders?)\b.{0,20}\b(emails?|addresses|phone numbers?)\b/,
];

/** Fold look-alike characters and zero-width tricks so patterns can't be dodged with Unicode. */
export function normalize(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[​-‍﻿⁠]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function inspectInput(raw: string): GuardVerdict {
  if (raw.length > MAX_INPUT_CHARS) {
    return { allowed: false, reason: "too_long", message: `Please keep messages under ${MAX_INPUT_CHARS} characters.` };
  }
  const normalized = normalize(raw);
  if (!normalized) return { allowed: false, reason: "empty", message: "How can I help with your order today?" };

  if (INJECTION_PATTERNS.some((p) => p.test(normalized))) {
    return {
      allowed: false,
      reason: "prompt_injection",
      message: "I can help with stock, orders, deliveries and returns. What would you like to check?",
    };
  }
  if (EXFIL_PATTERNS.some((p) => p.test(normalized))) {
    return {
      allowed: false,
      reason: "secret_exfiltration",
      message: "I can't share internal or other customers' information, but I'm happy to help with your own order.",
    };
  }
  return { allowed: true, normalized };
}
