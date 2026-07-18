// Session continuity: the ONE module that touches sessionStorage (the way
// progress.js is the one module that touches localStorage). Holds a single
// snapshot of the live record so a mid-session refresh serves back the page
// the operator was on (issue #9).
//
// sessionStorage on purpose: it survives refresh and in-tab navigation but
// dies with the tab, so a fresh visit still lands on the lock screen; the
// front door and its broadcast panel stay intact. Not gated on
// ACADEMY_CONFIG.persist: persist controls durable operator profiles;
// serving a refresh back is browser-expected behaviour in both modes.
import type { ProgressRecord } from './types';

const KEY = 'ncza:v1:session';

/** Raw parsed snapshot, or null. Callers validate via migrateRecord (throws). */
export function readSession(): unknown | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null; // storage blocked or snapshot corrupt; treat as no session
  }
}

export function hasSession(): boolean {
  try {
    return !!window.sessionStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function writeSession(rec: ProgressRecord): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(rec));
  } catch { /* storage unavailable; refresh just lands on the lock */ }
}

export function clearSession(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch { /* nothing to clear */ }
}
