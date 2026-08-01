#!/usr/bin/env node
// Seed the SYSTEM BROADCAST feed into KV, once, at setup.
//
// `scripts/seed-messages.json` is git's copy of the initial announcements: it
// exists so a fresh deployment does not land a new operator on an empty panel.
// It is NOT read at runtime (issue #8). KV is the only thing the site reads and
// the only thing an administrator touches; this script is the one-way door
// between them.
//
//   NCZA_MESSAGES_KV_ID=<namespace id> npm run seed:messages
//   NCZA_MESSAGES_KV_ID=<namespace id> npm run seed:messages -- --preview
//
// Validates before it writes, because a KV value goes live the moment it lands.
// The namespace id comes from the environment rather than a committed config:
// this repo has no wrangler.toml, and `--binding` needs one.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const seedFile = join(root, "scripts", "seed-messages.json");
const KEY = "messages:manual";

const namespaceId = process.env.NCZA_MESSAGES_KV_ID;
if (!namespaceId) {
  console.error(
    "FAIL  NCZA_MESSAGES_KV_ID is not set.\n" +
      "      Find it in the Cloudflare dashboard under Workers & Pages > KV,\n" +
      "      or run `npx wrangler kv namespace list`.",
  );
  process.exit(1);
}

const preview = process.argv.includes("--preview");

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (r.error) {
    console.error(`FAIL  could not run ${cmd}: ${r.error.message}`);
    process.exit(1);
  }
  return r.status ?? 1;
};

// Validate first. A malformed seed is a malformed live feed one command later.
if (run(process.execPath, [join(root, "scripts", "validate-messages.mjs"), seedFile]) !== 0) {
  console.error("FAIL  seed not written: validation failed");
  process.exit(1);
}

const args = [
  "wrangler",
  "kv",
  "key",
  "put",
  KEY,
  "--path",
  seedFile,
  "--namespace-id",
  namespaceId,
  "--remote",
];
if (preview) args.push("--preview");

console.log(`\nwriting ${KEY} to namespace ${namespaceId}${preview ? " (preview)" : ""}`);
process.exit(run("npx", args));
