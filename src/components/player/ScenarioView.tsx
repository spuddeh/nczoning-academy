// The war story: amber-themed scenario with a single-select question whose
// answer state is keyed by the SCENARIO id (not the inner question's).
// Measured spec: docs/monolith-parity-spec.md — "Scenario".
import type { Scenario } from '../../lib/types';
import { Md, SectionLabel, SourcesRow, StageCard, TerminalBlock } from './primitives';
import { SingleSelect } from './QuizView';
import type { QuizApi } from './QuizView';
import type { Accent } from './primitives';

export function ScenarioView({ sc, api }: { sc: Scenario; api: QuizApi }) {
  const q = { ...sc.question, id: sc.id }; // answer state keyed by scenario id
  const st = api.state(sc.id);
  const accent: Accent = st.answered
    ? (st.selected != null && q.options?.[st.selected]?.correct ? 'green' : 'red')
    : 'amber';
  return (
    <StageCard accent={accent}>
      <SectionLabel text={`WAR STORY // ${sc.title ?? 'SCENARIO'}`} tone="amber" />
      <TerminalBlock lines={sc.situation ?? []} />
      <div className="quiz-prompt scenario-prompt">{q.prompt}</div>
      <SingleSelect q={q} api={api} />
      {st.answered && sc.debrief && (
        <div className="scenario-debrief">
          <span className="scenario-debrief-label">DEBRIEF: </span>
          <Md text={sc.debrief} />
        </div>
      )}
      <SourcesRow list={sc.sources} />
    </StageCard>
  );
}
