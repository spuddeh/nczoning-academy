// Field Glossary modal: searchable, tier-filtered index of course
// terminology. Query/tier state lives in App so it persists across
// open/close for the session (it is NOT part of the record).
// Measured spec: docs/monolith-parity-spec.md, "Field Glossary".
import type { Course, GlossaryEntry } from '../../lib/types';
import { Md, SourcesRow } from '../player/primitives';
import { ModalShell } from './ModalShell';

export type GlossaryTier = 'all' | 'project' | 'general';

export function filteredGlossary(course: Course | null, query: string, tier: GlossaryTier): GlossaryEntry[] {
  const gl = (course?.glossary ?? []) as GlossaryEntry[];
  const q = query.trim().toLowerCase();
  return gl
    .filter((g) => {
      if (tier !== 'all' && (g.tier ?? 'general') !== tier) return false;
      if (!q) return true;
      return (g.term ?? '').toLowerCase().includes(q) || (g.def ?? '').toLowerCase().includes(q);
    })
    .sort((a, b) => (a.term ?? '').localeCompare(b.term ?? ''));
}

interface GlossaryModalProps {
  course: Course | null;
  query: string;
  tier: GlossaryTier;
  onQuery: (q: string) => void;
  onTier: (t: GlossaryTier) => void;
  onClose: () => void;
}

export function GlossaryModal({ course, query, tier, onQuery, onTier, onClose }: GlossaryModalProps) {
  const total = (course?.glossary ?? []).length;
  const list = filteredGlossary(course, query, tier);
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
          Reference terminology cited across the coursework. Open anytime: filter by clearance tier or search the index.
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
          ENTRIES <span>[ {list.length} / {total} ]</span>
        </div>
        {list.length ? (
          <div className="gloss-list">
            {list.map((g, i) => (
              <div key={i} className="gloss-card">
                <div className="gloss-term-row">
                  <span className="gloss-term">{g.term}</span>
                  <span className={`gloss-badge${(g.tier ?? 'general') === 'project' ? ' project' : ''}`}>
                    {(g.tier ?? 'general') === 'project' ? 'PROJECT' : 'GENERAL'}
                  </span>
                </div>
                <div className="gloss-def"><Md text={g.def ?? ''} /></div>
                <SourcesRow list={g.sources} />
              </div>
            ))}
          </div>
        ) : (
          <div className="modal-empty">&gt; NO MATCHING ENTRIES. Adjust the query or clear the tier filter.</div>
        )}
      </div>
    </ModalShell>
  );
}
