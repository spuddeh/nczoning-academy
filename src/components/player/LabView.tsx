// Lab runner: canned responses only (SIMULATION MODE, no live network).
// Honours the course's per-lab data contract: `request.editable` declares
// which query params / headers the operator can edit ('query.full',
// 'headers.If-None-Match', ...), and canned `when` conditions select the
// response — 'default' (fallback), 'if-none-match-matches' (the edited
// If-None-Match equals the default response's ETag → 304), or a generic
// '<key>=<value>' matched against the edited query/header value (m01's
// 'full=1'). GAP FIX vs the monolith, which hardcoded a single If-None-Match
// input onto every lab and could never serve m01's full=1 response.
// Visual spec: docs/monolith-parity-spec.md — "Lab".
import { useState } from 'react';
import type { Lab, LabCanned } from '../../lib/types';
import { Md, SectionLabel, SourcesRow, StageCard } from './primitives';

const stripQuotes = (s: string) => s.trim().replace(/^"|"$/g, '');

// current value of an editable/base field, by 'query.k' / 'headers.k' path
function fieldValue(lab: Lab, edits: Record<string, string>, path: string): string {
  if (path in edits) return edits[path];
  const [kind, ...rest] = path.split('.');
  const key = rest.join('.');
  const req = lab.request ?? {};
  if (kind === 'query') return req.query?.[key] ?? '';
  if (kind === 'headers') return req.headers?.[key] ?? '';
  return '';
}

function pickResponse(lab: Lab, edits: Record<string, string>): LabCanned | null {
  const canned = lab.canned ?? [];
  const def = canned.find((c) => c.when === 'default') ?? canned[0] ?? null;
  for (const c of canned) {
    if (c === def || c.when === 'default') continue;
    if (c.when === 'if-none-match-matches') {
      const sent = stripQuotes(fieldValue(lab, edits, 'headers.If-None-Match'));
      const defEtag = def?.headers?.ETag ? stripQuotes(def.headers.ETag) : null;
      if (defEtag && sent && sent === defEtag) return c;
      continue;
    }
    const kv = /^([^=]+)=(.*)$/.exec(c.when);
    if (kv) {
      const [, key, val] = kv;
      const sent = fieldValue(lab, edits, `query.${key}`).trim() || fieldValue(lab, edits, `headers.${key}`).trim();
      if (sent === val) return c;
    }
    // other `when` states ('stale', 'not-ready', ...) are not operator-reachable
  }
  return def;
}

// display path incl. the query string built from current values
function displayPath(lab: Lab, edits: Record<string, string>): string {
  const req = lab.request ?? {};
  const q = { ...(req.query ?? {}) };
  for (const [path, v] of Object.entries(edits)) {
    if (path.startsWith('query.')) q[path.slice(6)] = v;
  }
  const qs = Object.entries(q).filter(([, v]) => v !== '').map(([k, v]) => `${k}=${v}`).join('&');
  return (req.path ?? '') + (qs ? `?${qs}` : '');
}

export function LabView({ lab }: { lab: Lab }) {
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [resp, setResp] = useState<LabCanned | null>(null);
  const req = lab.request ?? {};
  const editable = req.editable ?? [];
  const statusClass = resp ? (resp.status < 300 ? 'ok' : resp.status < 400 ? 'warn' : 'err') : '';
  const statusColor = resp ? (resp.status < 300 ? 'var(--success)' : resp.status < 400 ? 'var(--secondary)' : 'var(--danger)') : 'var(--muted)';
  const statusText = resp
    ? (resp.status === 200 ? 'OK' : resp.status === 304 ? 'NOT MODIFIED' : resp.status === 429 ? 'TOO MANY REQUESTS' : resp.status === 503 ? 'SERVICE UNAVAILABLE' : '')
    : '';

  return (
    <StageCard>
      <SectionLabel text={`LAB // ${lab.title ?? 'CONSOLE'}`} />
      <div className="lab-sim">
        <span className="lab-sim-led ledblink" />
        <span className="lab-sim-text">SIMULATION MODE — RESPONSES ARE CANNED, NO LIVE NETWORK</span>
      </div>
      {lab.briefing && <div className="lab-brief"><Md text={lab.briefing} /></div>}

      {/* the authored try-and-see procedure (issue #14: the shell dropped
          lab.steps entirely) — numbered like the module's MISSION OBJECTIVES */}
      {(lab.steps ?? []).length > 0 && (
        <div className="lab-steps">
          <div className="lab-label">PROCEDURE</div>
          <div className="stage-list">
            {(lab.steps ?? []).map((s, i) => (
              <div key={i} className="stage-list-row">
                <span className="stage-list-num">[{String(i + 1).padStart(2, '0')}]</span>
                <span><Md text={s} /></span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="lab-request">
        <div className="lab-label">REQUEST</div>
        <div className="lab-method-line">
          <span className="lab-method">{req.method ?? 'GET'}</span> {displayPath(lab, edits)}
        </div>
        {editable.map((path) => {
          const [kind, ...rest] = path.split('.');
          const key = rest.join('.');
          const label = kind === 'query' ? `?${key}=` : `${key}:`;
          const placeholder = kind === 'headers' && key === 'If-None-Match' ? '"paste ETag here"' : '';
          return (
            <div key={path} className="lab-field-row" style={{ marginTop: 6 }}>
              <label className="lab-field-label" htmlFor={`lab-${lab.id ?? 'x'}-${key}`}>{label}</label>
              <input
                id={`lab-${lab.id ?? 'x'}-${key}`}
                className="lab-field"
                value={fieldValue(lab, edits, path)}
                onChange={(e) => setEdits((v) => ({ ...v, [path]: e.target.value }))}
                placeholder={placeholder}
              />
            </div>
          );
        })}
        <button type="button" className="lab-transmit" onClick={() => setResp(pickResponse(lab, edits))}>
          [ TRANSMIT ]
        </button>
      </div>

      {resp && (
        <div className={`lab-resp ${statusClass}`}>
          <div className="lab-resp-hdr">
            <span className="lab-resp-dot" style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
            <span className="lab-resp-status" style={{ color: statusColor }}>
              HTTP {resp.status} {statusText}
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
