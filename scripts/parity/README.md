# Parity harness

Proves a rebuilt view against the 0.1.0 Design-export monolith by driving both
through the SAME headless Chrome at the same viewport and capturing paired
screenshots. A view is not "done" until its pair matches and every visible
monolith element is either reproduced or explicitly listed as deferred in
`docs/shell-rebuild-plan.md`. No parity claims without artefacts.

The measured element-by-element spec lives in `docs/monolith-parity-spec.md`.

## Run

```bash
# 1. Serve the monolith straight out of git history (any temp dir)
git archive f16bd4f public/ | tar -x -C /tmp/ncza-monolith
npx serve -l 4173 --no-clipboard /tmp/ncza-monolith/public

# 2. Serve the rebuild
npm run dev          # port 5173

# 3. Capture pairs (launches its own headless Chrome)
node scripts/parity/capture.mjs
```

Outputs `scripts/parity/out/{monolith,rebuild}-{boot-typing,boot-form,boot-welcome,dashboard}.png`
(gitignored). Compare pairs by eye AND by probing computed styles when a delta
is suspected — never adjust values from memory of how it looked.

Needs `puppeteer-core` (devDependency) and a local Chrome at the standard
install path (override with `CHROME_BIN`).
