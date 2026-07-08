// Boot / login view — React + JSX port of the measured boot screen.
// Reuses public/assets/css/boot.css unchanged, so the pixels stay identical.
import { useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { IDENTITY, bootLines } from '../lib/academy';

interface BootProps {
  onLogin: (name: string) => void;
  onSlot: (json: string) => void;
  lastUser: string;
}

export function Boot({ onLogin, onSlot, lastUser }: BootProps) {
  const [name, setName] = useState(lastUser);

  const logText = [
    IDENTITY.division,
    `Terminal ID: ${IDENTITY.terminalId}`,
    '',
    ...bootLines(),
    '',
    'Mission: master the systems of the NC Zoning Board.',
    'Complete modules to raise standing and earn eddies.',
  ].join('\n');

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => onSlot(String(reader.result));
    reader.readAsText(f);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') onLogin(name);
  }

  return (
    <section className="boot-screen">
      <div className="boot-card">
        <header className="boot-titlebar">
          <span className="boot-tb-title">{IDENTITY.division}</span>
          <span className="boot-tb-id">{IDENTITY.terminalId}</span>
        </header>
        <div className="boot-body">
          <pre className="boot-log">{logText}<span className="cursor" /></pre>
          <div className="boot-form">
            <div className="boot-divider" />
            <div className="boot-prompt">{'> OPERATOR IDENTIFICATION REQUIRED'}</div>
            <label className="boot-field-label" htmlFor="op-name">OPERATOR NAME / CALLSIGN</label>
            <input
              id="op-name"
              name="operator"
              className="boot-input"
              type="text"
              placeholder={`e.g. ${IDENTITY.defaultOperator}`}
              autoComplete="off"
              spellCheck={false}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={onKey}
            />
            <button className="boot-access" type="button" onClick={() => onLogin(name)}>
              [ ACCESS TERMINAL ]
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
          </div>
        </div>
      </div>
    </section>
  );
}
