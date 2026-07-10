// Seeded records shared by the capture scripts.
//
// Timestamps are fixed, never `Date.now()`: both apps must render identical
// times or the screenshot pair diffs on the clock rather than on the layout.
export const NAME = 'S. DORSETT';
export const T0 = 1751947800000; // fixed epoch base

/** m01 certified, three answers logged (one wrong), eddies 1400. */
export const RECORD_M01 = {
  schema: 'ncza-record/v1',
  course: 'data-api',
  exportedAt: new Date(T0 + 4_000_000).toISOString(),
  moduleDone: { m01: true },
  quiz: {
    'm01-q1': { answered: true, selected: 0 },
    'm01-q3': { answered: true, selected: 1 },
  },
  eddies: 1400,
  revealedBy: { m01: 12 },
  txns: [
    { id: 't1', ts: T0, kind: 'answer', moduleId: 'm01', moduleTitle: 'The Living Map', qid: 'm01-q1', qPrompt: 'A consumer wants to detect when the dataset has changed. Which response header should it read?', correct: true, delta: 150, balanceAfter: 650 },
    { id: 't2', ts: T0 + 600_000, kind: 'answer', moduleId: 'm01', moduleTitle: 'The Living Map', qid: 'm01-q3', qPrompt: 'A new consumer is being written against /v1. Which assumption is WRONG?', correct: false, delta: -250, balanceAfter: 400 },
    { id: 't3', ts: T0 + 1_200_000, kind: 'module', moduleId: 'm01', moduleTitle: 'The Living Map', qid: null, qPrompt: '', correct: true, delta: 1000, balanceAfter: 1400 },
  ],
  operatorName: NAME,
  audio: null,
};

/** All nine modules certified, incl. the m09 capstone. */
const MODS = ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09'];
export const RECORD_CERTIFIED = {
  schema: 'ncza-record/v1',
  course: 'data-api',
  exportedAt: new Date(T0 + 9_000_000).toISOString(),
  moduleDone: Object.fromEntries(MODS.map((id) => [id, true])),
  quiz: {},
  eddies: 11000, // 500 start + 8×1000 + 2500 capstone
  revealedBy: Object.fromEntries(MODS.map((id) => [id, 20])),
  txns: MODS.map((id, i) => ({
    id: `t${i + 1}`, ts: T0 + i * 600_000, kind: 'module', moduleId: id,
    moduleTitle: id.toUpperCase(), qid: null, qPrompt: '', correct: true,
    delta: id === 'm09' ? 2500 : 1000,
    balanceAfter: 500 + Math.min(i + 1, 8) * 1000 + (id === 'm09' ? 2500 : 0),
  })),
  operatorName: NAME,
  audio: null,
};

/** m01 done, radio pinned — a fresh login otherwise randomises the station. */
export const RECORD_RADIO = {
  schema: 'ncza-record/v1',
  course: 'data-api',
  exportedAt: new Date(T0).toISOString(),
  moduleDone: { m01: true },
  quiz: {},
  eddies: 1400,
  revealedBy: { m01: 12 },
  txns: [],
  operatorName: NAME,
  audio: { muted: false, musicOn: true, musicVol: 0.4, sfxVol: 0.8, stationIdx: 1, trackIdx: 0, stationTracks: { 1: 0 }, cycle: true },
};
