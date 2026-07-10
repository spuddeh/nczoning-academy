# Decision: announcements from Workers KV, merged over a committed baseline

Status: accepted (2026-07-10); shipped in PR #4

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
- **Ordering is by `date`, not by source.** The client sorts newest-first and
  undated entries sort last, so an ops alert needs a `date` to appear above the
  evergreen lines. Source precedence governs *shadowing*, not display order.
- `public/_routes.json` restricts Function invocation to `/messages.json`, so
  static assets are not billed a Function call. Pages would auto-generate an
  equivalent file; committing it makes the intent explicit.

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
