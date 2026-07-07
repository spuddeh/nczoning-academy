# Decision: radio engine in the shell, stations as validated data

Status: accepted (2026-07-07)

## Context

The Academy shell includes a "radio": background 80s / lo-fi music generated live
in the browser with the Web Audio API (no audio files; every note is a scheduled
oscillator or noise burst). It was built in Claude Design with 7 genre-distinct
stations defined as data objects inline in the engine code.

Each station is already a data object (name, frequency, genre, BPM, filter cutoff,
swing, crackle, four chords as note-names, 16-step kick/snare/clap/hat patterns,
and mode flags for bass/lead/pad styles). The synthesis engine is generic over
that data. Claude Design is not the right place to author or expand tracks.

## Decision

1. **The synthesis engine lives in the shell (Claude Design owns it).** It stays
   fully **procedural** (Web Audio, no audio samples), preserving the zero-asset
   property.

2. **Stations are external DATA, not code.** The engine reads stations from a
   `window.RADIO_STATIONS` array (loaded from a separate `radio/stations.js` or
   `radio/stations.json`), never inline objects. Adding or tuning a station is a
   data edit with no engine change.

3. **Stations follow the same content pattern as courses**: a canonical
   `public/radio/stations.json` (`schemaVersion: "radio-stations/v1"`), a
   `schema/radio-station.schema.json`, and a `scripts/validate-radio.mjs`
   validator wired into CI. A malformed station (bad note-name, a pattern not 16
   slots long, an invalid mode) fails fast instead of sounding wrong.

4. **Division of labour**: Claude Design owns the engine and the radio UI; the
   station data is authored and validated in the repo by Claude Code. As the
   engine's author put it, "it's all just numbers in those track objects" — that
   is data authoring.

## Station object shape

```jsonc
{ "id": "night-city-fm", "name": "NIGHT CITY FM", "frequency": "101.9",
  "genre": "Synthwave", "bpm": 70,
  "filterCutoff": 1200, "swing": 0.15, "crackle": 0.3,
  "chords": [ { "bass": "A2", "pad": ["A3","C#4","E4"], "lead": ["A4","E4"] } /* x4 */ ],
  "patterns": { "kick": [ /* 16 x 0|1 */ ], "snare": [], "clap": [], "hat": [] },
  "modes": { "bass": "sustain|deep|root8|eighths|funk",
             "lead": "arp|sparse|penta|bell", "pad": "gated|wash|stab|power" } }
```
Array order = dial order. Schema constraints: note-names `^[A-G]#?b?[0-9]$`; each
pattern exactly 16 items of 0/1; `modes.*` from the enums above; sane `bpm` /
`filterCutoff` ranges; `swing` / `crackle` in 0-1.

## Consequences

- Stations can be added, tuned, and reviewed as repo data, authored anywhere,
  without touching the engine. The validator catches errors that are painful to
  debug by ear.
- Realism is improved with code-only, asset-free levers: humanized timing/velocity
  and a synthesized-impulse convolution reverb. Actual drum samples are out (they
  would break the zero-asset property) unless a deliberate future call is made.
- The current volumes, mute state and current station persist in the progress
  object (Service Record shard), consistent with [progress-and-users](progress-and-users.md).

## Trigger to revisit

Only introduce audio sample assets (drum kits, real impulse responses) if a
deliberate fidelity jump is wanted and shipping audio files is accepted.
