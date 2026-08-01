/// <reference types="@cloudflare/workers-types" />
//
// GET /messages.json: the lock screen's SYSTEM BROADCAST feed.
//
// KV is the ONLY runtime source (issue #8). Two keys, merged:
//
//   messages:ops     automated alerts (a health check writes these)
//   messages:manual  hand-written posts, live the moment they are saved
//
// There is no committed baseline underneath any more. `scripts/seed-messages.json`
// seeds `messages:manual` once at setup and is never read at runtime, so an
// administrator has exactly one place to look and nothing to keep in sync.
//
// FAILURE AND EMPTINESS MUST NOT LOOK THE SAME. With the baseline gone, a
// defensive catch returning `[]` would turn a KV outage into a successful-but-
// empty 200, and the client's fallback fires only on a failed response, so the
// panel would silently blank. So:
//
//   key absent          -> []    the admin cleared it; the panel hides, as meant
//   KV throws / bad JSON -> 503  the client falls back to its evergreen line
//   binding unbound      -> 503  same: this endpoint has nothing legitimate to serve
//
// Emptiness is a choice; failure is an accident. They get different status codes.

interface SysMessage {
  id: string;
  level?: 'update' | 'info' | 'alert' | 'resolved';
  date?: string;
  title?: string;
  body?: string;
}

interface Env {
  // Optional in the type only: unbound in local dev and in previews without the
  // binding. Unbound is a failure now, not a degraded mode (see above).
  MESSAGES?: KVNamespace;
}

const KEY_OPS = 'messages:ops';
const KEY_MANUAL = 'messages:manual';

/** Accepts `[...]` or `{ "messages": [...] }`; drops entries without a string id. */
function coerce(parsed: unknown): SysMessage[] {
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { messages?: unknown })?.messages)
      ? (parsed as { messages: unknown[] }).messages
      : [];
  return list.filter((m): m is SysMessage => !!m && typeof (m as SysMessage).id === 'string');
}

/**
 * A missing key is `[]`. Anything else that goes wrong throws, so the caller can
 * answer 503 rather than serve an empty feed that reads as "no announcements".
 * Unparseable JSON counts: every write through /api/messages is schema-validated,
 * so garbage in KV can only come from a direct `wrangler kv key put`, and that
 * deserves a loud fallback rather than a blank panel.
 */
async function readKey(kv: KVNamespace, key: string): Promise<SysMessage[]> {
  const raw = await kv.get(key);
  return raw ? coerce(JSON.parse(raw)) : [];
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Ops alerts must appear on the next load, not after a TTL.
      'cache-control': 'no-store',
    },
  });

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const kv = ctx.env.MESSAGES;
  if (!kv) return json({ error: 'messages store unavailable' }, 503);

  let ops: SysMessage[];
  let manual: SysMessage[];
  try {
    [ops, manual] = await Promise.all([readKey(kv, KEY_OPS), readKey(kv, KEY_MANUAL)]);
  } catch {
    return json({ error: 'messages store unreadable' }, 503);
  }

  // First id wins, so an ops entry shadows a manual one by reusing its id.
  // This governs *shadowing only*: the client re-sorts newest-first by date and
  // pins `alert` by level, so precedence here is not display order.
  const seen = new Set<string>();
  const messages: SysMessage[] = [];
  for (const m of [...ops, ...manual]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    messages.push(m);
  }

  return json({ messages });
};
