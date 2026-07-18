// Diff two computed-style snapshots numerically.
//
//   node scripts/parity/compare-styles.mjs before after
//
// Exit 0 = identical (a pure refactor). Exit 1 = something moved.
//
// Relative colour syntax computes as `color(srgb 0 0.9412 1 / 0.25)`; the
// literal it replaces computes as `rgba(0, 240, 255, 0.25)`. Same colour,
// different string. Comparing the strings reports a difference on every line
// that was touched, which is worse than useless: it hides the one line that
// actually moved. So every colour is parsed to numeric RGBA and compared with a
// tolerance of half a channel step, which is the most a correct sRGB round-trip
// can cost.
import fs from 'node:fs';
import path from 'node:path';

const [a, b] = process.argv.slice(2);
if (!a || !b) {
  console.error('usage: node scripts/parity/compare-styles.mjs <before> <after>');
  process.exit(2);
}
const dir = path.join(path.dirname(new URL(import.meta.url).pathname.slice(1)), 'out', 'styles');
const load = (l) => JSON.parse(fs.readFileSync(path.join(dir, `${l}.json`), 'utf8'));

const EPS = 0.5 / 255; // half a channel step, in 0..1 units

/** Parse any computed colour into [r,g,b,a] with channels in 0..1, or null. */
function parseColor(s) {
  s = s.trim();
  let m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.some(Number.isNaN)) return null;
    return [p[0] / 255, p[1] / 255, p[2] / 255, p.length > 3 ? p[3] : 1];
  }
  m = s.match(/^color\(srgb\s+([^)]+)\)$/i);
  if (m) {
    const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.some(Number.isNaN)) return null;
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  if (s === 'transparent') return [0, 0, 0, 0];
  return null;
}

const sameColor = (x, y) => x.every((v, i) => Math.abs(v - y[i]) <= EPS);

/**
 * Compare one property value. Colours are compared numerically. Composite
 * values (box-shadow, text-shadow) are split into "colour tokens" and
 * "everything else": the colours compare numerically, the geometry as text.
 */
function sameValue(x, y) {
  if (x === y) return true;
  const cx = parseColor(x), cy = parseColor(y);
  if (cx && cy) return sameColor(cx, cy);

  // composite: pull out every colour function, compare them pairwise, and
  // compare the remaining skeleton as a string.
  const RE = /(rgba?\([^)]*\)|color\(srgb[^)]*\))/gi;
  const xs = x.match(RE) ?? [], ys = y.match(RE) ?? [];
  if (xs.length !== ys.length || xs.length === 0) return false;
  for (let i = 0; i < xs.length; i++) {
    const px = parseColor(xs[i]), py = parseColor(ys[i]);
    if (!px || !py || !sameColor(px, py)) return false;
  }
  return x.replace(RE, '<c>').replace(/\s+/g, ' ').trim()
      === y.replace(RE, '<c>').replace(/\s+/g, ' ').trim();
}

const before = load(a), after = load(b);
const diffs = [];
let compared = 0;

const viewsA = Object.keys(before), viewsB = Object.keys(after);
for (const v of viewsA) if (!viewsB.includes(v)) diffs.push({ view: v, note: 'view missing from AFTER' });
for (const v of viewsB) if (!viewsA.includes(v)) diffs.push({ view: v, note: 'view missing from BEFORE' });

for (const view of viewsA.filter((v) => viewsB.includes(v))) {
  const ea = before[view], eb = after[view];
  const pathsA = Object.keys(ea), pathsB = Object.keys(eb);
  if (pathsA.length !== pathsB.length) {
    diffs.push({ view, note: `element count ${pathsA.length} → ${pathsB.length} (DOM changed; diff below may be misaligned)` });
  }
  for (const p of pathsA) {
    if (!eb[p]) { diffs.push({ view, path: p, note: 'element missing from AFTER' }); continue; }
    for (const prop of Object.keys(ea[p])) {
      compared++;
      const x = ea[p][prop], y = eb[p][prop];
      if (!sameValue(x, y)) diffs.push({ view, path: p, prop, before: x, after: y });
    }
  }
}

console.log(`compared ${compared} property values across ${viewsA.length} views`);
if (!diffs.length) {
  console.log('\nNO DIFFERENCES — pure refactor confirmed.');
  process.exit(0);
}
console.log(`\n${diffs.length} DIFFERENCE(S):\n`);
for (const d of diffs.slice(0, 60)) {
  if (d.note) console.log(`  [${d.view}] ${d.path ?? ''} ${d.note}`);
  else console.log(`  [${d.view}] ${d.path}\n    ${d.prop}:\n      before: ${d.before}\n      after:  ${d.after}`);
}
if (diffs.length > 60) console.log(`  ... and ${diffs.length - 60} more`);
process.exit(1);
