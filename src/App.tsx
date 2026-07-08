// Top-level app: owns the operator/course state, wires the Progress adapter,
// and shows Boot (login) until an operator signs in, then the app.
// (react-router comes in once there are multiple post-login views to route.)
import { useState } from 'react';
import { Boot } from './views/Boot';
import { Dashboard } from './views/Dashboard';
import { AppHeader } from './components/AppHeader';
import { IDENTITY, RECORD_SCHEMA, sanitizeName, createProgress, loadCourse } from './lib/academy';
import type { Course, ProgressRecord } from './lib/types';

export function App() {
  const [user, setUser] = useState('');
  const [course, setCourse] = useState<Course | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  // One Progress adapter for the app's lifetime, with the five injected callbacks.
  // (buildSnapshot will read live state via a ref once we implement saving.)
  const [progress] = useState(() => createProgress({
    persistEnabled: () => !!window.ACADEMY_CONFIG?.persist,
    buildSnapshot: () => ({ schema: RECORD_SCHEMA, user, course: course?.id, progress: {} }),
    normalize: (rec) => (rec as ProgressRecord) ?? {},
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
    if (!rec) return;
    await enter(rec.user ?? '');
  }

  if (signedIn) {
    return (
      <>
        <AppHeader course={course} />
        <Dashboard user={user} course={course} />
      </>
    );
  }
  return <Boot onLogin={login} onSlot={slot} lastUser={progress?.lastUser() ?? ''} />;
}
