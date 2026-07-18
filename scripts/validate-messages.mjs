#!/usr/bin/env node
// Validate a SYSTEM BROADCAST feed against schema/messages.schema.json.
//
// The feed is the first thing a visitor reads on the lock screen, and nothing
// else checks it: the committed file ships on deploy, and KV values go live the
// moment they are written. So validate both.
//
//   node scripts/validate-messages.mjs                 # the committed baseline
//   node scripts/validate-messages.mjs payload.json    # a KV value, before you put it
//
// A bare array is accepted (the Function and the client both coerce one), so a
// KV payload can be either `[...]` or `{ "messages": [...] }`.
//
// Run: npm run validate:messages

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, relative } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const schemaPath = join(root, "schema", "messages.schema.json");

const targets = process.argv.slice(2).map((p) => resolve(p));
if (!targets.length) targets.push(join(root, "public", "messages.json"));

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(readFileSync(schemaPath, "utf8")));

const errors = [];
const warnings = [];

for (const file of targets) {
  const label = relative(root, file) || file;
  let doc;
  try {
    doc = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    errors.push(`${label}: not readable / not JSON — ${err.message}`);
    continue;
  }

  // A bare array is a valid KV payload; wrap it so one schema covers both shapes.
  if (Array.isArray(doc)) doc = { messages: doc };

  if (!validate(doc)) {
    for (const e of validate.errors) {
      errors.push(`${label}: ${e.instancePath || "/"} ${e.message}`);
    }
    continue;
  }

  const ids = new Set();
  for (const m of doc.messages) {
    if (ids.has(m.id)) errors.push(`${label}: duplicate id "${m.id}"`);
    ids.add(m.id);
  }

  // Only the first four render. `alert` pins to the top, so an alert is never
  // the entry that gets cut, but everything below it competes for three slots.
  if (doc.messages.length > 4) {
    warnings.push(`${label}: ${doc.messages.length} messages, only the first 4 render after sorting`);
  }

  const alerts = doc.messages.filter((m) => m.level === "alert");
  if (alerts.length > 1) {
    warnings.push(`${label}: ${alerts.length} unresolved alerts all pin to the top, leaving ${Math.max(0, 4 - alerts.length)} slot(s) for everything else`);
  }
  if (alerts.length >= 4) {
    warnings.push(`${label}: alerts alone fill the panel — no other message can render`);
  }

  // A resolved incident does NOT pin; it sorts by date. Reusing the alert's id
  // is how you replace the banner rather than stack a second one beside it.
  const resolvedIds = new Set(doc.messages.filter((m) => m.level === "resolved").map((m) => m.id));
  for (const a of alerts) {
    if (resolvedIds.has(a.id)) {
      errors.push(`${label}: "${a.id}" is both alert and resolved — ids must be unique, so one shadows the other`);
    }
  }

  if (!errors.length) console.log(`ok  ${label} — ${doc.messages.length} message(s)`);
}

for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`FAIL  ${e}`);
if (errors.length) process.exit(1);
