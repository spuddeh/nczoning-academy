// Module-player stage model: a straight port of the monolith's buildStages/
// stageGated (docs/monolith-parity-spec.md, "Stage model"). Pure logic, no
// DOM: the Player view maps stages to components.
import type { Chunk, CourseModule, Lab, Question, QuizAnswerState, Scenario } from './types';

export type Stage =
  | { kind: 'hook' }
  | { kind: 'objectives' }
  | { kind: 'chunk'; data: Chunk }
  | { kind: 'lab'; data: Lab }
  | { kind: 'quiz'; data: Question }
  | { kind: 'scenario'; data: Scenario }
  | { kind: 'recap' }
  | { kind: 'fieldnotes' }
  | { kind: 'complete' };

// True when the module has field notes worth a stage of their own. Modules
// that author neither terms nor resources skip it rather than render an
// empty card.
export function hasFieldNotes(m: CourseModule): boolean {
  const fn = m.fieldNotes;
  return !!(fn?.glossaryTerms?.length || fn?.resources?.length);
}

export function buildStages(m: CourseModule): Stage[] {
  const st: Stage[] = [{ kind: 'hook' }, { kind: 'objectives' }];
  for (const c of m.chunks ?? []) st.push({ kind: 'chunk', data: c });
  if (m.lab) st.push({ kind: 'lab', data: m.lab });
  for (const q of m.quiz ?? []) st.push({ kind: 'quiz', data: q });
  if (m.scenario) st.push({ kind: 'scenario', data: m.scenario });
  st.push({ kind: 'recap' });
  // Field notes sit after the recap and before the completion stage: the
  // module's terms and further reading, gathered where the reader has just
  // finished the material and before they transmit for completion.
  if (hasFieldNotes(m)) st.push({ kind: 'fieldnotes' });
  st.push({ kind: 'complete' });
  return st;
}

// A stage gates CONTINUE while its question is unanswered.
export function stageGated(stage: Stage | undefined, quiz: Record<string, QuizAnswerState>): boolean {
  if (!stage) return false;
  if (stage.kind === 'quiz') return !quiz[stage.data.id]?.answered;
  if (stage.kind === 'scenario') return !quiz[stage.data.id]?.answered;
  return false;
}

// The stage id used for txn deep-link anchors (stg-<module>-<id>).
export function stageDataId(stage: Stage): string | undefined {
  return 'data' in stage ? (stage.data as { id?: string }).id : undefined;
}

// Resume position on module entry, the monolith's _resumeRevealed: a
// completed module reveals ALL stages; otherwise the recorded reveal,
// clamped to [1, total] (a stale record can exceed a re-authored module).
export function resumeRevealed(
  m: CourseModule,
  moduleDone: Record<string, unknown>,
  revealedBy: Record<string, number>,
): number {
  const total = buildStages(m).length;
  if (moduleDone[m.id]) return total;
  return Math.min(total, Math.max(1, revealedBy[m.id] ?? 1));
}

// Partial-progress credit for the dashboard bar and rail dots: the
// monolith's partialFrac: completed = 1; started (revealed past stage 1)
// = (revealed-1)/(stages-1); untouched = 0.
export function partialFrac(
  m: CourseModule,
  moduleDone: Record<string, unknown>,
  revealedBy: Record<string, number>,
): number {
  if (moduleDone[m.id]) return 1;
  const rec = revealedBy[m.id] ?? 0;
  if (rec <= 1) return 0;
  const total = buildStages(m).length || 1;
  return Math.min(1, Math.max(0, rec - 1) / Math.max(1, total - 1));
}
