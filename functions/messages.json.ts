/// <reference types="@cloudflare/workers-types" />
//
// GET /messages.json — the lock screen's SYSTEM BROADCAST feed.
//
// A Pages Function at this path takes precedence over the static asset of the
// same name, and `context.next()` hands us that asset's Response. So instead of
// "serve KV, else serve the file", we can read the committed file as a BASELINE
// and overlay KV on top of it:
//
//   messages:ops     KV  — automated alerts (a health check writes these)
//   messages:manual  KV  — hand-written posts, live the moment you save them
//   public/messages.json — the committed, reviewed, evergreen baseline
//
// Delete a KV key and the site reverts to the committed state with no deploy.
//
// This endpoint is the first thing a visitor reads. It must never throw, never
// 500, and never let a malformed KV value blank the panel: every read is
// defensive, and anything unparseable is treated as absent.

interface SysMessage {
  id: string;
  level?: 'update' | 'info' | 'alert';
  date?: string;
  title?: string;
  body?: string;
}

interface Env {
  // Optional: unbound in local dev and in previews without the binding, where
  // this function degrades to serving the committed baseline unchanged.
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

async function readKey(kv: KVNamespace | undefined, key: string): Promise<SysMessage[]> {
  if (!kv) return [];
  try {
    const raw = await kv.get(key);
    return raw ? coerce(JSON.parse(raw)) : [];
  } catch {
    return []; // KV unreachable, or the value is not JSON — treat as no messages
  }
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  // next() falls through to the asset server: the committed public/messages.json.
  let baseline: SysMessage[] = [];
  try {
    baseline = coerce(await (await ctx.next()).json());
  } catch {
    baseline = []; // asset missing or not JSON — KV alone still renders
  }

  const [ops, manual] = await Promise.all([
    readKey(ctx.env.MESSAGES, KEY_OPS),
    readKey(ctx.env.MESSAGES, KEY_MANUAL),
  ]);

  // First id wins, so a KV entry shadows a baseline one by reusing its id.
  // Precedence is ops > manual > baseline. This governs *shadowing only* —
  // the client re-sorts newest-first by date, so an ops alert needs a `date`
  // to surface above the evergreen lines (undated entries sort last).
  const seen = new Set<string>();
  const messages: SysMessage[] = [];
  for (const m of [...ops, ...manual, ...baseline]) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    messages.push(m);
  }

  return new Response(JSON.stringify({ messages }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Ops alerts must appear on the next load, not after a TTL.
      'cache-control': 'no-store',
    },
  });
};
