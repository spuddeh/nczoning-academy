# Decision: lock screen at `/`, boot hard-guarded at `/boot`

Status: accepted (2026-07-10); shipped in PR #3

## Context

The site opened straight onto the boot splash. That created two problems.

**Audio.** Browsers keep an `AudioContext` suspended until the first user
gesture. Boot's SFX (the whoosh, the drive-seek chatter, the login cue) fire
on a timer from its mount effect, so nothing had provided a gesture and the
whole boot sequence played silently. Separately, the radio engine was built in
`App`'s mount effect, which constructed and resumed an `AudioContext` with no
user activation. Chrome logged `The AudioContext was not allowed to start` on
every page load.

**Front door.** Boot is a splash. It says nothing about what the Academy is,
carries no announcements, and finishes in about two seconds. A first-time
visitor got a terminal log and a name prompt with no context for either.

## Decision

A **lock / standby screen** at `/`, in front of boot. Boot moves to `/boot`.

- The **LOGIN** click is the audio gate. It resumes the shared `AudioContext`
  and builds the radio engine, so boot inherits a running context.
- The screen states what the Academy is and renders a **SYSTEM BROADCAST**
  feed from `public/messages.json`, fetched with `cache: 'no-store'` so
  announcements go live without a rebuild.
- `/boot` is **hard-guarded** by an in-memory `entered` flag set as the
  operator leaves the lock. A refresh or a direct hit redirects to `/`.

## Consequences / constraints

- The radio engine constructs with `active = false`, so deferring its creation
  to the LOGIN gesture does not change when music starts. The `preAuth` effect
  still owns that, flipping `setActive(true)` only at `/dashboard`.
- `entered` is in-memory on purpose. Every fresh *visit* starts at the lock;
  since the session-continuity work (issues #9/#4, see
  `session-continuity-and-logout.md`) a mid-session **refresh** restores the
  page you were on instead; the lock remains the front door for new tabs.
- `messages.json` must carry **verifiable** claims. It is the first thing a
  visitor reads, and it is not covered by any schema or validator. An empty
  `messages` array hides the panel; a failed fetch renders the evergreen
  fallback inlined in `Lock.tsx`.
- Announcements sort newest-first by `date` and cap at four. Undated entries
  sort last, which is what evergreen items want.

## Alternatives rejected

- **Make `/boot` bookmarkable.** Reaching boot without the LOGIN gesture is a
  silent boot, the exact state the lock exists to prevent. A shared or
  refreshed `/boot` link also skips the front door, so a first-time visitor
  lands on a terminal log with no explanation. Boot has no content to return
  to, so nothing is lost by making it unreachable directly.
- **Unlock audio on any first click anywhere.** Works, but leaves the autoplay
  warning (the context is still constructed at mount) and does nothing for the
  landing-page problem.
- **Keep the radio engine at mount and only resume on gesture.** The warning
  comes from constructing and resuming without activation, so this does not
  silence it.
