# Monolith Parity Spec — measured from the 0.1.0 Design export

Extracted 2026-07-09 by driving the live monolith (git `f16bd4f`, served from
history) in headless Chrome and dumping rendered DOM + the app script. This is
the binding spec for the shell rebuild: every value below is measured, not
recalled. Sections for later views (module player, glossary, service record,
certificate, radio panel) get appended when those slices start.

Method note: the monolith styles everything inline, so a rendered-DOM dump IS
the complete visual spec. The app script (`text/x-dc` block) holds all
behaviour. Harness: `scripts/parity/` (see repo).

Palette object `C`: navy `#0a192f`, panel `#112240`, cyan `#00f0ff`,
amber `#ffb300`, gold `#ffd400`, green `#00ff9d`, red `#ff3355`,
gray `#8892b0`, white `#e6f1ff`, field `#050a14`, dim-gray `#54617f`
(placeholder/skip-hint), orientation body `#c3cfe2`.

## Global layer (style block)

- `body`: bg navy, color white, font `'Rajdhani',system-ui,sans-serif`,
  16px base, antialiased, `overflow:hidden` (app shell scrolls internally)
- Links: cyan, no underline, `border-bottom:1px solid rgba(0,240,255,0.35)`;
  hover INVERTS: `color:#0a192f;background:#00f0ff`. On `(hover:none)` devices
  the inversion is suppressed.
- Scrollbars (webkit): 10px; track navy; thumb `#173254` with 1px cyan .25
  border; thumb hover `#1e4470`
- `input::placeholder`: `#54617f`
- Keyframes:
  - `cursorblink{0%,49%{opacity:1}50%,100%{opacity:0}}` — 1s steps(1) infinite
  - `.cursor`: inline-block 9px × 1.05em, bg cyan, margin-left 2px,
    vertical-align -2px
  - `ledblink` (1.1s steps(2)) opacity 1→0.2; `statusblink` (2s ease) 1→0.3;
    `.statusled` uses statusblink
  - `eqbar{0%{scaleY(0.18)}100%{scaleY(1)}}`
  - `mqbounce{0%,14%{translateX(0)}86%,100%{translateX(var(--mqd,0))}}`
  - `floatup`, `flashbg`, `ncrowbump` — module-player slice
- `#scanlines`: fixed inset 0, z 9990, repeating-linear-gradient 0deg,
  cyan 0.035 1px / transparent to 3px. `#vign`: fixed, z 9989,
  radial-gradient transparent 55% → rgba(0,0,0,0.45) 100%
- Reduced motion: scanlines hidden; `.ledblink`/`.cursor` animation none.
  Sync-offset telemetry still runs (deliberate — text change, not motion).
- Print block: only `#cert-print` visible (certificate slice)
- Responsive: ≤1024px hides `.hdr-status`/`.hdr-clearance`, dash-scroll
  padding 36/24/54; ≤640px: header wraps (auto height, pad 10 14), sys-readout
  + hdr-sub hidden, brand title 15px, gloss FAB→header button, dash-scroll
  22/15/46, h1 25px, lead 14px, 1-col grids, 44px min touch targets

## Sounds (WebAudio synth, no assets)

Component-level: `_ac()` lazy AudioContext (resume on gesture);
`_tone(f1,f2,dur,type,vol,when,detune)` gain envelope 0.00012 →
vol×sfxVol (6ms attack) → decay over dur; `_noise(dur,vol,type,f1,f2,when)`
filtered white noise Q 1.1. Gated on `muted`/`sfxVol<=0`.

| name | recipe |
| --- | --- |
| tick | tone 150→124 0.026s square 0.03 + noise 0.016 0.012 highpass 3200 |
| nav | tone 320→190 0.07 square 0.045 |
| ok | tone 300 0.05 square 0.05; tone 470 0.075 square 0.045 @0.055 detune 6 |
| err | tone 94→70 0.30 saw 0.06; tone 122→92 0.30 saw 0.045 detune 9; noise 0.1 0.02 lowpass 420→200 |
| whoosh | noise 0.34 0.05 bandpass 1700→320; tone 210→90 0.30 saw 0.03 |
| chime | tones 196/262/392 square staggered 0/0.085/0.19 |
| access | noise 0.14 0.03 bandpass 800→1900; tone 160→320 0.14 square 0.05 @0.02; tone 300 0.20 saw 0.04 @0.16 detune 11 |
| drive | noise 0.09 0.05 bandpass 1500→620; tone 68→54 0.06 square 0.028 |
| drivehi | noise 0.05 0.028 bandpass 2400→1300 |

Global pointer tick: capture-phase `pointerdown` on the root — walk ≤6
ancestors; if BUTTON (not disabled) / role=button / `style.cursor==='pointer'`
→ `sfx('tick')`; `data-nosfx` opts out.

## Boot view

Layout: fixed inset-0 flex-centre, bg navy, `padding:24px`, whole screen
`onClick=skipBoot`. Backdrop: absolute inset-0
`radial-gradient(circle at 50% 0%, rgba(0,240,255,0.06), transparent 60%)`.
Card: relative, `width:640px;max-width:100%`, 1px solid cyan,
bg `rgba(10,25,47,0.92)`, shadow `0 0 40px rgba(0,240,255,0.15)`.
Titlebar: bg cyan, text navy, `padding:11px 20px`, flex space-between gap 14,
Night Corp Display 400 12px ls 0.05em, nowrap; left span ellipsis;
right span (`NC-ACAD-01`) opacity 0.7. Body: `padding:26px 28px 28px`.

Log `pre`: Fira Code 13.5px, line-height 1.85, cyan, pre-wrap,
`min-height:150px`, `{bootText}` + `.cursor` span while `!bootDone`
(cursor sits INLINE after the typed text; removed once done).

Typing (`startTyping`): 260ms initial delay + `whoosh`; reveal 1 char per
tick; delay per just-typed char: `\n` 140ms, `.` or `:` 34ms, else 12ms.
SFX: `drive` at each `\n`, `drivehi` every 6th char. On completion:
`bootDone`, `drive`. Skip (any key or click while `!bootDone`): full text +
bootDone instantly. Full text lines: see `fullBoot()` — identical to current
rebuild's `bootLines` + identity block, joined with real newlines.

After bootDone (`showBootBtn`): `margin-top:22px` block; divider
`height:1px;background:linear-gradient(90deg,#00f0ff,transparent);margin-bottom:20px`.

Auth form (`bootDone && !bootWelcome`):
- Prompt `> OPERATOR IDENTIFICATION REQUIRED`: Fira 11px ls .14em gray, mb 9
- Label `OPERATOR NAME / CALLSIGN`: Fira 10px ls .16em cyan, mb 7
- Input: 100% width, bg `#050a14`, border 1px `rgba(0,240,255,0.4)`, white,
  Orbitron 700 16px ls .08em, padding 12px 14px, mb 18, `maxLength=42`,
  autofocus, placeholder `e.g. S. DORSETT`; input filter strips control chars
  (`_cleanNameInput`), Enter submits. Prefilled with last operator when
  `cfg.persist`.
- ACCESS button — TWO states (`ready = name.trim() && !courseLoading`):
  ready → solid cyan bg, navy text, cursor pointer; not-ready → transparent
  bg, border `rgba(0,240,255,0.35)`, text `rgba(0,240,255,0.55)`,
  `cursor:not-allowed`. Orbitron 700 14px ls .18em, padding 15px, 100% width.
  Label: `[ ACCESS TERMINAL ]`, or `LOADING COURSE…` while the live course
  JSON is in flight (login is gated on it).
- RETURNING OPERATOR? row: mt 14, flex gap 14, side rules 1px
  `rgba(136,146,176,0.2)`, text Fira 10px ls .14em `#54617f`
- Slot button (label wrapping hidden file input): mt 14, flex-centred gap 9,
  border 1px `rgba(136,146,176,0.5)`, gray text, Orbitron 700 12px ls .14em,
  padding 12; shard icon 22×10.4px currentColor mask;
  hover → bg `rgba(0,240,255,0.08)`, border+text cyan
  (transition background/border-color/color 0.15s). File input resets after
  each pick (`e.target.value=''`).
- Import message (below slot, when set): `> ` + text, mt 14, Fira 12px
  ls .06em; green when ok, red when not. Texts: `SHARD REJECTED // <err>`
  (err: `invalid file` | `unrecognized record schema`),
  `SHARD READ FAILED // could not read file`, `STAND BY // COURSE LOADING`.

Skip hint (only while `!bootDone`): mt 16, centred, `#54617f`, Fira 11px
ls .1em, `// CLICK OR PRESS ANY KEY TO SKIP`.

Welcome state (`bootWelcome`, replaces auth form for 1700ms after login):
green (#00ff9d) `pre`, same type styles as log, text
`> IDENTITY CONFIRMED: <NAME>\n> ACCESS GRANTED // CLEARANCE LEVEL <N>\n> ESTABLISHING SESSION...`
with trailing `.cursor`. Then view → dashboard. Login: `sfx('access')`;
loads saved record for that name when persisted (restores progress + audio
prefs); fresh login picks a RANDOM radio station, track 0. Slotting a shard
at boot goes through the same welcome (`_bootEnterWithShard`).

## App shell (all post-boot views)

`div` flex column `height:100vh; overflow:hidden` → header + main content
(each view provides its own scroll container) + fixed satellites.

Header (62px, pad 0 22, border-bottom cyan .2, bg `rgba(10,25,47,0.9)`,
blur 8):
- Brand: logo img 40px high, `filter:brightness(0) invert(1) drop-shadow(0 0 6px rgba(0,240,255,0.35))`;
  title Night Corp Display 400 20px ls .11em white, line-height 1; sub Fira
  9.5px ls .14em gray, mt 3, nowrap. Gap 16.
- Nav (gap 6): buttons Orbitron 700 11px ls .14em, padding 8px 15px,
  `transition:none`. Active (DASHBOARD is active for dashboard AND player
  views): bg `rgba(0,240,255,0.1)`, 1px cyan border, cyan text. Inactive:
  transparent bg AND transparent border, gray text.
- Meta (gap 18): hidden header glossary button (shows ≤640 only) + 1px×26px
  divider (both `display:none` at desktop); clearance block (right-aligned:
  `OPERATOR CLEARANCE` Fira 9px ls .14em gray over rank Orbitron 700 12px
  ls .1em cyan — `LVL <n> <RANK TITLE>`, clearance = max clearance of
  completed modules, rank from `course.ranks`); balance BUTTON
  (title "View transaction history"): border 1px `rgba(255,212,0,0.5)`,
  bg `rgba(255,212,0,0.05)`, pad 6 12, column align-end gap 2; row =
  `BALANCE` Fira 8.5px ls .14em gray + 10px hamburger-lines SVG (#8892b0,
  opacity .85); value Fira 600 14px ls .06em gold `€$ 500`
  (`symbol + ' ' + eddies`; red when negative). Hover: bg `0.12`, border
  `0.85` alpha. (Opens transaction history — later slice; render the button
  now, no-op with cursor pointer.)

SYSTEM_STATUS readout: fixed `left:18px` (`306px` in player view — animated
via `transition:left 0.35s cubic-bezier(0.22,1,0.36,1)`), `bottom:14px`,
z 9100, flex gap 11, pad 7 4, pointer-events none, Orbitron 10px, opacity .9.
Parts: `[SYSTEM_STATUS: <STATUS>]` ls 1px, colour cyan/amber/red by status
(transition color .5s); LED 8px circle `.statusled` class, bg+glow
green/amber/red; `SYNC_OFFSET: <n.nn>ms` Fira ls .08em cyan opacity .75
tabular-nums. Telemetry: every 2000ms roll — 85% `rand*200` NOMINAL,
10% `200+rand*600` ELEVATED, 5% `800+rand*1000` CRITICAL. Initial 88.4
NOMINAL. Runs under reduced-motion (deliberate).

Glossary FAB: fixed top 76 right 22, z 9200, flex gap 8, pad 9 14, Orbitron
700 11px ls .14em, bg `rgba(10,25,47,0.92)` blur 8, border 1px
`rgba(0,240,255,0.55)`, cyan, shadow `0 4px 14px rgba(0,0,0,0.4)`; book SVG
15px stroke 1.8. Hover: bg `rgba(0,240,255,0.14)`, border solid cyan. Open
state (glossary slice): solid cyan bg, navy text. Hidden ≤640 (header variant
appears instead).

Radio pill (collapsed music player): fixed right 22 bottom 22, z 9995,
BUTTON, flex gap 10, pad 10 14, bg `rgba(10,25,47,0.94)`, border 1px
`rgba(0,240,255,0.5)`, shadow `0 0 22px rgba(0,240,255,0.14)`, blur 4,
title "Open NC Radio". Contents: 4 EQ bars (3px wide, 16px high, cyan,
radius 1, glow 5px, origin bottom, `eqbar` animation duration
`beat*0.5*(1+(i%4)*0.28)` where `beat=60/track.bpm`, delay `i*0.06s`;
paused → `animationPlayState:paused`, opacity 0.25); frequency (`104.2`)
Fira 11px ls .12em 600 cyan; track-name marquee: 96px overflow-hidden window,
text Fira 11px ls .12em 600 GOLD `♪ <Track Name>`; if overflow > 2px set
`--mqd = -(overflow+6)px` and duration `max(4, dist/22+1.4)s` (mqbounce
alternate), else no animation. Radio is constructed at mount (suspended AC),
`setActive(view!=='boot')` — music only starts after login gesture. Click
opens the radio panel (later slice; render pill + engine wiring now).

## Dashboard view

Scroll container `.dash-scroll`: `flex:1; overflow-y:auto;
padding:48px 40px 60px` (this is the app's `<main>` — keyboard scrolling:
ArrowUp/Down ±90, PageUp/Down/Space ±90% height, Home/End, unless focus in
input/button). Column: `max-width:1100px; margin:0 auto`.

- Terminal line `> ACCESS GRANTED. RENDERING AVAILABLE COURSEWARE...`:
  Fira 12px ls .1em cyan, mb 8
- H1 `OPERATOR DASHBOARD`: Night Corp Display **400** 38px ls .06em white,
  margin 0 0 6px  ← the rebuild had 700 (faux-bold; NCD has no 700)
- Lead: Rajdhani 16px ls .02em gray, mb 38
- Orientation card (shows when `!anyProgress && !firstRunSeen` — session
  state, resets on reload; NOT persisted): relative, border 1px
  `rgba(0,240,255,0.3)`, bg `rgba(0,240,255,0.04)`, padding 18px 20px 18px
  18px, mb 34, flex gap 14 align-start. Shard icon 26×12.3px cyan mask
  mt 3. Title `NEW OPERATOR // ORIENTATION` Orbitron 700 11px ls .16em cyan
  mb 7. Body Fira 12.5px lh 1.75 ls .02em `#c3cfe2`; `Service Record Shard`,
  `SAVE PROGRESS`, `SLOT SHARD` spans cyan. Dismiss ✕ top-right in flow
  (flex end): border 1px `rgba(136,146,176,0.4)`, gray, Fira 11px lh 1,
  pad 5 9.
- Section header `AVAILABLE COURSES [ N ]`: Fira 11px ls .16em gray,
  border-bottom 1px `rgba(136,146,176,0.25)`, pb 10 mb 24; count span cyan.
  **Deliberate fix:** monolith shows `mods.length` (9) — a bug (label says
  COURSES). Rebuild shows the course count (1).
- Course grid: `grid-template-columns:repeat(auto-fill,minmax(360px,1fr))`,
  gap 22.
- Course card (whole card clickable → module map; `cursor:pointer`):
  border 1px `rgba(0,240,255,0.25)`, bg `rgba(17,34,64,0.5)`, blur 6.
  - Hero: 132px, `linear-gradient(135deg,#0d1f3a,#122a4d)`, border-bottom
    cyan .25, relative overflow hidden, flex align-end pad 14. Grid overlay:
    two linear-gradients cyan .06 1px, `background-size:22px 22px`. Tag
    top-left: solid cyan bg, navy text, Fira 9.5px 600 ls .12em, pad 4 10,
    `COURSE // <ID-UPPER>`. Watermark (bottom-left, in flex flow): Orbitron
    900 26px ls .12em `rgba(0,240,255,0.18)`, text = module count.
  - Body pad 18px 18px 20px: title NCD 400 20px ls .04em white; underline
    bar 44×2px cyan margin 9 0 11; subtitle Rajdhani 15px gray mb 16
  - Chips row (flex gap 8 wrap, mb 16): border 1px `rgba(136,146,176,0.4)`,
    gray, Fira 10px ls .08em, pad 4 9. Chip 1: `⌁ <est> MIN` (U+2301), chip 2
    `<n> MODULES`
  - Progress row: flex space-between, Fira 10px ls .1em gray, mb 6; right
    span cyan `<done> / <total>`
  - Bar: 5px high, bg navy, border 1px cyan .2; fill
    `linear-gradient(90deg,#00f0ff,#00ff9d)` width = course fraction
    (partial-module credit — see `partialFrac`)
  - CTA button: mt 18, 100% width, transparent bg, 1px cyan border, cyan,
    Orbitron 700 12.5px ls .16em, pad 12. Label `[ BEGIN PROGRAM ]`, or
    `[ RESUME PROGRAM ]` when any progress. Hover: solid cyan bg, navy text.
- Relays (`margin-top:48px`): header `TRANSMISSION RELAYS // EXTERNAL LINKS`
  same style as courses header (mb 20; suffix span cyan). Links flex wrap
  gap 12; each `inline-flex` gap 10, Fira 12px ls .1em, pad 11 16, coloured
  by kind — cyan / gold (Ko-fi) / gray (GitHub): border `rgba(<c>,0.4)`,
  text solid colour, bg `rgba(<c>,0.04)`. Hover INVERTS: bg solid colour,
  text navy, border solid. Icons 17-19px: map polygon SVG (stroke 2),
  Discord path (stroke 1.4, w 18), kofi.webp img 19px, GitHub octocat
  (fill currentColor, viewBox 0 0 98 96). Full SVG paths: copy from
  `spec-relays.html` capture (or ICONS map in the monolith source).

## Record schema (the real ncza-record/v1)

```
{ schema:'ncza-record/v1', course, exportedAt,
  moduleDone:{}, quiz:{}, eddies:number, revealedBy:{}, txns:[],
  operatorName:string,
  audio:{ muted, musicOn, musicVol, sfxVol, stationIdx, trackIdx,
          stationTracks, cycle } }
```

`migrateRecord` (port exactly): non-object → throw `invalid file`; schema
!== `ncza-record/v1` → throw `unrecognized record schema`; else fill each
field with type-checked default (eddies default = economy.startingBalance
or 500). The rebuild's earlier invented `{user, progress}` shape is WRONG —
replace it. localStorage keys are `ncza:v1:progress:<name>` + `ncza:v1:lastUser`
(shipped 0.1.0 users may hold these).

## Deliberate divergences from the monolith (fixes, user-approved)

1. `AVAILABLE COURSES [ 9 ]` → `[ 1 ]` (label counts courses, not modules).
2. Root favicon 404 + login input missing id/name (noted in the 0.1.0 commit)
   — fixed in the rebuild.
3. Hover states move from JS style-mutation to CSS `:hover` (same visual
   result; idiomatic in the rebuild's architecture).
