# Claude Design handover — NC Radio section scheduler (song arrangements)

Companion to `docs/design-brief.md` §11 and the decision
`docs/decisions/radio-song-structure.md`. This is the build spec for turning each
radio track from a flat 4-bar loop into a song with a beginning, build, peak,
breakdown and ending. Everything stays procedural (Web Audio, no audio samples).

## What changes

Right now each track plays its 4-bar loop for a random 180–300s. Replace that
random duration with a **section scheduler**: an arrangement of sections that
gates voices/drums and drives an energy envelope across the track, so the track
progresses and then *ends*.

The `prog`, drum patterns and mode flags in `stations.js` are unchanged — the
arrangement decides **how the existing notes are revealed**, it does not add
notes.

## Data contract

Each track object now has a required `form` field:

```
form: 'drift' | 'build' | 'groove' | 'anthem' | 'haze'
```

`form` selects one of the five arrangement presets below. The presets live in the
engine; the data carries only the choice. All other track fields (`bpm`, `cut`,
`swing`, `crackle`, `kick/snare/clap/hat`, `bass/lead/pad/style`, `prog`) are read
exactly as they are today.

## The section model

An **arrangement** is an ordered list of **sections**. Each section:

- spans a whole number of **bars**,
- sets which **drum rows** are active (any subset of kick / snare / clap / hat),
- sets which **melodic voices** are active (any subset of pad / bass / lead),
- has an **energy** value = a multiplier applied to the track's `cut` (filter
  cutoff) and to music gain. `1.0` = the track's authored brightness/level;
  lower = darker/quieter.

At each **bar boundary**: apply the current section's drum/voice gates, and ramp
the filter cutoff and gain toward the section's energy over ~1–2 bars so
transitions glide rather than jump. When the final section ends, the track is
over — call the existing auto-rotate to advance to the next track.

## Track length is DERIVED, not authored

Do not read a length from the data. Compute it:

```
secondsPerBar = (60 / bpm) * 4        // 4 beats per bar
length        = totalBars * secondsPerBar
```

Some sections are **fixed** (intro, breakdown, outro — constant bar counts).
Some are **repeatable** (the middle sections, marked ⟳ below). **Deterministically**
choose how many times the repeatable sections play so `length` lands in roughly
**180–300s** for this track's `bpm`. Deterministic means: the same track produces
the same arrangement and the same length **every time it plays** — do NOT use
`Math.random()` here. (A track that comes back around later plays the same again;
that is intended.)

Feed this computed `length` to the progress bar and visualizer in place of the
old random duration. Nothing else about the transport, mute, instant-swap or
dial-wide auto-rotate behaviour changes.

## The five presets

Energy values are multipliers on the track's own `cut`/gain. ⟳ = repeatable
middle section (size these to hit the target length).

### build  (retro drive: synthwave / darksynth / italo)
1. intro — 8 bars — pad only, no drums — energy 0.5
2. add-bass — 8 bars — pad + bass, no drums — 0.6
3. groove ⟳ — 16 bars — pad + bass + lead; kick + hat — 0.8
4. full ⟳ — 16 bars — all voices; all drums — 1.0
5. breakdown — 8 bars — pad + lead; hat only (no kick) — 0.6
6. full-out ⟳ — 16 bars — all voices; all drums — 1.0
7. outro — 8 bars — pad only, fading, no drums — 0.4

### groove  (city pop / funk / boogie / synthpop)
1. intro — 4 bars — pad; hat — 0.7
2. verse ⟳ — 16 bars — pad + bass + lead; kick + snare + hat (no clap) — 0.85
3. chorus ⟳ — 16 bars — all voices + clap; full drums — 1.0
4. break — 8 bars — bass + lead; hat + clap (no kick) — 0.7
5. chorus-out ⟳ — 16 bars — all voices; full drums — 1.0
6. outro — 4 bars — pad only, fading — 0.5

### anthem  (80s rock)
1. intro — 4 bars — pad + kick — 0.8
2. verse ⟳ — 16 bars — bass + lead + pad; kick + snare + hat — 0.85
3. chorus ⟳ — 16 bars — all voices; full drums — 1.0
4. solo ⟳ — 16 bars — lead forward; full drums — 1.0
5. chorus-out — 16 bars — all voices; full drums — 1.0
6. outro — 4 bars — power chord ring, drums stop — 0.6

### haze  (lo-fi / chillwave)
1. intro — 8 bars — pad + sparse lead, no kick — 0.6
2. main ⟳ — 16 bars — pad + bass + lead; full (soft) drums — 0.8
3. break — 8 bars — pad + lead; hat only — 0.5
4. main-out ⟳ — 16 bars — full — 0.8
5. outro — 8 bars — pad only, fading — 0.4

### drift  (ambient / dream pop / drone)
1. swell-in — 16 bars — pad only; filter opens 0.3 → 0.7; no drums
2. body ⟳ — 24 bars — pad + bass + bell lead (+ whatever soft drums the track
   defines, kept steady) — 0.7
3. lull — 8 bars — pad only — 0.5
4. body-out ⟳ — 24 bars — pad + bass + bell lead — 0.7
5. fade — 16 bars — pad only, fading to silence — 0.3

**drift is the exception that matters:** it must NEVER gate to silence mid-track
or kill the beat. It only swells and recedes. Some drift tracks are beatless;
others have a soft steady kick — keep whatever the track defines, just never drop
it dramatically.

## Acceptance checklist

- [ ] Each track reads its `form` and plays the matching arrangement.
- [ ] Track has an audible intro, a peak, at least one dip, and an ending —
      not a flat loop.
- [ ] Length is computed from bars × bpm and lands ~180–300s; the progress bar
      reflects it.
- [ ] Same track = same arrangement and length every play (deterministic).
- [ ] Section transitions glide (filter/gain ramp), no hard clicks.
- [ ] `drift` never drops to silence mid-track.
- [ ] Transport, MUSIC mute, instant swaps and dial-wide auto-rotate all still
      behave as before.

## Tuning

The bar counts and energy values above are the tuning surface. If a preset feels
off by ear (e.g. `build`'s breakdown drags, `drift` sags, the slow tracks run too
long), those numbers move — narrow the target band to ~180–240s rather than
hand-authoring per-track lengths, to keep length derived. If per-track control is
eventually wanted, the arrangements graduate into the data (Tier 3).
