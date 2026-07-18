// Stage primitives shared by every module-player stage: the card frame,
// section label, terminal block, markdown-lite renderer, and sources row.
// Measured spec: docs/monolith-parity-spec.md, "Stage primitives".
import type { ReactNode } from 'react';
import type { Source } from '../../lib/types';

export type Accent =
  | 'default' | 'green' | 'red' | 'amber'
  | 'green-strong' | 'gold' | 'green-soft';

export function StageCard({ accent = 'default', children }: { accent?: Accent; children: ReactNode }) {
  const cls = accent === 'default' ? '' : ` accent-${accent}`;
  return <div className={`stage-card${cls}`}>{children}</div>;
}

export function SectionLabel({ text, tone = 'cyan' }: { text: string; tone?: 'cyan' | 'amber' | 'green' }) {
  return (
    <div className={`section-label${tone === 'cyan' ? '' : ` ${tone}`}`}>
      <span className="section-label-text">{text}</span>
      <span className="section-label-rule" />
    </div>
  );
}

export function TerminalBlock({ lines }: { lines: string[] }) {
  return (
    <div className="terminal-block">
      {lines.map((raw, i) => {
        const ln = raw.replace(/&gt;/g, '>');
        return (
          <div key={i} className={`terminal-line${ln.startsWith('>') ? ' prompt' : ''}`}>{ln}</div>
        );
      })}
    </div>
  );
}

// markdown-lite: **bold**, *em*, `code`, [label](url); nothing else.
export function Md({ text }: { text: string | undefined }) {
  if (text == null) return null;
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) out.push(<strong key={k++} className="md-strong">{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) out.push(<code key={k++} className="md-code">{t.slice(1, -1)}</code>);
    else if (t.startsWith('*')) out.push(<em key={k++} className="md-em">{t.slice(1, -1)}</em>);
    else {
      const mt = /\[([^\]]+)\]\(([^)]+)\)/.exec(t);
      if (mt) out.push(<a key={k++} href={mt[2]} target="_blank" rel="noreferrer">{mt[1]}</a>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

export function SourcesRow({ list }: { list?: Source[] }) {
  if (!list?.length) return null;
  return (
    <div className="stage-sources">
      <span className="stage-sources-label">SOURCES:</span>
      {list.map((s, i) => (
        <a
          key={i}
          className={`stage-source${s.kind === 'project' ? ' project' : ''}`}
          href={s.url}
          target="_blank"
          rel="noreferrer"
        >
          {(s.kind === 'project' ? '⟠ ' : '↗ ') + s.label}
        </a>
      ))}
    </div>
  );
}
