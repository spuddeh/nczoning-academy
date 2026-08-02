// Glossary declassification (issue #65). Terms are gated on the modules the
// operator has OPENED, not completed: you need the word while you are reading
// it, not after. Pure logic, no DOM.
//
// The gate reads `fieldNotes.glossaryTerms`, which every module already
// authors and the schema already defines; nothing here needs new content.
import type { Course, CourseModule, GlossaryEntry } from './types';
import { sortedModules } from './academy';

/** The terms a module introduces, in authored order. */
export function moduleTerms(m: CourseModule): string[] {
  const list = m.fieldNotes?.glossaryTerms;
  return Array.isArray(list) ? list.filter((t): t is string => typeof t === 'string' && !!t) : [];
}

/** Every term unlocked by the modules in `modulesSeen`. */
export function unlockedTerms(course: Course | null, modulesSeen: Record<string, number>): Set<string> {
  const out = new Set<string>();
  for (const m of sortedModules(course ?? {})) {
    if (!(m.id in modulesSeen)) continue;
    for (const t of moduleTerms(m)) out.add(t);
  }
  return out;
}

/**
 * Terms `m` would newly declassify given what is already unlocked. Used for
 * the FAB flash, so it must not count terms an earlier module already gave.
 */
export function newTermsFor(course: Course | null, modulesSeen: Record<string, number>, moduleId: string): number {
  if (moduleId in modulesSeen) return 0; // already opened: nothing new to declassify
  const have = unlockedTerms(course, modulesSeen);
  const m = sortedModules(course ?? {}).find((x) => x.id === moduleId);
  if (!m) return 0;
  let n = 0;
  for (const t of moduleTerms(m)) if (!have.has(t)) n++;
  return n;
}

/**
 * The module that introduces a term, for the redacted row's hint. Undefined
 * when no module claims it (an orphan: see the HTTP/status-code fix in #65).
 */
export function introducedBy(course: Course | null, term: string): CourseModule | undefined {
  return sortedModules(course ?? {}).find((m) => moduleTerms(m).includes(term));
}

/** Course position of the module that introduces a term; orphans sort last. */
function introOrder(course: Course | null, term: string): number {
  const mods = sortedModules(course ?? {});
  const i = mods.findIndex((m) => moduleTerms(m).includes(term));
  return i < 0 ? Number.MAX_SAFE_INTEGER : i;
}

export interface GlossaryRow {
  entry: GlossaryEntry;
  locked: boolean;
  /** Set only when locked: the module that declassifies it. */
  from?: CourseModule;
}

/**
 * The glossary list for the modal: sorted, tier-filtered, search-filtered,
 * with each row marked locked or not.
 *
 * A locked row is REDACTED, not hidden, so the index reads as filling in
 * rather than as broken. Search is the one place locking must subtract: a
 * locked entry is not searchable, or the redaction is decorative (you could
 * read a classified definition by typing a word from it).
 *
 * ORDER: declassified entries first (alphabetical, the reference index), then
 * the classified tail in course order. Sorting the whole list alphabetically
 * sorts redacted rows on a name the reader cannot see, which scatters blanks
 * through the terms they came for; grouped this way the tail reads as a
 * roadmap of what the next modules will open.
 */
export function glossaryRows(
  course: Course | null,
  query: string,
  tier: 'all' | 'project' | 'general',
  unlocked: Set<string>,
): GlossaryRow[] {
  const gl = (course?.glossary ?? []) as GlossaryEntry[];
  const q = query.trim().toLowerCase();
  return gl
    .filter((g) => tier === 'all' || (g.tier ?? 'general') === tier)
    .map((entry) => {
      const locked = !unlocked.has(entry.term ?? '');
      return { entry, locked, from: locked ? introducedBy(course, entry.term ?? '') : undefined };
    })
    .filter(({ entry, locked }) => {
      if (!q) return true;
      if (locked) return false; // classified entries are not searchable
      return (entry.term ?? '').toLowerCase().includes(q) || (entry.def ?? '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (a.locked !== b.locked) return a.locked ? 1 : -1;
      if (a.locked) {
        const d = introOrder(course, a.entry.term ?? '') - introOrder(course, b.entry.term ?? '');
        if (d) return d;
      }
      return (a.entry.term ?? '').localeCompare(b.entry.term ?? '');
    });
}
