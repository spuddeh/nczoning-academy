// Top-level app: owns the operator/course state, wires the Progress adapter,
// and shows Boot (login) until an operator signs in, then the app.
// (react-router comes in once there are multiple post-login views to route.)
import { useState } from 'react';
import { Boot } from './views/Boot';
import { Dashboard } from './views/Dashboard';
import { AppHeader } from './components/AppHeader';
import { IDENTITY, RECORD_SCHEMA, sanitizeName, createProgress, loadCourse, normalizeRecord } from './lib/academy';
import type { Course, ProgressRecord } from './lib/types';

export function App() {
  const [user, setUser] = useState('');
  const [course, setCourse] = useState<Course | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [slotError, setSlotError] = useState('');

  // One Progress adapter for the app's lifetime, with the five injected callbacks.
  // (buildSnapshot AND currentName close over first-render state — both must read
  // live state via a ref once we implement saving. Safe today only because enter()
  // calls setUser before any save.)
  const [progress] = useState(() => createProgress({
    persistEnabled: () => !!window.ACADEMY_CONFIG?.persist,
    buildSnapshot: () => ({ schema: RECORD_SCHEMA, user, course: course?.id, progress: {} }),
    normalize: normalizeRecord,
    sanitize: (n) => sanitizeName(n),
    currentName: () => user,
  }));

  async function enter(name: string) {
    const clean = sanitizeName(name) || IDENTITY.defaultOperator;
    setUser(clean);
    progress?.setUser(clean);
    setCourse(await loadCourse());
    setSignedIn(true);
  }

  async function login(name: string) {
    await enter(name);
  }

  async function slot(json: string) {
    if (!progress) return;
    let rec: ProgressRecord | null = null;
    try { rec = progress.import(json); } catch { rec = null; }
    if (!rec) {
      setSlotError('> SHARD REJECTED: NOT A VALID SERVICE RECORD');
      return;
    }
    setSlotError('');
    await enter(rec.user ?? '');
  }

  if (signedIn) {
    return (
      <>
        <AppHeader course={course} />
        <Dashboard user={user} course={course} />
        <div className="sys-readout">
          <span className="sys-status">[SYSTEM_STATUS: NOMINAL]</span>
          <span className="sys-offset">SYNC_OFFSET: 42.00ms</span>
        </div>
      </>
    );
  }
  return <Boot onLogin={login} onSlot={slot} lastUser={progress?.lastUser() ?? ''} slotError={slotError} />;
}
