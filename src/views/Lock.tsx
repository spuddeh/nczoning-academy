// Lock / standby screen — the pre-boot landing at `/`. Two jobs:
//
// 1. Audio gate. The browser keeps WebAudio suspended until the first user
//    gesture, so the boot sequence's SFX (and the radio) can't play if we drop
//    straight into it. The LOGIN click IS that gesture — it wakes the shared
//    AudioContext, then hands off to `/boot`.
// 2. Front door. It's the first thing a visitor sees, so it says what the site
//    is and shows a SYSTEM BROADCAST feed (company announcements) loaded from
//    the static /messages.json, with an inlined fallback.
import { useEffect, useState } from 'react';
import { IDENTITY } from '../lib/academy';
import type { Sfx } from '../lib/sfx';

interface LockProps {
  sfx: Sfx;
  onLogin: () => void;
}

type Level = 'update' | 'info' | 'alert' | 'resolved';

// messages.schema.json requires EVERY field. They stay optional here on purpose:
// this type describes what arrives over the wire, and KV values are written
// straight to the live feed without runtime validation. So the renderer treats a
// missing field as a bug it must survive, not as a shape it can rely on.
interface SysMessage {
  id: string;
  level?: Level;
  /** `YYYY-MM-DD` or a full ISO datetime; only the first 10 chars render. */
  date?: string;
  title?: string;
  body?: string;
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const p2 = (n: number) => String(n).padStart(2, '0');
// The terminal reports Night City's year, not ours. Weekday and day/month stay
// real (the clock is live) — only the year is in-fiction.
const LORE_YEAR = 2077;

// Evergreen fallback if /messages.json can't be fetched (offline, 404, etc).
const FALLBACK: SysMessage[] = [
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

const norm = (raw: unknown): SysMessage[] => {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { messages?: unknown })?.messages)
      ? (raw as { messages: SysMessage[] }).messages
      : [];
  return list
    .slice()
    .sort((a, b) => pinned(a) - pinned(b) || byDateDesc(a, b))
    .slice(0, 4);
};

const LEVELS: Record<Level, { tag: string; className: string }> = {
  update: { tag: 'UPDATE', className: 'update' },
  info: { tag: 'INFO', className: 'info' },
  alert: { tag: 'ALERT', className: 'alert' },
  resolved: { tag: 'RESOLVED', className: 'resolved' },
};

export function Lock({ sfx, onLogin }: LockProps) {
  const [now, setNow] = useState(() => new Date());
  const [messages, setMessages] = useState<SysMessage[]>([]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch('/messages.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => { if (alive) setMessages(norm(data)); })
      .catch(() => { if (alive) setMessages(norm(FALLBACK)); });
    return () => { alive = false; };
  }, []);

  const time = `${p2(now.getHours())}:${p2(now.getMinutes())}:${p2(now.getSeconds())}`;
  const date = `${DAYS[now.getDay()]} ${p2(now.getDate())}.${p2(now.getMonth() + 1)}.${LORE_YEAR}`;

  // Resume the shared AudioContext on this gesture, THEN play the cue. The
  // await matters: resume() is async, and Sfx drops any sound queued while the
  // context still reads 'suspended', so a same-tick play() is silently lost.
  async function login() {
    const ctx = sfx.context();
    if (ctx && ctx.state !== 'running') {
      try { await ctx.resume(); } catch { /* no audio — still let them in */ }
    }
    sfx.play('access');
    onLogin();
  }

  return (
    <section className="lock-screen">
      <div className="lock-backdrop" />
      <div className="lock-topline" />

      <div className="lock-stack">
        <img className="lock-logo" src="/assets/nightcorp-logo.svg" alt="Night Corp" />
        <h1 className="lock-wordmark">ZONING ACADEMY</h1>
        <div className="lock-sub">{`${IDENTITY.division} // TERMINAL ${IDENTITY.terminalId}`}</div>

        <p className="lock-desc">
          An interactive training terminal for Cyberpunk 2077 mod authors. Work
          through hands-on micro-modules and live labs at your own pace, then certify.
        </p>

        <div className="lock-status">
          <div className="lock-status-left">
            <span className="lock-led ledblink" />
            <div>
              <div className="lock-status-title">SYSTEM LOCKED</div>
              <div className="lock-status-note">AWAITING OPERATOR AUTHENTICATION</div>
            </div>
          </div>
          <div className="lock-clock">
            <div className="lock-clock-time">{time}</div>
            <div className="lock-clock-date">{date}</div>
          </div>
        </div>

        {messages.length > 0 && (
          <div className="lock-broadcast">
            <div className="lock-broadcast-head">
              <span className="lock-broadcast-led statusled" />
              <span className="lock-broadcast-title">SYSTEM BROADCAST</span>
            </div>
            <div className="lock-broadcast-list">
              {messages.map((m) => {
                const lvl = LEVELS[(m.level ?? 'info') as Level] ?? LEVELS.info;
                return (
                  <div className={`lock-msg ${lvl.className}`} key={m.id}>
                    <span className="lock-msg-dot" />
                    <div className="lock-msg-body">
                      <div className="lock-msg-head">
                        <span className="lock-msg-tag">{lvl.tag}</span>
                        <span className="lock-msg-title">{m.title}</span>
                        <span className="lock-msg-date">{m.date?.slice(0, 10)}</span>
                      </div>
                      <div className="lock-msg-text">{m.body}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button className="lock-login" type="button" onClick={() => void login()}>[ LOGIN ]</button>

        <div className="lock-audio-hint">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M19 5a9 9 0 0 1 0 14" />
          </svg>
          <span>AUDIO SUBSYSTEM ENGAGES ON LOGIN</span>
        </div>
      </div>
    </section>
  );
}
