# Decision: radio tracks are songs with structure (arrangement layer)

Status: accepted (2026-07-08)

Builds on [radio-stations-as-data](radio-stations-as-data.md) (v2 multi-track).

## Context

v2 made each station a family of tracks the engine rotates through, but a "track"
was still a flat 4-bar `prog` loop played for a random 180-300s. It sounds like a
loop, not a song. We want each track to have a beginning, a build, a peak, a
breakdown and an ending: a clear progression through the track.

The engine already had the two prerequisites: it schedules on bar boundaries and
each track already had a total duration. What was missing is a layer between them
that decides *how much of the song* plays at each point.

## Decision

1. **Add a song-arrangement layer (Tier 2).** The engine expands each track into
   sections (intro / build / peak / breakdown / outro) that gate which voices and
   drums are active and drive an energy/filter envelope across the track. The
   notes stay in the data (`prog`, patterns, modes); the arrangement decides how
   they are *revealed*. No new musical content is needed to get structure:
   muting the drums for the first phrase is an intro, dropping the kick mid-track
   is a breakdown, fading the pad is an ending.

2. **Presets live in the engine; the data carries only `form`.** Each track has a
   required `form` field (enum: `drift` | `build` | `groove` | `anthem` | `haze`)
   that selects an arrangement preset the engine owns. The engine owns the
   *shape*; the data owns the *choice*, per track (not per station), e.g. Kabuki
   After Dark uses `haze` for its two beat-driven tracks but `drift` for the slow
   detuned Closing Time.

3. **Track length is engine-derived, never authored as seconds.**
   `length = totalBars × (60 / bpm) × beatsPerBar`, where `totalBars` comes from
   the expanded arrangement. This retires the interim random 180-300s duration.
   Rationale: authoring a raw length AND an arrangement is two sources of truth
   for the same fact: they desync into either a looped "song" (over-long field)
   or a mid-phrase cutoff (short field). Deriving from bars guarantees a track can
   only ever end on a downbeat at a phrase end ("the song ended", not "the timer
   cut it off"), and because it scales with bpm the 56-BPM vaporwave track is
   automatically longer than the 128-BPM rock track at the same bar-count.

4. **Arrangements are deterministic (Fixed).** Each `form` expands the same way
   every play: same structure, same length, same track. Rejected alternatives:
   - *Name-seeded* random (seed the RNG from the track id): couples track naming
     to output, so a good title that happens to seed a bad structure becomes
     unusable. Kept only as a possible future one-line switch if more variety is
     ever wanted.
   - *Unseeded* re-roll every play: a track could sound good once and bad the next
     time, and it makes by-ear tuning chase a moving target (we author data, the
     user judges by ear and cannot rely on reproducing "that sounded off").
   Variety across the dial comes from 15 distinct tracks over 5 stations with
   differing bpm/form, not from intra-track randomness.

## Consequences

- **Minimal data change:** one required `form` field per track (schema +
  validator updated, all 15 tracks tagged). Length is not data.
- **The arrangement scheduler is the engine work (Claude Design):** at each bar
  boundary, read the current section from the chosen preset, gate voices/drums,
  drive the filter/energy envelope; when the arrangement's bars elapse, the track
  ends and auto-rotate advances. The progress bar/visualiser are unchanged; the
  engine computes the duration once at track start instead of `Math.random()`.
- **By-ear tuning stays reproducible**: what the user hears is what ships.

## Trigger to revisit (Tier 3)

If the preset arrangements feel too samey once we live with them, expand to
per-track authored arrangements plus a second `prog` (so a chorus lifts to
different chords, not just louder). That is a larger data + schema change; defer
until Tier 2 proves insufficient.
