// SYSTEM BROADCAST feed — the ONE implementation of the announcements
// contract (issue #10). The lock screen and the in-app surfaces (dashboard
// panel, shell alert strip) all fetch, sort and classify through here so the
// pinning and fallback rules cannot fork.
import type { SysMessage, SysLevel } from './types';

// messages.schema.json requires EVERY field. They stay optional in the type
// on purpose: this describes what arrives over the wire, and KV values are
// written straight to the live feed without runtime validation. The renderer
// treats a missing field as a bug it must survive, not a shape it can rely on.

export const MESSAGE_LEVELS: Record<SysLevel, { tag: string; className: string }> = {
  update: { tag: 'UPDATE', className: 'update' },
  info: { tag: 'INFO', className: 'info' },
  alert: { tag: 'ALERT', className: 'alert' },
  resolved: { tag: 'RESOLVED', className: 'resolved' },
};

// Evergreen fallback if /messages.json can't be fetched (offline, 404, etc).
export const MESSAGES_FALLBACK: SysMessage[] = [
  { id: 'welcome', level: 'info', date: '2026-07-10', title: 'ACADEMY STANDING BY', body: 'New training tracks are added as the NC Zoning modding toolset grows.' },
];

// An unresolved incident outranks every other message. Pinning by LEVEL rather
// than date means the panel's 4-item cap can never discard the one message that
// matters, and an ops writer cannot bury its own alert with a bad timestamp.
// `resolved` deliberately does NOT pin: it falls back to date order and ages out.
const pinned = (m: SysMessage) => (m.level === 'alert' ? 0 : 1);

// ISO strings compare lexicographically in chronological order, so a bare
// `YYYY-MM-DD` and a full timestamp sort correctly against each other.
const byDateDesc = (a: SysMessage, b: SysMessage) =>
  String(b.date ?? '').localeCompare(String(a.date ?? ''));

export function normalizeMessages(raw: unknown): SysMessage[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { messages?: unknown })?.messages)
      ? (raw as { messages: SysMessage[] }).messages
      : [];
  return list
    .slice()
    .sort((a, b) => pinned(a) - pinned(b) || byDateDesc(a, b))
    .slice(0, 4);
}

// ---- read watermark ----
// TERMINAL-local (localStorage), on purpose: which announcements a human has
// glanced at is terminal trivia, not service-record material — a shard slotted
// on another machine must not mark that terminal's feed read. This module owns
// the ncza:v1:broadcast-seen key the way session.ts owns sessionStorage;
// operator profiles remain progress.js territory. The live-alert indicator
// and the alert strip deliberately do NOT consult this.
const SEEN_KEY = 'ncza:v1:broadcast-seen';
const SEEN_CAP = 50; // the feed caps at 4; 50 comfortably outlives id churn

export function readSeenIds(): string[] {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string') : [];
  } catch {
    return []; // storage blocked or corrupt — everything reads as unread
  }
}

export function markSeen(ids: string[]): string[] {
  const merged = [...new Set([...readSeenIds(), ...ids])].slice(-SEEN_CAP);
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(merged));
  } catch { /* storage unavailable — the count returns next load */ }
  return merged;
}

// Failure and emptiness must not look the same (see the #8 groundwork): a
// failed fetch reports ok=false so callers can fall back or keep their last
// known list; a 200 with zero messages is the feed genuinely empty.
export async function fetchMessages(): Promise<{ ok: boolean; messages: SysMessage[] }> {
  try {
    const r = await fetch('/messages.json', { cache: 'no-store' });
    if (!r.ok) return { ok: false, messages: [] };
    return { ok: true, messages: normalizeMessages(await r.json()) };
  } catch {
    return { ok: false, messages: [] };
  }
}
