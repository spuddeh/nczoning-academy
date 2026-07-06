#!/usr/bin/env node
// Content freshness check.
//
// Each course pins the source commits its project claims were audited against
// (contentAudit.repos). This script asks GitHub, for every pinned repo, which
// files changed on the current default branch since that commit, and flags any
// that the course actually CITES — those modules need re-auditing. Files that
// changed but are not cited are ignored; a repo that only moved past the pin
// with no cited file touched is reported as safe to re-pin.
//
// Requires the `gh` CLI (authenticated; public repos read fine with the default
// GitHub Actions token). Exits non-zero if any cited file drifted or a check
// failed, so CI can alarm on it.
//
// Run: node scripts/check-freshness.mjs   (or: npm run freshness)

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const coursesDir = join(root, "public", "courses");
const gh = (args) => execFileSync("gh", args, { encoding: "utf8" });

// GitHub blob URL -> { repo: "owner/name", path: "a/b.js" }
function parseBlob(url) {
  const m = String(url).match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/[^/]+\/([^#]+)/);
  return m ? { repo: `${m[1]}/${m[2]}`, path: decodeURIComponent(m[3]) } : null;
}

// Walk a course, mapping each cited file (`repo\npath`) -> set of module ids.
function collectCitations(course) {
  const map = new Map();
  const add = (url, who) => {
    const p = parseBlob(url);
    if (!p) return;
    const key = `${p.repo}\n${p.path}`;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(who);
  };
  const eachSource = (obj, who) => (obj?.sources || []).forEach((s) => add(s.url, who));
  for (const m of course.modules || []) {
    (m.chunks || []).forEach((c) => eachSource(c, m.id));
    if (m.lab) eachSource(m.lab, m.id);
    (m.quiz || []).forEach((q) => eachSource(q, m.id));
    if (m.scenario) eachSource(m.scenario, m.id);
  }
  (course.glossary || []).forEach((g) => eachSource(g, "glossary"));
  return map;
}

let stale = false;
const index = JSON.parse(readFileSync(join(coursesDir, "index.json"), "utf8"));

for (const entry of index.courses || []) {
  const course = JSON.parse(readFileSync(join(coursesDir, entry.file), "utf8"));
  console.log(`\n=== ${entry.file}  (audited ${course.contentAudit?.auditedAt ?? "?"}) ===`);
  const citations = collectCitations(course);

  // Prefer the explicit pin list; otherwise derive repos from the citations,
  // pinned to projectCommit (best effort).
  let repos = course.contentAudit?.repos;
  if (!repos?.length) {
    const seen = new Set([...citations.keys()].map((k) => k.split("\n")[0]));
    repos = [...seen].map((repo) => ({ repo, commit: course.contentAudit?.projectCommit }));
  }

  for (const { repo, commit } of repos) {
    let branch, head;
    try {
      branch = gh(["api", `repos/${repo}`, "--jq", ".default_branch"]).trim();
      head = gh(["api", `repos/${repo}/commits/${branch}`, "--jq", ".sha"]).trim();
    } catch (e) {
      console.error(`  ! ${repo}: GitHub query failed (${String(e.message).split("\n")[0]})`);
      stale = true;
      continue;
    }

    if (head === commit) {
      console.log(`  OK   ${repo}: pinned commit is current (${commit.slice(0, 7)} == ${branch} HEAD)`);
      continue;
    }

    let changed = [];
    try {
      changed = gh(["api", `repos/${repo}/compare/${commit}...${head}`, "--jq", ".files[].filename"])
        .split("\n")
        .filter(Boolean);
    } catch (e) {
      console.error(`  ! ${repo}: compare ${commit.slice(0, 7)}...${head.slice(0, 7)} failed (${String(e.message).split("\n")[0]})`);
      stale = true;
      continue;
    }

    const changedSet = new Set(changed);
    const cited = [...citations.keys()]
      .filter((k) => k.startsWith(repo + "\n"))
      .map((k) => k.split("\n")[1]);
    const citedChanged = cited.filter((p) => changedSet.has(p));

    if (citedChanged.length === 0) {
      console.log(`  ~    ${repo}: moved ${commit.slice(0, 7)} -> ${head.slice(0, 7)} (${changed.length} files) but NO cited file changed. Safe to re-pin.`);
      continue;
    }

    stale = true;
    console.log(`  STALE ${repo}: ${citedChanged.length} cited file(s) changed since ${commit.slice(0, 7)} -> re-audit:`);
    for (const p of citedChanged.sort()) {
      const who = [...(citations.get(`${repo}\n${p}`) || [])].sort().join(", ");
      console.log(`         ${p}   (cited by: ${who})`);
    }
  }
}

console.log("");
if (stale) {
  console.error("FRESHNESS: STALE — cited source files changed (or a check failed). Re-audit the modules above, refresh the content, and re-pin contentAudit.repos.");
  process.exit(1);
}
console.log("FRESHNESS: OK — every pinned commit is current, or nothing cited changed.");
