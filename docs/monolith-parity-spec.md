# Monolith Parity Spec: measured from the 0.1.0 Design export

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
  - `cursorblink{0%,49%{opacity:1}50%,100%{opacity:0}}`: 1s steps(1) infinite
  - `.cursor`: inline-block 9px × 1.05em, bg cyan, margin-left 2px,
    vertical-align -2px
  - `ledblink` (1.1s steps(2)) opacity 1→0.2; `statusblink` (2s ease) 1→0.3;
    `.statusled` uses statusblink
  - `eqbar{0%{scaleY(0.18)}100%{scaleY(1)}}`
  - `mqbounce{0%,14%{translateX(0)}86%,100%{translateX(var(--mqd,0))}}`
  - `floatup`, `flashbg`, `ncrowbump`: module-player slice
- `#scanlines`: fixed inset 0, z 9990, repeating-linear-gradient 0deg,
  cyan 0.035 1px / transparent to 3px. `#vign`: fixed, z 9989,
  radial-gradient transparent 55% → rgba(0,0,0,0.45) 100%
- Reduced motion: scanlines hidden; `.ledblink`/`.cursor` animation none.
  Sync-offset telemetry still runs (deliberate: text change, not motion).
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

Global pointer tick: capture-phase `pointerdown` on the root, walk ≤6
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
bootDone instantly. Full text lines: see `fullBoot()`, identical to current
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
- ACCESS button, TWO states (`ready = name.trim() && !courseLoading`):
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
  ls .1em cyan: `LVL <n> <RANK TITLE>`, clearance = max clearance of
  completed modules, rank from `course.ranks`); balance BUTTON
  (title "View transaction history"): border 1px `rgba(255,212,0,0.5)`,
  bg `rgba(255,212,0,0.05)`, pad 6 12, column align-end gap 2; row =
  `BALANCE` Fira 8.5px ls .14em gray + 10px hamburger-lines SVG (#8892b0,
  opacity .85); value Fira 600 14px ls .06em gold `€$ 500`
  (`symbol + ' ' + eddies`; red when negative). Hover: bg `0.12`, border
  `0.85` alpha. (Opens transaction history, later slice; render the button
  now, no-op with cursor pointer.)

SYSTEM_STATUS readout: fixed `left:18px` (`306px` in player view, animated
via `transition:left 0.35s cubic-bezier(0.22,1,0.36,1)`), `bottom:14px`,
z 9100, flex gap 11, pad 7 4, pointer-events none, Orbitron 10px, opacity .9.
Parts: `[SYSTEM_STATUS: <STATUS>]` ls 1px, colour cyan/amber/red by status
(transition color .5s); LED 8px circle `.statusled` class, bg+glow
green/amber/red; `SYNC_OFFSET: <n.nn>ms` Fira ls .08em cyan opacity .75
tabular-nums. Telemetry: every 2000ms roll, 85% `rand*200` NOMINAL,
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
`setActive(view!=='boot')`, music only starts after login gesture. Click
opens the radio panel (later slice; render pill + engine wiring now).

## Dashboard view

Scroll container `.dash-scroll`: `flex:1; overflow-y:auto;
padding:48px 40px 60px` (this is the app's `<main>`, keyboard scrolling:
ArrowUp/Down ±90, PageUp/Down/Space ±90% height, Home/End, unless focus in
input/button). Column: `max-width:1100px; margin:0 auto`.

- Terminal line `> ACCESS GRANTED. RENDERING AVAILABLE COURSEWARE...`:
  Fira 12px ls .1em cyan, mb 8
- H1 `OPERATOR DASHBOARD`: Night Corp Display **400** 38px ls .06em white,
  margin 0 0 6px  ← the rebuild had 700 (faux-bold; NCD has no 700)
- Lead: Rajdhani 16px ls .02em gray, mb 38
- Orientation card (shows when `!anyProgress && !firstRunSeen`, session
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
  **Deliberate fix:** monolith shows `mods.length` (9), a bug (label says
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
    (partial-module credit, see `partialFrac`)
  - CTA button: mt 18, 100% width, transparent bg, 1px cyan border, cyan,
    Orbitron 700 12.5px ls .16em, pad 12. Label `[ BEGIN PROGRAM ]`, or
    `[ RESUME PROGRAM ]` when any progress. Hover: solid cyan bg, navy text.
- Relays (`margin-top:48px`): header `TRANSMISSION RELAYS // EXTERNAL LINKS`
  same style as courses header (mb 20; suffix span cyan). Links flex wrap
  gap 12; each `inline-flex` gap 10, Fira 12px ls .1em, pad 11 16, coloured
  by kind, cyan / gold (Ko-fi) / gray (GitHub): border `rgba(<c>,0.4)`,
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
or 500). The rebuild's earlier invented `{user, progress}` shape is WRONG;
replace it. localStorage keys are `ncza:v1:progress:<name>` + `ncza:v1:lastUser`
(shipped 0.1.0 users may hold these).

## Deliberate divergences from the monolith (fixes, user-approved)

1. `AVAILABLE COURSES [ 9 ]` → `[ 1 ]` (label counts courses, not modules).
2. Root favicon 404 + login input missing id/name (noted in the 0.1.0 commit),
   fixed in the rebuild.
3. Hover states move from JS style-mutation to CSS `:hover` (same visual
   result; idiomatic in the rebuild's architecture).

## Module player (extracted 2026-07-09; build slice pending)

### Shell
`isPlayer` view replaces the dashboard under the same app header:
`.player-wrap` flex row, `flex:1; overflow:hidden; position:relative`.

- **Rail** `aside.player-rail`: 288px, border-right cyan .2, bg
  `rgba(10,25,47,0.85)`, own scroll, flex column.
  - Top block (pad 16 18, border-bottom cyan .15): `RETURN TO DASHBOARD`
    button with a leading chevron: Fira 10.5px ls .12em gray, 1px gray-.5
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
    currentColor, hover: solid cyan bg + navy text); records
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
margin 0 0 6px; subtitle Rajdhani 16px gray; module progress bar mt 14:
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
  16 18; each line Fira 13px lh 1.7 pre-wrap; lines starting `>` are cyan,
  rest white (unescape `&gt;`).
- `md(str)` markdown-lite: `**bold**` = white 700 strong; `*em*` = white em;
  backtick code = Fira 0.88em cyan on cyan-.1 bg, 1px cyan-.2 border, pad
  1 5; `[label](url)` = link (global link styles). No other syntax.
- `sources(list)`: mt 12 flex wrap gap 8; `SOURCES:` Fira 9.5px ls .14em
  gray; each source a Fira 10px link; kind `project` = amber with a lozenge
  prefix + amber-.35 underline, else cyan with an arrow prefix.

### Chunk types (renderChunk, heading optional: Orbitron 600 15px white mb 12)
- `text`: p, gray 16px lh 1.65, md().
- `code`: dark block (bg `rgba(5,10,20,0.9)`, cyan .2 border) with header
  row (`<LANG>` + `// SNIPPET`, Fira 10px ls .12em gray, border-bottom cyan
  .15) and pre Fira 13px lh 1.65 cyan, pad 14 16, overflow-x auto.
- `table`: scroll wrapper (cyan .2 border), table min-width 420 collapse;
  th left, pad 10 14, Fira 10.5px ls .12em cyan on cyan-.06 bg,
  border-bottom cyan .25; td pad 10 14, 14px; first column white Fira,
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

### Scenario (renderScenario, the war story)
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
  TRANSFER overlay: fixed inset dim `rgba(5,10,20,0.72)` blur 3; 480px
  box. Phase 1 `transferring` (red): ledblink warning glyph +
  `TRANSFERRING FUNDS...` Fira 600 16px ls .16em red; 12px red progress
  bar +4% every 32ms after a 260ms delay, rising chatter tone
  (`200 + p*5.4` Hz square 0.045s) every 8%; `CURRENT PROGRESS n %`
  caption. Phase 2 `transfer` (gold, chime): `TRANSFER €$ <amt>` header,
  2px gold rule, `ACCOUNT BALANCE` label + Fira 600 34px gold count-up
  (900ms rAF) with gold glow; commits eddies + moduleDone, holds 1500ms,
  closes.
- Complete stage card (when done): accent green .35; `CERTIFIED` stamp with
  a check: NCD 400 22px ls .08em green, 2px green border, pad 8 16,
  rotate(-3deg), green glow; `[ SAVE TO SHARD ]` solid cyan;
  `[ RETURN TO DASHBOARD ]` brkBtn. When not yet done, the copy reads
  "All sections cleared. Transmit for completion..." (gray 15px).
- Txn history modal exists (openTxns from the balance button; `jumpToTxn`
  deep-links to `stg-<mod>-<qid>`, reveals it and pulses a cyan box-shadow
  for 1.4s); full modal spec to be extracted with the Service Record slice.

### Radio panel (expanded pill; renderMusicPlayer)
Pill (collapsed) already specced; addition: the border and freq/track text
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
  title 13px 600 gold; status line 9px ls .13em gray: `PAUSED` /
  `MUTED` / `<genre> - <bpm> BPM` with mode glyphs; track progress, 4px
  bar (gray-.22 track, cyan fill + glow; gray when muted/paused) with m:ss
  current/total (engine trackProgress polled every 400ms while open;
  duration from the engine, default 240s).
- Transport row (flex gap 8 mt 14): prev / `PLAY`|`PAUSE` (big variant:
  flex 1, cyan .1 bg, cyan border) / next: 38px high, hover cyan.
- `TRACK n / total - STEP TRACKS` caption 9px ls .16em gray centred mt 8.
- Station chips (flex wrap gap 6 mt 14): freq labels Fira 10px pad 5 8,
  active solid cyan/navy 700; inactive transparent/gray with gray-.35
  border, hover cyan.
- AUTO-ROTATE toggle: full width 32px, `AUTO-ROTATE - ON|OFF` with a loop
  glyph, 10px ls .16em 600: on = cyan .12 bg + cyan; off = transparent +
  gray.
- Volume rows x2 (`MUSIC` default 0.4, `SYSTEM SOUNDS` default 0.8):
  speaker mute button 24x22 (red with X lines when muted, waves otherwise),
  label 10px ls .14em gray, right side `n%` cyan or `MUTED` red; range
  input 0..1 step .01 `accent-color` cyan (dimmed when muted); right-click
  anywhere on the row resets to the default (with a tick).
- SFX on interactions: dial/track changes `drivehi`, play/pause `nav`,
  cycle/minimize/volume-reset `tick`.

### Certificate name prompt (renderNamePrompt, for the cert slice)
Modal (z 9999, dim blur 4, click-outside cancels): 440px navy box, cyan
border + 44px glow; titlebar solid cyan `OPERATOR IDENTIFICATION` NCD 400
14px ls .1em; body prompt Fira 12px gray; same input styling as boot;
`[ ISSUE CERTIFICATE ]` (solid cyan when a name is typed; dimmed
`rgba(0,240,255,0.25)` + not-allowed when empty) + `[ CANCEL ]` outline
gray. Enter confirms, Escape cancels.

### Lab data contract (GAP FIX, 2026-07-09, diverges from the monolith)
The shell (monolith included) was built against the Design sample course,
whose only lab was conditional retrieval, so it hardcoded one
`If-None-Match:` input onto every lab and matched only
`if-none-match-matches`. The authored course declares a richer per-lab
contract the monolith never implemented (user-confirmed bug: m01's lab
could never serve anything but the default 200):

- `request.editable: string[]`, which fields the operator edits;
  `query.<k>` renders a `?k=` input, `headers.<k>` renders a `k:` input;
  empty = no inputs. `request.query`/`request.headers` carry base values
  (m08 has a fixed `?full=1`).
- canned `when` selection, first match in authored order, else `default`:
  `if-none-match-matches` = edited If-None-Match equals the default
  response's quote-stripped ETag; generic `<key>=<value>` = edited
  query/header value equals `<value>` (m01's `full=1`); other states
  (`stale`, `not-ready`, `rate-limited`) are not operator-reachable.
- The request line renders `path?query` from the current values.

## Overlay modals: Field Glossary + Transaction History (extracted 2026-07-09)

Both mount at app root (after the cert/name-prompt overlays, before the
music player) and share one shell pattern:

- Scrim: `position:fixed inset:0 z-index:9995`, bg `rgba(5,10,20,0.86)`,
  `backdrop-filter:blur(4px)`, `display:flex align-items:flex-start
  justify-content:center`, padding `56px 24px` (txn narrow ≤640:
  `20px 8px`), `overflow:auto`. Click on the scrim closes; clicks inside
  the box `stopPropagation`.
- Box: navy `#0a192f`, `max-width:100%`, flex column,
  `max-height:calc(100vh - 112px)` (txn narrow: `calc(100vh - 40px)`).
- Title bar (flexShrink 0, pad 12 20, solid accent bg, navy text):
  left = NCD/'Orbitron' 400 15px ls .1em title + Fira 400 11px dimmed
  `// <sub>`; right = `[ ESC ] CLOSE` button, transparent, 1px
  `rgba(10,25,47,0.5)` border, navy, Orbitron 700 12px ls .1em,
  pad 6 12, line-height 1.
- Escape closes (checked BEFORE the input-tag guard in the key handler,
  works while focus is in the search input). Glossary check precedes txn.

### Field Glossary (renderGlossary / filteredGlossary)

Box 900px, 1px cyan border, glow `0 0 50px rgba(0,240,255,0.18)`. Title
`FIELD GLOSSARY` `// NC-ACAD-01` (sub opacity .65). Body scroll pad
`28px 32px 34px`:

- `> INDEXING FIELD TERMINOLOGY...` Fira 12px ls .1em cyan, mb 8.
- Intro, gray 15px, mb 22: "Reference terminology cited across the
  coursework. Open anytime — filter by clearance tier or search the index."
- Search + filter row (flex gap 12 wrap, mb 12): search wrap
  `flex:1 min-width:240px relative` with a `>` prompt (absolute left 12,
  vert-centred, gray Fira 13px); input full-width, bg navy, 1px cyan-.3
  border, white Fira 13px ls .06em, pad `11px 12px 11px 28px`,
  placeholder `SEARCH TERMS`. Tier pills (gap 8): ALL / PROJECT / GENERAL,
  Fira 10.5px ls .12em pad 7 14, transition none; ON = solid cyan bg,
  navy text, cyan border; OFF = transparent, gray text, border
  `rgba(136,146,176,0.4)`.
- Count line: Fira 11px ls .14em gray, border-bottom
  `rgba(136,146,176,0.25)`, pb 10 mb 20, `ENTRIES ` +
  cyan `[ shown / total ]`.
- Entry list (flex column gap 14). Card: 1px cyan-.18 border, bg
  `rgba(17,34,64,0.5)`, backdrop blur 4, pad 18 20. Term row (flex gap 12
  mb 8): term Orbitron 700 16px ls .06em cyan + tier badge Fira 9px
  ls .14em pad 3 8: PROJECT amber text/border, GENERAL cyan text /
  `rgba(0,240,255,0.5)` border (tier defaults to `general`). Definition:
  white 15px lh 1.65 through md(). Sources row (same primitive as chunks).
- Empty state: dashed `rgba(136,146,176,0.4)` border, pad 34, centred
  Fira 13px ls .08em gray: `> NO MATCHING ENTRIES. Adjust the query or
  clear the tier filter.`
- Filter: tier `all|project|general` against `g.tier || 'general'`; query
  lowercased substring over term OR def; sort `localeCompare` on term.
- `glossaryQuery`/`glossaryTier` live in app state; they persist across
  open/close for the session and are NOT in the record.
- Openers: the floating FAB (default placement): open state = solid cyan
  bg, navy text, cyan border; hover (closed) bg `rgba(0,240,255,0.14)`.
  `goGlossary()` (a glossary *view*) is dead code, never called.
- Real course data: 42 entries, tiers exactly project(16)/general(26),
  fields term/tier/def/sources, all entries have sources.
  `fieldNotes.glossaryTerms` in course data is never consumed; no feature.

### Transaction History (renderTxnHistory / openTxns / jumpToTxn)

Opened from the header balance chip (`#op-balance`, title "View
transaction history"); `openTxns` plays an explicit `tick` (on top of the
global pointer tick). Box 760px, gold border, glow
`0 0 50px rgba(255,212,0,0.16)`; title `TRANSACTION HISTORY`
`// ACCOUNT LEDGER` (sub opacity .7) on solid gold. Body pad
`24px 28px 30px` (narrow ≤640: `16px 14px 22px`):

- `> ACCESS GRANTED. RENDERING SIGNED LEDGER...` Fira 12px ls .1em gold,
  mb 16.
- Summary cells (flex gap 12 wrap, mb 22): OPENING BALANCE (gray) /
  EARNED `+€$ n` (green) / DEDUCTED `-€$ n` (red) / CURRENT (gold; red if
  negative). Cell `flex:1 1 0` (narrow: `calc(50% - 6px)`), 1px cyan-.18
  border, bg `rgba(17,34,64,0.5)`, pad 12 16 (narrow 10 12); label Fira
  9.5px ls .14em gray mb 6; value Fira 600 17px (narrow 15px) ls .04em.
  Opening = `economy.startingBalance || 500`; earned/deducted summed from
  txn deltas.
- `LEDGER [ n ]` line: Fira 11px ls .14em gray, gold count, border-bottom
  `rgba(136,146,176,0.25)` pb 10 mb 6; right-floated gray .7
  `GROUPED BY MODULE · NEWEST FIRST`.
- Rows = `txns` reversed (newest first), grouped by `moduleId` preserving
  that order. Group header: flex gap 10, pad 9 12, bg cyan-.06,
  border-left 2px cyan; title Orbitron 700 11px ls .1em cyan (ellipsis),
  `[count]` Fira 9.5px gray, right `NET ±€$ n` Fira 600 12px green/red.
- Row (wide) = full-width button, flex gap 16, 1px
  `rgba(136,146,176,0.16)` border with border-top none (rows share
  edges), pad 14 12; jumpable (has qid+moduleId) → pointer cursor + hover
  bg `rgba(255,212,0,0.06)` / border `rgba(255,212,0,0.4)`. Cells: time
  92px Fira 10px gray (`MMM dd HH:mm`, 24h); kind tag 118px centred
  Orbitron 700 9px ls .12em pad 4 8: `MODULE CLEARED` gold /
  `rgba(255,212,0,0.5)`, `CORRECT` green /.5, `INCORRECT` red /.5; title
  flex-1 white 13.5px nowrap-ellipsis (module txn = `Certified: <title>`,
  else `qPrompt || 'Knowledge check'`) + `↳ JUMP TO ANSWER` Fira 9.5px
  gray mt 3 when jumpable; delta 96px right Fira 600 15px green/red
  `±€$ n`; `BAL €$ n` 80px right Fira 11px gray.
- Row (narrow ≤640): column layout, tag+time row with delta right;
  title white 14px lh 1.45 wraps; bottom row `BAL` + gold
  `↳ JUMP TO ANSWER` right.
- Empty state: dashed border, pad 34, mt 16: `> NO TRANSACTIONS YET.
  Answer a knowledge check to open your ledger.`
- `jumpToTxn` (only when qid+moduleId): find module → buildStages → idx
  of the stage whose data id === qid → `revealed = max(resume, idx+1)`
  (revealedBy is NOT written) → close modal, enter player with stick OFF
  → double-rAF scroll `main.scrollTop += el.top - main.top - 24` to
  `#stg-<mid>-<qid>` → flash `box-shadow: 0 0 0 2px cyan,
  0 0 24px rgba(0,240,255,0.4)` (transition .2s) cleared after 1400ms.
- Txn shape (writer + reader agree, incl. 0.1.0 shards):
  `{ id, ts, kind:'answer'|'module', moduleId, moduleTitle, qid, qPrompt,
  correct, delta, balanceAfter }`.

## Service Record view + shard I/O overlays (extracted 2026-07-09)

Monolith source: `git archive f16bd4f public/` → index.html. Methods:
`progressStats` (1852), `renderProgress` (1862), `exportRecord` (726),
`renderEject` (762), `importRecord`/`slotShard`/`renderSlot` (804–907),
`renderSlotConfirm` (937), `askPurge`/`confirmPurge`/`renderPurgeConfirm`
(911–936), `setOperatorName` (642), `onImportPick` (956).

### progressStats (certification rule)

`mods` = modules sorted by order; `done` = completed; `capstone` = first
module with `capstone === true`. `certified` = capstone done if a capstone
exists, else "every module complete" (and at least one module). Clearance
for the view = `max(1, ...done.map(clearance||1))` or 1, same derivation
as the header (reuse `clearanceAndRank`).

### renderProgress (the view)

Nav: header SERVICE RECORD tab (`goProgress()`, plain view switch, no
extra sfx beyond the global pointer tick). Active tab styling identical to
DASHBOARD's. Scrollable main, pad `48px 40px 60px`, inner max-width 960
centred:

- `> READING SERVICE RECORD SHARD...` Fira 12px ls .1em cyan, mb 8.
- Title row (flex gap 16, mb 6): shard-icon.svg 68×32 + h1
  `SERVICE RECORD SHARD` Night Corp Display 400 38px ls .05em white.
- Lede gray 16px mb 28: "Standing, completed modules and earned
  certifications, written to a datashard. Eject the shard to carry your
  progress, or slot a saved one to restore it."
- OPERATOR IDENTITY section (cyan label): box flex gap 14 align-end wrap,
  1px `rgba(0,240,255,0.18)` border, bg `rgba(17,34,64,0.5)`, pad 18 20,
  mb 34. Input block flex-1 min 240: label `OPERATOR NAME / CALLSIGN`
  Fira 10px ls .14em cyan mb 7; input (value = LIVE state, maxLength 42,
  onChange `_cleanNameInput`: strips control chars only, no trim while
  typing, then debounced save) bg `#050a14`, 1px cyan-.4 border, white,
  Orbitron 700 16px ls .08em, pad 12 14, placeholder `e.g. S. DORSETT`.
  Caption right (max 280, pb 12) Fira 10.5px gray: "Prints on your field
  certificate and is written to your Service Record Shard."
- Stat row (flex gap 14 wrap, mb 34), cards `flex:1` min 150, 1px
  `<color>55` border, bg `rgba(17,34,64,0.55)`, pad 16 18; label Fira
  9.5px ls .16em gray mb 8; value Orbitron 700 22px (RANK card 15px)
  `overflow-wrap:anywhere`: CLEARANCE `LVL n` cyan / RANK title cyan /
  MODULES CLEAR `d / n` green / EDDIES BALANCE `€$ n` gold (red if
  negative). Balance shows `s.eddies` (settled, not the count-up shown).
- MODULE STATUS section (cyan): one row per module: flex gap 12, pad
  12 14, mb 6; done → 1px `rgba(0,255,157,0.3)` border + bg green-.05,
  else gray-.2 border. Dot 11×11: done = solid green + glow; else
  transparent + 1px gray border. Title Rajdhani 600 15px (white done /
  gray not); meta Fira 9.5px gray
  `CLR n // [CAPSTONE // ]COMPLETE|NOT STARTED`. Right status Fira 10px
  `✓ CERTIFIED` green / `— PENDING` gray. Empty course →
  `> no modules in this course.`
- EARNED CERTIFICATIONS section (green): stamps flex gap 16 wrap mb 34
  align-start. Per done module: 2px green border, green text, pad 10 14,
  Orbitron 700 11px, rotate(-2deg), bg green-.06: `MODULE CLEAR` +
  module id uppercase Fira 9px gray. If certified, a bigger stamp is
  UNSHIFTED first: 3px border, pad 14 20, 800 16px ls .16em,
  rotate(-4deg), bg green-.1, glow `0 0 22px rgba(0,255,157,0.25)`,
  `CERTIFIED` / `FIELD OPERATOR` (green, .8). Empty → dashed gray box:
  `> NO CERTIFICATIONS ON RECORD. Complete a module to earn your first
  stamp.`
- SERVICE RECORD SHARD // DATA TRANSFER section (cyan): button row flex
  gap 12 wrap. Outline buttons (transparent bg, 1px accent border, accent
  text, Orbitron 700 12px ls .14em, pad 13 20): `[ EJECT SHARD ]` cyan →
  exportRecord; `[ SLOT SHARD ]` cyan = a `<label>` wrapping a hidden
  file input (`.shard,.json,application/json`; input value reset after
  pick so the same file re-fires); `[ VIEW CERTIFICATE ]` green,
  disabled unless certified (disabled: gray-.3 border, gray text,
  opacity .6, not-allowed cursor).
- `importMsg` line (mt 14, Fira 12px, green ok / red fail): `> <text>`.
  Set by eject/slot/purge/cancel flows; persists across view switches
  (lives in app state; only a boot-screen shard login clears it).
- If not certified: locked hint mt 12 Fira 11px gray: `> CERTIFICATE
  LOCKED. Complete the capstone module to unlock the printable field
  certificate.`
- Danger zone: mt 30, pt 18, border-top 1px DASHED `rgba(255,51,85,0.35)`,
  flex gap 16. `[ PURGE LOCAL CACHE ]` red outline (border red-.55,
  11.5px, pad 11 18; hover = solid red bg + `#0a0f14` text) + caption
  Fira 10.5px gray: "Wipes this terminal back to a clean record. Ejected
  shards are unaffected."

NOTE: no operator list in this view; `listUsers()` is progress-adapter
API only (the boot screen owns operator selection). Plan's earlier
"operator list" mention was wrong.

### exportRecord + renderEject (eject overlay)

Guard: no-op if an eject is already running. Play `whoosh`; fname
`NCZA_<SLUG>_operator-shard.shard` (sanitized name uppercased,
non-alphanumerics → `-`, trimmed, fallback `OPERATOR`). Progress 0→100
over 820ms driven by rAF, plus a `setTimeout(dur+250)` guard so a
backgrounded tab still finishes (download must never gate on rAF). At
finish: build JSON (pretty, 2-space) → Blob → temp `<a download>` click;
phase `ejected` (or `error` + message); `importMsg` set
`SHARD EJECTED // <fname>` / `EJECT FAILED // <msg>`; overlay auto-clears
after 2300ms.

Overlay (z **9998**, UNDER the confirm dialogs at 9999 and the radio
pill wins by DOM order): fixed inset-0 flex-centred, bg
`rgba(5,10,20,0.78)` + blur(3px). Box 460px max 92%, 1px accent border,
bg `rgba(5,10,20,0.97)`, glow `0 0 44px <accent-glow>`. Accent: cyan
while writing (glow `rgba(0,240,255,0.28)`), green ejected (.3), red
error (`rgba(255,51,85,0.32)`).

- Header row (pad 14 22, bottom border gray-.2): 9px LED dot (ledblink
  while writing; solid when done/err) + Fira 600 14px ls .16em accent
  text `WRITING SERVICE RECORD SHARD...` / `SHARD EJECTED` /
  `EJECT FAILED`.
- Reader graphic (pad `36px 32px 22px`, centred; canvas 270×92):
  reader body abs left 0 top 16, 152×60, 2px gray border, radius 6, bg
  `linear-gradient(180deg,#0e1c30,#0a1424)`, inset shadow
  `inset 0 0 12px rgba(0,0,0,0.6)`; slot lip right -2 top/bottom 11
  width 8 bg `#050a12` with gray top/bottom borders; two 6px LEDs at
  11,11 gap 5 (first accent, ledblink while active; second gold with
  glow → gray no-glow when ejected). Shard chip abs left 106 top 24,
  64×46, 1.5px accent border radius 4, bg
  `linear-gradient(150deg,#0a2436,#061520)`, shard-icon.svg 48×23
  centred inside (opacity .95); `transform: translateX(0→120px)` when
  ejected (`transition: transform .78s cubic-bezier(.2,.85,.25,1),
  opacity .6s ease`), glow `0 0 22px accent` when out (else
  `0 0 8px rgba(0,240,255,0.3)`); error → chip opacity .35.
- Footer (pad `0 32px 26px`): while writing: 8px bar (1px cyan border,
  bg `#0a0f14`, fill cyan + glow `0 0 10px cyan`, `width .05s linear`)
  + centred Fira 11px ls .14em gray `ENCODING RECORD  n %` (two
  spaces); done: centred Fira 11.5px green `> <fname>` (break-all);
  error: red `> <msg>`.

### importRecord / slotShard / renderSlot (slot overlay)

File read via FileReader text → `progress.import` (parse + migrate;
reject → `importMsg` `SHARD REJECTED // <msg>`; read error →
`SHARD READ FAILED // could not read file`). Then: at boot → boot login
flow (already built); else if current progress non-empty
(`moduleDone` non-empty OR eddies ≠ startingBalance) → set
`pendingShard` (confirm dialog); else slot immediately.

`slotShard`: guard if already running; `whoosh`; phase `reading`,
progress 0→100 over 820ms (same rAF + guard-timeout pattern). At finish:
commit the record (REPLACE op state, never merge; set operator +
adapter user; schedule save), `chime`, phase `slotted`, auto-clear
1700ms. Commit message: `SHARD SLOTTED // n MODULE(S) CERTIFIED
[// m IN PROGRESS]` / `SHARD SLOTTED // PROGRESS RESTORED //
m MODULE(S) IN PROGRESS` / `SHARD SLOTTED // CLEAN RECORD`
(in-progress = revealedBy > 1 and not done).

Overlay = mirror of eject: same shell, no error state; titles
`READING SERVICE RECORD SHARD...` / `RECORD SLOTTED`; chip slides IN
(`translateX(120px→0)`, opacity .95 when slotted); second LED gold →
green (keeps glow); footer `DECODING RECORD  n %` → green
`> RECORD RESTORED TO TERMINAL`.

### renderSlotConfirm + renderPurgeConfirm (red confirm dialogs)

Shared shell: z **9999**, scrim `rgba(5,10,20,0.9)` blur(4px) pad 32,
click-outside cancels; box 460px max 100%, bg `#0a192f`, 1px red border,
glow `0 0 44px rgba(255,51,85,0.28)`; SOLID RED title bar (`#0a0f14`
text, pad 11 20, Night Corp Display 400 14px ls .1em); body pad
`26px 26px 24px`: white Fira 13px lh 1.7 line (mb 10), gray 11.5px
`> ...` detail (mb 22), then flex gap 12 buttons: solid red primary
(flex 1, Orbitron 700 12px ls .12em pad 12 18, `#0a0f14` text) + gray
outline `[ CANCEL ]`. NOT Escape-wired in the monolith (only
glossary/txn are); keep that.

- Slot confirm (pendingShard set): `⚠ OVERWRITE WARNING` / "SLOTTING
  WILL OVERWRITE CURRENT PROGRESS." / `> Incoming shard: n module(s),
  operator "<name|UNNAMED>". This replaces your current record and
  cannot be undone.` / `[ OVERWRITE & SLOT ]`. Cancel → importMsg
  `SLOT CANCELLED // CURRENT PROGRESS PRESERVED`.
- Purge confirm: `⚠ PURGE LOCAL CACHE` / "THIS WIPES ALL PROGRESS ON
  THIS TERMINAL." / `> Certifications, quiz results, eddies and session
  place reset to a clean record. Any shard you have already ejected is
  unaffected. This cannot be undone.` / `[ PURGE RECORD ]`. Confirm:
  remove persisted profile for the CURRENT operator (persist mode only),
  play `err`, reset moduleDone/quiz/revealedBy/eddies(→starting)/txns,
  keep operator signed in; importMsg `LOCAL CACHE PURGED // RECORD RESET
  TO CLEAN STATE`.

### Rail SAVE PROGRESS routes through the eject overlay

Monolith: rail SAVE PROGRESS = `revealedBy[id] = max(…, revealed)` then
`exportRecord()`; the completion stage's `[ SAVE TO SHARD ]` is
`exportRecord()` directly. Both show the full eject animation. The
rebuild's slice-2 `saveProgress` (bare download + whoosh) predates the
overlay; fix it to route through the shared eject flow.

## Certificate + name prompt + print CSS (extracted 2026-07-09)

Monolith source: `git archive f16bd4f public/` → index.html. Methods:
`openCert`/`confirmName`/`cancelNamePrompt`/`editCertName`/`closeCert`/
`printCert` (957–967), `renderNamePrompt` (1628), `renderCert` (1950),
print CSS (46–51). Root order: cert renders after the purge confirm, name
prompt after cert (z decides anyway: cert 9998, prompt 9999).

### Flow

`openCert()` (VIEW CERTIFICATE, enabled only when certified): operator name
non-blank → `certMode`; blank → `certPrompt` with EMPTY `nameInput`.
`confirmName()`: sanitize `nameInput`; empty → no-op (button also disabled);
else set operatorName (+ save), close prompt, open cert. `editCertName()`
(from the cert): close cert, open prompt with nameInput = CURRENT name.
`printCert()` = `window.print()`. `nameInput` stores the RAW value (maxLength
42); sanitation happens on confirm only.

### renderCert (z 9998)

Scrim: fixed inset-0, `rgba(5,10,20,0.9)` + blur(4px), flex-centred, pad
32, `overflow: auto`. NO click-outside close and NOT Escape-wired (close is
the button only). Column (flex col centre, gap 18): the certificate box +
a controls row.

`#cert-print` box: 720px max 100%, bg navy, 2px cyan border, glow
`0 0 50px rgba(0,240,255,0.2)`:

- Titlebar solid cyan (navy text, pad 12 22, flex between gap 14 nowrap,
  Night Corp Display 400 12px ls .06em): left
  `NIGHT CORP // URBAN PLANNING DIVISION` (min-width 0,
  ellipsis), right terminal id `NC-ACAD-01` (opacity .7, flex none).
- Body pad `44px 48px 40px`, centred, relative. Grid overlay: absolute
  inset-0, two linear-gradients `rgba(0,240,255,0.05) 1px, transparent
  1px` (rows + 90deg columns), size 26×26, pointer-events none. Content
  wrapper `position: relative` above it:
  - nc-monogram.svg 52×28, centred, mb 20, opacity .92
  - `CERTIFICATE OF FIELD CERTIFICATION` Fira 11px ls .24em gray, mb 18
  - Course title Orbitron 800 30px ls .08em white, mb 6 (fallback
    `TRANSMISSION PROTOCOLS`); subtitle gray 15px, mb 26
  - `AWARDED TO` Fira 11px ls .18em gray, mb 8
  - Operator name (sanitized, fallback `OPERATOR`) Orbitron 800 27px
    ls .06em green, text-shadow `0 0 18px rgba(0,255,157,0.35)`, mb 6
  - Rule 160×1px `rgba(0,240,255,0.35)` centred, mb 26
  - `THIS CERTIFIES THAT THE OPERATOR HAS ATTAINED` Fira 12px ls .1em
    gray, mb 6
  - `CLEARANCE LEVEL <n> // <rank>` Orbitron 700 20px ls .1em cyan,
    mb 30. Clearance = max clearance of DONE modules (same as the view).
    Rank = the LAST entry in `course.ranks` (the top rank, NOT the
    earned rank; fallback `CERTIFIED FIELD OPERATOR`).
  - CERTIFIED stamp: inline-block, 3px green border, green text, pad
    14 26, Orbitron 800 26px ls .2em, rotate(-4deg), bg
    `rgba(0,255,157,0.08)`, glow `0 0 24px rgba(0,255,157,0.25)`, mb 32
  - Footer: flex between, border-top `rgba(0,240,255,0.2)`, pt 18, Fira
    11px ls .08em gray: `ISSUED <date>` (date white; `new
    Date().toLocaleDateString('en-US', {year:'numeric', month:'long',
    day:'numeric'})`) / `AUTH <NIGHT CORP // AUTOMATED>` (value cyan).

`#cert-controls` row (flex gap 12): `[ PRINT CERTIFICATE ]` solid cyan
(navy text, Orbitron 700 12px ls .14em, pad 12 22); `[ EDIT NAME ]` cyan
outline; `[ CLOSE ]` gray outline.

`renderCert` reads `certified` from progressStats but never checks it,
`certMode` is the only gate (openCert is unreachable while the button is
disabled). Keep the same reliance.

### renderNamePrompt (z 9999, cyan, not the red confirm shell)

Scrim `rgba(5,10,20,0.9)` blur(4px) pad 32, click-outside CANCELS. Box
440px max 100%, bg navy, 1px cyan border, glow
`0 0 44px rgba(0,240,255,0.22)`. Solid cyan titlebar
`OPERATOR IDENTIFICATION` (navy text, pad 11 20, Night Corp Display 400
14px ls .1em). Body pad `26px 28px 28px`:

- `> The certificate must be issued in an operator name. Enter the name
  or callsign to print on the record.` Fira 12px ls .08em gray lh 1.6,
  mb 18
- Label `OPERATOR NAME / CALLSIGN` Fira 10px ls .14em cyan, mb 7
- Input: autoFocus, maxLength 42, same styling as the Service Record
  identity input, mb 22. Enter → confirm; Escape → cancel (wired on the
  INPUT, not globally).
- Buttons flex gap 12: `[ ISSUE CERTIFICATE ]` flex 1, navy text; valid
  (trimmed input non-empty): solid cyan; empty: bg `rgba(0,240,255,0.25)`,
  border cyan-.3, not-allowed. `[ CANCEL ]` gray outline.

### Print CSS

```css
@media print {
  body * { visibility: hidden !important; }
  #cert-print, #cert-print * { visibility: visible !important; }
  #cert-print { position: absolute !important; left: 0; top: 0; width: 100% !important; box-shadow: none !important; }
  #scanlines, #vign, #cert-controls { display: none !important; }
}
```

Rebuild note: our vignette element id is `#vignette` (monolith: `#vign`),
target the rebuild's ids. Visibility (not display) keeps layout so the
absolutely-positioned cert prints at the page origin.

DELIBERATE DIVERGENCE (user-signed-off 2026-07-09): the monolith's print
output is broken: it only flips visibility, and real print dialogs strip
`background` colours by default and darken light text, so paper output was
neon text on white with no card, no header bar, and an invisible white
monogram (never caught: Design's preview can't print). The rebuild adds an
ink-on-paper restyle inside `@media print` (screen untouched): NC Navy
takes the cyan roles, gold takes the green roles (name + CERTIFIED stamp),
black takes the grey roles, monogram → black via `filter: brightness(0)`,
grid hidden. The titlebar stays a solid navy band with NC-white text via
`print-color-adjust: exact` (disables both background stripping AND
Chrome's light-text darkening; Chromium honours it with the dialog
checkbox off) plus an inset box-shadow fill as fallback; shadows print as
content ink. Verified with `page.pdf({ printBackground: false })`; note
`emulateMediaType('print')` applies print CSS but NOT the stripping, so it
cannot catch this bug class.

### Radio panel: implementation addenda (extracted 2026-07-09)

- Handler SFX (host concern; the engine only swaps audio): dial/track
  changes `drivehi`; play/pause `nav`; cycle toggle, panel open AND close,
  and volume right-click reset `tick`; unmuting (music or SFX) confirms
  with `nav`; muting is silent.
- Track progress/duration are runtime-only (NOT emitted through
  onStateChange): the monolith polls `getState().trackProgress` every
  400ms while the panel is open (`_startProgTimer`), duration
  `trackDuration || 240`.
- Cycle button textContent is `⟳AUTO-ROTATE · ON|OFF` (no space, the
  flex gap is the spacing). Caption: `TRACK n / total  ·  ⏮ ⏭ STEP TRACKS`
  (two source spaces, collapse to one on render).
- Pill track text falls back to the STATION NAME when the track has no
  title (`T.title || ST.name`).
- The header MUSIC/SFX toggle props (`toggleMusic`, `musicBtnStyle`,
  `sfxBtnStyle`, titles/icons at monolith lines 2074-2081) are DEAD CODE,
  produced in the props bag but never consumed anywhere in the DC markup.
  The panel's volume-row speaker buttons are the only mute UI. Do not
  "restore" header buttons later.
- Audio persistence: every radio/SFX state change schedules the debounced
  save (monolith saves from componentDidUpdate); the snapshot's `audio`
  object (line ~723) is built from LIVE state. Monolith defaults:
  sfxVol 0.8, musicVol 0.4, unmuted, cycle on.

## Final parity sweep (2026-07-09): full-monolith audit

Method: exhaustive inventory of the f16bd4f monolith cross-checked against
the rebuild: all 139 class methods, the full initial-state field list, all
13 `sc-if` markup regions, the props bag vs markup consumption, the global
`<style>` block (keyframes, responsive tiers, print), mount/unmount
listeners, and a file-level diff of every shared asset.

Results:

- **Methods**: every method maps to a built slice or a documented
  divergence. Confirmed DEAD in the monolith (do not port): `goGlossary`
  (glossary is a modal, never a view), `_beep` (defined, never called),
  the header MUSIC/SFX props block (2074–2081).
- **State fields**: all mapped (view→routes; hoverLink/bump→CSS;
  vw→matchMedia; the rest are 1:1 React state).
- **Markup**: all 13 template regions built (boot incl. cursor/skip/
  welcome/first-run, dashboard, player, progress=Service Record, glossary
  floating+header variants, import msg).
- **Global CSS**: all keyframes present except `floatup` and `flashbg`,
  both defined but UNUSED in the monolith (dead CSS, not ported). All
  responsive tiers present (≤1024, ≤640 incl. drawer rail + 44px targets,
  `(hover: none)` link reset, tap-highlight/touch-action).
- **Shared files**: progress.js, radio-engine.js, radio/stations.js,
  config.js and every asset byte-identical / complete. support.js (DC
  runtime) intentionally absent from the rebuild.
- **Design-preview props** (`glossaryPlacement`, `showScanlines`,
  `demoAutoBoot`): preview-only knobs; production defaults are what the
  rebuild implements (floating FAB + header button at ≤640, scanlines on,
  typed boot).
- **Fixed by the sweep**: index.html `<head>` was missing the PNG favicon
  sizes (16/32), `apple-touch-icon` and `site.webmanifest` links from the
  monolith helmet. Only gap found.
- Behavioural equivalences (not gaps): keydown `_syncMusic` → lazy
  AudioContext resume on first gesture; keydown `_stick` writes → the
  player's own scroll listener; balance re-seat `_courseStarted` gate →
  login is gated on `courseLoading`, so the unconditional re-seat runs
  strictly before any progress exists.
