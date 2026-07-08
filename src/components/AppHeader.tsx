// Shared app header chrome: brand, nav tabs, clearance + balance cluster.
// Measured spec: docs/monolith-parity-spec.md — "App shell". The balance is a
// button (transaction history — later slice). SERVICE RECORD routes to the
// Service Record view when that slice lands.
import { useMemo } from 'react';
import { IDENTITY, clearanceAndRank } from '../lib/academy';
import type { Course } from '../lib/types';

interface AppHeaderProps {
  course: Course | null;
  moduleDone: Record<string, unknown>;
  eddies: number;
}

export function AppHeader({ course, moduleDone, eddies }: AppHeaderProps) {
  const { clearance, rankTitle } = useMemo(
    () => clearanceAndRank(course ?? {}, moduleDone),
    [course, moduleDone],
  );
  const symbol = course?.economy?.symbol ?? '€$';

  return (
    <header className="app-header">
      <div className="hdr-brand">
        <img className="hdr-logo" src="/assets/nightcorp-logo.svg" alt="Night Corp" />
        <div>
          <div className="hdr-brand-title">ZONING ACADEMY</div>
          <div className="hdr-sub">URBAN PLANNING DIVISION // TERMINAL {IDENTITY.terminalId}</div>
        </div>
      </div>
      <nav className="hdr-nav">
        <button className="hdr-nav-btn active" type="button">DASHBOARD</button>
        <button className="hdr-nav-btn" type="button">SERVICE RECORD</button>
      </nav>
      <div className="hdr-meta">
        <button className="gloss-hdr" type="button" title="Open glossary">
          <BookIcon size={14} />
          GLOSSARY
        </button>
        <div className="hdr-clearance">
          <div className="hdr-clearance-label">OPERATOR CLEARANCE</div>
          <div className="hdr-clearance-val">LVL {clearance} {rankTitle}</div>
        </div>
        <button className="hdr-balance" type="button" title="View transaction history">
          <div className="hdr-balance-row">
            <div className="hdr-balance-label">BALANCE</div>
            <svg className="hdr-balance-icon" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#8892b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </div>
          <div className={`hdr-balance-val${eddies < 0 ? ' negative' : ''}`}>{symbol} {eddies}</div>
        </button>
      </div>
    </header>
  );
}

export function BookIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.5C10.5 5.2 8 5 5.5 5H3v13h2.5c2.5 0 5 .2 6.5 1.5" />
      <path d="M12 6.5C13.5 5.2 16 5 18.5 5H21v13h-2.5c-2.5 0-5 .2-6.5 1.5" />
    </svg>
  );
}
