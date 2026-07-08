// Top-level app: owns the operator/record state, the view state machine
// (boot → dashboard → …), the Progress adapter, the SFX synth, and the radio
// engine host. Views and fixed satellites render from here.
// (react-router lands as its own slice before the module player.)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Boot } from './views/Boot';
import { Dashboard } from './views/Dashboard';
import { AppHeader } from './components/AppHeader';
import { SysReadout } from './components/SysReadout';
import { GlossaryFab } from './components/GlossaryFab';
import { RadioPill } from './components/RadioPill';
import {
  RECORD_SCHEMA, cfg, cleanNameInput, clearanceAndRank, createProgress,
  loadCourse, migrateRecord, sanitizeName, stations,
} from './lib/academy';
import { Sfx, attachPointerTick } from './lib/sfx';
import type { Course, ProgressRecord, RadioEngine, RecordAudio } from './lib/types';

type View = 'boot' | 'dashboard';

interface ImportMsg { ok: boolean; text: string; }

// The operator-progress slice of state (mirrors the record fields).
interface OperatorState {
  operatorName: string;
  moduleDone: Record<string, unknown>;
  quiz: Record<string, unknown>;
  eddies: number;
  revealedBy: Record<string, number>;
  txns: unknown[];
  audio: RecordAudio | null;
}

const freshOperator = (eddies: number): OperatorState => ({
  operatorName: '', moduleDone: {}, quiz: {}, eddies, revealedBy: {}, txns: [], audio: null,
});

export function App() {
  const [view, setView] = useState<View>('boot');
  const [course, setCourse] = useState<Course | null>(null);
  const [courseLoading, setCourseLoading] = useState(false);
  const [op, setOp] = useState<OperatorState>(() => freshOperator(500));
  const [bootWelcome, setBootWelcome] = useState(false);
  const [importMsg, setImportMsg] = useState<ImportMsg | null>(null);
  const [radioIdx, setRadioIdx] = useState({ station: 0, track: 0, playing: false });

  const sfx = useRef<Sfx>(null as unknown as Sfx);
  if (!sfx.current) sfx.current = new Sfx();
  const radio = useRef<RadioEngine | null>(null);
  const welcomeT = useRef<number | undefined>(undefined);

  // Live-state ref so adapter callbacks never capture a stale render.
  const live = useRef({ op, course });
  live.current = { op, course };

  const snapshot = useCallback((): ProgressRecord => {
    const { op: o, course: c } = live.current;
    return {
      schema: RECORD_SCHEMA,
      course: c?.id || 'sample',
      exportedAt: new Date().toISOString(),
      moduleDone: o.moduleDone, quiz: o.quiz, eddies: o.eddies,
      revealedBy: o.revealedBy, txns: o.txns,
      operatorName: sanitizeName(o.operatorName),
      audio: o.audio,
    };
  }, []);

  const [progress] = useState(() => createProgress({
    persistEnabled: () => !!window.ACADEMY_CONFIG?.persist,
    buildSnapshot: snapshot,
    normalize: (rec) => migrateRecord(rec, live.current.course ?? {}),
    sanitize: sanitizeName,
    currentName: () => live.current.op.operatorName,
  }));

  // ---- mount: course load, pointer tick, radio engine ----
  useEffect(() => {
    let alive = true;
    setCourseLoading(true);
    void loadCourse().then((c) => {
      if (!alive) return;
      setCourse(c);
      setCourseLoading(false);
      const bal = c.economy?.startingBalance ?? 500;
      setOp((o) => ({ ...o, eddies: bal }));
    });
    const detachTick = attachPointerTick(sfx.current);
    if (window.NCRadio && stations().length) {
      radio.current = window.NCRadio.create({
        stations: stations(),
        audioContext: sfx.current.context(),
        autoRotate: true,
        onStateChange: (st) => setRadioIdx({ station: st.stationIndex, track: st.trackIndex, playing: !st.paused && !st.musicMuted }),
      });
    }
    return () => {
      alive = false;
      detachTick();
      radio.current?.destroy();
      sfx.current.close();
      window.clearTimeout(welcomeT.current);
    };
  }, []);

  // Debounced local save whenever operator state changes (persist only).
  useEffect(() => {
    if (!cfg().persist || !progress || view === 'boot') return;
    const t = window.setTimeout(() => { try { progress.save(); } catch { /* storage unavailable */ } }, 400);
    return () => window.clearTimeout(t);
  }, [op, view, progress]);

  // Music runs only off the boot screen.
  useEffect(() => { radio.current?.setActive(view !== 'boot'); }, [view]);

  // ---- login / import flows ----
  const finishBoot = useCallback(() => {
    window.clearTimeout(welcomeT.current);
    welcomeT.current = window.setTimeout(() => {
      setBootWelcome(false);
      setView('dashboard');
    }, 1700);
  }, []);

  const applyAudio = useCallback((a: RecordAudio | null) => {
    if (a) {
      if (typeof a.muted === 'boolean') sfx.current.muted = a.muted;
      if (typeof a.sfxVol === 'number') sfx.current.sfxVol = Math.max(0, Math.min(1, a.sfxVol));
      radio.current?.restore({
        stationIndex: typeof a.stationIdx === 'number' && a.stationIdx >= 0 ? a.stationIdx : undefined,
        trackIndexByStation: a.stationTracks && typeof a.stationTracks === 'object' ? a.stationTracks : undefined,
        cycle: typeof a.cycle === 'boolean' ? a.cycle : undefined,
        musicVolume: typeof a.musicVol === 'number' ? a.musicVol : undefined,
        musicMuted: typeof a.musicOn === 'boolean' ? !a.musicOn : undefined,
      });
    } else {
      // fresh login → random station, first track
      const n = stations().length;
      if (n) radio.current?.restore({ stationIndex: Math.floor(Math.random() * n), trackIndexByStation: {} });
    }
  }, []);

  const submitAuth = useCallback((rawName: string) => {
    if (courseLoading) return;
    const name = sanitizeName(rawName);
    if (!name) return;
    progress?.setUser(name);
    sfx.current.play('access');
    let saved: ProgressRecord | null = null;
    try { saved = progress?.load(name) ?? null; } catch { saved = null; }
    if (saved) {
      setOp({
        operatorName: name, moduleDone: saved.moduleDone, quiz: saved.quiz,
        eddies: saved.eddies, revealedBy: saved.revealedBy, txns: saved.txns,
        audio: saved.audio,
      });
      applyAudio(saved.audio);
    } else {
      setOp((o) => ({ ...freshOperator(o.eddies), operatorName: name }));
      applyAudio(null);
    }
    setImportMsg(null);
    setBootWelcome(true);
    finishBoot();
  }, [courseLoading, progress, applyAudio, finishBoot]);

  const slotAtBoot = useCallback((json: string) => {
    if (courseLoading) { setImportMsg({ ok: false, text: 'STAND BY // COURSE LOADING' }); return; }
    let rec: ProgressRecord;
    try {
      if (!progress) throw new Error('invalid file');
      rec = progress.import(json);
    } catch (err) {
      setImportMsg({ ok: false, text: `SHARD REJECTED // ${(err as Error)?.message || 'invalid file'}` });
      return;
    }
    const name = sanitizeName(rec.operatorName);
    setOp({
      operatorName: name, moduleDone: rec.moduleDone, quiz: rec.quiz,
      eddies: rec.eddies, revealedBy: rec.revealedBy, txns: rec.txns, audio: rec.audio,
    });
    applyAudio(rec.audio);
    if (name) { try { progress?.setUser(name); } catch { /* in-memory */ } }
    sfx.current.play('access');
    setImportMsg(null);
    setBootWelcome(true);
    finishBoot();
  }, [courseLoading, progress, applyAudio, finishBoot]);

  const readFailed = useCallback(() => {
    setImportMsg({ ok: false, text: 'SHARD READ FAILED // could not read file' });
  }, []);

  const { clearance } = useMemo(
    () => clearanceAndRank(course ?? {}, op.moduleDone),
    [course, op.moduleDone],
  );

  if (view === 'boot') {
    return (
      <Boot
        sfx={sfx.current}
        lastUser={cfg().persist ? (progress?.lastUser() ?? '') : ''}
        courseLoading={courseLoading}
        importMsg={importMsg}
        welcome={bootWelcome ? { name: op.operatorName || 'OPERATOR', clearance } : null}
        onSubmit={submitAuth}
        onSlot={slotAtBoot}
        onSlotReadError={readFailed}
        cleanInput={cleanNameInput}
      />
    );
  }

  return (
    <div className="app-shell">
      <AppHeader course={course} moduleDone={op.moduleDone} eddies={op.eddies} />
      <Dashboard course={course} moduleDone={op.moduleDone} />
      <SysReadout />
      <GlossaryFab />
      <RadioPill stationIdx={radioIdx.station} trackIdx={radioIdx.track} playing={radioIdx.playing} />
    </div>
  );
}
