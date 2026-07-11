// Top-level app: owns the operator/record state, the Progress adapter, the
// SFX synth, the radio engine host, and the eddies economy (flyers, ledger,
// transfer). Views are routes: / (lock), /boot, /dashboard, /module/:moduleId —
// post-login routes are guarded and share the app shell.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Lock } from './views/Lock';
import { Boot } from './views/Boot';
import { Dashboard } from './views/Dashboard';
import { Player } from './views/Player';
import { ServiceRecord } from './views/ServiceRecord';
import { AppHeader } from './components/AppHeader';
import { ShardOverlay } from './components/ShardOverlay';
import type { ShardIOState } from './components/ShardOverlay';
import { ConfirmDialog } from './components/ConfirmDialog';
import { CertificateOverlay } from './components/CertificateOverlay';
import { NamePromptDialog } from './components/NamePromptDialog';
import { SysReadout } from './components/SysReadout';
import { GlossaryFab } from './components/GlossaryFab';
import { MusicPlayer } from './components/MusicPlayer';
import type { RadioUiState } from './components/MusicPlayer';
import { FlyerLayer, TransferOverlay } from './components/Overlays';
import type { Flyer, TransferState } from './components/Overlays';
import { GlossaryModal } from './components/modals/GlossaryModal';
import type { GlossaryTier } from './components/modals/GlossaryModal';
import { TxnHistoryModal } from './components/modals/TxnHistoryModal';
import {
  RECORD_SCHEMA, cfg, cleanNameInput, clearanceAndRank, createProgress,
  loadCourse, migrateRecord, sanitizeName, sortedModules, stations,
} from './lib/academy';
import { Sfx, attachPointerTick } from './lib/sfx';
import { clearSession, hasSession, readSession, writeSession } from './lib/session';
import { fetchMessages } from './lib/messages';
import { AlertStrip } from './components/AlertStrip';
import { BroadcastFeed } from './components/BroadcastFeed';
import type { QuizApi } from './components/player/QuizView';
import type {
  Course, CourseModule, ProgressRecord, Question, QuizAnswerState,
  RadioEngine, RadioEngineState, RecordAudio, SysMessage, Txn,
} from './lib/types';

interface ImportMsg { ok: boolean; text: string; }

// The operator-progress slice of state (mirrors the record fields; audio is
// NOT here — the snapshot builds it from the live radio/SFX state).
interface OperatorState {
  operatorName: string;
  moduleDone: Record<string, unknown>;
  quiz: Record<string, QuizAnswerState>;
  eddies: number;
  revealedBy: Record<string, number>;
  txns: unknown[];
}

const freshOperator = (eddies: number): OperatorState => ({
  operatorName: '', moduleDone: {}, quiz: {}, eddies, revealedBy: {}, txns: [],
});

const RADIO_DEFAULTS: RadioUiState = {
  station: 0, track: 0, stationTracks: {}, cycle: true, musicVol: 0.4, musicMuted: false, paused: false,
};

const ECON_DEFAULTS = { symbol: '€$', startingBalance: 500, moduleReward: 1000, rightReward: 150, wrongPenalty: 250 };

// Route adapter for the player. MUST live at module scope: defining it inside
// App gives it a new component identity every render, and React then remounts
// the whole player on every state tick (eddies count-up, flyers) — re-running
// the mount scroll and flashing the view.
type PlayerRouteProps = Omit<React.ComponentProps<typeof Player>, 'moduleId'>;
function PlayerRoute(props: PlayerRouteProps) {
  const { moduleId } = useParams();
  return <Player {...props} moduleId={moduleId} />;
}

export function App() {
  const navigate = useNavigate();
  // The whole pre-auth surface: the lock screen and the boot splash behind it.
  const path = useLocation().pathname;
  const preAuth = path === '/' || path === '/boot';
  // Seeded from the sessionStorage snapshot so the very first render of a
  // refreshed in-app route doesn't bounce to the lock (issue #9). The record
  // itself adopts in the restore effect once the course arrives; `restoring`
  // holds the route views back until it has (they mount-read op state — the
  // player's resume place, for one — so adoption must land first).
  const [signedIn, setSignedIn] = useState(() => hasSession());
  const [restoring, setRestoring] = useState(() => hasSession());
  // Restored session, radio not yet built: the pill shows a disconnected
  // state until the first gesture boots the engine (startRadio clears it).
  const [audioStandby, setAudioStandby] = useState(() => hasSession());
  // Set as the operator leaves the lock; gates /boot. In-memory on purpose —
  // a refresh clears it, so every fresh load starts at the lock screen.
  const [entered, setEntered] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [courseLoading, setCourseLoading] = useState(false);
  const [op, setOp] = useState<OperatorState>(() => freshOperator(500));
  const [eddiesShown, setEddiesShown] = useState(500);
  const [balPulse, setBalPulse] = useState<string | null>(null);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [transfer, setTransfer] = useState<TransferState | null>(null);
  const [bootWelcome, setBootWelcome] = useState(false);
  const [importMsg, setImportMsg] = useState<ImportMsg | null>(null);
  // Radio: mirror of the engine's discrete state, the pill/panel toggle, and
  // the track progress (polled every 400ms only while the panel is open).
  const [radioSt, setRadioSt] = useState<RadioUiState>(RADIO_DEFAULTS);
  // Radio fully closed (issue #34): pill dismissed, music stopped. Persists
  // in the record's audio prefs; reopened from the Service Record page.
  const [radioClosed, setRadioClosed] = useState(false);
  // SYSTEM BROADCAST in-app (issue #10): polled feed shared by the dashboard
  // panel and the shell alert strip. Dismissals are in-memory on purpose — a
  // still-live alert returns on refresh, and vanishes when ops resolves it.
  const [messages, setMessages] = useState<SysMessage[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  // Header bell popover + read watermark. Seen state is in-memory: a refresh
  // marks the feed unread again, which errs towards showing announcements.
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [trackPos, setTrackPos] = useState({ frac: 0, dur: 240 });
  // SFX prefs are React state (the panel renders them); synced into the Sfx
  // instance below. Monolith defaults: sfx 0.8, unmuted.
  const [sfxMuted, setSfxMuted] = useState(false);
  const [sfxVol, setSfxVolState] = useState(0.8);
  // Overlay modals. Glossary query/tier persist across open/close for the
  // session (monolith keeps them in app state; NOT part of the record).
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [glossaryQuery, setGlossaryQuery] = useState('');
  const [glossaryTier, setGlossaryTier] = useState<GlossaryTier>('all');
  const [txnOpen, setTxnOpen] = useState(false);
  // Shard I/O: the eject/slot animation overlay, the slot-overwrite confirm,
  // and the purge confirm (Service Record view).
  const [shardIO, setShardIO] = useState<ShardIOState | null>(null);
  const [pendingShard, setPendingShard] = useState<ProgressRecord | null>(null);
  const [purgePrompt, setPurgePrompt] = useState(false);
  // Certificate: the overlay, its name-gate prompt, and the prompt's RAW
  // input (sanitized only on confirm).
  const [certMode, setCertMode] = useState(false);
  const [certPrompt, setCertPrompt] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const sfx = useRef<Sfx>(null as unknown as Sfx);
  if (!sfx.current) { sfx.current = new Sfx(); sfx.current.sfxVol = 0.8; }
  const radio = useRef<RadioEngine | null>(null);
  // Radio prefs that arrived before the engine existed (session restore adopts
  // the record at load, but the engine only builds on the first gesture).
  const pendingRadio = useRef<Parameters<RadioEngine['restore']>[0] | null>(null);
  const welcomeT = useRef<number | undefined>(undefined);
  const flyerId = useRef(0);
  const pulseT = useRef<number | undefined>(undefined);
  // Shard animation bookkeeping: a running-IO guard the handlers can read
  // synchronously, plus the rAF/timeout ids for unmount cleanup.
  const ioRef = useRef<ShardIOState | null>(null);
  ioRef.current = shardIO;
  const ioRaf = useRef(0);
  const ioGuard = useRef<number | undefined>(undefined);
  const ioClear = useRef<number | undefined>(undefined);

  // Live-state ref so adapter/economy callbacks never capture a stale render.
  const live = useRef({ op, course, radioSt, sfxMuted, sfxVol, preAuth, signedIn, radioClosed });
  live.current = { op, course, radioSt, sfxMuted, sfxVol, preAuth, signedIn, radioClosed };

  // Modal flags mirrored into a ref so the mount-time key handler sees them.
  const modals = useRef({ glossaryOpen, txnOpen });
  modals.current = { glossaryOpen, txnOpen };

  // Ledger deep-link target. Plain state (not a consume-once ref) so the
  // player's mount effect stays idempotent under StrictMode's double run —
  // both runs must decide the same branch. The tick distinguishes a fresh
  // jump (same-module jumps included) from a later plain module change.
  const [jump, setJump] = useState<{ moduleId: string; qid: string; tick: number } | null>(null);

  const econ = useMemo(() => ({ ...ECON_DEFAULTS, ...(course?.economy ?? {}) }), [course]);
  const econRef = useRef(econ);
  econRef.current = econ;

  const snapshot = useCallback((): ProgressRecord => {
    const { op: o, course: c, radioSt: r, sfxMuted: m, sfxVol: sv, radioClosed: rc } = live.current;
    return {
      schema: RECORD_SCHEMA,
      course: c?.id || 'sample',
      exportedAt: new Date().toISOString(),
      moduleDone: o.moduleDone, quiz: o.quiz, eddies: o.eddies,
      revealedBy: o.revealedBy, txns: o.txns,
      operatorName: sanitizeName(o.operatorName),
      audio: {
        muted: m, musicOn: !r.musicMuted, musicVol: r.musicVol, sfxVol: sv,
        stationIdx: r.station, trackIdx: r.track, stationTracks: r.stationTracks, cycle: r.cycle,
        off: rc,
      },
    };
  }, []);

  const [progress] = useState(() => createProgress({
    persistEnabled: () => !!window.ACADEMY_CONFIG?.persist,
    buildSnapshot: snapshot,
    normalize: (rec) => migrateRecord(rec, live.current.course ?? {}),
    sanitize: sanitizeName,
    currentName: () => live.current.op.operatorName,
  }));

  // Build the radio engine. Deliberately NOT called at mount: it needs the
  // shared AudioContext, and constructing one before user activation is what
  // makes Chrome log "The AudioContext was not allowed to start". The lock
  // screen's LOGIN click is the gesture, so this runs from there. The engine
  // constructs inactive (active=false), so music still waits for /dashboard.
  const startRadio = useCallback(() => {
    setAudioStandby(false); // a gesture reached us — the pill's standby state resolves
    if (radio.current || !window.NCRadio || !stations().length) return;
    const mirror = (st: RadioEngineState) => setRadioSt({
      station: st.stationIndex, track: st.trackIndex, stationTracks: st.trackIndexByStation,
      cycle: st.cycle, musicVol: st.musicVolume, musicMuted: st.musicMuted, paused: st.paused,
    });
    radio.current = window.NCRadio.create({
      stations: stations(),
      audioContext: sfx.current.context(),
      autoRotate: true,
      onStateChange: mirror,
    });
    if (pendingRadio.current) { radio.current.restore(pendingRadio.current); pendingRadio.current = null; }
    mirror(radio.current.getState()); // the engine doesn't emit on create — seed the mirror
  }, []);

  // ---- mount: course load, pointer tick, keyboard scrolling ----
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
    // Keyboard scrolling of the lesson/dashboard (targets the visible <main>).
    const onKey = (e: KeyboardEvent) => {
      // Escape closes modals BEFORE the input guard — works from the search box.
      if (e.key === 'Escape' && modals.current.glossaryOpen) { setGlossaryOpen(false); return; }
      if (e.key === 'Escape' && modals.current.txnOpen) { setTxnOpen(false); return; }
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
      cancelAnimationFrame(ioRaf.current);
      window.clearTimeout(ioGuard.current);
      window.clearTimeout(ioClear.current);
    };
  }, []);

  // Debounced local save whenever operator state OR the persisted audio
  // prefs change. The session snapshot (refresh continuity, issue #9) writes
  // in BOTH persist modes; the durable profile stays persist-gated.
  useEffect(() => {
    if (!signedIn) return;
    const t = window.setTimeout(() => {
      writeSession(snapshot());
      if (cfg().persist && progress) { try { progress.save(); } catch { /* storage unavailable */ } }
    }, 400);
    return () => window.clearTimeout(t);
  }, [op, radioSt, sfxMuted, sfxVol, signedIn, progress, snapshot]);

  // A refresh can land inside that 400ms window — flush the snapshot on
  // pagehide so the last action survives the reload.
  useEffect(() => {
    const flush = () => { if (live.current.signedIn) writeSession(snapshot()); };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [snapshot]);

  // In-app broadcast poll (issue #10): fetch on sign-in and every 5 minutes
  // (the endpoint is no-store and cheap), so a mid-session alert arrives
  // mid-session. A failed poll keeps the last known list rather than
  // flashing the panel away; the lock screen owns the evergreen fallback.
  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    const load = () => { void fetchMessages().then((r) => { if (alive && r.ok) setMessages(r.messages); }); };
    load();
    const t = window.setInterval(load, 5 * 60 * 1000);
    return () => { alive = false; window.clearInterval(t); };
  }, [signedIn]);

  // Music runs only once the operator is past the lock and boot screens,
  // and only while the radio has not been closed (issue #34).
  useEffect(() => { radio.current?.setActive(!preAuth && !radioClosed); }, [preAuth, radioClosed]);

  // Deferred audio boot (issue #9): user activation is per page load, so a
  // restored session comes back with no gesture and the radio can't legally
  // build at load. The first gesture of the new load — any click or key —
  // stands in for the lock's LOGIN click: the context is created and resumed
  // inside it (no autoplay warning), the engine builds, and the stashed radio
  // prefs apply. Until then the app is fully usable, just silent.
  useEffect(() => {
    if (!signedIn || radio.current) return;
    const off = () => {
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
    };
    const arm = () => {
      off();
      startRadio();
      radio.current?.setActive(!live.current.preAuth && !live.current.radioClosed);
    };
    window.addEventListener('pointerdown', arm);
    window.addEventListener('keydown', arm);
    return off;
  }, [signedIn, startRadio]);

  // The Sfx instance mirrors the React prefs (it gates every play() call).
  useEffect(() => {
    sfx.current.muted = sfxMuted;
    sfx.current.sfxVol = sfxVol;
  }, [sfxMuted, sfxVol]);

  // Track progress: poll the engine every 400ms, only while the panel is
  // open (continuous values are NOT emitted through onStateChange).
  useEffect(() => {
    if (!playerOpen) return;
    const tick = () => {
      const st = radio.current?.getState();
      setTrackPos({ frac: st?.trackProgress ?? 0, dur: st?.trackDuration || 240 });
    };
    tick();
    const t = window.setInterval(tick, 400);
    return () => window.clearInterval(t);
  }, [playerOpen]);

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

  // ---- record adoption (login + slot + session restore share it) ----
  // Apply radio prefs now if the engine exists, else stash them for startRadio.
  const restoreRadio = useCallback((p: Parameters<RadioEngine['restore']>[0]) => {
    if (radio.current) radio.current.restore(p);
    else pendingRadio.current = p;
  }, []);

  const applyAudio = useCallback((a: RecordAudio | null) => {
    if (a) {
      if (typeof a.muted === 'boolean') { sfx.current.muted = a.muted; setSfxMuted(a.muted); }
      if (typeof a.sfxVol === 'number') {
        const v = Math.max(0, Math.min(1, a.sfxVol));
        sfx.current.sfxVol = v;
        setSfxVolState(v);
      }
      setRadioClosed(!!a.off);
      restoreRadio({
        stationIndex: typeof a.stationIdx === 'number' && a.stationIdx >= 0 ? a.stationIdx : undefined,
        trackIndexByStation: a.stationTracks && typeof a.stationTracks === 'object' ? a.stationTracks : undefined,
        cycle: typeof a.cycle === 'boolean' ? a.cycle : undefined,
        musicVolume: typeof a.musicVol === 'number' ? a.musicVol : undefined,
        musicMuted: typeof a.musicOn === 'boolean' ? !a.musicOn : undefined,
      });
    } else {
      // fresh login → random station, first track, radio on
      setRadioClosed(false);
      const n = stations().length;
      if (n) restoreRadio({ stationIndex: Math.floor(Math.random() * n), trackIndexByStation: {} });
    }
  }, [restoreRadio]);

  const adoptRecord = useCallback((rec: ProgressRecord, name: string) => {
    setOp({
      operatorName: name, moduleDone: rec.moduleDone, quiz: rec.quiz as Record<string, QuizAnswerState>,
      eddies: rec.eddies, revealedBy: rec.revealedBy, txns: rec.txns,
    });
    setEddiesShown(rec.eddies);
    applyAudio(rec.audio);
  }, [applyAudio]);

  // Session restore (issue #9): a mid-session refresh serves back the page the
  // operator was on. The route survives in the URL and signedIn seeded from the
  // session flag; the record adopts here once the course arrives (migrateRecord
  // needs it for defaults). Runs after the mount effect's balance seeding, so
  // the adopted record wins. A snapshot that fails migration ends the session
  // rather than guessing.
  const restoreDone = useRef(false);
  useEffect(() => {
    if (!course || restoreDone.current) return;
    restoreDone.current = true;
    if (!hasSession()) return;
    try {
      const rec = migrateRecord(readSession(), course);
      const name = sanitizeName(rec.operatorName);
      adoptRecord(rec, name);
      if (name) { try { progress?.setUser(name); } catch { /* in-memory */ } }
    } catch {
      clearSession();
      setSignedIn(false);
    }
    setRestoring(false);
  }, [course, adoptRecord, progress]);

  // ---- shard I/O: eject (export), slot (import), purge ----
  // EJECT: animated overlay 0→100 over 820ms, then the actual download. The
  // rAF drives the bar; a guard timeout finishes anyway on backgrounded tabs
  // (rAF pauses there — the download must never gate on it).
  const exportRecord = useCallback(() => {
    if (ioRef.current) return;
    sfx.current.play('whoosh');
    const slug = (sanitizeName(live.current.op.operatorName) || 'OPERATOR').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'OPERATOR';
    const fname = `NCZA_${slug}_operator-shard.shard`;
    setShardIO({ mode: 'eject', phase: 'writing', progress: 0, fname });
    const start = performance.now();
    const dur = 820;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setShardIO((io) => (io ? { ...io, progress: 100 } : io));
      let ok = true;
      let emsg = '';
      try {
        const data = JSON.stringify(snapshot(), null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (err) {
        ok = false;
        emsg = (err as Error)?.message || 'unknown';
      }
      setShardIO((io) => (io ? { ...io, phase: ok ? 'ejected' : 'error', err: emsg || undefined } : io));
      setImportMsg(ok ? { ok: true, text: `SHARD EJECTED // ${fname}` } : { ok: false, text: `EJECT FAILED // ${emsg}` });
      ioClear.current = window.setTimeout(() => setShardIO(null), 2300);
    };
    const frame = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      setShardIO((io) => (io ? { ...io, progress: Math.round(k * 100) } : io));
      if (k < 1) { ioRaf.current = requestAnimationFrame(frame); return; }
      finish();
    };
    ioRaf.current = requestAnimationFrame(frame);
    ioGuard.current = window.setTimeout(finish, dur + 250);
  }, [snapshot]);

  // SAVE PROGRESS (player rail + completion stage): record the furthest
  // reveal, then run the full eject flow — same as the monolith.
  const saveProgress = useCallback((moduleId: string, revealed: number) => {
    setOp((o) => ({ ...o, revealedBy: { ...o.revealedBy, [moduleId]: Math.max(o.revealedBy[moduleId] ?? 0, revealed) } }));
    exportRecord();
  }, [exportRecord]);

  // SLOT commit: REPLACE the current record (never merge) and report what
  // the shard carried.
  const commitImport = useCallback((rec: ProgressRecord) => {
    const name = sanitizeName(rec.operatorName);
    adoptRecord(rec, name);
    if (name) { try { progress?.setUser(name); } catch { /* in-memory */ } }
    const doneN = Object.keys(rec.moduleDone ?? {}).length;
    const rb = rec.revealedBy ?? {};
    const startedN = Object.keys(rb).filter((k) => !rec.moduleDone?.[k] && (rb[k] ?? 0) > 1).length;
    const msg = doneN
      ? `SHARD SLOTTED // ${doneN} MODULE(S) CERTIFIED${startedN ? ` // ${startedN} IN PROGRESS` : ''}`
      : startedN
        ? `SHARD SLOTTED // PROGRESS RESTORED // ${startedN} MODULE(S) IN PROGRESS`
        : 'SHARD SLOTTED // CLEAN RECORD';
    setPendingShard(null);
    setImportMsg({ ok: true, text: msg });
  }, [adoptRecord, progress]);

  // Slot animation: mirror of eject — shard slides INTO the reader, decodes,
  // commits at 100%. Shared by the Service Record slot and the boot slot
  // (issue #30); boot trims the post-read hold because its welcome readout
  // follows as the next ceremony.
  const runSlotAnimation = useCallback((commit: () => void, holdMs: number, onCleared?: () => void) => {
    if (ioRef.current) return;
    sfx.current.play('whoosh');
    setShardIO({ mode: 'slot', phase: 'reading', progress: 0 });
    const start = performance.now();
    const dur = 820;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setShardIO((io) => (io ? { ...io, progress: 100 } : io));
      commit();
      sfx.current.play('chime');
      setShardIO((io) => (io ? { ...io, phase: 'slotted' } : io));
      ioClear.current = window.setTimeout(() => { setShardIO(null); onCleared?.(); }, holdMs);
    };
    const frame = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      setShardIO((io) => (io ? { ...io, progress: Math.round(k * 100) } : io));
      if (k < 1) { ioRaf.current = requestAnimationFrame(frame); return; }
      finish();
    };
    ioRaf.current = requestAnimationFrame(frame);
    ioGuard.current = window.setTimeout(finish, dur + 250);
  }, []);

  const slotShard = useCallback((rec: ProgressRecord) => {
    runSlotAnimation(() => commitImport(rec), 1700);
  }, [runSlotAnimation, commitImport]);

  // Post-login slot: parse + migrate, then confirm before replacing a
  // non-empty record (module certified OR balance moved off starting).
  const slotFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (!progress) throw new Error('invalid file');
        const rec = progress.import(String(reader.result));
        const o = live.current.op;
        const nonEmpty = Object.keys(o.moduleDone).length > 0 || o.eddies !== econRef.current.startingBalance;
        if (nonEmpty) setPendingShard(rec);
        else slotShard(rec);
      } catch (err) {
        setImportMsg({ ok: false, text: `SHARD REJECTED // ${(err as Error)?.message || 'invalid file'}` });
      }
    };
    reader.onerror = () => setImportMsg({ ok: false, text: 'SHARD READ FAILED // could not read file' });
    reader.readAsText(file);
  }, [progress, slotShard]);

  // The ONE end-of-session path (issues #9 + #4): logout and purge both funnel
  // here so "signed out" means one thing — session snapshot gone, in-memory
  // record reset, back to the lock. Music stops via the preAuth effect.
  const endSession = useCallback(() => {
    clearSession();
    setSignedIn(false);
    setEntered(false);
    // broadcast read/dismiss state is per signed-in session: the next sign-in
    // (possibly a different operator on this terminal) sees live alerts again
    setDismissedAlerts([]);
    setSeenIds([]);
    setBroadcastOpen(false);
    const bal = econRef.current.startingBalance;
    setOp(freshOperator(bal));
    setEddiesShown(bal);
    navigate('/');
  }, [navigate]);

  const logout = useCallback(() => {
    sfx.current.play('nav');
    setImportMsg(null);
    endSession();
  }, [endSession]);

  // PURGE: wipe the persisted profile (persist mode only) and end the session —
  // a purge starts you from scratch at the lock (#4). progress.remove() also
  // clears lastUser when it was this operator, so boot doesn't pre-fill a
  // purged name. The import line surfaces on the next boot.
  const confirmPurge = useCallback(() => {
    try { if (cfg().persist) progress?.remove(live.current.op.operatorName); } catch { /* storage unavailable */ }
    sfx.current.play('err');
    setPurgePrompt(false);
    setImportMsg({ ok: true, text: 'LOCAL CACHE PURGED // RECORD RESET TO CLEAN STATE' });
    endSession();
  }, [progress, endSession]);

  const setOperatorName = useCallback((v: string) => {
    setOp((o) => ({ ...o, operatorName: cleanNameInput(v) }));
  }, []);

  // ---- radio panel intents (monolith: user-initiated SFX is a host concern;
  // the engine does the swap and emits the new state) ----
  const togglePlayer = useCallback(() => {
    setPlayerOpen((o) => !o);
    sfx.current.play('tick');
  }, []);

  const advanceTrack = useCallback((dir: number) => {
    if (!radio.current) return;
    sfx.current.play('drivehi');
    if (dir > 0) radio.current.next(); else radio.current.prev();
  }, []);

  const selectStation = useCallback((i: number) => {
    if (!radio.current) return;
    sfx.current.play('drivehi');
    radio.current.selectStation(i);
  }, []);

  const togglePlay = useCallback(() => {
    if (!radio.current) return;
    radio.current.toggle();
    sfx.current.play('nav');
  }, []);

  const toggleCycle = useCallback(() => {
    if (!radio.current) return;
    radio.current.toggleCycle();
    sfx.current.play('tick');
  }, []);

  // Close the radio entirely (issue #34): pill dismissed, music stopped (the
  // activity effect reacts to radioClosed). Reopen lives on the Service
  // Record; the click is a gesture, so startRadio can build the engine if the
  // radio was closed for this whole page load.
  const closeRadio = useCallback(() => {
    sfx.current.play('tick');
    setPlayerOpen(false);
    setRadioClosed(true);
  }, []);

  const reopenRadio = useCallback(() => {
    sfx.current.play('nav');
    setRadioClosed(false);
    startRadio();
  }, [startRadio]);

  const setMusicVol = useCallback((v: number) => radio.current?.setMusicVolume(v), []);
  const setSfxVol = useCallback((v: number) => setSfxVolState(Math.max(0, Math.min(1, v))), []);

  // Unmuting confirms audibly with a nav blip (muting is silent, obviously).
  const toggleMusic = useCallback(() => {
    const r = radio.current;
    if (!r) return;
    r.toggleMusicMuted();
    if (!r.getState().musicMuted) sfx.current.play('nav');
  }, []);

  const toggleMute = useCallback(() => {
    const next = !sfx.current.muted;
    sfx.current.muted = next; // ahead of the state sync so the blip gates right
    setSfxMuted(next);
    if (!next) sfx.current.play('nav');
  }, []);

  // ---- certificate (gated on a non-blank operator name) ----
  const openCert = () => {
    if (op.operatorName.trim()) setCertMode(true);
    else { setNameInput(''); setCertPrompt(true); }
  };

  const confirmName = () => {
    const name = sanitizeName(nameInput);
    if (!name) return;
    setOp((o) => ({ ...o, operatorName: name }));
    setCertPrompt(false);
    setCertMode(true);
  };

  const advance = useCallback((moduleId: string, revealed: number) => {
    setOp((o) => ({ ...o, revealedBy: { ...o.revealedBy, [moduleId]: Math.max(o.revealedBy[moduleId] ?? 0, revealed) } }));
  }, []);

  // Ledger modal: explicit tick on open (on top of the global pointer tick,
  // as the monolith does). Jump = close, navigate, stash the target for the
  // player to consume (reveal + scroll + flash happen there).
  const openTxns = useCallback(() => {
    sfx.current.play('tick');
    setTxnOpen(true);
  }, []);

  const jumpToTxn = useCallback((t: Txn) => {
    if (!t.qid || !t.moduleId) { setTxnOpen(false); return; }
    const m = sortedModules(live.current.course ?? {}).find((x) => x.id === t.moduleId);
    if (!m) { setTxnOpen(false); return; }
    setTxnOpen(false);
    setJump((j) => ({ moduleId: t.moduleId as string, qid: t.qid as string, tick: (j?.tick ?? 0) + 1 }));
    navigate(`/module/${t.moduleId}`);
  }, [navigate]);

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

  // Boot slot (issue #30): the reader animation plays first (trimmed 800ms
  // hold), THEN the welcome readout — the overlay is the "machine reads your
  // file" beat, the welcome is the "you're in" payoff, and every boot login
  // ends in the same welcome regardless of how you authenticated.
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
    runSlotAnimation(() => {
      const name = sanitizeName(rec.operatorName);
      adoptRecord(rec, name);
      if (name) { try { progress?.setUser(name); } catch { /* in-memory */ } }
      setImportMsg(null);
    }, 800, () => {
      sfx.current.play('access');
      setBootWelcome(true);
      finishBoot();
    });
  }, [courseLoading, progress, adoptRecord, runSlotAnimation, finishBoot]);

  const readFailed = useCallback(() => {
    setImportMsg({ ok: false, text: 'SHARD READ FAILED // could not read file' });
  }, []);

  const { clearance } = useMemo(
    () => clearanceAndRank(course ?? {}, op.moduleDone),
    [course, op.moduleDone],
  );

  // Bell state (issue #10): unread count + a live-alert indicator that does
  // not care about read state — an unresolved incident stays flagged.
  const unread = messages.filter((m) => !seenIds.includes(m.id)).length;
  const alertLive = messages.some((m) => m.level === 'alert');
  const alertShowing = messages.some((m) => m.level === 'alert' && !dismissedAlerts.includes(m.id));

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const toggleBroadcast = useCallback(() => {
    setBroadcastOpen((o) => {
      // opening marks everything currently in the feed as read
      if (!o) setSeenIds(messagesRef.current.map((m) => m.id));
      return !o;
    });
  }, []);

  // the popover is anchored chrome, not a route: close it on navigation
  useEffect(() => { setBroadcastOpen(false); }, [path]);

  const lock = (
    <Lock
      sfx={sfx.current}
      onLogin={() => { startRadio(); setEntered(true); navigate('/boot'); }}
    />
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
    <div className={`app-shell${alertShowing ? ' has-alert' : ''}`}>
      <AppHeader
        course={course}
        moduleDone={op.moduleDone}
        eddies={eddiesShown}
        balPulse={balPulse}
        glossaryOpen={glossaryOpen}
        onOpenGlossary={() => setGlossaryOpen(true)}
        onOpenTxns={openTxns}
        onLogout={logout}
        unread={unread}
        alertLive={alertLive}
        broadcastOpen={broadcastOpen}
        onToggleBroadcast={toggleBroadcast}
      />
      {/* live incident banner — every view, only while an alert is unresolved */}
      <AlertStrip
        messages={messages}
        dismissed={dismissedAlerts}
        onDismiss={(id) => setDismissedAlerts((d) => d.concat(id))}
      />
      {/* bell popover (issue #10): the broadcast feed, reachable from any view */}
      {broadcastOpen && (
        <>
          <div className="broadcast-pop-backdrop" onClick={() => setBroadcastOpen(false)} />
          <div className="broadcast-pop">
            <BroadcastFeed messages={messages} />
            {messages.length === 0 && <div className="broadcast-pop-empty">&gt; NO BROADCASTS ON RECORD.</div>}
          </div>
        </>
      )}
      {/* On a restored session the route is live before the course fetch and
          record adoption land; the views assume both at mount (the player
          reads its resume place from op state), so hold them briefly. */}
      {course && !restoring ? content : <main className="restore-wait">REBUILDING SESSION…</main>}
      <SysReadout />
      <GlossaryFab open={glossaryOpen} onOpen={() => setGlossaryOpen(true)} />
      <FlyerLayer flyers={flyers} />
      <TransferOverlay t={transfer} symbol={econ.symbol} />
      {glossaryOpen && (
        <GlossaryModal
          course={course}
          query={glossaryQuery}
          tier={glossaryTier}
          onQuery={setGlossaryQuery}
          onTier={setGlossaryTier}
          onClose={() => setGlossaryOpen(false)}
        />
      )}
      {txnOpen && (
        <TxnHistoryModal
          txns={op.txns as Txn[]}
          symbol={econ.symbol}
          startingBalance={econ.startingBalance}
          eddies={op.eddies}
          onJump={jumpToTxn}
          onClose={() => setTxnOpen(false)}
        />
      )}
      {pendingShard && (
        <ConfirmDialog
          title="OVERWRITE WARNING"
          lead="SLOTTING WILL OVERWRITE CURRENT PROGRESS."
          detail={`Incoming shard: ${Object.keys(pendingShard.moduleDone ?? {}).length} module(s), operator "${sanitizeName(pendingShard.operatorName) || 'UNNAMED'}". This replaces your current record and cannot be undone.`}
          primaryLabel="OVERWRITE & SLOT"
          onPrimary={() => { const rec = pendingShard; setPendingShard(null); slotShard(rec); }}
          onCancel={() => { setPendingShard(null); setImportMsg({ ok: false, text: 'SLOT CANCELLED // CURRENT PROGRESS PRESERVED' }); }}
        />
      )}
      {purgePrompt && (
        <ConfirmDialog
          title="PURGE LOCAL CACHE"
          lead="THIS WIPES ALL PROGRESS ON THIS TERMINAL."
          detail="Certifications, quiz results, eddies and session place reset to a clean record. Any shard you have already ejected is unaffected. This cannot be undone."
          primaryLabel="PURGE RECORD"
          onPrimary={confirmPurge}
          onCancel={() => setPurgePrompt(false)}
        />
      )}
      {certMode && (
        <CertificateOverlay
          course={course}
          moduleDone={op.moduleDone}
          operatorName={op.operatorName}
          onPrint={() => window.print()}
          onEditName={() => { setCertMode(false); setNameInput(op.operatorName || ''); setCertPrompt(true); }}
          onClose={() => setCertMode(false)}
        />
      )}
      {certPrompt && (
        <NamePromptDialog
          value={nameInput}
          onChange={setNameInput}
          onConfirm={confirmName}
          onCancel={() => setCertPrompt(false)}
        />
      )}
      {/* last, like the monolith: same z as the modal scrim, wins by DOM order */}
      {!radioClosed && <MusicPlayer
        open={playerOpen}
        standby={audioStandby}
        st={radioSt}
        trackProg={trackPos.frac}
        trackDur={trackPos.dur}
        sfxMuted={sfxMuted}
        sfxVol={sfxVol}
        sfx={sfx.current}
        onToggleOpen={togglePlayer}
        onPrev={() => advanceTrack(-1)}
        onNext={() => advanceTrack(1)}
        onTogglePlay={togglePlay}
        onToggleCycle={toggleCycle}
        onSelectStation={selectStation}
        onMusicVol={setMusicVol}
        onSfxVol={setSfxVol}
        onToggleMusic={toggleMusic}
        onToggleMute={toggleMute}
        onClose={closeRadio}
      />}
    </div>
  ) : (
    <Navigate to="/" replace />
  );

  return (
    <>
    <Routes>
      <Route path="/" element={lock} />
      {/* Boot is a transient splash, not a destination: reaching it without the
          LOGIN gesture means a silent boot, the exact state the lock prevents. */}
      <Route path="/boot" element={entered ? boot : <Navigate to="/" replace />} />
      <Route path="/dashboard" element={shell(
        <Dashboard course={course} moduleDone={op.moduleDone} revealedBy={op.revealedBy} onOpenCourse={openCourse} />,
      )} />
      <Route path="/record" element={shell(
        <ServiceRecord
          course={course}
          moduleDone={op.moduleDone}
          eddies={op.eddies}
          operatorName={op.operatorName}
          importMsg={importMsg}
          onNameChange={setOperatorName}
          onEject={exportRecord}
          onSlotFile={slotFile}
          onViewCert={openCert}
          onPurge={() => setPurgePrompt(true)}
          radioClosed={radioClosed}
          onReopenRadio={reopenRadio}
        />,
      )} />
      <Route path="/module/:moduleId" element={shell(
        <PlayerRoute
          course={course}
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
          onViewCert={openCert}
          jump={jump}
        />,
      )} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    {/* App level, not shell: the boot slot (issue #30) animates pre-login.
        position:fixed, so the mount point has no visual effect. */}
    {shardIO && <ShardOverlay io={shardIO} />}
    </>
  );
}
