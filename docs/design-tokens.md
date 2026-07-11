# Design tokens

Every visual constant in the Academy — colour, type size, spacing, letter-spacing,
stacking order — comes from a **named token** in
[`public/assets/css/theme.css`](../public/assets/css/theme.css). A stylesheet
names the token; it never writes the raw value at the call site.

This is one pattern applied to five axes. Learn it once and the whole system reads
the same way.

## The pattern

**1. Call sites name a token, never a literal.**

```css
.chunk-heading { font-size: var(--fs-heading); }        /* yes */
.card         { border: 1px solid var(--line); }        /* yes */
.card         { border: 1px solid rgba(0,240,255,0.25); } /* no  */
```

The only exceptions are values that are genuinely not part of a system, and they
carry a comment saying so: a glyph sized as an icon, a pure-black shadow, a
one-off page-frame padding. "Frequent" is not the same as "systematic" — see
spacing below.

**2. A view re-binds tokens on its own root, with a reason.**

The `--fs-*` roles are *inherited* custom properties, so re-binding one on a
view's root element re-tunes that whole subtree — every rule inside keeps saying
`var(--fs-label)` and needs no knowledge of where it landed.

```css
/* Docked chrome, never a reading surface — the whole ladder steps down. */
.radio-pill { --fs-heading: 26px; --fs-body: 13px; }
```

Always say *why*. A radio is not a lesson player is not a certificate.

**3. Nobody invents a token to fit one value.** If a value fits no token, either
the scale is wrong or the value is a genuine one-off that stays literal. A token
that names a pixel value instead of a design decision (`--space-7xl: 26px`) is a
magic number with a longer name — worse than the literal, because it reads as a
system that isn't one.

## The five axes

| Axis | Tokens | Mechanism |
| --- | --- | --- |
| **Colour** | `--primary`, `--muted`, `--success`, … + `--line`, `--card-glow`, … | Semantic roles map to the palette. Tints/lines/glows use **relative colour**: `rgb(from var(--primary) r g b / 0.25)`. |
| **Type size** | `--fs-title` … `--fs-micro` (8 roles) | See [`type-system.md`](type-system.md). |
| **Spacing** | `--space-2xs` … `--space-6xl` (4–24px) + `--section-gap`, `--scrim-pad`, `--frame-gutter` | Two layers: a 2px numeric scale for the dense region, named layout tokens for large values that repeat by meaning. |
| **Letter-spacing** | `--tracking-tight` … `--tracking-wide` (5 rungs) | A scale; near-duplicate `em` values collapse to the nearest rung. |
| **Stacking** | `--z-order-row` … `--z-dialog` (15 tiers) | A named ladder; shared values are shared tokens (documents intentional ties). |

### Colour — why relative colour, not a token per shade

There are 36 distinct alpha steps of the primary colour across the app. A token
per step is unworkable; a *function* needs none. `rgb(from var(--primary) r g b /
0.25)` reads as "the theme's primary, quarter opacity" and, crucially, **follows
a re-bound `--primary`**. Re-skinning for another organisation is one line on the
theme selector:

```css
html.theme-acme { --primary: #ff2e63; --tertiary: #ffd166; }
```

Every derived border, glow and tint turns with it; neutrals and the other
semantic colours (`--success` etc) hold. The derived tokens in `theme.css`
(`--line`, `--card-glow`, `--scanline`, …) are themselves relative-colour, so
they follow too.

### Spacing — two layers, because the data has two shapes

The dense region (≤24px) is a 2px numeric scale, mirroring the map's `--space-*`.
Sub-4px values are optical nudges (a 1px inline-code inset, a glyph-baseline
kern), **not** spacing — they stay literal, which is also where the map's scale
starts. Above 24px, a value earns a *named* token only if it repeats by one
meaning (`--section-gap` is the record-section rhythm; `--frame-gutter` is the
horizontal page gutter). Per-view frame padding and the scattered 26–30px band
stay literal.

### Stacking — the ladder is load-bearing

`.radio-pill`/`.radio-panel` deliberately share `--z-overlay` (9995) with the
modal scrim and win the tie on **DOM order** (`MusicPlayer` renders last in
`App.tsx`). Do not split them or reorder the DOM. Confirm dialogs sit at
`--z-dialog` (9999), above the `--z-scrim` (9998) overlays — the "why is the
confirm above the shard overlay" answer is now readable in one place.

## Verifying a token change

A token refactor must be provable, not eyeballed. The harness under
[`scripts/parity/`](../scripts/parity/) has a computed-style differ:

```bash
node scripts/parity/snapshot-styles.mjs before   # on main
# ...make the change...
node scripts/parity/snapshot-styles.mjs after
node scripts/parity/compare-styles.mjs before after
```

It drives all 14 view states and records colour, `z-index`, `letter-spacing` and
the box-model longhands on every element, normalising colour to numeric RGBA
(relative colour computes as `color(srgb …)`, the literal as `rgba(…)` — a string
diff false-positives on every line).

Read the result two ways:

- **Pure refactor** (value-preserving, e.g. a literal → its equal token): the diff
  must be **empty**.
- **Scoped change** (an intentional visual move, e.g. a spacing snap): the diff
  must contain **only** the property you meant to change, on the elements you
  meant, by the amounts you meant.

Always run a **control** (snapshot the same CSS twice → empty) and a **negative
control** (change one token → it screams) first. "No differences" is also what a
blind tool reports. Note the differ records `getComputedStyle` *used* values, so
a `margin: auto` can appear in a box-model diff even when its rule is untouched —
a non-empty line is not automatically a bug.

## The lint

`npm run validate:css` (in CI on any `public/assets/css/**` change) checks that
comments balance and that every `var(--x)` resolves to a definition or carries a
fallback. It exists because a stray `*/` once swallowed `--fs-title` and shipped
the module title at 16px, invisible to every other tool.
