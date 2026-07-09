// Lab runner: canned responses only (SIMULATION MODE, no live network).
// The one interactive input is If-None-Match; when it matches the default
// response's ETag, the 304 canned response is served.
// Measured spec: docs/monolith-parity-spec.md — "Lab".
import { useState } from 'react';
import type { Lab, LabCanned } from '../../lib/types';
import { Md, SectionLabel, SourcesRow, StageCard } from './primitives';

function pickResponse(lab: Lab, field: string): LabCanned | null {
  const canned = lab.canned ?? [];
  const def = canned.find((c) => c.when === 'default') ?? canned[0] ?? null;
  const match = canned.find((c) => c.when === 'if-none-match-matches');
  const clean = field.trim().replace(/^"|"$/g, '');
  const defEtag = def?.headers?.ETag?.replace(/^"|"$/g, '') ?? null;
  if (match && defEtag && clean && clean === defEtag) return match;
  return def;
}

export function LabView({ lab }: { lab: Lab }) {
  const [field, setField] = useState('');
  const [resp, setResp] = useState<LabCanned | null>(null);
  const req = lab.request ?? {};
  const statusClass = resp ? (resp.status < 300 ? 'ok' : resp.status < 400 ? 'warn' : 'err') : '';
  const statusColor = resp ? (resp.status < 300 ? 'var(--success)' : resp.status < 400 ? 'var(--secondary)' : 'var(--danger)') : 'var(--muted)';

  return (
    <StageCard>
      <SectionLabel text={`LAB // ${lab.title ?? 'CONSOLE'}`} />
      <div className="lab-sim">
        <span className="lab-sim-led ledblink" />
        <span className="lab-sim-text">SIMULATION MODE — RESPONSES ARE CANNED, NO LIVE NETWORK</span>
      </div>
      {lab.briefing && <div className="lab-brief"><Md text={lab.briefing} /></div>}

      <div className="lab-request">
        <div className="lab-label">REQUEST</div>
        <div className="lab-method-line">
          <span className="lab-method">{req.method ?? 'GET'}</span> {req.path ?? ''}
        </div>
        <div className="lab-field-row">
          <label className="lab-field-label" htmlFor={`lab-field-${lab.id ?? 'x'}`}>If-None-Match:</label>
          <input
            id={`lab-field-${lab.id ?? 'x'}`}
            className="lab-field"
            value={field}
            onChange={(e) => setField(e.target.value)}
            placeholder='"paste ETag here"'
          />
        </div>
        <button type="button" className="lab-transmit" onClick={() => setResp(pickResponse(lab, field))}>
          [ TRANSMIT ]
        </button>
      </div>

      {resp && (
        <div className={`lab-resp ${statusClass}`}>
          <div className="lab-resp-hdr">
            <span className="lab-resp-dot" style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
            <span className="lab-resp-status" style={{ color: statusColor }}>
              HTTP {resp.status} {resp.status === 200 ? 'OK' : resp.status === 304 ? 'NOT MODIFIED' : ''}
            </span>
          </div>
          <div className="lab-resp-body">
            <div className="lab-resp-label">HEADERS OF INTEREST</div>
            {Object.entries(resp.headers ?? {}).map(([k, v], i) => (
              <div key={i} className="lab-header-line"><span className="k">{k}: </span>{v}</div>
            ))}
            <div className="lab-resp-label" style={{ margin: '14px 0 6px' }}>BODY</div>
            {resp.body == null
              ? <div className="lab-nobody">(no body)</div>
              : <pre className="lab-json">{JSON.stringify(resp.body, null, 2)}</pre>}
          </div>
        </div>
      )}

      {resp && lab.debrief && <div className="lab-debrief"><Md text={lab.debrief} /></div>}
      <SourcesRow list={lab.sources} />
    </StageCard>
  );
}
