// The parts of academy-messages/v1 that JSON Schema cannot express.
//
// It lives beside messages.schema.json because it is the same contract: the
// schema covers the shape of one message, this covers what a SET of them may
// look like. Both `scripts/validate-messages.mjs` and the `PUT /api/messages`
// endpoint import this, so the rules a payload must satisfy cannot fork
// depending on which door it came through.
//
// Plain ESM, no dependencies, no Node built-ins: it has to run unchanged in the
// Workers runtime.

/**
 * @param {Array<{id?: string, level?: string}>} messages
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function checkMessageRules(messages) {
  const errors = [];
  const warnings = [];

  // Ids are the shadowing mechanism. Two entries sharing one inside a single
  // payload means one silently wins and the other was never published.
  const ids = new Set();
  for (const m of messages) {
    if (ids.has(m.id)) errors.push(`duplicate id "${m.id}"`);
    ids.add(m.id);
  }

  // A resolved incident does NOT pin; it sorts by date. Reusing the alert's id
  // is how you replace the banner rather than stack a second one beside it.
  const alerts = messages.filter((m) => m.level === 'alert');
  const resolvedIds = new Set(messages.filter((m) => m.level === 'resolved').map((m) => m.id));
  for (const a of alerts) {
    if (resolvedIds.has(a.id)) {
      errors.push(`"${a.id}" is both alert and resolved — ids must be unique, so one shadows the other`);
    }
  }

  // Only the first four render. `alert` pins to the top, so an alert is never
  // the entry that gets cut, but everything below it competes for three slots.
  if (messages.length > 4) {
    warnings.push(`${messages.length} messages, only the first 4 render after sorting`);
  }
  if (alerts.length > 1) {
    warnings.push(
      `${alerts.length} unresolved alerts all pin to the top, leaving ${Math.max(0, 4 - alerts.length)} slot(s) for everything else`,
    );
  }
  if (alerts.length >= 4) {
    warnings.push('alerts alone fill the panel — no other message can render');
  }

  return { errors, warnings };
}
