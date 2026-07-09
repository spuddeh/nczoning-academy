// Module player: module-map rail (off-canvas drawer ≤640px), streamed stage
// column, gated CONTINUE, and the completion stage. Stage model in
// lib/player.ts; measured spec: docs/monolith-parity-spec.md — "Module player".
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Course, CourseModule, QuizAnswerState } from '../lib/types';
import { buildStages, partialFrac, stageDataId, stageGated } from '../lib/player';
import { sortedModules } from '../lib/academy';
import { ChunkView } from '../components/player/ChunkView';
import { QuizView } from '../components/player/QuizView';
import type { QuizApi } from '../components/player/QuizView';
import { LabView } from '../components/player/LabView';
import { ScenarioView } from '../components/player/ScenarioView';
import { Md, SectionLabel, StageCard, TerminalBlock } from '../components/player/primitives';

interface PlayerProps {
  course: Course | null;
  moduleId: string | undefined;
  quiz: Record<string, QuizAnswerState>;
  moduleDone: Record<string, unknown>;
  revealedBy: Record<string, number>;
  quizApi: QuizApi;
  moduleReward: (m: CourseModule) => number;
  economySymbol: string;
  onAdvance: (moduleId: string, revealed: number) => void;
  onSelectModule: (id: string) => void;
  onBackToDashboard: () => void;
  onComplete: (m: CourseModule) => void;
  onSaveProgress: (moduleId: string, revealed: number) => void;
}

export function Player({
  course, moduleId, quiz, moduleDone, revealedBy, quizApi,
  moduleReward, economySymbol,
  onAdvance, onSelectModule, onBackToDashboard, onComplete, onSaveProgress,
}: PlayerProps) {
  const mods = sortedModules(course ?? {});
  const m = mods.find((x) => x.id === moduleId) ?? mods[0];
  const [revealed, setRevealed] = useState(() => Math.max(revealedBy[m?.id ?? ''] ?? 0, 1));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const followRaf = useRef(0);

  // Smoothly follow to the bottom of the stream (the monolith's stick follower).
  const follow = useCallback(() => {
    cancelAnimationFrame(followRaf.current);
    let stable = 0;
    const loop = () => {
      const el = mainRef.current;
      if (!el) return;
      const target = el.scrollHeight - el.clientHeight;
      const diff = target - el.scrollTop;
      if (Math.abs(diff) < 1) { stable++; if (stable > 6) return; }
      else { stable = 0; el.scrollTop = el.scrollTop + diff * 0.16; }
      followRaf.current = requestAnimationFrame(loop);
    };
    followRaf.current = requestAnimationFrame(loop);
  }, []);

  // Resume position + jump to the furthest revealed content on module change.
  useEffect(() => {
    if (!m) return;
    setRevealed(Math.max(revealedBy[m.id] ?? 0, 1));
    setDrawerOpen(false);
    const go = () => { const el = mainRef.current; if (el) el.scrollTop = el.scrollHeight; };
    requestAnimationFrame(() => { go(); requestAnimationFrame(go); });
    return () => cancelAnimationFrame(followRaf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.id]);

  // A user wheel/touch cancels the follower until the next advance.
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const stop = () => cancelAnimationFrame(followRaf.current);
    el.addEventListener('wheel', stop, { passive: true });
    el.addEventListener('touchstart', stop, { passive: true });
    return () => { el.removeEventListener('wheel', stop); el.removeEventListener('touchstart', stop); };
  }, [m?.id]);

  if (!m) return null;

  const stages = buildStages(m);
  const shown = stages.slice(0, revealed);
  const cur = stages[revealed - 1];
  const atEnd = revealed >= stages.length;
  const showContinue = !atEnd && (!cur || cur.kind !== 'complete');
  const gated = stageGated(cur, quiz);
  const done = !!moduleDone[m.id];

  const advance = () => {
    const nv = revealed + 1;
    setRevealed(nv);
    onAdvance(m.id, nv);
    follow();
  };

  return (
    <div className="player-wrap">
      <div className={`rail-backdrop${drawerOpen ? ' open' : ''}`} onClick={() => setDrawerOpen(false)} />
      <aside className={`player-rail${drawerOpen ? ' open' : ''}`}>
        <div className="rail-top">
          <button type="button" className="rail-back" onClick={onBackToDashboard}>‹ RETURN TO DASHBOARD</button>
        </div>
        <div className="rail-map-hdr">
          <div className="rail-map-title">MODULE MAP</div>
          <div className="rail-course">{course?.title ?? ''}</div>
        </div>
        <div className="rail-list">
          {mods.map((mod) => {
            const isDone = !!moduleDone[mod.id];
            const active = mod.id === m.id;
            const inprog = !isDone && (active || partialFrac(mod, moduleDone, revealedBy) > 0);
            const dotCls = isDone ? ' done' : inprog ? ' inprog' : '';
            return (
              <button
                key={mod.id}
                type="button"
                className={`rail-row${active ? ' active' : ''}`}
                onClick={() => onSelectModule(mod.id)}
              >
                <span className={`rail-dot${dotCls}${inprog ? ' ledblink' : ''}`} />
                <span className="rail-row-body">
                  <span className="rail-row-title">{mod.title}</span>
                  <span className="rail-row-meta" style={{ display: 'block' }}>
                    CLR {mod.clearance ?? 1} // {isDone ? 'COMPLETE' : inprog ? 'IN PROGRESS' : 'LOCKED-READY'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="rail-session">
          <div className="rail-session-hdr">
            <span className="rail-session-label">SESSION</span>
            <span className="rail-session-stage">STAGE {Math.min(revealed, stages.length)} / {stages.length}</span>
          </div>
          <div className="rail-session-bar">
            <div className="rail-session-fill" style={{ width: `${Math.round(Math.min(revealed, stages.length) / stages.length * 100)}%` }} />
          </div>
          <button type="button" className="rail-save" onClick={() => onSaveProgress(m.id, revealed)}>
            <span className="rail-save-icon" />
            SAVE PROGRESS
          </button>
          <div className="rail-save-caption">EJECTS A SHARD WITH YOUR CURRENT PLACE</div>
        </div>
      </aside>

      <main className="player-main" ref={mainRef}>
        <button type="button" className="rail-toggle" onClick={() => setDrawerOpen((v) => !v)}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>☰</span> MODULE MAP
        </button>
        <div className="player-body">
          <div className="player-head">
            <div className="player-crumb">
              &gt; MODULE {(m.id ?? '').toUpperCase()} // CLEARANCE LEVEL {m.clearance ?? 1}
            </div>
            <h1 className="player-h1">{m.title}</h1>
            <div className="player-sub">{m.subtitle}</div>
            <div className="player-bar">
              <div className="player-bar-fill" style={{ width: `${Math.round(revealed / stages.length * 100)}%` }} />
            </div>
          </div>

          {shown.map((stage, i) => {
            const dataId = stageDataId(stage);
            return (
              <div key={i} id={dataId ? `stg-${m.id}-${dataId}` : undefined}>
                {stage.kind === 'hook' && (
                  <StageCard>
                    <SectionLabel text="INCOMING TRANSMISSION" />
                    <TerminalBlock lines={m.hook?.lines ?? []} />
                  </StageCard>
                )}
                {stage.kind === 'objectives' && (
                  <StageCard>
                    <SectionLabel text="MISSION OBJECTIVES" />
                    <div className="stage-list">
                      {(m.objectives ?? []).map((o, oi) => (
                        <div key={oi} className="stage-list-row">
                          <span className="stage-list-num">[{String(oi + 1).padStart(2, '0')}]</span>
                          <span>{o}</span>
                        </div>
                      ))}
                    </div>
                  </StageCard>
                )}
                {stage.kind === 'chunk' && <ChunkView chunk={stage.data} />}
                {stage.kind === 'lab' && <LabView lab={stage.data} />}
                {stage.kind === 'quiz' && <QuizView q={stage.data} api={quizApi} />}
                {stage.kind === 'scenario' && <ScenarioView sc={stage.data} api={quizApi} />}
                {stage.kind === 'recap' && (
                  <StageCard accent="green-soft">
                    <SectionLabel text="RECAP" tone="green" />
                    <div className="stage-list">
                      {(m.recap ?? []).map((r, ri) => (
                        <div key={ri} className="stage-list-row">
                          <span className="stage-list-tick">▸</span>
                          <span><Md text={r} /></span>
                        </div>
                      ))}
                    </div>
                  </StageCard>
                )}
                {stage.kind === 'complete' && (
                  <StageCard accent={done ? 'green-strong' : 'gold'}>
                    <SectionLabel text="MODULE COMPLETE" tone={done ? 'green' : 'cyan'} />
                    <div className="complete-copy">
                      {done
                        ? 'Standing updated. Reward transferred to your account. This module is now certified on your Service Record Shard.'
                        : 'All sections cleared. Transmit for completion to receive your eddies reward and raise your standing.'}
                    </div>
                    {done ? (
                      <div className="complete-row">
                        <span className="complete-stamp">✓ CERTIFIED</span>
                        <button type="button" className="complete-save" onClick={() => onSaveProgress(m.id, revealed)}>
                          [ SAVE TO SHARD ]
                        </button>
                        <button type="button" className="quiz-submit" onClick={onBackToDashboard}>
                          [ RETURN TO DASHBOARD ]
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="complete-transmit" onClick={() => onComplete(m)}>
                        [ TRANSMIT FOR COMPLETION // +{economySymbol} {moduleReward(m)} ]
                      </button>
                    )}
                  </StageCard>
                )}
              </div>
            );
          })}

          {showContinue && (
            <button
              type="button"
              data-nosfx="1"
              className="player-continue"
              disabled={gated}
              onClick={gated ? undefined : advance}
            >
              {gated ? '[ RESPOND TO CONTINUE ]' : '[ CONTINUE ]'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
