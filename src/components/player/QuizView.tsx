// Knowledge checks: single-select (mcq / spot-wrong), multi-select, and
// sequence ordering with lift-and-carry drag (pointer events = mouse AND
// touch). Measured spec: docs/monolith-parity-spec.md — "Quizzes".
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import type { Question, QuizAnswerState, QuizOption } from '../../lib/types';
import type { Sfx } from '../../lib/sfx';
import { SectionLabel, SourcesRow, StageCard } from './primitives';
import type { Accent } from './primitives';

export interface QuizApi {
  state(qid: string): QuizAnswerState;
  setQ(qid: string, patch: Partial<QuizAnswerState>): void;
  /** Log the answer txn + play ok/err + fly the eddies delta from the click. */
  award(q: Question, correct: boolean, sourceEl: Element | null): void;
  sfx: Sfx;
}

const KIND_LABEL: Record<string, string> = {
  mcq: 'KNOWLEDGE CHECK // SINGLE SELECT',
  multi: 'KNOWLEDGE CHECK // MULTI SELECT',
  order: 'KNOWLEDGE CHECK // SEQUENCE',
  'spot-wrong': 'KNOWLEDGE CHECK // SPOT THE FALSE STATEMENT',
};

type OptState = 'idle' | 'selected' | 'correct' | 'wrong' | 'reveal-correct';
const MARK: Record<OptState, string> = {
  idle: '[ ]', selected: '[■]', correct: '[✓]', wrong: '[✗]', 'reveal-correct': '[✓]',
};

export function OptionButton({ text, state, onClick, feedback }: {
  text: string;
  state: OptState;
  onClick: ((e: ReactMouseEvent<HTMLButtonElement>) => void) | null;
  feedback?: string | null;
}) {
  return (
    <div>
      <button
        type="button"
        className={`quiz-option${state === 'idle' ? '' : ` ${state}`}`}
        onClick={onClick ?? undefined}
        disabled={!onClick}
      >
        <span className="quiz-mark">{MARK[state]}</span>
        <span>{text}</span>
      </button>
      {feedback && (
        <div className={`quiz-feedback${state === 'wrong' ? ' wrong' : ''}`}>{'// '}{feedback}</div>
      )}
    </div>
  );
}

/** Single-select options list (also used by the scenario stage). */
export function SingleSelect({ q, api }: { q: Question; api: QuizApi }) {
  const st = api.state(q.id);
  const options = q.options ?? [];
  const pick = (idx: number, opt: QuizOption) => (e: ReactMouseEvent<HTMLButtonElement>) => {
    if (api.state(q.id).answered) return;
    api.setQ(q.id, { answered: true, selected: idx });
    api.award(q, !!opt.correct, e.currentTarget);
  };
  return (
    <div className="quiz-options">
      {options.map((o, i) => {
        let s: OptState = 'idle';
        if (st.answered) {
          if (i === st.selected) s = o.correct ? 'correct' : 'wrong';
          else if (o.correct) s = 'reveal-correct';
        }
        const showFeedback = st.answered && (i === st.selected || o.correct);
        return (
          <OptionButton
            key={i}
            text={o.text}
            state={s}
            onClick={st.answered ? null : pick(i, o)}
            feedback={showFeedback ? o.feedback : null}
          />
        );
      })}
    </div>
  );
}

function MultiSelect({ q, api }: { q: Question; api: QuizApi }) {
  const st = api.state(q.id);
  const options = q.options ?? [];
  const chosen = new Set(st.set ?? []);
  const toggle = (idx: number) => {
    if (api.state(q.id).answered) return;
    const set = new Set(api.state(q.id).set ?? []);
    if (set.has(idx)) set.delete(idx); else set.add(idx);
    api.setQ(q.id, { set: Array.from(set) });
  };
  const submit = (e: ReactMouseEvent<HTMLButtonElement>) => {
    if (api.state(q.id).answered) return;
    const picked = new Set(api.state(q.id).set ?? []);
    const correct = options.every((o, i) => !!o.correct === picked.has(i));
    api.setQ(q.id, { answered: true, correct });
    api.award(q, correct, e.currentTarget);
  };
  return (
    <div>
      <div className="quiz-options">
        {options.map((o, i) => {
          let s: OptState = chosen.has(i) ? 'selected' : 'idle';
          if (st.answered) {
            if (o.correct) s = chosen.has(i) ? 'correct' : 'reveal-correct';
            else s = chosen.has(i) ? 'wrong' : 'idle';
          }
          return (
            <OptionButton
              key={i}
              text={o.text}
              state={s}
              onClick={st.answered ? null : () => toggle(i)}
              feedback={st.answered ? o.feedback : null}
            />
          );
        })}
      </div>
      {!st.answered && (
        <button type="button" className="quiz-submit" onClick={submit}>[ SUBMIT SELECTION ]</button>
      )}
    </div>
  );
}

interface DragState { fromIndex: number; targetIndex: number; dy: number; }

function OrderQuiz({ q, api }: { q: Question; api: QuizApi }) {
  const st = api.state(q.id);
  const steps = q.steps ?? [];
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [bumpItem, setBumpItem] = useState<number | null>(null);
  const drag = useRef<{ pointerId: number; startY: number; rowH: number; fromIndex: number } | null>(null);
  const bumpT = useRef<number | undefined>(undefined);

  // Shuffle once (Fisher-Yates) on first encounter; stored so it persists.
  useEffect(() => {
    if (!api.state(q.id).order) {
      const shuffled = steps.map((_, i) => i);
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      api.setQ(q.id, { order: shuffled });
    }
    return () => window.clearTimeout(bumpT.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.id]);

  const order = st.order ?? steps.map((_, i) => i);

  const flash = (item: number) => {
    window.clearTimeout(bumpT.current);
    setBumpItem(item);
    bumpT.current = window.setTimeout(() => setBumpItem(null), 420);
  };

  const move = (pos: number, dir: number) => {
    if (api.state(q.id).answered) return;
    const arr = (api.state(q.id).order ?? []).slice();
    const ni = pos + dir;
    if (ni < 0 || ni >= arr.length) return;
    const item = arr[pos];
    [arr[pos], arr[ni]] = [arr[ni], arr[pos]];
    api.setQ(q.id, { order: arr });
    flash(item);
    api.sfx.play('tick');
  };

  const dragStart = (pos: number) => (e: ReactPointerEvent<HTMLSpanElement>) => {
    if (api.state(q.id).answered) return;
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    const list = (e.currentTarget as HTMLElement).closest('[data-order-list]');
    const rows = list ? Array.from(list.children) : [];
    const rect = rows[pos]?.getBoundingClientRect();
    const rowH = rect ? rect.height + 8 : 52; // row height + the 8px flex gap = one slot
    drag.current = { pointerId: e.pointerId, startY: e.clientY, rowH, fromIndex: pos };
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* unsupported */ }
    setDragging({ fromIndex: pos, targetIndex: pos, dy: 0 });
    api.sfx.play('tick');
  };
  const dragMove = (e: ReactPointerEvent<HTMLSpanElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    let target = d.fromIndex + Math.round(dy / d.rowH);
    target = Math.max(0, Math.min(order.length - 1, target));
    setDragging({ fromIndex: d.fromIndex, targetIndex: target, dy });
  };
  const dragEnd = (e: ReactPointerEvent<HTMLSpanElement>) => {
    const d = drag.current;
    if (!d) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(d.pointerId); } catch { /* released */ }
    setDragging((dg) => {
      if (dg && dg.targetIndex !== d.fromIndex) {
        const arr = (api.state(q.id).order ?? []).slice();
        const [item] = arr.splice(d.fromIndex, 1);
        arr.splice(dg.targetIndex, 0, item);
        api.setQ(q.id, { order: arr });
        flash(item);
      }
      return null;
    });
    drag.current = null;
    api.sfx.play('tick');
  };

  const submit = (e: ReactMouseEvent<HTMLButtonElement>) => {
    if (api.state(q.id).answered) return;
    const arr = api.state(q.id).order ?? [];
    const correct = arr.every((v, i) => v === i);
    api.setQ(q.id, { answered: true, correct });
    api.award(q, correct, e.currentTarget);
  };

  const rowH = drag.current?.rowH ?? 52;
  const dragActive = !st.answered && dragging;

  return (
    <div>
      <div data-order-list="1" className="order-list">
        {order.map((stepIdx, pos) => {
          const isRight = !!st.answered && stepIdx === pos;
          const picked = !!dragActive && pos === dragging.fromIndex;
          let shift = 0;
          if (dragActive && !picked) {
            if (dragging.targetIndex > dragging.fromIndex && pos > dragging.fromIndex && pos <= dragging.targetIndex) shift = -rowH;
            else if (dragging.targetIndex < dragging.fromIndex && pos < dragging.fromIndex && pos >= dragging.targetIndex) shift = rowH;
          }
          const cls = [
            'order-row',
            st.answered ? (isRight ? 'right' : 'wrong-pos') : '',
            picked ? 'picked' : '',
            !st.answered && !dragActive && bumpItem === stepIdx ? 'bump' : '',
          ].filter(Boolean).join(' ');
          return (
            <div
              key={pos}
              className={cls}
              style={{ transform: picked ? `translateY(${dragging.dy}px) scale(1.035)` : `translateY(${shift}px)` }}
            >
              {!st.answered && (
                <span
                  className="order-grip"
                  title="Drag to reorder"
                  aria-hidden="true"
                  onPointerDown={dragStart(pos)}
                  onPointerMove={dragMove}
                  onPointerUp={dragEnd}
                  onPointerCancel={dragEnd}
                >
                  <GripIcon />
                </span>
              )}
              <span className="order-num">{pos + 1}.</span>
              <span className="order-text">{steps[stepIdx]}</span>
              {st.answered ? (
                <span className="order-mark">{isRight ? '✓' : '✗'}</span>
              ) : (
                <div className="order-arrows">
                  <button type="button" className="order-arrow" onClick={() => move(pos, -1)} disabled={pos === 0} aria-label="Move up">▲</button>
                  <button type="button" className="order-arrow" onClick={() => move(pos, 1)} disabled={pos === order.length - 1} aria-label="Move down">▼</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {st.answered ? (
        <div className={`quiz-result${st.correct ? '' : ' wrong'}`}>
          {st.correct ? '// SEQUENCE CORRECT' : '// SEQUENCE INCORRECT — correct order shown by numbering'}
        </div>
      ) : (
        <div>
          <div className="quiz-hint">{'// DRAG ROWS OR USE ARROWS TO ORDER'}</div>
          <button type="button" className="quiz-submit" onClick={submit}>[ SUBMIT SEQUENCE ]</button>
        </div>
      )}
    </div>
  );
}

function GripIcon() {
  return (
    <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor" style={{ display: 'block' }}>
      {[[3, 4], [9, 4], [3, 9], [9, 9], [3, 14], [9, 14]].map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="1.5" />
      ))}
    </svg>
  );
}

/** Was the recorded answer correct (drives the card accent)? */
function answeredCorrect(q: Question, st: QuizAnswerState): boolean {
  if (st.correct) return true;
  if (st.selected != null && q.options?.[st.selected]?.correct) return true;
  return false;
}

export function QuizView({ q, api }: { q: Question; api: QuizApi }) {
  const st = api.state(q.id);
  const accent: Accent = st.answered ? (answeredCorrect(q, st) ? 'green' : 'red') : 'default';
  return (
    <StageCard accent={accent}>
      <SectionLabel text={KIND_LABEL[q.type] ?? 'KNOWLEDGE CHECK'} />
      <div className="quiz-prompt">{q.prompt}</div>
      {(q.type === 'mcq' || q.type === 'spot-wrong') && <SingleSelect q={q} api={api} />}
      {q.type === 'multi' && <MultiSelect q={q} api={api} />}
      {q.type === 'order' && <OrderQuiz q={q} api={api} />}
      <SourcesRow list={q.sources} />
    </StageCard>
  );
}
