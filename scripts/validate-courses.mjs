#!/usr/bin/env node
// Validate every course under public/courses/ against schema/course.schema.json.
//
// - Schema errors -> non-zero exit (blocks CI).
// - Em dashes anywhere in a course JSON -> non-zero exit (authoring guide rule 3).
// - Content sources[] that are empty on chunk/lab/quiz/scenario -> WARNING only
//   (nudges the P2 accuracy mandate without failing the P1 scaffold).
//
// Run: node scripts/validate-courses.mjs   (or: npm run validate)

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const coursesDir = join(root, "public", "courses");
const schemaPath = join(root, "schema", "course.schema.json");

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

const errors = [];
const warnings = [];

// --- house style: no em dashes (authoring guide rule 3) ---------------------
// Rule 3 forbids U+2014 outright; its one exemption (verbatim quotes from
// external docs) has never been used, so there is deliberately no escape hatch.
// Add one the day a real quote needs it, not before. Walks every string in the
// file, including changelog and contentAudit prose, which no schema rule covers.
const EM_DASH = "—";

const lintNoEmDash = (rel, node, path = "") => {
  if (typeof node === "string") {
    if (node.includes(EM_DASH)) {
      const at = node.indexOf(EM_DASH);
      const excerpt = node.slice(Math.max(0, at - 30), at + 31).replace(/\s+/g, " ");
      errors.push(
        `${rel}: em dash at ${path || "/"} (rule 3: use a comma, colon, ` +
          `parentheses, or a rewrite) ...${excerpt}...`,
      );
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => lintNoEmDash(rel, v, `${path}/${i}`));
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) lintNoEmDash(rel, v, `${path}/${k}`);
  }
};

// --- load + compile schema --------------------------------------------------
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
let validate;
try {
  validate = ajv.compile(readJson(schemaPath));
} catch (e) {
  console.error(`FATAL: could not compile schema ${schemaPath}\n  ${e.message}`);
  process.exit(1);
}

// --- resolve the course list ------------------------------------------------
// courses/index.json is the registry the shell loads; validate its files exist,
// then validate each referenced course. Also flag orphan .json files on disk.
const indexPath = join(coursesDir, "index.json");
if (!existsSync(indexPath)) {
  console.error(`FATAL: missing ${indexPath}`);
  process.exit(1);
}
const index = readJson(indexPath);
if (!Array.isArray(index.courses)) {
  errors.push("courses/index.json: `courses` must be an array");
}
lintNoEmDash("courses/index.json", index);

const registered = new Set();
for (const entry of index.courses ?? []) {
  if (!entry.file) {
    errors.push(`courses/index.json: entry ${entry.id ?? "?"} has no \`file\``);
    continue;
  }
  registered.add(entry.file);
  const file = join(coursesDir, entry.file);
  if (!existsSync(file)) {
    errors.push(`courses/index.json references missing file: ${entry.file}`);
  }
}

// orphan detection: course JSON on disk not listed in the index
for (const f of readdirSync(coursesDir)) {
  if (f === "index.json" || !f.endsWith(".json")) continue;
  if (!registered.has(f)) warnings.push(`${f} exists on disk but is not listed in index.json`);
}

// --- validate each registered course ----------------------------------------
const emptySources = (label, obj, path) => {
  if (Array.isArray(obj?.sources) && obj.sources.length === 0) {
    warnings.push(`${label}: empty sources[] at ${path} (P2 must cite this)`);
  }
};

for (const entry of index.courses ?? []) {
  const rel = entry.file;
  if (!rel || !existsSync(join(coursesDir, rel))) continue;
  let course;
  try {
    course = readJson(join(coursesDir, rel));
  } catch (e) {
    errors.push(`${rel}: invalid JSON: ${e.message}`);
    continue;
  }

  // style lint first: it does not depend on the shape being valid
  lintNoEmDash(rel, course);

  if (!validate(course)) {
    for (const err of validate.errors) {
      errors.push(`${rel} ${err.instancePath || "/"} ${err.message}`);
    }
    continue; // don't lint content shape we couldn't validate
  }

  // sources[] content lint (warnings only)
  for (const m of course.modules) {
    (m.chunks ?? []).forEach((c) => emptySources(rel, c, `${m.id}/${c.id}`));
    if (m.lab) emptySources(rel, m.lab, `${m.id}/${m.lab.id}`);
    (m.quiz ?? []).forEach((q) => emptySources(rel, q, `${m.id}/${q.id}`));
    if (m.scenario) emptySources(rel, m.scenario, `${m.id}/${m.scenario.id}`);
  }
}

// --- report -----------------------------------------------------------------
for (const w of warnings) console.warn(`  warn: ${w}`);
if (errors.length) {
  console.error(`\nFAIL: ${errors.length} error(s)`);
  for (const e of errors) console.error(`  error: ${e}`);
  process.exit(1);
}
console.log(
  `\nOK: validated ${index.courses?.length ?? 0} course(s), ${warnings.length} warning(s).`,
);
