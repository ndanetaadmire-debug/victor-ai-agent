# ADR-002: Side-effecting tools verify inputs against what the user typed

**Status:** Accepted

**Context.** Models will happily "fill in" an email address (e.g. from a company name) to complete a booking. Sending a CV or a calendar invite to a guessed address is a privacy incident.

**Decision.** `send_cv` and `book_meeting` receive the user's own messages in their context and refuse values that do not appear there. The output guard independently blocks success claims that are not backed by a successful tool result.

**Consequences.** Occasionally Victor asks the person to type their email again. That friction is the point.
