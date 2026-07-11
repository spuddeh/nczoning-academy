# Type system

> One axis of the [design token system](design-tokens.md). Colour, spacing,
> letter-spacing and stacking follow the same pattern — this page is the type
> detail.

All font sizes in the Academy come from **eight semantic roles** defined in
`public/assets/css/theme.css`. No stylesheet declares a pixel size at a call
site. Colour, spacing, letter-spacing and z-index all work the same way: a
component names a role, never a raw value.

## The roles

| Role | Base | What plays this part |
| --- | --- | --- |
| `--fs-title` | 34px | Page titles, hero numerics |
| `--fs-heading` | 22px | Card headings, quiz prompts, glossary terms |
| `--fs-body` | 18px | Reading prose |
| `--fs-secondary` | 16px | Table cells, quiz options, debriefs |
| `--fs-ui` | 14px | Buttons, rail rows, status lines |
| `--fs-code` | 13px | Monospace code, terminal output, JSON |
| `--fs-label` | 12px | Uppercase labels, field labels |
| `--fs-micro` | 10px | Sources, badges, captions, meta |

Alongside them: `--lh-body` (1.7), `--lh-tight` (1.4), and `--measure`, the
width of the prose column.

## The three rules

**1. Call sites name a role.**

```css
.chunk-heading { font-size: var(--fs-heading); }  /* yes */
.chunk-heading { font-size: 22px; }               /* no  */
```

The only exception is a glyph sized as an icon rather than as text, such as
`.order-arrow` or `.course-watermark`. Those keep a pixel value and carry a
comment saying why.

**2. A view re-binds roles on its own root.**

`--fs-*` are inherited custom properties, so re-binding one on a view's root
element re-tunes that entire subtree. Every rule inside keeps saying
`var(--fs-label)` and needs no knowledge of where it landed.

```css
/* Docked chrome, never a reading surface — the whole ladder steps down. */
.radio-pill,
.radio-panel {
  --fs-heading: 26px;
  --fs-body:    13px;
  --fs-label:   11px;
  --fs-micro:   10px;
}
```

Always say *why* in a comment. A radio is not a lesson player is not a
certificate, and the next reader needs to know which of those you were
serving.

This also replaces `!important` size overrides in media queries:

```css
@media (max-width: 640px) {
  .lock-screen { --fs-title: 26px; }   /* re-bind the role, not the call site */
}
```

**3. Nobody invents a role name.**

If a context wants a size no role names, the role set is wrong. Do **not** add
`--fs-heading-radio`. That escape hatch is how the codebase accumulated 24
ad-hoc sizes (including 8.5px, 11.5px, 12.5px and 13.5px) before this system
existed. Scoped re-binding keeps the vocabulary at eight words no matter how
many contexts appear.

## Current re-bindings

| Root | File | Why it differs |
| --- | --- | --- |
| `.app-header` | `style.css` | Dense chrome in a 62px bar |
| `.sys-readout`, `.gloss-fab` | `style.css` | Fixed satellites, match header chrome |
| `.dash-scroll` | `dashboard.css` | Browsing surface, prose is scanned |
| `.boot-screen` | `boot.css` | A terminal; the log is the content |
| `.lock-screen` | `lock.css` | Landing page, not a long read |
| `.radio-pill`, `.radio-panel` | `radio.css` | Docked chrome |
| `.cert-scrim` | `cert.css` | A printed document |
| `.nameprompt-scrim` | `cert.css` | Dialog, own root |
| `.record-main` | `record.css` | A dossier of figures |
| `.shard-scrim`, `.confirm-scrim` | `record.css` | Overlays, own roots |

The module player and the modals use the base ladder unchanged. They are what
it was tuned for.

## Gotchas

**Fixed and portalled elements inherit from `:root`.** An overlay rendered at
App root does not inherit from the view that opened it, however much it looks
like it belongs there. `.confirm-scrim`, `.shard-scrim`, `.nameprompt-scrim`
and the fixed satellites all need their own binding or they silently fall back
to the base ladder. That fallback is invisible until someone notices the
dialog's buttons are 2px too big.

**Pixel sizes are not comparable across families.** Orbitron at 15px and
Rajdhani at 18px have the **same 11px cap height**. That is why `--fs-heading`
sits so far above `--fs-body`: it has to, to read as a heading at all. If
`--font-display` or `--font-body` ever change, re-measure the cap heights
rather than assuming the pixel ladder still holds.

**`ch` is not a character.** It is the width of the `0` glyph. Rajdhani's
tabular zero is 27% wider than its average glyph, so `max-width: 68ch` renders
about 81 characters, not 68. `--measure` is expressed in pixels for this
reason.
