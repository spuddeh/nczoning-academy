#!/usr/bin/env node
// Validate the NC Radio station data against schema/radio-station.schema.json.
//
// The engine reads a bare `window.RADIO_STATIONS = [ ... ]` global (no fetch),
// so this extracts that array from public/radio/stations.js and validates it,
// plus a couple of semantic checks (unique id, unique dial frequency).
//
// Run: node scripts/validate-radio.mjs   (or: npm run validate:radio)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stationsPath = join(root, "public", "radio", "stations.js");
const schemaPath = join(root, "schema", "radio-station.schema.json");

const src = readFileSync(stationsPath, "utf8");
const m = src.match(/window\.RADIO_STATIONS\s*=\s*(\[[\s\S]*\]);/);
if (!m) {
  console.error(`FATAL: could not find "window.RADIO_STATIONS = [...]" in ${stationsPath}`);
  process.exit(1);
}
let stations;
try {
  stations = eval("(" + m[1] + ")"); // comments allowed; it is JS, not JSON
} catch (e) {
  console.error(`FATAL: RADIO_STATIONS array is not valid JS — ${e.message}`);
  process.exit(1);
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(readFileSync(schemaPath, "utf8")));

const errors = [];
if (!validate(stations)) {
  for (const e of validate.errors) errors.push(`${e.instancePath || "/"} ${e.message}`);
}

// semantic checks: id and dial frequency must be unique (station-level);
// track titles must be unique WITHIN a station (guards copy-paste dupes).
const seenId = new Map();
const seenFreq = new Map();
stations.forEach((s, i) => {
  if (s?.id != null) {
    if (seenId.has(s.id)) errors.push(`duplicate id "${s.id}" (stations ${seenId.get(s.id)} and ${i})`);
    else seenId.set(s.id, i);
  }
  if (s?.freq != null) {
    if (seenFreq.has(s.freq)) errors.push(`duplicate freq "${s.freq}" (stations ${seenFreq.get(s.freq)} and ${i})`);
    else seenFreq.set(s.freq, i);
  }
  if (Array.isArray(s?.tracks)) {
    const seenTitle = new Map();
    s.tracks.forEach((t, j) => {
      if (t?.title == null) return;
      if (seenTitle.has(t.title)) errors.push(`station "${s.id}" has duplicate track title "${t.title}" (tracks ${seenTitle.get(t.title)} and ${j})`);
      else seenTitle.set(t.title, j);
    });
  }
});

if (errors.length) {
  console.error(`\nFAIL: ${errors.length} error(s) in radio stations:`);
  for (const e of errors) console.error(`  error: ${e}`);
  process.exit(1);
}
console.log(`OK: ${stations.length} radio station(s) valid.`);
