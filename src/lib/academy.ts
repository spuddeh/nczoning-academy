// Academy runtime helpers. Wraps the static globals loaded in index.html
// (window.ACADEMY_CONFIG / window.SAMPLE_COURSE / window.Progress /
// window.NCRadio / window.RADIO_STATIONS) with typed, importable functions so
// React code never touches window directly.

import type {
  AcademyConfig, Course, CourseChangelogEntry, CourseModule, ProgressAdapter, ProgressHost,
  CourseIndexEntry, CourseProgress, ProgressRecord, RadioEngine, RadioStation, RecordAudio, Txn,
} from './types';

declare global {
  interface Window {
    ACADEMY_CONFIG?: AcademyConfig;
    SAMPLE_COURSE?: Course;
    RADIO_STATIONS?: RadioStation[];
    Progress?: { create(host: ProgressHost): ProgressAdapter };
    NCRadio?: {
      create(opts: {
        stations: RadioStation[];
        audioContext: AudioContext | null;
        autoRotate: boolean;
        initialState?: Partial<{
          stationIndex: number;
          trackIndexByStation: Record<string, number>;
          cycle: boolean;
          musicVolume: number;
          musicMuted: boolean;
        }>;
        onStateChange?: (st: import('./types').RadioEngineState) => void;
      }): RadioEngine;
    };
  }
}

export const IDENTITY = {
  division: 'NIGHT CORP // URBAN PLANNING DIVISION',
  terminalId: 'NC-ACAD-01',
  defaultOperator: 'S. DORSETT',
} as const;

export const RECORD_SCHEMA = 'ncza-record/v2';
/** Accepted on import and migrated. A shard written before multi-course
 *  support is flat and single-course; see migrateRecord. */
export const RECORD_SCHEMA_V1 = 'ncza-record/v1';

export function cfg(): AcademyConfig {
  return window.ACADEMY_CONFIG ?? { liveMode: false, persist: false, apiBase: '', course: 'sample' };
}

// The full boot log, typed out by the boot view (delays and SFX in Boot.tsx).
export function fullBoot(): string {
  const host = (cfg().apiBase || 'https://api.nczoning.net').replace(/^https?:\/\//, '');
  return [
    IDENTITY.division,
    `Terminal ID: ${IDENTITY.terminalId}`,
    '',
    '> INITIALIZING NC ZONING ACADEMY...',
    `> LINKING TO DATA API [ ${host} ]`,
    '> ACCESS GRANTED: OPERATOR CLEARANCE LEVEL 1',
    '',
    'Mission: master the systems of the NC Zoning Board.',
    'Complete modules to raise standing and earn eddies.',
  ].join('\n');
}

const isControlChar = (ch: string) => {
  const c = ch.charCodeAt(0);
  return c < 32 || c === 127;
};

// Collapse control chars + whitespace, 42-char cap (matches the monolith and
// progress.js). Use for stored/displayed names.
export function sanitizeName(name: string): string {
  let out = '';
  for (const ch of String(name ?? '')) out += isControlChar(ch) ? ' ' : ch;
  return out.replace(/\s+/g, ' ').trim().slice(0, 42);
}

// Milder live-input filter: strip control chars but keep inner spacing while
// the operator is still typing.
export function cleanNameInput(v: string): string {
  let out = '';
  for (const ch of String(v ?? '')) { if (!isControlChar(ch)) out += ch; }
  return out.slice(0, 42);
}

export function createProgress(host: ProgressHost): ProgressAdapter | null {
  return window.Progress?.create(host) ?? null;
}

// modulesSeen backfill for shards written before it existed (issue #65).
// A module the operator completed, or revealed past its first stage, was
// plainly opened, so its terms are already earned; withholding them would
// re-classify a returning operator's own glossary. Backfilled entries carry
// timestamp 0 (open time unknown); live opens carry Date.now().
export function backfillSeen(
  seen: Record<string, number>,
  moduleDone: Record<string, unknown>,
  revealedBy: Record<string, number>,
): Record<string, number> {
  const out = { ...seen };
  for (const id of Object.keys(moduleDone)) if (!(id in out)) out[id] = 0;
  for (const id of Object.keys(revealedBy)) if (!(id in out)) out[id] = 0;
  return out;
}

// Version-tolerant record migration: port of the monolith's migrateRecord.
// THROWS on anything that isn't a ncza-record (the thrown message surfaces in
// the boot import line as `SHARD REJECTED // <message>`).
export function migrateRecord(rec: unknown, course: Course): ProgressRecord {
  if (!rec || typeof rec !== 'object') throw new Error('invalid file');
  const r = rec as Record<string, unknown>;
  const schema = String(r.schema ?? '');
  if (schema !== RECORD_SCHEMA && schema !== RECORD_SCHEMA_V1) {
    throw new Error('unrecognized record schema');
  }
  const obj = <T>(v: unknown): Record<string, T> =>
    (v && typeof v === 'object' && !Array.isArray(v)) ? v as Record<string, T> : {};

  const startBal = course.economy?.startingBalance ?? 500;
  const slice = (v: unknown): CourseProgress => {
    const s = obj(v);
    const moduleDone = obj(s.moduleDone);
    const revealedBy = obj<number>(s.revealedBy);
    return {
      moduleDone,
      quiz: obj(s.quiz),
      eddies: typeof s.eddies === 'number' ? s.eddies : startBal,
      revealedBy,
      modulesSeen: backfillSeen(obj<number>(s.modulesSeen), moduleDone, revealedBy),
      // Migration branch for certifiedAt (issue #74): a shard written before
      // the field existed has none, and every value must be a version string.
      // Nothing is invented here; the ledger fallback lives in
      // certifiedVersions, which needs the course this slice belongs to.
      certifiedAt: Object.fromEntries(
        Object.entries(obj(s.certifiedAt))
          .filter(([, v]) => typeof v === 'string' && v)
          .map(([k, v]) => [k, v as string]),
      ),
      txns: Array.isArray(s.txns) ? s.txns : [],
    };
  };

  // The course this record was last in. v1 carried it at the top level and it
  // is the id its flat progress belongs to, so it doubles as the migration key.
  const active = typeof r.course === 'string' && r.course ? r.course : (course.id || 'sample');

  // v1 -> v2: the flat fields ARE one course's progress. Fold them under the id
  // the record already named rather than under whichever course happens to be
  // loaded now, or slotting an old shard while in a different course would file
  // its modules against the wrong one.
  const courses: Record<string, CourseProgress> = schema === RECORD_SCHEMA_V1
    ? { [active]: slice(r) }
    : Object.fromEntries(Object.entries(obj(r.courses)).map(([id, v]) => [id, slice(v)]));

  // A record naming a course it holds no slice for. Usually a fresh operator.
  // But if it holds EXACTLY ONE slice under a different id, the record is
  // mis-keyed rather than empty, and adopting the empty default would discard
  // real progress silently. One slice is unambiguous, so recover it; anything
  // else stays a fresh start rather than a guess.
  if (!courses[active]) {
    const ids = Object.keys(courses);
    if (ids.length === 1) {
      courses[active] = courses[ids[0]];
      delete courses[ids[0]];
    } else {
      courses[active] = slice({});
    }
  }

  return {
    schema: RECORD_SCHEMA,
    course: active,
    courses,
    operatorName: typeof r.operatorName === 'string' ? r.operatorName : '',
    audio: (r.audio && typeof r.audio === 'object') ? r.audio as RecordAudio : null,
  };
}

/** The slice for one course, with course-correct defaults when it is untouched. */
export function courseProgress(rec: ProgressRecord | null, courseId: string, course: Course): CourseProgress {
  const got = rec?.courses?.[courseId];
  if (got) return got;
  return {
    moduleDone: {}, quiz: {}, eddies: course.economy?.startingBalance ?? 500,
    revealedBy: {}, modulesSeen: {}, certifiedAt: {}, txns: [],
  };
}

/** Certified and in-progress module counts ACROSS every course in a record.
 *  A v2 shard carries more than one course, so a count taken from a single
 *  slice would under-report what the operator is about to overwrite. */
export function recordTotals(rec: ProgressRecord): { done: number; started: number } {
  let done = 0;
  let started = 0;
  for (const c of Object.values(rec.courses ?? {})) {
    const md = c.moduleDone ?? {};
    const rb = c.revealedBy ?? {};
    done += Object.keys(md).length;
    started += Object.keys(rb).filter((k) => !md[k] && (rb[k] ?? 0) > 1).length;
  }
  return { done, started };
}

// Live half of the course data contract: fetch the real course when liveMode,
// else (or on failure) fall back to the inline SAMPLE_COURSE.
// The URL must stay rooted (/courses/...): a relative path would resolve
// against nested router URLs like /module/3 and silently hit the fallback.
export async function loadCourse(id?: string): Promise<Course> {
  const c = cfg();
  const fallback = window.SAMPLE_COURSE ?? {};
  if (!c.liveMode || typeof fetch !== 'function') return fallback;
  try {
    const r = await fetch(`/courses/${id || c.course || 'sample'}.json`, { credentials: 'omit' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = (await r.json()) as Course;
    if (!data || typeof data !== 'object' || !Array.isArray(data.modules)) throw new Error('bad course shape');
    return data;
  } catch {
    return fallback;
  }
}

// The course catalogue. Its absence is not fatal: fall back to the single id in
// config.js, which is what the shell did before a catalogue existed, so a bad
// deploy loses the picker rather than the app.
export async function loadCourseIndex(): Promise<CourseIndexEntry[]> {
  const c = cfg();
  const solo: CourseIndexEntry[] = [{ id: c.course || 'sample', title: '', file: '', status: 'draft' }];
  if (!c.liveMode || typeof fetch !== 'function') return solo;
  try {
    const r = await fetch('/courses/index.json', { credentials: 'omit' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json() as { courses?: CourseIndexEntry[] };
    const list = Array.isArray(data?.courses) ? data.courses.filter((e) => e && typeof e.id === 'string') : [];
    return list.length ? list : solo;
  } catch {
    return solo;
  }
}

/** Every module certified? The bar `requires` gates on. */
export function isCourseComplete(course: Course, done: Record<string, unknown>): boolean {
  const mods = sortedModules(course);
  return mods.length > 0 && mods.every((m) => !!done[m.id]);
}

/** Prerequisite ids this course still lacks, given what each course has certified.
 *  Names the missing courses rather than answering yes/no, because a locked card
 *  that cannot say WHY is indistinguishable from a broken one. */
export function unmetRequires(
  entry: CourseIndexEntry,
  completedIds: Set<string>,
): string[] {
  return (entry.requires ?? []).filter((id) => !completedIds.has(id));
}

export function sortedModules(course: Course): CourseModule[] {
  return (course.modules ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// Certification: capstone done if the course declares one; otherwise every
// module complete (a course with no modules never certifies).
export function progressStats(course: Course, moduleDone: Record<string, unknown>): {
  mods: CourseModule[]; done: CourseModule[]; capstone: CourseModule | undefined; certified: boolean;
} {
  const mods = sortedModules(course);
  const done = mods.filter((m) => moduleDone[m.id]);
  const capstone = mods.find((m) => m.capstone === true);
  const certified = capstone ? !!moduleDone[capstone.id] : (mods.length > 0 && done.length === mods.length);
  return { mods, done, capstone, certified };
}

// ---- course revisions (issue #74) ----
// "Has the COURSE moved under this operator", the mirror of what contentAudit
// and the freshness guard answer one level up ("has the SOURCE moved under this
// course").

/** SemVer-ish compare of two `x.y.z` strings. -1 / 0 / 1. */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string) => String(v).split('.').map((n) => parseInt(n, 10) || 0);
  const [A, B] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) if (A[i] !== B[i]) return A[i] < B[i] ? -1 : 1;
  return 0;
}

/** Newest-first changelog, sorted defensively rather than trusted. */
function sortedChangelog(course: Course): CourseChangelogEntry[] {
  return (course.changelog ?? [])
    .filter((e) => typeof e?.version === 'string')
    .slice()
    .sort((a, b) => compareVersions(String(b.version), String(a.version)));
}

/** Local `YYYY-MM-DD` for a timestamp, to compare against changelog dates
 *  (which are authored as plain dates, in no timezone). */
function dayOf(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** The course version a module was certified at, for every certified module we
 *  can answer for. Two sources, in order:
 *
 *   1. `certifiedAt`, written at completion. Exact.
 *   2. The ledger. A shard written before certifiedAt existed still carries the
 *      `kind: 'module'` transaction that certified it, and a date maps to the
 *      version that was current on that date. Same-day ties resolve to the
 *      release, not to the version before it, so the operator is not warned
 *      about a change they may well have read.
 *
 *  A module with neither is simply absent: unknown is NOT treated as old, or
 *  every legacy record would light up with alarms nobody can verify. */
export function certifiedVersions(
  course: Course,
  p: Pick<CourseProgress, 'moduleDone' | 'certifiedAt' | 'txns'>,
): Record<string, string> {
  const log = sortedChangelog(course);
  const out: Record<string, string> = {};
  // newest certifying transaction per module (the ledger is append-only)
  const certTs: Record<string, number> = {};
  for (const t of (p.txns ?? []) as Txn[]) {
    if (t?.kind !== 'module' || !t.moduleId || typeof t.ts !== 'number') continue;
    certTs[t.moduleId] = Math.max(certTs[t.moduleId] ?? 0, t.ts);
  }
  for (const id of Object.keys(p.moduleDone ?? {})) {
    const stored = (p.certifiedAt ?? {})[id];
    if (stored) { out[id] = stored; continue; }
    const ts = certTs[id];
    if (!ts) continue;
    const day = dayOf(ts);
    const inForce = log.find((e) => String(e.date ?? '') <= day);
    if (inForce?.version) out[id] = inForce.version;
  }
  return out;
}

/** The same entries, oldest first. Revisions are enumerated to the reader as a
 *  sequence they missed, and a descending pair reads as a typo, not a run. */
export function oldestFirst(entries: CourseChangelogEntry[]): CourseChangelogEntry[] {
  return entries.slice().sort((a, b) => compareVersions(String(a.version), String(b.version)));
}

/** "V2.1.0, V2.2.0" for an inline sentence. */
export function versionList(entries: CourseChangelogEntry[]): string {
  return oldestFirst(entries).map((e) => `V${e.version}`).join(', ');
}

/** Certified modules the course has changed under, `id -> the entries that did
 *  it` (newest first). A module is listed only when an entry NEWER than the
 *  version it was certified at names it: a course-level bump says the course
 *  moved, not that this module did, and nine false alarms against one real
 *  change teach the reader to dismiss the tenth. */
export function revisedModules(
  course: Course,
  certVersions: Record<string, string>,
): Record<string, CourseChangelogEntry[]> {
  const log = sortedChangelog(course);
  const out: Record<string, CourseChangelogEntry[]> = {};
  // Only modules the course still has. A module retired between releases stays
  // named in the old entries and in the operator's record, and flagging it
  // would put a count on the dashboard that no view can show a row for.
  const live = new Set(sortedModules(course).map((m) => m.id));
  for (const [id, at] of Object.entries(certVersions)) {
    if (!live.has(id)) continue;
    const since = log.filter(
      (e) => (e.modules ?? []).includes(id) && compareVersions(String(e.version), at) > 0,
    );
    if (since.length) out[id] = since;
  }
  return out;
}

// Clearance = highest clearance among completed modules (1 when fresh);
// rank = the highest course rank at or below that clearance.
export function clearanceAndRank(course: Course, moduleDone: Record<string, unknown>): { clearance: number; rankTitle: string } {
  const done = sortedModules(course).filter((m) => moduleDone[m.id]);
  const clearance = done.length ? Math.max(1, ...done.map((m) => m.clearance ?? 1)) : 1;
  let rank = course.ranks?.[0] ?? { clearance: 1, title: 'PROBATIONARY OPERATOR' };
  for (const r of course.ranks ?? []) {
    if ((r.clearance ?? 0) <= clearance && (r.clearance ?? 0) >= (rank.clearance ?? 0)) rank = r;
  }
  return { clearance, rankTitle: rank.title ?? 'PROBATIONARY OPERATOR' };
}

export function stations(): RadioStation[] {
  return Array.isArray(window.RADIO_STATIONS) && window.RADIO_STATIONS.length ? window.RADIO_STATIONS : [];
}

// Bouncing-marquee measurement (port of the monolith's _marquee): if the text
// overflows its window, set --mqd and a distance-scaled duration; else clear.
export function applyMarquee(el: HTMLElement | null): void {
  if (!el) return;
  requestAnimationFrame(() => {
    if (!el.isConnected) return;
    const box = el.parentElement;
    if (!box) return;
    const over = el.scrollWidth - box.clientWidth;
    const key = `${el.textContent}|${over}`;
    const tagged = el as HTMLElement & { __mqKey?: string };
    if (tagged.__mqKey === key) return;
    tagged.__mqKey = key;
    if (over > 2) {
      const dist = over + 6;
      const dur = Math.max(4, dist / 22 + 1.4);
      el.style.setProperty('--mqd', `${-dist}px`);
      el.style.animation = `mqbounce ${dur.toFixed(1)}s ease-in-out infinite alternate`;
    } else {
      el.style.animation = 'none';
      el.style.removeProperty('--mqd');
    }
  });
}
