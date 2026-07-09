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

## Module player (extracted 2026-07-09; build slice pending)

### Shell
`isPlayer` view replaces the dashboard under the same app header:
`.player-wrap` flex row, `flex:1; overflow:hidden; position:relative`.

- **Rail** `aside.player-rail`: 288px, border-right cyan .2, bg
  `rgba(10,25,47,0.85)`, own scroll, flex column.
  - Top block (pad 16 18, border-bottom cyan .15): `RETURN TO DASHBOARD`
    button with a leading chevron — Fira 10.5px ls .12em gray, 1px gray-.5
    border, pad 7 12, full width, left-aligned; hover: bg cyan .08,
    border+text cyan.
  - `MODULE MAP` header: Orbitron 700 11px ls .14em cyan with a 3px cyan
    left bar (padding-left 9); course title under it Fira 10px gray mt 8
    pl 12.
  - Module rows (list pad 6 12 20): row = flex gap 11 align-start pad 11 12,
    cursor pointer, mb 4; ACTIVE row has border cyan .4 + bg cyan .07 (else
    transparent border). Dot 11px (mt 3): done = solid green + 8px glow;
    in-progress = amber + 6px glow + `.ledblink`; else transparent with 1px
    gray border. Title Rajdhani 600 14px ls .04em (cyan when active, white
    otherwise, ellipsis); meta Fira 9.5px ls .08em gray mt 2 =
    `CLR <n> // COMPLETE|IN PROGRESS|LOCKED-READY`.
  - Sticky footer (border-top cyan .15, bg `rgba(8,18,36,0.96)`, pad
    14 18 16): `SESSION` Orbitron 700 10px ls .18em gray + `STAGE n / total`
    Fira 10px cyan; 3px progress bar (navy bg, cyan .2 border, cyan-to-green
    fill, width = revealed/total%); `SAVE PROGRESS` button full width (bg
    cyan .08, cyan border, Orbitron 700 11px ls .14em, shard icon 22x10.4
    currentColor, hover: solid cyan bg + navy text) — records
    `revealedBy[id] = max(revealedBy[id], revealed)` then ejects a shard;
    caption `EJECTS A SHARD WITH YOUR CURRENT PLACE` Fira 9px `#54617f`
    centred mt 8.
- **Main** `main.player-main`: flex 1, overflow-y auto (this is the keyboard
  scroll target). At 640px and below the rail becomes an off-canvas drawer
  (`.player-rail.open` + `.rail-backdrop.open`, styles already in the global
  responsive block) toggled by the sticky `.rail-toggle` button
  (hamburger + `MODULE MAP`).

SYSTEM_STATUS readout: `left` animates 18px to **306px** in the player view
(rail width + margin); transition already specced.

### Body (renderPlayer)
Column `max-width:860px; margin:0 auto; padding:34px 40px 80px`.
Header block (mb 26): breadcrumb `> MODULE <ID-UPPER> // CLEARANCE LEVEL <n>`
Fira 11px ls .14em cyan mb 8; h1 = module title, NCD 400 34px ls .05em white
margin 0 0 6px; subtitle Rajdhani 16px gray; module progress bar mt 14 —
4px, navy bg, cyan .2 border, cyan-to-green fill, width = revealed/stages%,
`transition: width .3s`.

Then the revealed stages in order, each wrapped in a div with
`id="stg-<moduleId>-<data.id>"` when the stage has data (txn jump target).
Below them the CONTINUE button (`data-nosfx`, full width, Orbitron 700 13px
ls .18em, pad 15, mt 4): enabled = bg cyan .08 + cyan border/text,
`[ CONTINUE ]`; gated = transparent, gray .3 border, gray text, not-allowed,
`[ RESPOND TO CONTINUE ]`. Hidden once the `complete` stage is revealed.

### Stage model
`buildStages(m)` = `[hook, objectives, ...chunks, lab?, ...quiz, scenario?,
recap, complete]`. `revealed` counts visible stages (min 1);
`revealedBy[moduleId]` records the furthest reveal per module (written on
every advance). Resume = max(revealedBy, 1). `stageGated(stage)` =
quiz/scenario not yet answered, which disables CONTINUE. `advance()` bumps
revealed + revealedBy and re-sticks the scroll to bottom.
`selectCourse()` (dashboard card/CTA click) enters the player at the first
incomplete module (else the last); `selectModule(id)` from the rail. On
entry `_jumpBottom()`: scroll main to bottom over two rAFs, then re-engage
the stick-to-bottom follower (`_stick`; wheel/touch opt out, End re-engages,
smoothing `scrollTop += diff * 0.16` per frame).

### Stage primitives
- `sectionLabel(txt, color)`: Orbitron 700 12px ls .18em coloured text +
  1px gradient rule (colour at 55 alpha to transparent), flex gap 10, mb 16.
- `card(children, accent)`: 1px border (default `rgba(0,240,255,0.18)`),
  bg `rgba(17,34,64,0.55)`, blur 4, pad 22 24, mb 20.
- `terminalBlock(lines)`: border cyan .25, bg `rgba(5,10,20,0.85)`, pad
  16 18; each line Fira 13px lh 1.7 pre-wrap — lines starting `>` are cyan,
  rest white (unescape `&gt;`).
- `md(str)` markdown-lite: `**bold**` = white 700 strong; `*em*` = white em;
  backtick code = Fira 0.88em cyan on cyan-.1 bg, 1px cyan-.2 border, pad
  1 5; `[label](url)` = link (global link styles). No other syntax.
- `sources(list)`: mt 12 flex wrap gap 8; `SOURCES:` Fira 9.5px ls .14em
  gray; each source a Fira 10px link — kind `project` = amber with a lozenge
  prefix + amber-.35 underline, else cyan with an arrow prefix.

### Chunk types (renderChunk — heading optional: Orbitron 600 15px white mb 12)
- `text`: p, gray 16px lh 1.65, md().
- `code`: dark block (bg `rgba(5,10,20,0.9)`, cyan .2 border) with header
  row (`<LANG>` + `// SNIPPET`, Fira 10px ls .12em gray, border-bottom cyan
  .15) and pre Fira 13px lh 1.65 cyan, pad 14 16, overflow-x auto.
- `table`: scroll wrapper (cyan .2 border), table min-width 420 collapse;
  th left, pad 10 14, Fira 10.5px ls .12em cyan on cyan-.06 bg,
  border-bottom cyan .25; td pad 10 14, 14px — first column white Fira,
  others gray Rajdhani; row border-bottom gray .12. Optional `body` caption
  under, gray 14px mt 10.
- `callout`: 1px DASHED border in variant colour (info cyan / warning amber /
  policy gray), bg `rgba(255,179,0,0.03)`, pad 14 16; label
  `INFO|CAUTION|POLICY` with a warning glyph, Fira 10.5px ls .14em 600 mb 7;
  body white 15px lh 1.6 md().
- `terminal-log`: terminalBlock(lines).

### Quizzes (renderQuiz; card accent: unanswered cyan .18; answered green .3
or red .3 by correctness)
Kind labels: mcq `KNOWLEDGE CHECK // SINGLE SELECT`, multi `// MULTI SELECT`,
order `// SEQUENCE`, spot-wrong `// SPOT THE FALSE STATEMENT`.
Prompt: white 17px 600 lh 1.4 mb 16.
- `optionButton` states: idle (cyan-.3 border, white), selected (cyan
  border/text, cyan-.08 bg), correct (green, green-.08), wrong (red,
  red-.08), revealCorrect (green, green-.05). Leading mark Fira 13px:
  `[ ]` / `[#]` filled / `[check]` / `[cross]`. Body Rajdhani 15px 500,
  pad 12 14, flex gap 11. Feedback line under (when shown): `// <feedback>`
  Fira 12px, red if wrong else green, pad 8 14 4.
- mcq/spot-wrong: one click answers (locks, reveals correct via
  revealCorrect on others); feedback shows for the selected + correct
  options; `_recordAnswer` + `awardFrom`.
- multi: options toggle selected; `[ SUBMIT SELECTION ]` (brkBtn) grades
  exact-set match; answered: correct chosen = correct, correct unchosen =
  revealCorrect, wrong chosen = wrong; all feedbacks shown.
- order: rows shuffled on first render (Fisher-Yates into `order`).
  Row: flex gap 10, 1px border (unanswered cyan-.3; answered green/red per
  `stepIdx===pos`), pad 10 12, bg `rgba(17,34,64,0.4)`; grip handle (6-dot
  SVG 12x18, gray, cyan when carried, `touch-action:none`; pointer-event
  drag = lift-and-carry: dy as translateY + scale 1.035 + deep shadow,
  siblings shift by one slot (row height + 8px gap) with `transform .16s
  cubic-bezier(.2,.7,.3,1)`, drop commits the splice); index `1.` Fira 13px
  cyan 22px col; text 15px; up/down arrow buttons (arrowBtn: 8px font, 1px
  border cyan-.4, gray-.3 when disabled at ends) OR check/cross marks when
  answered. A row that just moved gets `ncrowbump 0.42s` (keyframe already
  in the global CSS). Hint `// DRAG ROWS OR USE ARROWS TO ORDER` Fira
  10.5px gray mt 10; `[ SUBMIT SEQUENCE ]` grades `order[i]===i`. Result
  line mt 12 Fira 12px: `// SEQUENCE CORRECT` green or `// SEQUENCE
  INCORRECT — correct order shown by numbering` red.
- brkBtn (submit style): mt 14, transparent, 1px cyan border, cyan,
  Orbitron 700 12px ls .14em, pad 11 20.

### Lab (renderLab)
- sectionLabel `LAB // <TITLE|CONSOLE>` cyan.
- SIMULATION banner: 1px amber border, amber-.08 bg, pad 8 12, mb 16;
  8px amber `.ledblink` square + `SIMULATION MODE — RESPONSES ARE CANNED,
  NO LIVE NETWORK` Fira 11px ls .14em amber 600.
- briefing: gray 15px lh 1.6 md(), mb 14.
- REQUEST block (cyan .25 border, bg `rgba(5,10,20,0.85)`, pad 14 16,
  mb 14): `REQUEST` label Fira 11px gray; method green 600 + path cyan Fira
  14px; `If-None-Match:` label + input (bg navy, cyan-.3 border, cyan Fira
  12px, pad 8 10, flex 1 min 220px); `[ TRANSMIT ]` full-width SOLID cyan
  button (Orbitron 700 13px ls .16em, navy text, pad 12).
- Canned-response logic: default = the `when==='default'` entry (or first);
  if a `when==='if-none-match-matches'` entry exists and the trimmed,
  quote-stripped field equals the default response's quote-stripped ETag,
  serve it (the 304). No live network ever.
- Response block (border/status colour: under 300 green, under 400 amber,
  else red): header row (9px glow dot + `HTTP <status> OK|NOT MODIFIED`
  Fira 14px 600), `HEADERS OF INTEREST` label + `key: value` lines (key
  amber, value white, Fira 12px lh 1.7 break-all), `BODY` label + pretty
  JSON pre (Fira 12.5px cyan) or `(no body)` italic gray.
- debrief (after transmit): 2px cyan left border, pl 12, gray 14px md().

### Scenario (renderScenario — the war story)
Amber themed: sectionLabel `WAR STORY // <TITLE|SCENARIO>` amber; card
accent amber .25 (green/red .3 once answered). terminalBlock(situation);
prompt white 17px 600 margin 18 0 14; options behave exactly like mcq
(qState keyed by the scenario id). DEBRIEF after answering: 2px amber left
border, pl 12; `DEBRIEF: ` prefix amber Fira 11px ls .12em; body gray 14px
md().

### Economy + ledger
- Answer: `_recordAnswer` logs a txn {kind:'answer', moduleId/Title, qid,
  qPrompt, correct, delta +-rightReward/wrongPenalty, balanceAfter} and
  `awardFrom(e)` plays ok/err + spawns a flyer from the clicked element.
- Flyer: `+€$ n` / `-€$ n` Fira 700 22px in green/red with 14px text glow,
  fixed at the source centre; after 400ms it flies to the `#op-balance`
  centre (`transform .74s cubic-bezier(.4,0,.25,1)`, scale to 0.65, opacity
  to 0.75); at 1160ms it is removed, the balance animates to the new value
  (count 650ms) and the balance box pulses (border+glow in the delta
  colour, 560ms).
- `completeModule` (`[ TRANSMIT FOR COMPLETION // +€$ <reward> ]`, gold
  solid button, Orbitron 800 14px ls .16em): logs a module txn, then the
  TRANSFER overlay — fixed inset dim `rgba(5,10,20,0.72)` blur 3; 480px
  box. Phase 1 `transferring` (red): ledblink warning glyph +
  `TRANSFERRING FUNDS...` Fira 600 16px ls .16em red; 12px red progress
  bar +4% every 32ms after a 260ms delay, rising chatter tone
  (`200 + p*5.4` Hz square 0.045s) every 8%; `CURRENT PROGRESS n %`
  caption. Phase 2 `transfer` (gold, chime): `TRANSFER €$ <amt>` header,
  2px gold rule, `ACCOUNT BALANCE` label + Fira 600 34px gold count-up
  (900ms rAF) with gold glow; commits eddies + moduleDone, holds 1500ms,
  closes.
- Complete stage card (when done): accent green .35; `CERTIFIED` stamp with
  a check — NCD 400 22px ls .08em green, 2px green border, pad 8 16,
  rotate(-3deg), green glow; `[ SAVE TO SHARD ]` solid cyan;
  `[ RETURN TO DASHBOARD ]` brkBtn. When not yet done, the copy reads
  "All sections cleared. Transmit for completion..." (gray 15px).
- Txn history modal exists (openTxns from the balance button; `jumpToTxn`
  deep-links to `stg-<mod>-<qid>`, reveals it and pulses a cyan box-shadow
  for 1.4s) — full modal spec to be extracted with the Service Record slice.

### Radio panel (expanded pill; renderMusicPlayer)
Pill (collapsed) already specced — addition: the border and freq/track text
go gray (border gray-.4) when music is muted; hover forces a solid cyan
border.
Expanded: fixed right 22 bottom 22, 300px (max `calc(100vw - 44px)`), bg
`rgba(8,18,34,0.97)`, 1px cyan border, shadow `0 0 40px
rgba(0,240,255,0.22)`, blur 5, Fira base.
- Titlebar: solid cyan, navy text, `NC RADIO` with a note glyph in NCD 400
  13px ls .12em, pad 8 8 8 14; minimize button (en-dash, navy, 16px, 700).
- Now-playing box (pad 13 15, cyan .25 border, cyan .04 bg): freq 26px 700
  cyan with 12px glow (gray, no glow, when muted/paused); station name 11px
  ls .12em white ellipsis; 10-bar EQ at 32px (same eqbar formula); track
  title 13px 600 gold; status line 9px ls .13em gray — `PAUSED` /
  `MUTED` / `<genre> - <bpm> BPM` with mode glyphs; track progress — 4px
  bar (gray-.22 track, cyan fill + glow; gray when muted/paused) with m:ss
  current/total (engine trackProgress polled every 400ms while open;
  duration from the engine, default 240s).
- Transport row (flex gap 8 mt 14): prev / `PLAY`|`PAUSE` (big variant:
  flex 1, cyan .1 bg, cyan border) / next — 38px high, hover cyan.
- `TRACK n / total - STEP TRACKS` caption 9px ls .16em gray centred mt 8.
- Station chips (flex wrap gap 6 mt 14): freq labels Fira 10px pad 5 8 —
  active solid cyan/navy 700; inactive transparent/gray with gray-.35
  border, hover cyan.
- AUTO-ROTATE toggle: full width 32px, `AUTO-ROTATE - ON|OFF` with a loop
  glyph, 10px ls .16em 600 — on = cyan .12 bg + cyan; off = transparent +
  gray.
- Volume rows x2 (`MUSIC` default 0.4, `SYSTEM SOUNDS` default 0.8):
  speaker mute button 24x22 (red with X lines when muted, waves otherwise),
  label 10px ls .14em gray, right side `n%` cyan or `MUTED` red; range
  input 0..1 step .01 `accent-color` cyan (dimmed when muted); right-click
  anywhere on the row resets to the default (with a tick).
- SFX on interactions: dial/track changes `drivehi`, play/pause `nav`,
  cycle/minimize/volume-reset `tick`.

### Certificate name prompt (renderNamePrompt — for the cert slice)
Modal (z 9999, dim blur 4, click-outside cancels): 440px navy box, cyan
border + 44px glow; titlebar solid cyan `OPERATOR IDENTIFICATION` NCD 400
14px ls .1em; body prompt Fira 12px gray; same input styling as boot;
`[ ISSUE CERTIFICATE ]` (solid cyan when a name is typed; dimmed
`rgba(0,240,255,0.25)` + not-allowed when empty) + `[ CANCEL ]` outline
gray. Enter confirms, Escape cancels.
