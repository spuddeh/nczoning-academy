// Shared data shapes. Typing these once keeps every file consistent and lets
// the compiler catch mistakes (wrong field names, missing checks) as we write.

export interface AcademyConfig {
  liveMode: boolean;
  persist: boolean;
  apiBase: string;
  course: string;
}

export interface CourseModule {
  id: string;
  order?: number;
  title?: string;
  [k: string]: unknown; // widened until we build the module player
}

export interface Course {
  schemaVersion?: string;
  id?: string;
  title?: string;
  subtitle?: string;
  modules?: CourseModule[];
  economy?: {
    symbol?: string;
    startingBalance?: number;
    moduleReward?: number;
    rightReward?: number;
    wrongPenalty?: number;
  };
  glossary?: unknown[];
  ranks?: unknown[];
  [k: string]: unknown;
}

export interface ProgressRecord {
  schema?: string;
  user?: string;
  course?: string;
  progress?: Record<string, unknown>;
}

// The window.Progress adapter contract (progress.js, loaded as a global).
export interface ProgressAdapter {
  setUser(name: string): string;
  snapshot(): ProgressRecord;
  save(): boolean;
  load(name?: string): ProgressRecord | null;
  lastUser(): string;
  remove(name?: string): boolean;
  import(json: string | object): ProgressRecord;
  listUsers(): string[];
}

export interface ProgressHost {
  persistEnabled(): boolean;
  buildSnapshot(): ProgressRecord;
  normalize(rec: unknown): ProgressRecord;
  sanitize(name: string): string;
  currentName(): string;
}
