/// <reference types="@cloudflare/workers-types" />
//
// The admin API for the SYSTEM BROADCAST feed (issue #8).
//
//   GET    /api/messages           current state of BOTH KV keys, unmerged
//   PUT    /api/messages           write one key   { key, messages }
//   DELETE /api/messages?key=ops   clear one key
//
// WHY THIS EXISTS. `announcements-via-kv` named its own sharp edge: KV values
// are validated by nothing at runtime, and the only thing between a typo and
// the site's front door was remembering to run `npm run validate:messages`
// first. Behind this endpoint, validation stops being a discipline and becomes
// a wall the data must pass through. The admin UI is almost a side effect.
//
// GET RETURNS BOTH KEYS UNMERGED, on purpose. `/messages.json` merges them for
// a visitor; an administrator needs to see which key an entry lives in, because
// that is what "resolve in place" depends on. It is also what makes AUTOMATED
// messages editable: a health check writes messages:ops, and an operator has to
// be able to amend, resolve or clear that entry without a shell.
//
// The automated writer does NOT come through here. It writes messages:ops
// directly with a scoped Cloudflare API token from GitHub Actions: different
// writer, different door, no service token and no shared HTTP surface.
import validateMessages from './_messages-validator.mjs';
import { checkMessageRules } from '../../schema/messages-rules.mjs';
import { authorize, refused } from './_access';
import type { AccessEnv } from './_access';

interface SysMessage {
  id: string;
  level: 'update' | 'info' | 'alert' | 'resolved';
  date: string;
  title: string;
  body: string;
}

interface Env extends AccessEnv {
  MESSAGES?: KVNamespace;
}

const KEYS = { ops: 'messages:ops', manual: 'messages:manual' } as const;
type KeyName = keyof typeof KEYS;

const isKeyName = (v: unknown): v is KeyName => v === 'ops' || v === 'manual';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

/**
 * What a key currently holds.
 *
 * `invalid` is a state, not an error, because the administrator is exactly the
 * person who needs to see it: a direct `wrangler kv key put` (or a broken
 * automated writer) can leave a value this endpoint would never have accepted,
 * and the only way to fix it from a phone is to be shown it and offered Clear.
 */
type KeyState =
  | { state: 'absent' }
  | { state: 'ok'; messages: SysMessage[]; warnings: string[] }
  | { state: 'invalid'; raw: string; errors: string[] };

const RAW_PREVIEW = 4000; // enough to recognise a bad value, not enough to be a payload

/** Validate a parsed document. Accepts `[...]` or `{ messages: [...] }`. */
function check(parsed: unknown): { messages: SysMessage[]; warnings: string[] } | { errors: string[] } {
  const doc = Array.isArray(parsed) ? { messages: parsed } : parsed;
  if (!validateMessages(doc)) {
    const errors = (validateMessages.errors ?? []).map(
      (e) => `${e.instancePath || '/'} ${e.message}`,
    );
    return { errors: errors.length ? errors : ['payload does not match academy-messages/v1'] };
  }
  const { messages } = doc as { messages: SysMessage[] };
  const rules = checkMessageRules(messages);
  if (rules.errors.length) return { errors: rules.errors };
  return { messages, warnings: rules.warnings };
}

async function readState(kv: KVNamespace, key: string): Promise<KeyState> {
  const raw = await kv.get(key); // a throw here is a real KV failure; let it bubble
  if (raw === null) return { state: 'absent' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: 'invalid', raw: raw.slice(0, RAW_PREVIEW), errors: ['value is not JSON'] };
  }

  const result = check(parsed);
  if ('errors' in result) {
    return { state: 'invalid', raw: raw.slice(0, RAW_PREVIEW), errors: result.errors };
  }
  return { state: 'ok', messages: result.messages, warnings: result.warnings };
}

/** Resolve auth and the KV binding together: every verb needs both. */
async function gate(request: Request, env: Env) {
  const identity = await authorize(request, env);
  if (refused(identity)) return { refusal: identity };
  if (!env.MESSAGES) return { refusal: json({ error: 'messages store unavailable' }, 503) };
  return { identity, kv: env.MESSAGES };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const g = await gate(request, env);
  if (g.refusal) return g.refusal;

  try {
    const [ops, manual] = await Promise.all([
      readState(g.kv, KEYS.ops),
      readState(g.kv, KEYS.manual),
    ]);
    return json({ ops, manual, email: g.identity.email });
  } catch {
    return json({ error: 'messages store unreadable' }, 503);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const g = await gate(request, env);
  if (g.refusal) return g.refusal;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'request body is not JSON' }, 400);
  }

  const { key, messages } = (body ?? {}) as { key?: unknown; messages?: unknown };
  if (!isKeyName(key)) {
    return json({ error: 'key must be "ops" or "manual"' }, 400);
  }

  // The wall. Nothing reaches KV that would not also pass CI.
  const result = check({ messages });
  if ('errors' in result) return json({ error: 'payload rejected', errors: result.errors }, 400);

  try {
    await g.kv.put(KEYS[key], JSON.stringify(result.messages));
  } catch {
    return json({ error: 'messages store not writable' }, 503);
  }

  // Warnings do not block a write: "three alerts pin above everything" is a
  // judgement about presentation, and the person posting during an incident is
  // better placed to make it than this endpoint is.
  return json({
    ok: true,
    key,
    count: result.messages.length,
    warnings: result.warnings,
    by: g.identity.email,
  });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const g = await gate(request, env);
  if (g.refusal) return g.refusal;

  const key = new URL(request.url).searchParams.get('key');
  if (!isKeyName(key)) return json({ error: 'key must be "ops" or "manual"' }, 400);

  try {
    await g.kv.delete(KEYS[key]);
  } catch {
    return json({ error: 'messages store not writable' }, 503);
  }
  return json({ ok: true, key, cleared: true, by: g.identity.email });
};
