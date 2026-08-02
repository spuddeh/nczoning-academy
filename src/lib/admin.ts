// The admin surface's side of the announcements contract (issue #8).
//
// `messages.ts` owns the READ path a visitor sees: one merged, sorted, capped
// list. This owns the WRITE path an administrator sees, which is a different
// shape on purpose: both KV keys, unmerged, because which key an entry lives in
// is the thing the lifecycle depends on.
//
// The endpoint is the truth. Nothing here caches or predicts a write's result;
// every mutation is followed by a re-read.
import type { SysMessage, SysLevel } from './types';

/** Mirrors the endpoint's per-key report. `invalid` is a state, not an error. */
export type KeyState =
  | { state: 'absent' }
  | { state: 'ok'; messages: SysMessage[]; warnings: string[] }
  | { state: 'invalid'; raw: string; errors: string[] };

export type KeyName = 'ops' | 'manual';

export interface AdminSnapshot {
  ops: KeyState;
  manual: KeyState;
  /** The verified Access identity, echoed back so the UI can show who it is. */
  email: string;
}

export interface WriteResult {
  ok: true;
  key: KeyName;
  count: number;
  /** Presentation judgements. They do NOT block a write; the UI surfaces them. */
  warnings: string[];
  by: string;
}

/** Every failure the UI can show, flattened to one shape. */
export interface AdminError {
  ok: false;
  status: number;
  message: string;
  /** Field-level detail from the schema, when the endpoint sent any. */
  errors?: string[];
}

const API = '/api/messages';

/**
 * The status codes the endpoint uses, translated once.
 *
 * 401/403 is not "something went wrong", it is "you are not signed in to
 * Access", and an administrator on a phone needs to be told to reload rather
 * than to read a status code.
 */
function describe(status: number, body: { error?: string } | null): string {
  if (status === 401 || status === 403) {
    return 'Not signed in to Cloudflare Access. Reload this page to authenticate.';
  }
  if (status === 503) return body?.error ?? 'The announcements store is unavailable.';
  return body?.error ?? `Request failed (${status}).`;
}

async function request<T>(init: RequestInit & { url?: string } = {}): Promise<T | AdminError> {
  const { url = API, ...rest } = init;
  let r: Response;
  try {
    r = await fetch(url, { cache: 'no-store', ...rest });
  } catch {
    return { ok: false, status: 0, message: 'No response from the server. Check the connection.' };
  }

  let body: unknown = null;
  try {
    body = await r.json();
  } catch { /* a non-JSON error page; describe() falls back on the status */ }

  if (!r.ok) {
    const b = body as { error?: string; errors?: string[] } | null;
    return { ok: false, status: r.status, message: describe(r.status, b), errors: b?.errors };
  }
  return body as T;
}

export const isError = (r: unknown): r is AdminError =>
  !!r && typeof r === 'object' && (r as AdminError).ok === false;

export const getSnapshot = () => request<AdminSnapshot>();

export const putKey = (key: KeyName, messages: SysMessage[]) =>
  request<WriteResult>({
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key, messages }),
  });

export const clearKey = (key: KeyName) =>
  request<WriteResult>({ url: `${API}?key=${key}`, method: 'DELETE' });

// ---- shaping helpers ----

/** The entries a key currently holds, or none if it is absent or unreadable. */
export const entriesOf = (k: KeyState): SysMessage[] => (k.state === 'ok' ? k.messages : []);

/**
 * Where a NEW post goes. `alert` is the ops channel by definition, everything
 * else is a hand-written note.
 *
 * This rule governs new posts ONLY. Resolving an incident rewrites the entry in
 * the key it already lives in; see `resolveIn`.
 */
export const keyForLevel = (level: SysLevel): KeyName => (level === 'alert' ? 'ops' : 'manual');

/** `YYYY-MM-DD` in the operator's own timezone, which is what they mean by today. */
export function today(): string {
  const d = new Date();
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/**
 * A slug from the title, uniquified against ids already in use.
 *
 * An id is the shadowing mechanism, so it has to be stable and unique, and it
 * is the one field an administrator should never have to think about. Reusing
 * one deliberately is what Mark resolved does, and that path does not come
 * through here.
 */
export function deriveId(title: string, taken: Iterable<string>): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'post';
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

/**
 * Rewrite one entry IN PLACE, in the key it already lives in.
 *
 * This is the rule the UI exists to enforce. Routing a resolved entry by level
 * would move it to `manual`, leaving the original alert alive in `ops`, where it
 * shadows the same id and wins. The banner would never change.
 */
export const replaceIn = (list: SysMessage[], entry: SysMessage): SysMessage[] =>
  list.map((m) => (m.id === entry.id ? entry : m));

export const removeFrom = (list: SysMessage[], id: string): SysMessage[] =>
  list.filter((m) => m.id !== id);
