# Decision: lab scenario selector for named canned states

Status: accepted (2026-07-09); build AFTER the 0.2.0 parity merge

## Context

Labs are fake API consoles: TRANSMIT serves a canned response chosen by
matching `when` conditions against the operator's edited request values,
falling back to `default`. Two modules author canned responses for **named
failure states** that no edit can ever select:

- **m04 SUPPLY LINE** (`GET /v1/meta`): `stale` (200 with an old dataset
  timestamp) and `not-ready` (503, the dataset-refresh window)
- **m05 PERIMETER DEFENSE** (`GET /v1/health`): `rate-limited` (429 -
  Cloudflare's edge block, deliberately NOT the JSON envelope because the
  edge fires before the Worker)

Both labs declare `"editable": []`, so TRANSMIT always serves `default` and
the failure responses are unreachable dead data. This was true in the 0.1.0
monolith too - it is a content-feature gap, not a parity gap. The states
were canned precisely because the real ones are unsafe or impractical to
trigger live (tripping the rate limit once blocked the maintainer's own IP;
the 503 only exists during a refresh window).

## Decision

Add a **scenario selector** to the lab console, shown ONLY when a lab
carries canned responses whose `when` is a named state (not `default`, not
a `key=value` condition): a row of chips (e.g. `SIMULATE: NOMINAL / STALE /
NOT-READY`) that picks which canned response TRANSMIT serves. `NOMINAL`
maps to `default`.

Rationale: the course's lab pedagogy is "operate the console, see the wire
format". A static listing of the 503/429 bodies teaches the same facts but
not the experience, and the entire reason these responses were canned is so
operators could SEE them safely.

## Consequences / constraints

- Schema already carries everything needed; this is a shell-only change.
- Value-keyed labs (m01 `full=1`, m02 If-None-Match, m08) are unaffected -
  the selector never renders there.
- Sequencing: this is new behaviour beyond the monolith, so it lands as the
  first 0.2.x feature branch after PR #1 merges (PR #1's contract is
  parity). Harness capture extends to the selector when built.
- Labels/copy follow the authoring guide (audience floor, en-US, no em
  dashes).

## Alternatives rejected

- **Convert to static content chunks**: zero shell work but loses the
  interactive teaching moment; the responses become something operators
  read about rather than something the console does to them.
- **Leave as-is**: invisible dead data in the course JSON; confuses the
  next content author and wastes already-verified teaching material.
