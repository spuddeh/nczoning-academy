// Top-level app: owns the operator/record state, the Progress adapter, the
// SFX synth, the radio engine host, and the eddies economy (flyers, ledger,
// transfer). Views are routes: / (boot), /dashboard, /module/:moduleId —
// post-login routes are guarded and share the app shell.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Boot } from './views/Boot';
import { Dashboard } from './views/Dashboard';
import { Player } from './views/Player';
import { AppHeader } from './components/AppHeader';
import { SysReadout } from './components/SysReadout';
import { GlossaryFab } from './components/GlossaryFab';
import { RadioPill } from './components/RadioPill';
import { FlyerLayer, TransferOverlay } from './components/Overlays';
import type { Flyer, TransferState } from './components/Overlays';
import {
  RECORD_SCHEMA, cfg, cleanNameInput, clearanceAndRank, createProgress,
  loadCourse, migrateRecord, sanitizeName, sortedModules, stations,
} from './lib/academy';
import { Sfx, attachPointerTick } from './lib/sfx';
import type { QuizApi } from './components/player/QuizView';
import type {
  Course, CourseModule, ProgressRecord, Question, QuizAnswerState,
  RadioEngine, RecordAudio,
} from './lib/types';

interface ImportMsg { ok: boolean; text: string; }

// The operator-progress slice of state (mirrors the record fields).
interface OperatorState {
  operatorName: string;
  moduleDone: Record<string, unknown>;
  quiz: Record<string, QuizAnswerState>;
  eddies: number;
  revealedBy: Record<string, number>;
  txns: unknown[];
  audio: RecordAudio | null;
}

const freshOperator = (eddies: number): OperatorState => ({
  operatorName: '', moduleDone: {}, quiz: {}, eddies, revealedBy: {}, txns: [], audio: null,
});

const ECON_DEFAULTS = { symbol: '€$', startingBalance: 500, moduleReward: 1000, rightReward: 150, wrongPenalty: 250 };

export function App() {
  const navigate = useNavigate();
  const atBoot = useLocation().pathname === '/';
  const [signedIn, setSignedIn] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [courseLoading, setCourseLoading] = useState(false);
  const [op, setOp] = useState<OperatorState>(() => freshOperator(500));
  const [eddiesShown, setEddiesShown] = useState(500);
  const [balPulse, setBalPulse] = useState<string | null>(null);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [transfer, setTransfer] = useState<TransferState | null>(null);
  const [bootWelcome, setBootWelcome] = useState(false);
  const [importMsg, setImportMsg] = useState<ImportMsg | null>(null);
  const [radioIdx, setRadioIdx] = useState({ station: 0, track: 0, playing: false });

  const sfx = useRef<Sfx>(null as unknown as Sfx);
  if (!sfx.current) sfx.current = new Sfx();
  const radio = useRef<RadioEngine | null>(null);
  const welcomeT = useRef<number | undefined>(undefined);
  const flyerId = useRef(0);
  const pulseT = useRef<number | undefined>(undefined);

  // Live-state ref so adapter/economy callbacks never capture a stale render.
  const live = useRef({ op, course });
  live.current = { op, course };

  const econ = useMemo(() => ({ ...ECON_DEFAULTS, ...(course?.economy ?? {}) }), [course]);
  const econRef = useRef(econ);
  econRef.current = econ;

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

  // ---- mount: course load, pointer tick, radio engine, keyboard scrolling ----
  useEffect(() => {
    let alive = true;
    setCourseLoading(true);
    void loadCourse().then((c) => {
      if (!alive) return;
      setCourse(c);
      setCourseLoading(false);
      const bal = c.economy?.startingBalance ?? 500;
      setOp((o) => ({ ...o, eddies: bal }));
      setEddiesShown(bal);
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
    // Keyboard scrolling of the lesson/dashboard (targets the visible <main>).
    const onKey = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement | null;
      const tag = tg?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tg?.isContentEditable) return;
      if ((e.key === ' ' || e.key === 'Enter') && (tag === 'BUTTON' || tg?.getAttribute?.('role') === 'button')) return;
      const m = document.querySelector('main');
      if (!m) return;
      const page = m.clientHeight * 0.9;
      let d: number | null = null;
      switch (e.key) {
        case 'ArrowDown': d = 90; break;
        case 'ArrowUp': d = -90; break;
        case 'PageDown': case ' ': d = page; break;
        case 'PageUp': d = -page; break;
        case 'Home': e.preventDefault(); m.scrollTop = 0; return;
        case 'End': e.preventDefault(); m.scrollTop = m.scrollHeight; return;
        default: return;
      }
      e.preventDefault();
      m.scrollTop += d;
    };
    window.addEventListener('keydown', onKey);
    return () => {
      alive = false;
      detachTick();
      window.removeEventListener('keydown', onKey);
      radio.current?.destroy();
      sfx.current.close();
      window.clearTimeout(welcomeT.current);
      window.clearTimeout(pulseT.current);
    };
  }, []);

  // Debounced local save whenever operator state changes (persist only).
  useEffect(() => {
    if (!cfg().persist || !progress || !signedIn) return;
    const t = window.setTimeout(() => { try { progress.save(); } catch { /* storage unavailable */ } }, 400);
    return () => window.clearTimeout(t);
  }, [op, signedIn, progress]);

  // Music runs only off the boot screen.
  useEffect(() => { radio.current?.setActive(!atBoot); }, [atBoot]);

  // ---- eddies economy ----
  const animateEddies = useCallback((target: number) => {
    const start = live.current.op.eddies;
    setOp((o) => ({ ...o, eddies: target }));
    const t0 = performance.now();
    const dur = 650;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      setEddiesShown(Math.round(start + (target - start) * k));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, []);

  const pulseBalance = useCallback((color: string) => {
    setBalPulse(color);
    window.clearTimeout(pulseT.current);
    pulseT.current = window.setTimeout(() => setBalPulse(null), 560);
  }, []);

  const logTxn = useCallback((entry: Record<string, unknown>) => {
    setOp((o) => ({
      ...o,
      txns: o.txns.concat([{ id: `t${Date.now()}-${o.txns.length}`, ts: Date.now(), ...entry }]),
    }));
  }, []);

  const flyAward = useCallback((amount: number, positive: boolean, rect: DOMRect | null) => {
    const color = positive ? '#00ff9d' : '#ff3355';
    const id = ++flyerId.current;
    const sym = econRef.current.symbol;
    const txt = `${positive ? '+' : '-'}${sym} ${Math.abs(amount)}`;
    const bal = document.getElementById('op-balance');
    const t = bal?.getBoundingClientRect() ?? null;
    const fx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const fy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const tx = t ? t.left + t.width / 2 : window.innerWidth - 90;
    const ty = t ? t.top + t.height / 2 : 34;
    setFlyers((f) => f.concat([{ id, txt, color, fx, fy, tx, ty, moved: false }]));
    window.setTimeout(() => setFlyers((f) => f.map((x) => (x.id === id ? { ...x, moved: true } : x))), 400);
    window.setTimeout(() => {
      setFlyers((f) => f.filter((x) => x.id !== id));
      animateEddies(live.current.op.eddies + (positive ? amount : -amount));
      pulseBalance(color);
    }, 1160);
  }, [animateEddies, pulseBalance]);

  const quizApi = useMemo<QuizApi>(() => ({
    state: (qid) => live.current.op.quiz[qid] ?? {},
    setQ: (qid, patch) => setOp((o) => ({ ...o, quiz: { ...o.quiz, [qid]: { ...o.quiz[qid], ...patch } } })),
    award: (q: Question, correct: boolean, el: Element | null) => {
      sfx.current.play(correct ? 'ok' : 'err');
      const e = econRef.current;
      const amt = correct ? e.rightReward : e.wrongPenalty;
      const delta = correct ? amt : -amt;
      const mods = sortedModules(live.current.course ?? {});
      const m = mods.find((x) => (x.quiz ?? []).some((qq) => qq.id === q.id) || x.scenario?.id === q.id);
      logTxn({
        kind: 'answer', moduleId: m?.id ?? null, moduleTitle: m?.title ?? '',
        qid: q.id, qPrompt: q.prompt ?? '', correct, delta,
        balanceAfter: live.current.op.eddies + delta,
      });
      flyAward(amt, correct, el?.getBoundingClientRect() ?? null);
    },
    sfx: sfx.current,
  }), [flyAward, logTxn]);

  const completeModule = useCallback((m: CourseModule) => {
    if (live.current.op.moduleDone[m.id]) return;
    const e = econRef.current;
    const amt = m.reward ?? e.moduleReward;
    const from = live.current.op.eddies;
    logTxn({ kind: 'module', moduleId: m.id, moduleTitle: m.title ?? '', qid: null, qPrompt: '', correct: true, delta: amt, balanceAfter: from + amt });
    setTransfer({ phase: 'transferring', progress: 0, amount: amt, display: from });
    let p = 0;
    const step1 = () => {
      p += 4;
      setTransfer((t) => (t ? { ...t, progress: Math.min(100, p) } : t));
      // rising data-transfer chatter synced to the progress bar
      if (p % 8 === 0) { const f = 200 + p * 5.4; sfx.current.playTone(f, f, 0.045, 'square', 0.028); }
      if (p < 100) { window.setTimeout(step1, 32); return; }
      setTransfer((t) => (t ? { ...t, phase: 'transfer' } : t));
      sfx.current.play('chime');
      const start = performance.now();
      const dur = 900;
      const count = (t: number) => {
        const k = Math.min(1, (t - start) / dur);
        const val = Math.round(from + amt * k);
        setTransfer((tr) => (tr ? { ...tr, display: val } : tr));
        if (k < 1) { requestAnimationFrame(count); return; }
        setOp((o) => ({ ...o, eddies: from + amt, moduleDone: { ...o.moduleDone, [m.id]: true } }));
        setEddiesShown(from + amt);
        window.setTimeout(() => setTransfer(null), 1500);
      };
      requestAnimationFrame(count);
    };
    window.setTimeout(step1, 260);
  }, [logTxn]);

  // SAVE PROGRESS: record the furthest reveal, then eject a shard download.
  const saveProgress = useCallback((moduleId: string, revealed: number) => {
    sfx.current.play('whoosh');
    setOp((o) => ({ ...o, revealedBy: { ...o.revealedBy, [moduleId]: Math.max(o.revealedBy[moduleId] ?? 0, revealed) } }));
    window.setTimeout(() => {
      try {
        const data = JSON.stringify(snapshot(), null, 2);
        const slug = (sanitizeName(live.current.op.operatorName) || 'OPERATOR').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'OPERATOR';
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NCZA_${slug}_operator-shard.shard`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch { /* download blocked */ }
    }, 50);
  }, [snapshot]);

  const advance = useCallback((moduleId: string, revealed: number) => {
    setOp((o) => ({ ...o, revealedBy: { ...o.revealedBy, [moduleId]: Math.max(o.revealedBy[moduleId] ?? 0, revealed) } }));
  }, []);

  // Dashboard entry: first not-yet-complete module (fall back to the last).
  const openCourse = useCallback(() => {
    const mods = sortedModules(live.current.course ?? {});
    if (!mods.length) return;
    const target = mods.find((m) => !live.current.op.moduleDone[m.id]) ?? mods[mods.length - 1];
    navigate(`/module/${target.id}`);
  }, [navigate]);

  // ---- login / import flows ----
  const finishBoot = useCallback(() => {
    window.clearTimeout(welcomeT.current);
    welcomeT.current = window.setTimeout(() => {
      setBootWelcome(false);
      setSignedIn(true);
      navigate('/dashboard');
    }, 1700);
  }, [navigate]);

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

  const adoptRecord = useCallback((rec: ProgressRecord, name: string) => {
    setOp({
      operatorName: name, moduleDone: rec.moduleDone, quiz: rec.quiz as Record<string, QuizAnswerState>,
      eddies: rec.eddies, revealedBy: rec.revealedBy, txns: rec.txns, audio: rec.audio,
    });
    setEddiesShown(rec.eddies);
    applyAudio(rec.audio);
  }, [applyAudio]);

  const submitAuth = useCallback((rawName: string) => {
    if (courseLoading) return;
    const name = sanitizeName(rawName);
    if (!name) return;
    progress?.setUser(name);
    sfx.current.play('access');
    let saved: ProgressRecord | null = null;
    try { saved = progress?.load(name) ?? null; } catch { saved = null; }
    if (saved) {
      adoptRecord(saved, name);
    } else {
      setOp((o) => ({ ...freshOperator(o.eddies), operatorName: name }));
      applyAudio(null);
    }
    setImportMsg(null);
    setBootWelcome(true);
    finishBoot();
  }, [courseLoading, progress, adoptRecord, applyAudio, finishBoot]);

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
    adoptRecord(rec, name);
    if (name) { try { progress?.setUser(name); } catch { /* in-memory */ } }
    sfx.current.play('access');
    setImportMsg(null);
    setBootWelcome(true);
    finishBoot();
  }, [courseLoading, progress, adoptRecord, finishBoot]);

  const readFailed = useCallback(() => {
    setImportMsg({ ok: false, text: 'SHARD READ FAILED // could not read file' });
  }, []);

  const { clearance } = useMemo(
    () => clearanceAndRank(course ?? {}, op.moduleDone),
    [course, op.moduleDone],
  );

  const boot = (
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

  const shell = (content: React.ReactNode) => signedIn ? (
    <div className="app-shell">
      <AppHeader course={course} moduleDone={op.moduleDone} eddies={eddiesShown} balPulse={balPulse} />
      {content}
      <SysReadout />
      <GlossaryFab />
      <RadioPill stationIdx={radioIdx.station} trackIdx={radioIdx.track} playing={radioIdx.playing} />
      <FlyerLayer flyers={flyers} />
      <TransferOverlay t={transfer} symbol={econ.symbol} />
    </div>
  ) : (
    <Navigate to="/" replace />
  );

  const PlayerRoute = () => {
    const { moduleId } = useParams();
    return (
      <Player
        course={course}
        moduleId={moduleId}
        quiz={op.quiz}
        moduleDone={op.moduleDone}
        revealedBy={op.revealedBy}
        quizApi={quizApi}
        moduleReward={(m) => m.reward ?? econ.moduleReward}
        economySymbol={econ.symbol}
        onAdvance={advance}
        onSelectModule={(id) => navigate(`/module/${id}`)}
        onBackToDashboard={() => navigate('/dashboard')}
        onComplete={completeModule}
        onSaveProgress={saveProgress}
      />
    );
  };

  return (
    <Routes>
      <Route path="/" element={boot} />
      <Route path="/dashboard" element={shell(
        <Dashboard course={course} moduleDone={op.moduleDone} revealedBy={op.revealedBy} onOpenCourse={openCourse} />,
      )} />
      <Route path="/module/:moduleId" element={shell(<PlayerRoute />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
