// Types for messages-rules.mjs, which is plain ESM so the Workers runtime can
// import it unchanged. Hand-written and stable: the rules may grow, the shape
// of the result will not.

export interface RuleCheck {
  /** Blocking. A payload with any of these must not reach KV. */
  errors: string[];
  /** Advisory. Presentation judgements the writer is better placed to make. */
  warnings: string[];
}

export function checkMessageRules(
  messages: Array<{ id?: string; level?: string }>,
): RuleCheck;
