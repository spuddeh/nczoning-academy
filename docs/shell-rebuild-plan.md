# NC Zoning Academy - Shell Rebuild Plan

Status: in progress (2026-07-08). Branch: `feat/shell-rebuild`.
Live site (`main`) is unaffected and still serving the 0.1.0 baseline.

This doc records what has been done, the working method for getting each view
right, and the next steps. It is the resume point for the rebuild.

---

## 1. Summary of where we are

The Academy shell was prototyped in Claude Design and shipped as a working but
monolithic 0.1.0 baseline. We are rebuilding it in a maintainable, professional
stack (React + TypeScript + Vite), reproducing the prototype view by view. The
radio system is finished. The boot/login and dashboard views are rebuilt and
verified. The core work left is the module player and the remaining views.

Why the rebuild: the Claude Design export is a single ~180KB file with all styles
written inline in JavaScript, running on the design tool's own runtime and pulling
React from a CDN. That is fine as a visual prototype but hard to maintain and
impossible to theme with CSS custom properties. The chosen stack fixes all of
that and is the right foundation for growth and a possible port to a work LMS at
Concinnity. See `wiki/decisions/shell-rebuild-in-repo.md` for the full decision.

---

## 2. What has been done

### 2.1 Radio (finished)
- `radio-station/v2` data model: a station is `{id, name, freq, genre, tracks[]}`;
  each track carries the musical fields plus a `form` preset. Data in
  `public/radio/stations.js`, validated by `scripts/validate-radio.mjs` (CI).
- Five stations, three tracks each (15 tracks). The synth engine (built in Claude
  Design, `public/radio-engine.js`, `window.NCRadio`) expands each track's `form`
  into an intro/build/peak/dip/outro arrangement; track length is derived from
  bars x bpm, deterministic. Signed off by ear.

### 2.2 Architecture decision
- Chosen: React + TypeScript + Vite, client-side routing with react-router,
  plain CSS with custom properties for theming, no UI-component library.
- Rejected: keeping the monolith, hand-rolled vanilla JS, and Preact + htm. The
  deciding factors were that the module player (the core view) is the most
  stateful part and benefits most from components, that the project may grow and
  may port to a professional context, and that the build runs in CI on Cloudflare
  Pages so build tooling is not a manual burden.

### 2.3 The React migration (commit `2eece57`)
- Repo converted to a Vite project: root `index.html` entry, `vite.config.ts`,
  `tsconfig.json`, `package.json` scripts (`dev`, `build`, `preview`, `typecheck`)
  alongside the existing validators.
- `public/` is now static passthrough only; the monolith and the experiment files
  were removed (kept in git history).

### 2.4 Views rebuilt
- Boot/login (commit `d8bda22`): pixel-faithful to the monolith.
- Dashboard (commits `f71f5a7`, polish `ca72a55`): header chrome, dismissible
  orientation card, half-width course grid, relay links, and the fixed
  SYSTEM_STATUS readout.

Every commit above was verified: `tsc` clean, `vite build` ok, rendered in a
browser, zero console errors.

---

## 3. The architecture (how it is built)

### 3.1 The stack, in plain terms
- **React**: the page is built from components, which are functions that return
  markup and own a slice of state. When state changes, React re-renders that part.
- **JSX**: HTML-like syntax written inside JavaScript.
- **TypeScript**: JavaScript with type labels. The types catch mistakes as the
  code is written. It compiles to plain JavaScript, so the code that runs in the
  browser is ordinary JS.
- **Vite**: the dev server and build tool. `npm run dev` gives a local server with
  hot reload; `npm run build` produces an optimised `dist/` folder.
- **react-router** (to be added with the module player): gives each view a real
  URL so a module can be bookmarked and deep-linked.

### 3.2 File structure
```text
nczoning-academy/
  index.html              Vite entry: overlays + <div id="app"> + loads /src/main.tsx
  vite.config.ts          Vite config (build to dist)
  tsconfig.json           TypeScript settings
  package.json            deps + scripts (dev/build/preview/typecheck + validators)
  src/                    source you edit
    main.tsx              mounts <App/> onto #app
    App.tsx               operator/course state, Progress wiring, view switch
    views/                Boot.tsx, Dashboard.tsx (one per view)
    components/           AppHeader.tsx (shared chrome), and future shared bits
    lib/
      academy.ts          typed helpers over the window globals (cfg, loadCourse, ...)
      types.ts            data shapes: Course, ProgressRecord, ProgressAdapter, ...
  public/                 static passthrough, copied to dist untouched
    config.js             window.ACADEMY_CONFIG (hosted profile)
    progress.js           window.Progress storage adapter
    radio-engine.js       window.NCRadio synth engine
    radio/stations.js     window.RADIO_STATIONS
    courses/*.json        course content (fetched at runtime)
    assets/               css/ (theme, style, boot, dashboard), font/, favicons
  dist/                   build output (gitignored; Cloudflare builds it)
```

### 3.3 How data and modules connect
- `config.js`, `progress.js`, `radio-engine.js`, and `stations.js` load as classic
  scripts in `index.html` and publish globals. `src/lib/academy.ts` wraps those
  globals with typed functions so the React code never touches `window` directly.
- The course loads at runtime: in live mode the app fetches
  `courses/<id>.json`; otherwise it falls back to an inline sample.
- CSS lives in `public/assets/css/*.css` and is linked in `index.html`. This keeps
  the design tokens and theming editable without a rebuild.

### 3.4 Theming
- `theme.css` defines semantic CSS custom properties (for example `--primary`,
  `--bg`, `--font-display`) scoped to an `html.theme-*` class. Components reference
  those variables, never raw colours. Adding a theme later means defining one more
  `html.theme-<name>` block that overrides the same variables.

### 3.5 Build and deploy
- Push to GitHub. Cloudflare Pages runs `npm install && npm run build` and serves
  `dist/` from its CDN. Build command `npm run build`, output directory `dist`
  (already configured in the Cloudflare dashboard).
- Local development: `npm run dev`.

---

## 4. The method (how we get each view exactly right)

The Claude Design prototype, running live, is the visual source of truth. The
whole point is that reproduction is a measurement job, not a design job. For each
view we follow the same loop:

1. **Reach the view in the live monolith.** Open the deployed prototype and drive
   it to the target screen (for example log in to reach the dashboard).
2. **Measure exact values.** Use Chrome DevTools to read the computed styles of
   each element: colours, fonts, sizes, spacing, borders, shadows, and positions.
   Never approximate from memory of how it looked.
3. **Reproduce.** Build the view as a React component plus a per-view CSS file,
   using the measured values and the shared theme tokens. Reuse the CSS,
   data, and no-DOM modules unchanged wherever possible.
4. **Verify.** `npm run typecheck`, `npm run build`, serve `dist/`, load it in a
   browser, and confirm zero console messages.
5. **Compare and fix by measuring.** Screenshot the rebuild, compare against the
   monolith, and fix any delta by measuring the difference, not by eyeballing.
6. **Commit the slice.** One coherent view or piece per commit, with the
   verification noted in the message.

Two rules that sit above the loop:
- **Decide once, build once.** For any choice with real trade-offs, lay out the
  pros, cons, and the understanding first, reach a decision, then build. Do not
  build, react, and rebuild.
- **Parity first, refine later.** Reproduce the current look and behaviour to
  reach parity (0.2.0), then treat polish, new interactions, and extra themes as
  separate later passes.

---

## 5. Next steps

In priority order:

1. **Module player** (the core view, and the reason for React). Measure its shell
   and the module-map navigation, then build the streamed content blocks, the four
   quiz types (multiple choice, multi-select, scenario, ordering with drag), and
   the lab runner. Introduce **react-router** here (`/module/:id`) and add a
   `public/_redirects` file (`/* /index.html 200`) so deep links work on Cloudflare.
2. **Glossary** modal plus its floating button.
3. **Service Record** view (import and export of the progress shard).
4. **Certificate** view (name-gated, stamped).
5. **Radio panel** in React, plus the deferred radio pill (bottom-right) and the
   glossary floating button.

Smaller follow-ups:
- Switch `App.tsx` `buildSnapshot` to read live state through a ref once saving is
  implemented, so an ejected shard always serialises current progress.
- Animate the SYNC_OFFSET value in the SYSTEM_STATUS readout.

Path to release:
- Keep building on `feat/shell-rebuild`. Push the branch when a live preview is
  wanted (Cloudflare gives branch previews).
- Merge to `main` only at parity (this becomes 0.2.0). The 0.1.0 monolith keeps
  serving until then.

---

## 6. Reference values (measured from the monolith)

Kept here so future work does not need to re-measure the basics.

- **Reference URL** (the deployed 0.1.0 monolith): a Cloudflare Pages
  `*.pages.dev` deployment of `main`.
- **Palette** (from the monolith's `C` object): navy `#0a192f`, panel `#112240`,
  cyan `#00f0ff`, amber `#ffb300`, gold `#ffd400`, green `#00ff9d`, red `#ff3355`,
  grey `#8892b0`, white `#e6f1ff`, near-black field `#050a14`.
- **Fonts**: Night Corp Display (identity: wordmark, boot titlebar, headings),
  Orbitron (display headings and buttons), Rajdhani (body), Fira Code (terminal
  and mono labels).
- **Boot view**: card 640px wide, bg `rgba(10,25,47,0.92)`, 1px cyan border,
  glow `0 0 40px rgba(0,240,255,0.15)`; cyan titlebar with navy text; boot log in
  Fira Code 13.5px, line-height 1.85; input bg `#050a14` in Orbitron 700; ACCESS
  button dimmed cyan `rgba(0,240,255,0.55)`.
- **Dashboard**: header 62px, bg `rgba(10,25,47,0.9)` with `blur(8px)`, 1px cyan
  `0.2` bottom border; wordmark Night Corp Display 20px; content is a 1100px
  centred column; course cards are a two-column grid; orientation card bg
  `rgba(0,240,255,0.04)` with a `0.3` cyan border; SYSTEM_STATUS readout fixed
  bottom-left, Orbitron 10px.

---

*Related: `wiki/decisions/shell-rebuild-in-repo.md` (why in-repo),
`wiki/learnings/dc-export-visual-spec-not-codebase.md` (why the export is a spec,
not a codebase), `docs/decisions/radio-song-structure.md` (radio arrangement).*
