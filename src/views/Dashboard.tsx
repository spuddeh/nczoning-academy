// Dashboard content: orientation card, heading, the available course grid, and
// the external-link relays. (SYSTEM_STATUS readout lives in App; radio pill and
// glossary FAB come with their own feature slices.)
import { useState } from 'react';
import type { Course } from '../lib/types';

const LINKS = [
  { label: 'NC ZONING MAP', url: 'https://nczoning.net/' },
  { label: 'LOCATIONS HUB DISCORD', url: 'https://discord.gg/sc4yEx2fNf' },
  { label: 'SUPPORT ON KO-FI', url: 'https://ko-fi.com/nczoning' },
  { label: 'MAP REPOSITORY', url: 'https://github.com/spuddeh/nc-zoning-board' },
  { label: 'ACADEMY REPOSITORY', url: 'https://github.com/spuddeh/nczoning-academy' },
];

interface DashboardProps {
  user: string;
  course: Course | null;
}

export function Dashboard({ course }: DashboardProps) {
  const modCount = course?.modules?.length ?? 0;
  const [showOrient, setShowOrient] = useState(true);

  return (
    <main className="dash">
      <div className="dash-terminal">&gt; ACCESS GRANTED. RENDERING AVAILABLE COURSEWARE...</div>
      <h1 className="dash-h1">OPERATOR DASHBOARD</h1>
      <p className="dash-lead">
        Select a training program to begin. Completion raises standing and pays eddies.
      </p>

      {showOrient && (
        <div className="orient-card">
          <button className="orient-dismiss" type="button" aria-label="Dismiss" onClick={() => setShowOrient(false)}>
            &#10005;
          </button>
          <span className="orient-title">NEW OPERATOR // ORIENTATION</span>
          This terminal keeps no cloud account. Your progress lives on a <b>Service Record Shard</b> —
          hit <b>SAVE PROGRESS</b> inside any module to eject one, then <b>SLOT SHARD</b> from the
          Service Record page to pick up where you left off, on any machine.
        </div>
      )}

      <div className="dash-section-hdr">AVAILABLE COURSES <b>[ 1 ]</b></div>
      <div className="course-grid">
        <article className="course-card">
          <div className="course-tag">COURSE // <b>{(course?.id ?? 'data-api').toUpperCase()}</b></div>
          <div className="course-title">{course?.title ?? 'TRANSMISSION PROTOCOLS'}</div>
          <div className="course-sub">{course?.subtitle ?? 'The NC Zoning Data API'}</div>
          <div className="course-meta">
            <span>&#9089; {course?.estMinutes ?? 120} MIN</span>
            <span>{modCount} MODULES</span>
          </div>
          <div className="course-progress">PROGRESS 0 / {modCount}</div>
          <button className="course-begin" type="button">[ BEGIN PROGRAM ]</button>
        </article>
      </div>

      <div className="dash-section-hdr">TRANSMISSION RELAYS <b>// EXTERNAL LINKS</b></div>
      <div className="dash-links">
        {LINKS.map((l) => (
          <a key={l.url} className="dash-link" href={l.url} target="_blank" rel="noreferrer">
            {l.label}
          </a>
        ))}
      </div>
    </main>
  );
}
