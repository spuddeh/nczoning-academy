// Academy runtime helpers. Wraps the static globals loaded in index.html
// (window.ACADEMY_CONFIG / window.SAMPLE_COURSE / window.Progress /
// window.NCRadio / window.RADIO_STATIONS) with typed, importable functions so
// React code never touches window directly.

import type {
  AcademyConfig, Course, CourseModule, ProgressAdapter, ProgressHost,
  ProgressRecord, RadioEngine, RadioStation, RecordAudio,
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

export const RECORD_SCHEMA = 'ncza-record/v1';

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

// Version-tolerant record migration: port of the monolith's migrateRecord.
// THROWS on anything that isn't a ncza-record (the thrown message surfaces in
// the boot import line as `SHARD REJECTED // <message>`).
export function migrateRecord(rec: unknown, course: Course): ProgressRecord {
  if (!rec || typeof rec !== 'object') throw new Error('invalid file');
  const r = rec as Record<string, unknown>;
  switch (String(r.schema ?? '')) {
    case RECORD_SCHEMA: break;
    // future: case 'ncza-record/v2': migrate...
    default: throw new Error('unrecognized record schema');
  }
  const obj = <T>(v: unknown): Record<string, T> =>
    (v && typeof v === 'object' && !Array.isArray(v)) ? v as Record<string, T> : {};
  return {
    schema: RECORD_SCHEMA,
    course: typeof r.course === 'string' && r.course ? r.course : (course.id || 'sample'),
    moduleDone: obj(r.moduleDone),
    quiz: obj(r.quiz),
    eddies: typeof r.eddies === 'number' ? r.eddies : (course.economy?.startingBalance ?? 500),
    revealedBy: obj<number>(r.revealedBy),
    txns: Array.isArray(r.txns) ? r.txns : [],
    operatorName: typeof r.operatorName === 'string' ? r.operatorName : '',
    audio: (r.audio && typeof r.audio === 'object') ? r.audio as RecordAudio : null,
  };
}

// Live half of the course data contract: fetch the real course when liveMode,
// else (or on failure) fall back to the inline SAMPLE_COURSE.
// The URL must stay rooted (/courses/...): a relative path would resolve
// against nested router URLs like /module/3 and silently hit the fallback.
export async function loadCourse(): Promise<Course> {
  const c = cfg();
  const fallback = window.SAMPLE_COURSE ?? {};
  if (!c.liveMode || typeof fetch !== 'function') return fallback;
  try {
    const r = await fetch(`/courses/${c.course || 'sample'}.json`, { credentials: 'omit' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = (await r.json()) as Course;
    if (!data || typeof data !== 'object' || !Array.isArray(data.modules)) throw new Error('bad course shape');
    return data;
  } catch {
    return fallback;
  }
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
