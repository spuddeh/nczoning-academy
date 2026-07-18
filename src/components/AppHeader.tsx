// Shared app header chrome: brand, nav tabs, clearance + balance cluster.
// Measured spec: docs/monolith-parity-spec.md, "App shell". The balance
// button opens the transaction-history modal; the header GLOSSARY button is
// the ≤640px opener (the FAB hides there). DASHBOARD is the active tab for
// both the dashboard and player views (the monolith's navTabStyle rule).
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IDENTITY, clearanceAndRank } from '../lib/academy';
import type { Course } from '../lib/types';

interface AppHeaderProps {
  course: Course | null;
  moduleDone: Record<string, unknown>;
  eddies: number;
  balPulse?: string | null;
  glossaryOpen: boolean;
  onOpenGlossary: () => void;
  onOpenTxns: () => void;
  onLogout: () => void;
  /** SYSTEM BROADCAST bell (issue #10) */
  unread: number;
  alertLive: boolean;
  broadcastOpen: boolean;
  onToggleBroadcast: () => void;
}

export function AppHeader({
  course, moduleDone, eddies, balPulse, glossaryOpen, onOpenGlossary, onOpenTxns, onLogout,
  unread, alertLive, broadcastOpen, onToggleBroadcast,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const path = useLocation().pathname;
  const dashActive = path === '/dashboard' || path.startsWith('/module');
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
        <button
          className={`hdr-nav-btn${dashActive ? ' active' : ''}`}
          type="button"
          onClick={() => navigate('/dashboard')}
        >
          DASHBOARD
        </button>
        <button
          className={`hdr-nav-btn${path === '/record' ? ' active' : ''}`}
          type="button"
          onClick={() => navigate('/record')}
        >
          SERVICE RECORD
        </button>
      </nav>
      <div className="hdr-meta">
        <button
          className={`gloss-hdr${glossaryOpen ? ' open' : ''}`}
          type="button"
          title="Open glossary"
          onClick={onOpenGlossary}
        >
          <BookIcon size={14} />
          GLOSSARY
        </button>
        <div className="hdr-clearance">
          <div className="hdr-clearance-label">OPERATOR CLEARANCE</div>
          <div className="hdr-clearance-val">LVL {clearance} {rankTitle}</div>
        </div>
        <button
          id="op-balance"
          className="hdr-balance"
          type="button"
          title="View transaction history"
          onClick={onOpenTxns}
          style={balPulse ? { boxShadow: `0 0 18px ${balPulse}`, borderColor: balPulse } : undefined}
        >
          <div className="hdr-balance-row">
            <div className="hdr-balance-label">BALANCE</div>
            <svg className="hdr-balance-icon" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#8892b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </div>
          <div className={`hdr-balance-val${eddies < 0 ? ' negative' : ''}`}>{symbol} {eddies}</div>
        </button>
        <button
          className={`hdr-bell${broadcastOpen ? ' open' : ''}`}
          type="button"
          title="System broadcast"
          onClick={onToggleBroadcast}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="1" />
            <path d="m22 6-10 7L2 6" />
          </svg>
          {alertLive
            ? <span className="hdr-bell-dot ledblink" />
            : unread > 0 && <span className="hdr-bell-count">{unread}</span>}
        </button>
        <button
          className="hdr-logout"
          type="button"
          title="End session and return to the lock screen"
          onClick={onLogout}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
            <line x1="12" y1="2" x2="12" y2="11" />
          </svg>
          <span className="hdr-logout-txt">JACK OUT</span>
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
