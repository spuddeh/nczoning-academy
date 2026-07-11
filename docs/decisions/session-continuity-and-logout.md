# Decision: refresh restores the session; logout and purge share one exit

Status: accepted (2026-07-11); resolves issues #9 and #4

## Context

Refreshing any in-app page bounced the operator to the lock screen. The
redirect was always there (`signedIn` was in-memory from day one); the lock
screen just made it legible. Users expect a refresh to serve back the page
they were on.

The obstacle was audio, not state. The lock's LOGIN click is the audio gate,
and **user activation is per page load** — the browser does not remember the
gesture across a refresh, and no stored flag can stand in for it. A page can
come back instantly, but sound cannot legally start until the first
click/keypress of the new load.

## Decision

**Refresh keeps you where you are; audio re-arms on the first gesture.**

- A snapshot of the live record (same shape as a shard) is written to
  `sessionStorage` (`ncza:v1:session`, `src/lib/session.ts`) on the debounced
  save and flushed on `pagehide`. On load, `signedIn` seeds from the flag so
  the first render doesn't bounce the route; the record adopts once the
  course arrives, and the views are held on a brief "REBUILDING SESSION"
  stand-in until adoption lands (the player mount-reads its resume place from
  op state, so order matters).
- `sessionStorage` on purpose: it survives refresh and in-tab navigation but
  dies with the tab, so a fresh visit still lands on the lock — the front
  door and its broadcast panel are untouched. Not gated on
  `ACADEMY_CONFIG.persist`; persist governs durable profiles, refresh
  continuity is browser-expected behaviour in both modes.
- **Deferred audio boot**: on a restored load the radio engine does not
  build (that would construct an `AudioContext` without activation — the
  warning the lock screen exists to prevent). The first `pointerdown`/`keydown`
  stands in for the LOGIN click: the context is created and resumed inside
  the gesture, the engine builds, and radio prefs stashed at adoption time
  apply. Until then the app is fully usable, just silent — and the radio pill
  shows a red AUDIO STANDBY state (warning triangle, danger border) so the
  silence is explained; it resolves on the same first gesture. `Sfx` resumes
  the context on every play attempt, so even a consumed-without-activation
  edge (Escape as first key) self-heals on the next real gesture.
- **One end-of-session path** (`endSession` in `App.tsx`): clear the session
  snapshot, drop `signedIn`/`entered`, reset the in-memory record, navigate
  to the lock. The header's JACK OUT button (logout) and PURGE both funnel
  through it, so "signed out" means one thing from either direction. Logout
  keeps the durable profile (log back in to resume); purge removes it first
  (`progress.remove()` also clears `lastUser`) for a genuine clean slate.

## Alternatives rejected

- **Zero-click restore with music already playing.** Impossible — activation
  is per load by browser policy; every "remember the user said yes to audio"
  design is actually a cheap re-acquisition of a gesture.
- **RESUME AS `<name>` variant of the lock's LOGIN button.** Designed first;
  dropped once the per-load activation model was understood — it keeps the
  lock in the refresh path for no benefit. The first in-app gesture is a
  gesture all the same.
- **`localStorage` for the session flag.** Returning visitors would never see
  the front door again, gutting the lock screen's landing-page and broadcast
  roles.
