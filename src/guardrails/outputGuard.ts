import type { ToolResultRecord } from "../agent/state.js";

/**
 * Claims the model may only make if the corresponding tool actually succeeded.
 * "You're booked for Tuesday" with no booking is the single most damaging thing
 * a representative agent can say; it is intercepted and corrected mid-stream.
 */
const BOOKED = /\b(you('| a)re (all )?(booked|scheduled|confirmed)|i('ve| have) (booked|scheduled)|meeting is (booked|confirmed|scheduled)|booking (is )?confirmed)\b/i;
const CV_SENT = /\b(i('ve| have) (sent|emailed)|cv (has been|was) (sent|emailed)|sent (you )?(the|his|my) cv)\b/i;

export interface OutputVerdict {
  content: string;
  corrected: boolean;
  violations: string[];
}

const succeeded = (ledger: ToolResultRecord[], tool: string) => ledger.some((r) => r.tool === tool && r.ok);

export function enforceOutputPolicy(content: string, ledger: ToolResultRecord[]): OutputVerdict {
  const violations: string[] = [];
  let out = content;
  if (BOOKED.test(out) && !succeeded(ledger, "book_meeting")) {
    violations.push("unbacked_booking_claim");
    out = "I haven't booked anything yet. To confirm a call I need your name, your email and one of the open slots — shall I list them?";
  }
  if (CV_SENT.test(out) && !succeeded(ledger, "send_cv")) {
    violations.push("unbacked_cv_claim");
    out = out.replace(CV_SENT, "I can send the CV") + " Just type the email address you'd like it sent to.";
  }
  return { content: out, corrected: violations.length > 0, violations };
}
