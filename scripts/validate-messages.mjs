#!/usr/bin/env node
// Validate a SYSTEM BROADCAST feed against schema/messages.schema.json.
//
// The feed is the first thing a visitor reads on the lock screen, and a KV value
// goes live the moment it is written. Two things need checking: the seed file
// that git supplies for a fresh deployment, and any payload about to be written
// to KV by hand.
//
//   node scripts/validate-messages.mjs                 # the seed file
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
import { checkMessageRules } from "../schema/messages-rules.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const schemaPath = join(root, "schema", "messages.schema.json");

const targets = process.argv.slice(2).map((p) => resolve(p));
if (!targets.length) targets.push(join(root, "scripts", "seed-messages.json"));

// No ajv-formats: this schema uses no `format` keywords. `date` is a `pattern`
// so the same schema can compile to the standalone validator the write endpoint
// imports (see scripts/build-validator.mjs). One schema, two consumers, and the
// checks they apply cannot diverge.
const ajv = new Ajv({ allErrors: true });
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

  // The set-level rules live in schema/messages-rules.mjs, shared with the write
  // endpoint, so a payload faces the same checks whichever door it arrives at.
  const rules = checkMessageRules(doc.messages);
  for (const e of rules.errors) errors.push(`${label}: ${e}`);
  for (const w of rules.warnings) warnings.push(`${label}: ${w}`);

  if (!errors.length) console.log(`ok  ${label} — ${doc.messages.length} message(s)`);
}

for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`FAIL  ${e}`);
if (errors.length) process.exit(1);
