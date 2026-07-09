// Boot / login view — typewriter boot log (click or any key to skip), gated
// ACCESS button, shard slot with result line, and the 1.7s green welcome
// readout after login. All timings and SFX cues ported from the monolith
// (docs/monolith-parity-spec.md — "Boot view").
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { IDENTITY, fullBoot } from '../lib/academy';
import type { Sfx } from '../lib/sfx';

interface BootProps {
  sfx: Sfx;
  lastUser: string;
  courseLoading: boolean;
  importMsg: { ok: boolean; text: string } | null;
  welcome: { name: string; clearance: number } | null;
  onSubmit: (name: string) => void;
  onSlot: (json: string) => void;
  onSlotReadError: () => void;
  cleanInput: (v: string) => string;
}

export function Boot({
  sfx, lastUser, courseLoading, importMsg, welcome,
  onSubmit, onSlot, onSlotReadError, cleanInput,
}: BootProps) {
  const full = useRef(fullBoot());
  const [bootText, setBootText] = useState('');
  const [bootDone, setBootDone] = useState(false);
  const [name, setName] = useState(lastUser);
  const timer = useRef<number | undefined>(undefined);
  const doneRef = useRef(false);

  // Typewriter: 260ms lead-in (whoosh), then 1 char/tick — 140ms after a
  // newline, 34ms after '.' or ':', else 12ms. Drive-seek SFX at newlines,
  // head chatter every 6th char.
  useEffect(() => {
    const text = full.current;
    let i = 0;
    const tick = () => {
      if (doneRef.current) return;
      i += 1;
      setBootText(text.slice(0, i));
      if (i >= text.length) {
        doneRef.current = true;
        setBootDone(true);
        sfx.play('drive');
        return;
      }
      const ch = text[i - 1];
      if (ch === '\n') sfx.play('drive');
      else if (i % 6 === 0) sfx.play('drivehi');
      const d = ch === '\n' ? 140 : (ch === '.' || ch === ':') ? 34 : 12;
      timer.current = window.setTimeout(tick, d);
    };
    timer.current = window.setTimeout(() => { sfx.play('whoosh'); tick(); }, 260);
    return () => window.clearTimeout(timer.current);
  }, [sfx]);

  // Any key skips the animation (the whole screen is also click-to-skip).
  useEffect(() => {
    const onKey = () => { skip(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function skip() {
    if (doneRef.current) return;
    doneRef.current = true;
    window.clearTimeout(timer.current);
    setBootText(full.current);
    setBootDone(true);
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onSlot(String(reader.result));
    reader.onerror = () => onSlotReadError();
    reader.readAsText(f);
    e.target.value = ''; // allow re-slotting the same file after a rejection
  }

  function onKeyInput(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') onSubmit(name);
  }

  const ready = !!name.trim() && !courseLoading;
  const welcomeText = welcome
    ? `> IDENTITY CONFIRMED: ${welcome.name}\n> ACCESS GRANTED // CLEARANCE LEVEL ${welcome.clearance}\n> ESTABLISHING SESSION...`
    : '';

  return (
    <section className="boot-screen" onClick={skip}>
      <div className="boot-backdrop" />
      <div className="boot-card">
        <header className="boot-titlebar">
          <span className="boot-tb-title">{IDENTITY.division}</span>
          <span className="boot-tb-id">{IDENTITY.terminalId}</span>
        </header>
        <div className="boot-body">
          <pre className="boot-log">{bootText}{!bootDone && <span className="cursor" />}</pre>

          {bootDone && (
            <div className="boot-form">
              <div className="boot-divider" />

              {welcome ? (
                <pre className="boot-welcome">{welcomeText}<span className="cursor" /></pre>
              ) : (
                <>
                  <div className="boot-prompt">{'> OPERATOR IDENTIFICATION REQUIRED'}</div>
                  <label className="boot-field-label" htmlFor="op-name">OPERATOR NAME / CALLSIGN</label>
                  <input
                    id="op-name"
                    name="operator"
                    className="boot-input"
                    type="text"
                    placeholder={`e.g. ${IDENTITY.defaultOperator}`}
                    autoComplete="off"
                    autoFocus
                    spellCheck={false}
                    maxLength={42}
                    value={name}
                    onChange={(e) => setName(cleanInput(e.target.value))}
                    onKeyDown={onKeyInput}
                  />
                  <button
                    className={`boot-access${ready ? ' ready' : ''}`}
                    type="button"
                    onClick={() => onSubmit(name)}
                  >
                    {courseLoading ? 'LOADING COURSE…' : '[ ACCESS TERMINAL ]'}
                  </button>
                  <div className="boot-returning">
                    <span className="boot-rule" />
                    <span className="boot-returning-text">RETURNING OPERATOR?</span>
                    <span className="boot-rule" />
                  </div>
                  <label className="boot-slot">
                    <span className="boot-shard-icon" />
                    [ SLOT SERVICE RECORD SHARD ]
                    <input
                      className="boot-file"
                      type="file"
                      accept=".shard,.json,application/json"
                      onChange={onFile}
                    />
                  </label>
                  {importMsg && (
                    <div className={`boot-import-msg${importMsg.ok ? ' ok' : ''}`} role="alert">
                      {'> '}{importMsg.text}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!bootDone && (
            <div className="boot-skip-hint">{'// CLICK OR PRESS ANY KEY TO SKIP'}</div>
          )}
        </div>
      </div>
    </section>
  );
}
