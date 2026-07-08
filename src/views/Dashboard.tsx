// Dashboard content: welcome terminal line, heading, the available course card,
// and the external-link relays. (Welcome/orientation card, SYSTEM_STATUS readout
// and the radio pill are follow-up pieces.)
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
  return (
    <main className="dash">
      <div className="dash-terminal">&gt; ACCESS GRANTED. RENDERING AVAILABLE COURSEWARE...</div>
      <h1 className="dash-h1">OPERATOR DASHBOARD</h1>
      <p className="dash-lead">
        Select a training program to begin. Completion raises standing and pays eddies.
      </p>

      <div className="dash-section-hdr">AVAILABLE COURSES <b>[ 1 ]</b></div>
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
