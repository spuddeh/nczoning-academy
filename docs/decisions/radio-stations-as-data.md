# Decision: radio engine in the shell, stations as validated data

Status: accepted (2026-07-07); revised to multi-track (radio-station/v2) 2026-07-07

## Context

The Academy shell includes a "radio": background 80s / lo-fi music generated live
in the browser with the Web Audio API (no audio files; every note is a scheduled
oscillator or noise burst). It was built in Claude Design with 7 genre-distinct
stations defined as data objects inline in the engine code.

Each station is a data object (name, dial frequency, genre, BPM, filter cutoff,
swing, crackle, a 4-bar chord progression as note-names, 16-step
kick/snare/clap/hat patterns, and mode flags for bass/lead/pad/style). The
synthesis engine is generic over that data. Claude Design is not the right place
to author or expand tracks.

**Revision (v2, multi-track).** A flat station == one track proved too limited:
distinct micro-genres competed for dial slots (darksynth vs synthwave, boogie vs
city pop). v2 makes a station a *vibe/family* that holds MULTIPLE tracks the
engine rotates through, so adjacent genres become sibling tracks on one station
instead of near-duplicate stations. The dial consolidated from a projected 13
micro-genre stations to 5 distinct families (Chrome Horizon, Kabuki After Dark,
J-Town Gold, Neon Rain, Badlands FM), ~3 tracks each. This is a breaking
data + engine change (the engine now reads musical fields off the current track,
not the station); made pre-launch with no consumers.

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
   engine's author put it, "it's all just numbers in those track objects". That
   is data authoring.

## Station object shape (radio-station/v2, multi-track)

The engine reads FLAT field names (not the nested `frequency`/`filterCutoff`/
`chords`/`patterns`/`modes` sketched in early notes). A station is identity +
dial + a `tracks` array; each track holds the musical fields.

```jsonc
{ "id": "chrome-horizon", "name": "CHROME HORIZON", "freq": "101.9",
  "genre": "SYNTHWAVE // OUTRUN",
  "tracks": [                       // >= 1; array order = rotation order
    { "title": "Chrome Sunset",
      "bpm": 70, "cut": 2600, "swing": 0, "crackle": 0.7,
      "kick": [0,8], "snare": [4,12], "clap": [], "hat": [2,6,10,14],
      "bass": "sustain", "lead": "arp", "pad": "gated", "style": "synth",
      "prog": [ { "bass": "A2", "pad": ["A3","C4","E4","G4"], "lead": ["A4","C5","E5","C5"] } /* x4 */ ] }
    /* more tracks... */
  ] }
```

Array order = dial order; within a station, track order = rotation order. Schema
constraints: note-names `^[A-G]#?[0-8]$` (sharps only, octave 0-8); each
kick/snare/clap/hat pattern is step INDICES 0..15 (unique), not a 16-slot 0/1
mask; `bass`/`lead`/`pad`/`style` from the enums; `prog` is exactly 4 bars; sane
`bpm`/`cut` ranges; `swing` in 0-1, `crackle` in 0-5. Semantic checks: station
`id` and `freq` unique across the dial; track `title` unique within a station.

**Engine rotation (as shipped).** The engine keeps a current-track index per
station and reads all musical fields off the current track. Track changes are
**instant**: restart the sequencer on a fresh downbeat, silence ringing voices
(no tail), snap the filter/echo retune (no cue-and-crossfade). Next/prev step
through the current station's tracks (they used to cycle stations); the dial
selects stations. Auto-rotate scans the whole dial: a finished track rolls to the
next track, and off the last track of a station into the next station, wrapping
all five. Play/Pause is a real transport (stop/restart the sequencer, remember
elapsed) separate from the MUSIC mute (silences gain, playback continues). Station
index, per-station track memory and cycle state persist in the Service Record;
paused/track-progress are runtime-only.

Track length and song structure (the `form` arrangement layer, engine-derived
length, Fixed determinism) are covered in
[radio-song-structure](radio-song-structure.md).

## Consequences

- Stations can be added, tuned, and reviewed as repo data, authored anywhere,
  without touching the engine. The validator catches errors that are painful to
  debug by ear.
- A station spans a genre *family*: adjacent micro-genres are sibling tracks on
  one distinct station, not competing dial slots. New tracks reuse the existing
  `style`/`bass`/`lead`/`pad` enums (character comes from bpm/cut/swing/prog/
  patterns), so authoring a new track is pure data with no engine change; only
  bespoke new voicings would need an engine change.
- Realism is improved with code-only, asset-free levers: humanised timing/velocity
  and a synthesised-impulse convolution reverb. Actual drum samples are out (they
  would break the zero-asset property) unless a deliberate future call is made.
- The current volumes, mute state and current station persist in the progress
  object (Service Record shard), consistent with [progress-and-users](progress-and-users.md).

## Trigger to revisit

Only introduce audio sample assets (drum kits, real impulse responses) if a
deliberate fidelity jump is wanted and shipping audio files is accepted.
