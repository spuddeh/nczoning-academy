// Content-chunk renderer: text / code / table / callout / terminal-log.
// Measured spec: docs/monolith-parity-spec.md — "Chunk types".
import type { Chunk } from '../../lib/types';
import { Md, SourcesRow, StageCard, TerminalBlock } from './primitives';

const CALLOUT_LABEL: Record<string, string> = { info: 'INFO', warning: 'CAUTION', policy: 'POLICY' };

export function ChunkView({ chunk }: { chunk: Chunk }) {
  let body;
  if (chunk.type === 'text') {
    body = <p className="chunk-text"><Md text={chunk.body} /></p>;
  } else if (chunk.type === 'code') {
    body = (
      <div className="chunk-code">
        <div className="chunk-code-hdr">
          <span>{(chunk.lang ?? 'text').toUpperCase()}</span>
          <span>{'// SNIPPET'}</span>
        </div>
        <pre className="chunk-code-pre">{chunk.body}</pre>
      </div>
    );
  } else if (chunk.type === 'table') {
    body = (
      <div>
        <div className="chunk-table-wrap">
          <table className="chunk-table">
            <thead>
              <tr>{(chunk.columns ?? []).map((c, i) => <th key={i}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {(chunk.rows ?? []).map((r, ri) => (
                <tr key={ri}>{r.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        {chunk.body && <div className="chunk-table-caption"><Md text={chunk.body} /></div>}
      </div>
    );
  } else if (chunk.type === 'callout') {
    const variant = chunk.variant ?? 'info';
    body = (
      <div className={`chunk-callout${variant === 'info' ? '' : ` ${variant}`}`}>
        <div className="chunk-callout-label">⚠ {CALLOUT_LABEL[variant] ?? 'NOTE'}</div>
        <div className="chunk-callout-body"><Md text={chunk.body} /></div>
      </div>
    );
  } else if (chunk.type === 'terminal-log') {
    body = <TerminalBlock lines={chunk.lines ?? []} />;
  }

  return (
    <StageCard>
      {chunk.heading && <div className="chunk-heading">{chunk.heading}</div>}
      {body}
      <SourcesRow list={chunk.sources} />
    </StageCard>
  );
}
