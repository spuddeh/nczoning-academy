// Field notes: the module-footer block the design brief specified and the
// rebuild never built (issue #65). Three parts, all optional:
//
//   TERMS            the terms this module declassifies, as chips that open
//                    the glossary. Names only, deliberately: definitions live
//                    in ONE place, and repeating ten of them here would
//                    rebuild the wall of text the glossary already had.
//   FURTHER READING  course-level `resources` this module cites, by id.
//   VERIFIED AGAINST rolled-up `kind: project` citations, de-duplicated.
//                    Gated on fieldNotes.renderCitations. Inline citations
//                    are scattered through the stream; gathered, they are the
//                    module's provenance against the pinned audit commit.
import type { Course, CourseModule, Source } from '../../lib/types';
import { moduleTerms } from '../../lib/glossary';
import { SectionLabel, StageCard } from './primitives';

// Every source cited anywhere in the module, de-duplicated by url.
function moduleSources(m: CourseModule): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  const take = (list?: Source[]) => {
    for (const s of list ?? []) {
      if (!s?.url || seen.has(s.url)) continue;
      seen.add(s.url);
      out.push(s);
    }
  };
  for (const c of m.chunks ?? []) take(c.sources);
  take(m.lab?.sources);
  for (const q of m.quiz ?? []) take(q.sources);
  take(m.scenario?.sources);
  return out;
}

interface FieldNotesViewProps {
  course: Course | null;
  module: CourseModule;
  onOpenGlossary: () => void;
}

export function FieldNotesView({ course, module: m, onOpenGlossary }: FieldNotesViewProps) {
  const terms = moduleTerms(m);
  const wantIds = m.fieldNotes?.resources ?? [];
  const resources = (course?.resources ?? []).filter((r) => wantIds.includes(r.id));
  const citations = m.fieldNotes?.renderCitations
    ? moduleSources(m).filter((s) => s.kind === 'project')
    : [];

  return (
    <StageCard>
      <SectionLabel text="FIELD NOTES" tone="amber" />

      {terms.length > 0 && (
        <div className="fn-block">
          <div className="fn-label">
            TERMS DECLASSIFIED <span className="fn-count">[ {terms.length} ]</span>
          </div>
          <div className="fn-terms">
            {terms.map((t) => (
              <button key={t} type="button" className="fn-term" onClick={onOpenGlossary} title="Open the field glossary">
                {t}
              </button>
            ))}
          </div>
          <div className="fn-hint">
            Definitions are in the FIELD GLOSSARY, readable from any view.
          </div>
        </div>
      )}

      {resources.length > 0 && (
        <div className="fn-block">
          <div className="fn-label">FURTHER READING</div>
          <div className="fn-links">
            {resources.map((r) => (
              <a key={r.id} className="fn-link" href={r.url} target="_blank" rel="noreferrer">
                ↗ {r.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {citations.length > 0 && (
        <div className="fn-block">
          <div className="fn-label">
            VERIFIED AGAINST <span className="fn-count">[ {citations.length} ]</span>
          </div>
          <div className="fn-links wrap">
            {citations.map((s, i) => (
              <a key={i} className="fn-link project" href={s.url} target="_blank" rel="noreferrer">
                ⟠ {s.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </StageCard>
  );
}
