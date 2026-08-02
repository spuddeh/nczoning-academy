// Field Glossary modal: searchable, tier-filtered index of course
// terminology. Query/tier state lives in App so it persists across
// open/close for the session (it is NOT part of the record).
// Measured spec: docs/monolith-parity-spec.md, "Field Glossary".
//
// Terms declassify as the operator opens the module that introduces them
// (issue #65). A classified term still occupies a row, redacted, so the index
// reads as filling in rather than as a short or broken list.
import type { Course } from '../../lib/types';
import { glossaryRows } from '../../lib/glossary';
import { Md, SourcesRow } from '../player/primitives';
import { ModalShell } from './ModalShell';

export type GlossaryTier = 'all' | 'project' | 'general';

interface GlossaryModalProps {
  course: Course | null;
  query: string;
  tier: GlossaryTier;
  /** terms the operator has declassified by opening their module */
  unlocked: Set<string>;
  onQuery: (q: string) => void;
  onTier: (t: GlossaryTier) => void;
  onClose: () => void;
}

export function GlossaryModal({ course, query, tier, unlocked, onQuery, onTier, onClose }: GlossaryModalProps) {
  const total = (course?.glossary ?? []).length;
  const rows = glossaryRows(course, query, tier, unlocked);
  const open = rows.filter((r) => !r.locked).length;
  const classified = rows.length - open;
  const pill = (val: GlossaryTier, label: string) => (
    <button
      key={val}
      type="button"
      className={`gloss-tier${tier === val ? ' on' : ''}`}
      onClick={() => onTier(val)}
    >
      {label}
    </button>
  );

  return (
    <ModalShell accent="cyan" title="FIELD GLOSSARY" sub="// NC-ACAD-01" closeLabel="Close glossary" onClose={onClose}>
      <div className="gloss-body">
        <div className="gloss-index-line">&gt; INDEXING FIELD TERMINOLOGY...</div>
        <div className="gloss-intro">
          Reference terminology cited across the coursework. Terms declassify as you open the module that
          introduces them. Open anytime: filter by clearance tier or search the index.
        </div>
        <div className="gloss-controls">
          <div className="gloss-search">
            <span>&gt;</span>
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="SEARCH TERMS"
              aria-label="Search glossary terms"
            />
          </div>
          <div className="gloss-tiers">
            {pill('all', 'ALL')}
            {pill('project', 'PROJECT')}
            {pill('general', 'GENERAL')}
          </div>
        </div>
        <div className="gloss-count">
          ENTRIES <span>[ {open} / {total} ]</span>
          {classified > 0 && <span className="gloss-classified">// {classified} CLASSIFIED</span>}
        </div>
        {rows.length ? (
          <div className="gloss-list">
            {rows.map(({ entry: g, locked, from }, i) => (
              <div key={i} className={`gloss-card${locked ? ' locked' : ''}`}>
                <div className="gloss-term-row">
                  <span className="gloss-term">{locked ? '████████' : g.term}</span>
                  <span className={`gloss-badge${(g.tier ?? 'general') === 'project' ? ' project' : ''}`}>
                    {(g.tier ?? 'general') === 'project' ? 'PROJECT' : 'GENERAL'}
                  </span>
                </div>
                {locked ? (
                  <div className="gloss-locked-def">
                    &gt; CLEARANCE PENDING
                    {from ? ` // DECLASSIFIED ON OPENING ${(from.id ?? '').toUpperCase()} ${from.title ?? ''}`.trimEnd() : ''}
                  </div>
                ) : (
                  <>
                    <div className="gloss-def"><Md text={g.def ?? ''} /></div>
                    <SourcesRow list={g.sources} />
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="modal-empty">
            &gt; NO MATCHING ENTRIES. {query.trim()
              ? 'Adjust the query, clear the tier filter, or keep going: classified terms are not searchable.'
              : 'Adjust the query or clear the tier filter.'}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
