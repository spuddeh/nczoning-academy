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
import { MESSAGES_FALLBACK, fetchMessages } from '../lib/messages';
import { BroadcastFeed } from '../components/BroadcastFeed';
import type { Sfx } from '../lib/sfx';
import type { SysMessage } from '../lib/types';

interface LockProps {
  sfx: Sfx;
  onLogin: () => void;
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const p2 = (n: number) => String(n).padStart(2, '0');
// The terminal reports Night City's year, not ours. Weekday and day/month stay
// real (the clock is live) — only the year is in-fiction.
const LORE_YEAR = 2077;

export function Lock({ sfx, onLogin }: LockProps) {
  const [now, setNow] = useState(() => new Date());
  const [messages, setMessages] = useState<SysMessage[]>([]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    // failed fetch → the evergreen fallback line; a 200 with zero messages
    // hides the panel (emptiness is a choice, failure is an accident)
    void fetchMessages().then((r) => {
      if (alive) setMessages(r.ok ? r.messages : MESSAGES_FALLBACK);
    });
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

        <BroadcastFeed messages={messages} />

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
