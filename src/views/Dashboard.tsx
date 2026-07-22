// Dashboard view: terminal line, H1, orientation card, course card (blueprint
// hero, chips, progress bar, CTA), and the transmission relays. Measured spec:
// docs/monolith-parity-spec.md, "Dashboard view".
//
// Deliberate fix vs the monolith: the courses counter shows the number of
// courses (1), not modules; the monolith shows mods.length under an
// "AVAILABLE COURSES" label, which is a bug.
import { useState } from 'react';
import { sortedModules } from '../lib/academy';
import { partialFrac } from '../lib/player';
import type { Course } from '../lib/types';

type LinkKind = 'cyan' | 'gold' | 'gray';
interface Relay { label: string; url: string; kind: LinkKind; icon: 'map' | 'discord' | 'kofi' | 'github'; }

const LINKS: Relay[] = [
  { label: 'NC ZONING MAP', icon: 'map', url: 'https://nczoning.net', kind: 'cyan' },
  { label: 'LOCATIONS HUB DISCORD', icon: 'discord', url: 'https://discord.gg/sc4yEx2fNf', kind: 'cyan' },
  { label: 'SUPPORT ON KO-FI', icon: 'kofi', url: 'https://ko-fi.com/nczoning', kind: 'gold' },
  { label: 'MAP REPOSITORY', icon: 'github', url: 'https://github.com/spuddeh/nc-zoning-board', kind: 'gray' },
  { label: 'ACADEMY REPOSITORY', icon: 'github', url: 'https://github.com/spuddeh/nczoning-academy', kind: 'gray' },
];

interface DashboardProps {
  course: Course | null;
  moduleDone: Record<string, unknown>;
  revealedBy: Record<string, number>;
  onOpenCourse: () => void;
}

export function Dashboard({ course, moduleDone, revealedBy, onOpenCourse }: DashboardProps) {
  const c = course ?? {};
  const mods = sortedModules(c);
  const doneCount = mods.filter((m) => moduleDone[m.id]).length;
  const startedCount = mods.filter((m) => !moduleDone[m.id] && partialFrac(m, moduleDone, revealedBy) > 0).length;
  const anyProgress = doneCount > 0 || startedCount > 0;
  // course fraction with partial-module credit (the monolith's courseFrac)
  const frac = mods.length
    ? mods.reduce((a, m) => a + partialFrac(m, moduleDone, revealedBy), 0) / mods.length
    : 0;
  // orientation card: session-scoped (resets on reload, like the monolith)
  const [firstRunSeen, setFirstRunSeen] = useState(false);
  const showOrient = !anyProgress && !firstRunSeen;

  return (
    <main className="dash-scroll">
      <div className="dash">
        <div className="dash-terminal">&gt; ACCESS GRANTED. RENDERING AVAILABLE COURSEWARE...</div>
        <h1 className="dash-h1">OPERATOR DASHBOARD</h1>
        <p className="dash-lead">
          Select a training program to begin. Completion raises standing and pays eddies.
        </p>

        {showOrient && (
          <div className="orient-card">
            <span className="orient-icon" />
            <div className="orient-content">
              <div className="orient-title">NEW OPERATOR // ORIENTATION</div>
              <div className="orient-body">
                This terminal keeps no cloud account. Your progress lives on a <b>Service Record Shard</b>. Hit{' '}
                <b>SAVE PROGRESS</b> inside any module to eject one, then <b>SLOT SHARD</b> from the Service
                Record page to pick up where you left off, on any machine.
              </div>
            </div>
            <button className="orient-dismiss" type="button" title="Dismiss" onClick={() => setFirstRunSeen(true)}>
              &#10005;
            </button>
          </div>
        )}

        <div className="dash-section-hdr">AVAILABLE COURSES <b>[ 1 ]</b></div>
        <div className="course-grid">
          <article className="course-card" onClick={onOpenCourse}>
            <div className="course-hero">
              <div className="course-hero-grid" />
              <div className="course-tag">COURSE // {(c.id ?? 'course').toUpperCase()}</div>
              <div className="course-watermark">{mods.length}</div>
            </div>
            <div className="course-body">
              <div className="course-title">{c.title ?? 'COURSE'}</div>
              <div className="course-title-bar" />
              <div className="course-sub">{c.subtitle ?? ''}</div>
              <div className="course-chips">
                <span className="course-chip">&#8961; {c.estMinutes ?? 0} MIN</span>
                <span className="course-chip">{mods.length} MODULES</span>
                {typeof c.version === 'string' && <span className="course-chip">V{c.version}</span>}
              </div>
              <div className="course-progress-row">
                <span>PROGRESS</span>
                <span className="course-progress-count">{doneCount} / {mods.length}</span>
              </div>
              <div className="course-bar">
                <div className="course-bar-fill" style={{ width: `${Math.round(frac * 100)}%` }} />
              </div>
              <button className="course-cta" type="button" onClick={onOpenCourse}>
                [ {anyProgress ? 'RESUME PROGRAM' : 'BEGIN PROGRAM'} ]
              </button>
            </div>
          </article>
        </div>

        <div className="dash-relays">
          <div className="dash-section-hdr dash-relays-hdr">TRANSMISSION RELAYS <b>// EXTERNAL LINKS</b></div>
          <div className="dash-links">
            {LINKS.map((l) => (
              <a key={l.url} className={`dash-link ${l.kind}`} href={l.url} target="_blank" rel="noreferrer">
                <RelayIcon icon={l.icon} />
                <span>{l.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function RelayIcon({ icon }: { icon: Relay['icon'] }) {
  if (icon === 'kofi') return <img className="dash-link-kofi" src="/assets/kofi.webp" alt="" />;
  if (icon === 'map') {
    return (
      <span className="dash-link-icon">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />
        </svg>
      </span>
    );
  }
  if (icon === 'discord') {
    return (
      <span className="dash-link-icon">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
          <path d="M18.8943 4.34399C17.5183 3.71467 16.057 3.256 14.5317 3C14.3396 3.33067 14.1263 3.77866 13.977 4.13067C12.3546 3.89599 10.7439 3.89599 9.14391 4.13067C8.99457 3.77866 8.77056 3.33067 8.58922 3C7.05325 3.256 5.59191 3.71467 4.22552 4.34399C1.46286 8.41865 0.716188 12.3973 1.08952 16.3226C2.92418 17.6559 4.69486 18.4666 6.4346 19C6.86126 18.424 7.24527 17.8053 7.57594 17.1546C6.9466 16.92 6.34927 16.632 5.77327 16.2906C5.9226 16.184 6.07194 16.0667 6.21061 15.9493C9.68793 17.5387 13.4543 17.5387 16.889 15.9493C17.0383 16.0667 17.177 16.184 17.3263 16.2906C16.7503 16.632 16.153 16.92 15.5236 17.1546C15.8543 17.8053 16.2383 18.424 16.665 19C18.4036 18.4666 20.185 17.6559 22.01 16.3226C22.4687 11.7787 21.2836 7.83202 18.8943 4.34399ZM8.05593 13.9013C7.01058 13.9013 6.15725 12.952 6.15725 11.7893C6.15725 10.6267 6.98925 9.67731 8.05593 9.67731C9.11191 9.67731 9.97588 10.6267 9.95454 11.7893C9.95454 12.952 9.11191 13.9013 8.05593 13.9013ZM15.065 13.9013C14.0196 13.9013 13.1652 12.952 13.1652 11.7893C13.1652 10.6267 13.9983 9.67731 15.065 9.67731C16.121 9.67731 16.985 10.6267 16.9636 11.7893C16.9636 12.952 16.1317 13.9013 15.065 13.9013Z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="dash-link-icon">
      <svg viewBox="0 0 98 96" width="17" height="17" fill="currentColor">
        <path d="M41.4395 69.3848C28.8066 67.8535 19.9062 58.7617 19.9062 46.9902C19.9062 42.2051 21.6289 37.0371 24.5 33.5918C23.2559 30.4336 23.4473 23.7344 24.8828 20.959C28.7109 20.4805 33.8789 22.4902 36.9414 25.2656C40.5781 24.1172 44.4062 23.543 49.0957 23.543C53.7852 23.543 57.6133 24.1172 61.0586 25.1699C64.0254 22.4902 69.2891 20.4805 73.1172 20.959C74.457 23.543 74.6484 30.2422 73.4043 33.4961C76.4668 37.1328 78.0937 42.0137 78.0937 46.9902C78.0937 58.7617 69.1934 67.6621 56.3691 69.2891C59.623 71.3945 61.8242 75.9883 61.8242 81.252L61.8242 91.2051C61.8242 94.0762 64.2168 95.7031 67.0879 94.5547C84.4102 87.9512 98 70.6289 98 49.1914C98 22.1074 75.9883 0 48.9043 0C21.8203 0 0 22.1074 0 49.1914C0 70.4375 13.4941 88.0469 31.6777 94.6504C34.2617 95.6074 36.75 93.8848 36.75 91.3008L36.75 83.6445C35.4102 84.2188 33.6875 84.6016 32.1562 84.6016C25.8398 84.6016 22.1074 81.1563 19.4277 74.7441C18.375 72.1602 17.2266 70.6289 15.0254 70.3418C13.877 70.2461 13.4941 69.7676 13.4941 69.1934C13.4941 68.0449 15.4082 67.1836 17.3223 67.1836C20.0977 67.1836 22.4902 68.9063 24.9785 72.4473C26.8926 75.2227 28.9023 76.4668 31.2949 76.4668C33.6875 76.4668 35.2187 75.6055 37.4199 73.4043C39.0469 71.7773 40.291 70.3418 41.4395 69.3848Z" />
      </svg>
    </span>
  );
}
