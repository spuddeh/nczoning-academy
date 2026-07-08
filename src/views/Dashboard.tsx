// Dashboard view (STUB) — proves login -> course load -> route with the real
// course. Replaced with the full dashboard in the next slice.
import type { Course } from '../lib/types';

interface DashboardProps {
  user: string;
  course: Course | null;
}

export function Dashboard({ user, course }: DashboardProps) {
  const mods = course?.modules ?? [];
  return (
    <section className="view-stub">
      <h1>DASHBOARD</h1>
      <p>Operator: {user || '—'}</p>
      <p>Course: {(course?.title ?? '(none loaded)') + (mods.length ? ` — ${mods.length} modules` : '')}</p>
      <p className="muted">React + TypeScript + Vite. The full dashboard is the next slice.</p>
    </section>
  );
}
