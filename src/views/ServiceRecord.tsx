// Service Record view: operator identity, standing stat cards, module
// status, certification stamps, and shard I/O (eject / slot / purge).
// Measured spec: docs/monolith-parity-spec.md — "Service Record view".
// The balance card shows the SETTLED eddies (op state), not the header's
// count-up value. <main> so the global keyboard scrolling targets it.
import { useRef } from 'react';
import type { Course } from '../lib/types';
import { clearanceAndRank, progressStats } from '../lib/academy';
import { SectionLabel } from '../components/player/primitives';

interface ServiceRecordProps {
  course: Course | null;
  moduleDone: Record<string, unknown>;
  eddies: number;
  operatorName: string;
  importMsg: { ok: boolean; text: string } | null;
  onNameChange: (v: string) => void;
  onEject: () => void;
  onSlotFile: (f: File) => void;
  onViewCert: () => void;
  onPurge: () => void;
  /** radio power state (issue #34): the reopen control lives here for now */
  radioClosed: boolean;
  onReopenRadio: () => void;
}

export function ServiceRecord({
  course, moduleDone, eddies, operatorName, importMsg,
  onNameChange, onEject, onSlotFile, onViewCert, onPurge,
  radioClosed, onReopenRadio,
}: ServiceRecordProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { mods, done, certified } = progressStats(course ?? {}, moduleDone);
  const { clearance, rankTitle } = clearanceAndRank(course ?? {}, moduleDone);
  const symbol = course?.economy?.symbol ?? '€$';

  return (
    <main className="record-main">
      <div className="record-inner">
        <div className="record-access-line">&gt; READING SERVICE RECORD SHARD...</div>
        <div className="record-title-row">
          <img src="/assets/shard-icon.svg" width={68} height={32} alt="" />
          <h1 className="record-h1">SERVICE RECORD SHARD</h1>
        </div>
        <div className="record-lede">
          Standing, completed modules and earned certifications, written to a datashard.
          Eject the shard to carry your progress, or slot a saved one to restore it.
        </div>

        <SectionLabel text="OPERATOR IDENTITY" />
        <div className="record-identity">
          <div className="record-id-field">
            <div className="record-id-label">OPERATOR NAME / CALLSIGN</div>
            <input
              className="record-id-input"
              value={operatorName}
              maxLength={42}
              placeholder="e.g. S. DORSETT"
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>
          <div className="record-id-caption">
            Prints on your field certificate and is written to your Service Record Shard.
          </div>
        </div>

        <div className="record-stats">
          <div className="stat-card cyan">
            <div className="stat-label">CLEARANCE</div>
            <div className="stat-val">LVL {clearance}</div>
          </div>
          <div className="stat-card cyan">
            <div className="stat-label">RANK</div>
            <div className="stat-val small">{rankTitle}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">MODULES CLEAR</div>
            <div className="stat-val">{done.length} / {mods.length}</div>
          </div>
          <div className={`stat-card ${eddies < 0 ? 'red' : 'gold'}`}>
            <div className="stat-label">EDDIES BALANCE</div>
            <div className="stat-val">{symbol} {eddies}</div>
          </div>
        </div>

        <SectionLabel text="MODULE STATUS" />
        <div className="record-mods">
          {mods.length ? mods.map((m) => {
            const md = !!moduleDone[m.id];
            return (
              <div key={m.id} className={`record-mod-row${md ? ' done' : ''}`}>
                <span className="record-mod-dot" />
                <div className="record-mod-body">
                  <div className="record-mod-title">{m.title}</div>
                  <div className="record-mod-meta">
                    CLR {m.clearance ?? 1} // {m.capstone ? 'CAPSTONE // ' : ''}{md ? 'COMPLETE' : 'NOT STARTED'}
                  </div>
                </div>
                <span className="record-mod-status">{md ? '✓ CERTIFIED' : '— PENDING'}</span>
              </div>
            );
          }) : <div className="record-no-mods">&gt; no modules in this course.</div>}
        </div>

        <SectionLabel text="EARNED CERTIFICATIONS" tone="green" />
        {done.length || certified ? (
          <div className="record-stamps">
            {certified && (
              <div className="stamp-cert">
                CERTIFIED
                <div className="stamp-cert-sub">FIELD OPERATOR</div>
              </div>
            )}
            {done.map((m) => (
              <div key={m.id} className="stamp">
                MODULE CLEAR
                <div className="stamp-sub">{(m.id ?? '').toUpperCase()}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="record-empty-stamps">
            &gt; NO CERTIFICATIONS ON RECORD. Complete a module to earn your first stamp.
          </div>
        )}

        <SectionLabel text="SERVICE RECORD SHARD // DATA TRANSFER" />
        <div className="record-io-row">
          <button type="button" className="record-io-btn cyan" onClick={onEject}>[ EJECT SHARD ]</button>
          <label style={{ display: 'inline-flex' }}>
            <span className="record-io-btn cyan" style={{ cursor: 'pointer' }} role="button">[ SLOT SHARD ]</span>
            <input
              ref={fileRef}
              type="file"
              accept=".shard,.json,application/json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onSlotFile(f);
                // reset so re-picking the same file fires again
                if (fileRef.current) fileRef.current.value = '';
              }}
            />
          </label>
          <button
            type="button"
            className="record-io-btn green"
            disabled={!certified}
            onClick={certified ? onViewCert : undefined}
          >
            [ VIEW CERTIFICATE ]
          </button>
        </div>
        {importMsg && (
          <div className={`record-msg ${importMsg.ok ? 'ok' : 'err'}`}>&gt; {importMsg.text}</div>
        )}
        {!certified && (
          <div className="record-locked-hint">
            &gt; CERTIFICATE LOCKED. Complete the capstone module to unlock the printable field certificate.
          </div>
        )}

        {radioClosed && (
          <div className="record-radio">
            <SectionLabel text="NC RADIO // OFFLINE" />
            <div className="record-io-row">
              <button type="button" className="record-io-btn cyan" onClick={onReopenRadio}>[ POWER ON RADIO ]</button>
              <span className="record-radio-caption">Radio powered down from the player. Powering on resumes your saved station.</span>
            </div>
          </div>
        )}

        <div className="record-danger">
          <button type="button" className="btn-purge" onClick={onPurge}>[ PURGE LOCAL CACHE ]</button>
          <span className="record-danger-caption">
            Wipes this terminal back to a clean record. Ejected shards are unaffected.
          </span>
        </div>
      </div>
    </main>
  );
}
