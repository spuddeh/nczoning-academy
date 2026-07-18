# Decision: single-user progress, local username profiles, no server auth

Status: accepted (2026-07-07)

## Context

The Academy is a static, single-user, zero-backend site (Cloudflare Pages, no
build step). Progress must persist and be portable across devices. During the
Claude Design phase (P4) a lightweight "login" was added: enter a username on the
boot screen, resume that session, import a record into it, and the username is
printed on the certificate. Import/export was also made more prominent (promoted
at the end of each module).

This raised the question of whether to implement real users/accounts.

## Decision

1. **No server-side users, auth, backend or database for the POC.** The
   "username login" is a **named local profile, not authentication**: anyone on
   the browser may pick any username. It is a convenience and visibility layer
   (same spirit as the map's "visibility, not claiming"), not access control.

2. **All progress goes through a single persistence adapter** (`Progress.*`) over
   **one serialisable, username-keyed progress object**. No view touches
   `localStorage` directly.

3. **Progress is namespaced by username**: `ncza:v1:progress:<username>`, plus
   `ncza:v1:lastUser` for auto-resume. Import/export operate on that one object.
   Persistence respects `ACADEMY_CONFIG.persist` (in-memory only when false).

### Progress object

```json
{ "schemaVersion": "ncza:v1", "username": "…", "completedModules": [],
  "quiz": { "<questionId>": "correct|wrong" }, "eddies": 650, "stamps": [],
  "certified": false, "updatedAt": "…" }
```

### Adapter interface

`Progress.setUser(name)` · `Progress.load()` · `Progress.save()` ·
`Progress.export()` · `Progress.import(json)` · `Progress.listUsers()`

## Consequences

- Login/resume, import/export, save-on-completion and the certificate name all
  read one source of truth, so they cannot drift.
- The shell stays static and free; no auth, database or cost added now.
- **If real accounts are ever needed** (cross-device sync, or an admin view of
  who has completed onboarding), swap the one adapter to call a Worker keyed by a
  **Cloudflare Access** email: same interface, no view changes. The username
  session is the stepping stone, not a throwaway.

## Trigger to revisit

Only implement real users if the goal shifts to multi-person cross-device sync
without manual import/export, or an admin dashboard of onboarding completion.
Until then, local profiles + export/import are sufficient.
