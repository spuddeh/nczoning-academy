// Academy runtime helpers. Wraps the static globals loaded in index.html
// (window.ACADEMY_CONFIG / window.SAMPLE_COURSE / window.Progress) with typed,
// importable functions so React code never touches window directly.

import type {
  AcademyConfig, Course, ProgressAdapter, ProgressHost,
} from './types';

declare global {
  interface Window {
    ACADEMY_CONFIG?: AcademyConfig;
    SAMPLE_COURSE?: Course;
    RADIO_STATIONS?: unknown[];
    Progress?: { create(host: ProgressHost): ProgressAdapter };
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

export function bootLines(): string[] {
  const host = (cfg().apiBase || 'https://api.nczoning.net').replace(/^https?:\/\//, '');
  return [
    '> INITIALIZING NC ZONING ACADEMY...',
    `> LINKING TO DATA API [ ${host} ]`,
    '> ACCESS GRANTED: OPERATOR CLEARANCE LEVEL 1',
  ];
}

// Strip control chars, collapse whitespace, 42-char cap (mirrors progress.js).
export function sanitizeName(name: string): string {
  let out = '';
  for (const ch of String(name ?? '')) {
    const code = ch.charCodeAt(0);
    if (code >= 32 && code !== 127) out += ch;
  }
  return out.replace(/\s+/g, ' ').trim().slice(0, 42);
}

export function createProgress(host: ProgressHost): ProgressAdapter | null {
  return window.Progress?.create(host) ?? null;
}

// Live half of the course data contract: fetch the real course when liveMode,
// else (or on failure) fall back to the inline SAMPLE_COURSE.
export async function loadCourse(): Promise<Course> {
  const c = cfg();
  const fallback = window.SAMPLE_COURSE ?? {};
  if (!c.liveMode || typeof fetch !== 'function') return fallback;
  try {
    const r = await fetch(`courses/${c.course || 'sample'}.json`, { credentials: 'omit' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as Course;
  } catch {
    return fallback;
  }
}
