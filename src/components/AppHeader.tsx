// App header (shared chrome for every post-login view): brand, nav, operator
// clearance, and the eddies balance. Values measured from the monolith.
import type { Course } from '../lib/types';

interface AppHeaderProps {
  course: Course | null;
  clearance?: string;
  balance?: number;
}

export function AppHeader({ course, clearance = 'LVL 1 PROBATIONARY OPERATOR', balance }: AppHeaderProps) {
  const sym = course?.economy?.symbol ?? '€$';
  const bal = balance ?? course?.economy?.startingBalance ?? 500;
  return (
    <header className="app-header">
      <div className="hdr-brand">
        <img className="hdr-logo" src="/assets/nightcorp-logo.svg" alt="Night Corp" />
        <div className="hdr-brand-text">
          <span className="hdr-wordmark">ZONING ACADEMY</span>
          <span className="hdr-sub">URBAN PLANNING DIVISION // TERMINAL NC-ACAD-01</span>
        </div>
      </div>
      <nav className="hdr-nav">
        <button className="hdr-nav-btn active" type="button">DASHBOARD</button>
        <button className="hdr-nav-btn" type="button">SERVICE RECORD</button>
      </nav>
      <div className="hdr-meta">
        <div className="hdr-clearance">
          <span className="hdr-clearance-label">OPERATOR CLEARANCE</span>
          <span className="hdr-clearance-val">{clearance}</span>
        </div>
        <button className="hdr-balance" type="button" title="View transaction history">
          <span className="hdr-balance-label">BALANCE</span>
          <span className="hdr-balance-val">{sym} {bal}</span>
        </button>
      </div>
    </header>
  );
}
