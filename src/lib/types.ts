// Shared data shapes. Typing these once keeps every file consistent and lets
// the compiler catch mistakes (wrong field names, missing checks) as we write.

export interface AcademyConfig {
  liveMode: boolean;
  persist: boolean;
  apiBase: string;
  course: string;
}

export interface CourseRank {
  clearance?: number;
  title?: string;
  [k: string]: unknown;
}

// ---- course content (shapes mirror schema/course.schema.json) ----

export interface Source {
  kind?: 'project' | 'official' | string;
  label: string;
  url: string;
}

export interface Chunk {
  id?: string;
  type: 'text' | 'code' | 'table' | 'callout' | 'terminal-log';
  heading?: string;
  body?: string;
  variant?: 'info' | 'warning' | 'policy';
  lang?: string;
  columns?: string[];
  rows?: string[][];
  lines?: string[];
  sources?: Source[];
}

export interface QuizOption {
  text: string;
  correct?: boolean;
  feedback?: string;
}

export interface Question {
  id: string;
  type: 'mcq' | 'multi' | 'order' | 'spot-wrong';
  prompt: string;
  options?: QuizOption[];
  steps?: string[];
  sources?: Source[];
}

export interface LabCanned {
  when: string; // 'default' | 'if-none-match-matches' | ...
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface Lab {
  id?: string;
  title?: string;
  briefing?: string;
  steps?: string[];
  request?: { method?: string; path?: string };
  expected?: unknown;
  canned?: LabCanned[];
  debrief?: string;
  sources?: Source[];
}

export interface Scenario {
  id: string;
  title?: string;
  situation?: string[];
  question: Question;
  debrief?: string;
  sources?: Source[];
}

export interface CourseModule {
  id: string;
  order?: number;
  title?: string;
  subtitle?: string;
  clearance?: number;
  estMinutes?: number;
  reward?: number;
  capstone?: boolean;
  hook?: { type?: string; lines?: string[] };
  objectives?: string[];
  chunks?: Chunk[];
  lab?: Lab;
  quiz?: Question[];
  scenario?: Scenario;
  recap?: string[];
  [k: string]: unknown;
}

// Per-question answer state, stored in the record's `quiz` map.
export interface QuizAnswerState {
  answered?: boolean;
  selected?: number;   // mcq / spot-wrong / scenario
  correct?: boolean;   // multi / order
  set?: number[];      // multi selections
  order?: number[];    // order permutation (values are step indices)
}

export interface Course {
  schemaVersion?: string;
  id?: string;
  title?: string;
  subtitle?: string;
  estMinutes?: number;
  modules?: CourseModule[];
  economy?: {
    symbol?: string;
    startingBalance?: number;
    moduleReward?: number;
    rightReward?: number;
    wrongPenalty?: number;
  };
  glossary?: unknown[];
  ranks?: CourseRank[];
  [k: string]: unknown;
}

// Audio preferences carried inside the record (radio + SFX state).
export interface RecordAudio {
  muted?: boolean;
  musicOn?: boolean;
  musicVol?: number;
  sfxVol?: number;
  stationIdx?: number;
  trackIdx?: number;
  stationTracks?: Record<string, number>;
  cycle?: boolean;
}

// The REAL ncza-record/v1 shape, as shipped by the 0.1.0 monolith
// (docs/monolith-parity-spec.md — "Record schema"). localStorage under
// ncza:v1:* may already hold these for live operators.
export interface ProgressRecord {
  schema: 'ncza-record/v1';
  course: string;
  exportedAt?: string;
  moduleDone: Record<string, unknown>;
  quiz: Record<string, unknown>;
  eddies: number;
  revealedBy: Record<string, number>;
  txns: unknown[];
  operatorName: string;
  audio: RecordAudio | null;
}

// The window.Progress adapter contract (progress.js, loaded as a global).
export interface ProgressAdapter {
  setUser(name: string): string;
  snapshot(): ProgressRecord;
  save(): boolean;
  load(name?: string): ProgressRecord | null;
  lastUser(): string;
  remove(name?: string): boolean;
  import(json: string | object): ProgressRecord; // throws on invalid input
  listUsers(): string[];
}

export interface ProgressHost {
  persistEnabled(): boolean;
  buildSnapshot(): ProgressRecord;
  normalize(rec: unknown): ProgressRecord; // throws on invalid input
  sanitize(name: string): string;
  currentName(): string;
}

// ---- NC Radio engine (radio-engine.js, window.NCRadio) ----

export interface RadioTrack {
  title?: string;
  bpm?: number;
  [k: string]: unknown;
}

export interface RadioStation {
  id?: string;
  name?: string;
  freq?: number | string;
  genre?: string;
  tracks?: RadioTrack[];
  [k: string]: unknown;
}

export interface RadioEngineState {
  stationIndex: number;
  trackIndex: number;
  trackIndexByStation: Record<string, number>;
  cycle: boolean;
  musicVolume: number;
  musicMuted: boolean;
  paused: boolean;
  trackProgress?: number;
  trackDuration?: number;
}

export interface RadioEngine {
  getState(): RadioEngineState;
  setActive(active: boolean): void;
  restore(partial: Partial<{
    stationIndex: number;
    trackIndexByStation: Record<string, number>;
    cycle: boolean;
    musicVolume: number;
    musicMuted: boolean;
  }>): void;
  toggle(): void;
  toggleMusicMuted(): void;
  toggleCycle(): void;
  setMusicVolume(v: number): void;
  next(): void;
  prev(): void;
  selectStation(idx: number): void;
  destroy(): void;
}
