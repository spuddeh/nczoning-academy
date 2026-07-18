#!/usr/bin/env node
// Validate the stylesheets under public/assets/css/. Nothing else in this repo
// parses CSS: tsc ignores it, the course validator ignores it, and a CSS parse
// error is not a build error, so Cloudflare Pages ships it happily. #20 proved
// the cost: a stray `*/` swallowed `--fs-title` and the module title rendered
// at 16px in production, invisible to every tool and to code review.
//
// Two hand-rolled checks, no dependency (this build has no PostCSS on purpose):
//
//   1. Comments balance. A stray `*/` or an unclosed `/*` is what caused #20;
//      CSS error recovery then eats the declaration that follows, silently.
//   2. Every `var(--x)` resolves. A reference with no `--x:` definition anywhere
//      (and no inline fallback) is the #20 failure mode generalised: the token
//      looks defined to grep but was eaten by the parser, or was never there.
//      A `var(--x, fallback)` is self-protecting and exempt (that is how the one
//      runtime-set var, --mqd, is handled, no allowlist needed).
//
// Run: node scripts/validate-css.mjs   (or: npm run validate:css)

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cssDir = resolve(__dirname, "..", "public", "assets", "css");

const files = readdirSync(cssDir).filter((f) => f.endsWith(".css"));
const errors = [];

// Line number of a character offset, for messages that point somewhere useful.
const lineAt = (src, pos) => src.slice(0, pos).split("\n").length;

// Blank out /* ... */ comments (keeping newlines) so later scans see only code.
function stripComments(src, file) {
  let out = "";
  let i = 0;
  let openedAt = -1;
  while (i < src.length) {
    if (openedAt === -1 && src.startsWith("/*", i)) {
      openedAt = i;
      i += 2;
    } else if (openedAt !== -1 && src.startsWith("*/", i)) {
      openedAt = -1;
      i += 2;
    } else if (openedAt === -1 && src.startsWith("*/", i)) {
      errors.push(`${file}:${lineAt(src, i)}  stray \`*/\` with no open comment`);
      i += 2;
    } else {
      out += openedAt === -1 ? src[i] : src[i] === "\n" ? "\n" : " ";
      i += 1;
    }
  }
  if (openedAt !== -1) {
    errors.push(`${file}:${lineAt(src, openedAt)}  unclosed \`/*\` comment`);
  }
  return out;
}

// Pass 1: strip comments (which also runs the balance check), collect every
// custom-property DEFINITION across all files. A local re-binding counts: the
// token is defined, that is all this check asks.
const codeByFile = {};
const defined = new Set();
for (const f of files) {
  const src = readFileSync(join(cssDir, f), "utf8");
  const code = stripComments(src, f);
  codeByFile[f] = code;
  for (const m of code.matchAll(/(?:^|[\s;{])(--[a-z0-9-]+)\s*:/gi)) defined.add(m[1]);
}

// Pass 2: every var(--x) without a fallback must resolve to a definition.
for (const f of files) {
  const code = codeByFile[f];
  for (const m of code.matchAll(/var\(\s*(--[a-z0-9-]+)\s*(,)?/gi)) {
    const [, name, hasFallback] = m;
    if (hasFallback || defined.has(name)) continue;
    errors.push(
      `${f}:${lineAt(code, m.index)}  var(${name}) has no definition and no fallback`,
    );
  }
}

// --- report -----------------------------------------------------------------
if (errors.length) {
  console.error(`FAIL: ${errors.length} CSS error(s)`);
  for (const e of errors) console.error(`  error: ${e}`);
  process.exit(1);
}
console.log(
  `OK: ${files.length} stylesheet(s), ${defined.size} tokens — comments balanced, every var() resolves.`,
);
