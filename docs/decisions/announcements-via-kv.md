# Decision: announcements from Workers KV, merged over a committed baseline

Status: accepted (2026-07-10); shipped in PR #7.
**Partly superseded (2026-07-10) by issue #8**: the committed baseline is
retired as a runtime source once the `/admin` surface lands. An administrator
should manage announcements in one place, not keep two datapoints in sync. The
"evergreen vs timely" split below was a developer's model, not an operator's.
`public/messages.json` becomes a one-time seed, and the Function must then stop
conflating a KV read *failure* with an *empty* feed — see the issue.

## Context

The lock screen's SYSTEM BROADCAST feed read `public/messages.json`, fetched
`no-store` at runtime. That was described as "editable without a rebuild", which
was only half true: the file is committed, so a post meant edit → commit → push
→ Pages deploy. No code change, but not "just done".

Two things pushed past that. The maintainer wants to post an announcement
without a git round trip, and wants the option of **automated** broadcasts
later — an "API is down" alert written by a health check, which cannot be a
commit at all.

## Decision

Serve `/messages.json` from a **Pages Function** backed by **Workers KV**,
merging three sources. Earlier sources shadow later ones that share an `id`:

1. `messages:ops` (KV) — automated alerts, for a health check to write
2. `messages:manual` (KV) — hand-written posts, live on save
3. `public/messages.json` — the committed, reviewed, evergreen baseline

A Pages Function at a path takes precedence over the static asset of the same
name, and `context.next()` returns that asset's `Response`. So the baseline is
not an either/or fallback: it is always read, and KV is overlaid on top.

Deleting a KV key reverts to the committed state with no deploy.

## Consequences / constraints

- **The client is unchanged.** `Lock.tsx` still fetches `/messages.json` and
  still falls back to its inlined evergreen message if the request fails.
- **The Function must never throw.** It is the first thing a visitor reads.
  Unreachable KV, malformed KV JSON, and a missing baseline each degrade to
  whatever else is available; an empty result hides the panel. Verified against
  all six cases, including a KV that throws.
- **Deploy is safe before the binding exists.** With no `MESSAGES` binding
  (local dev, previews), the Function serves the baseline unchanged.
- **KV values are not validated at runtime.** `scripts/validate-messages.mjs`
  accepts a file argument so a payload can be checked before `wrangler kv key
  put`. CI validates the committed baseline only. This is the sharp edge.
- **Source precedence governs shadowing, not display order.** Merging ops-first
  only decides which entry wins an `id` collision. Display order is the client's
  sort. Those are two different orderings, and conflating them is what put the
  first ops alert at the *bottom* of the panel (observed on the preview).
- `public/_routes.json` restricts Function invocation to `/messages.json`, so
  static assets are not billed a Function call. Pages would auto-generate an
  equivalent file; committing it makes the intent explicit.

## Amendment (2026-07-10): levels, pinning, and required fields

Testing the first real ops alert exposed the gap above. An undated
`level: alert` rendered last, below the evergreen lines, and the four-item cap
silently dropped a message. Three rules close it:

1. **`alert` pins to the top by level, not by date.** An unresolved incident
   outranks everything, so the cap can never discard it and a bad timestamp
   cannot bury it.
2. **`resolved` (green) is the counterpart level.** The incident is over, so it
   does *not* pin: it falls back to date order and ages out naturally. Resolve
   an incident by overwriting `messages:ops` with the **same `id`** at
   `resolved`, replacing the banner rather than stacking a second one beside it.
   Both levels sharing an `id` in one payload is a validator error.
3. **Every field is required** (`id`, `level`, `date`, `title`, `body`). An
   omitted field only ever means the author forgot. This turns the old "undated
   entries sort last" runtime accident into a schema error, caught by CI on the
   baseline and by `validate:messages` before a KV write. With no undated
   entries possible, the two orderings finally agree.

`date` also accepts a full ISO 8601 datetime, since a health check emits one.
ISO strings compare lexicographically in chronological order, so timestamps and
bare dates sort correctly against each other; only the first ten render.

## Alternatives rejected

- **Keep it in the repo, add validation only.** Lowest effort, keeps review and
  history, but never delivers instant posting and cannot support an automated
  writer. Retained *as the baseline layer* rather than discarded.
- **GitHub raw / Gist fetched at runtime.** Edits without a deploy, but adds a
  third-party origin to the front door, and `raw.githubusercontent.com` caches
  for minutes, so "instant" is not true anyway.
- **Serve from the existing Data API Worker** (`api.nczoning.net`). Reuses live
  infrastructure, but couples the Academy's front door to the map project's API,
  and an "API is down" broadcast would then be served by the thing that is down.
