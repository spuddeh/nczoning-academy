// Course revision log (issue #74). Two jobs, in this order:
//
//   1. Tell the operator which modules they already certified have CHANGED
//      since, and offer a re-run. That is the half that matters: v2.3.0 of
//      TRANSMISSION PROTOCOLS corrected claims that had become false, and an
//      operator who certified before it is carrying a wrong answer.
//   2. Show the course changelog, which was authored from the start and
//      rendered nowhere.
//
// Completion is never reset here. Re-doing a revised module is the operator's
// choice; the certification stands either way.
import type { Course, CourseChangelogEntry, CourseModule } from '../../lib/types';
import { oldestFirst, sortedModules } from '../../lib/academy';
import { Md, SectionLabel } from '../player/primitives';
import { ModalShell } from './ModalShell';

interface CourseChangelogModalProps {
  course: Course | null;
  /** module id -> the course version it was certified at (known ones only) */
  certVersions: Record<string, string>;
  /** module id -> the entries that changed it since, newest first */
  revised: Record<string, CourseChangelogEntry[]>;
  moduleDone: Record<string, unknown>;
  /** re-run: close the modal and open the module in the player */
  onOpenModule: (id: string) => void;
  onClose: () => void;
}

export function CourseChangelogModal({
  course, certVersions, revised, moduleDone, onOpenModule, onClose,
}: CourseChangelogModalProps) {
  const c = course ?? {};
  const mods = sortedModules(c);
  const titleOf = (id: string) => mods.find((m: CourseModule) => m.id === id)?.title || id.toUpperCase();
  const log = (c.changelog ?? []);
  const revisedIds = mods.map((m) => m.id).filter((id) => revised[id]?.length);
  // Certified, but we cannot say which version it was certified at: a shard
  // written before the field existed, whose ledger does not reach back either.
  // Reported rather than guessed; guessing here is how a drift alarm becomes
  // noise the operator learns to dismiss.
  const unknown = Object.keys(moduleDone).filter((id) => !certVersions[id]).length;
  // An entry that changed one of YOUR certified modules, so the log itself
  // shows why the marker above it exists. Matched on version, not object
  // identity: `revised` is built from a defensively re-sorted copy.
  const affectsYou = (e: CourseChangelogEntry) =>
    (e.modules ?? []).some((id) => (revised[id] ?? []).some((r) => r.version === e.version));

  return (
    <ModalShell
      accent="cyan"
      title="COURSE REVISION LOG"
      sub={`// ${(c.id ?? 'course').toUpperCase()}`}
      closeLabel="Close course revision log"
      onClose={onClose}
      scrimClass="clog"
    >
      <div className="clog-body">
        <div className="clog-access-line">&gt; READING CONTENT RELEASE RECORD...</div>
        <div className="clog-head">
          <span className="clog-course">{c.title ?? 'COURSE'}</span>
          <span className="clog-version">V{c.version ?? '0.0.0'}</span>
          <span className="clog-count">[ {log.length} RELEASE{log.length === 1 ? '' : 'S'} ]</span>
        </div>
        <p className="clog-intro">
          Course content is re-audited against a moving codebase. Every release is listed here,
          newest first, with the modules it changed.
        </p>

        {revisedIds.length > 0 && (
          <>
            <SectionLabel text="REVISED SINCE YOUR CERTIFICATION" tone="amber" />
            <p className="clog-revised-lede">
              These modules changed after you certified them. Your certification stands and nothing
              has been reset. Re-run one when you want the corrected material.
            </p>
            <div className="clog-revised">
              {revisedIds.map((id) => {
                const since = revised[id] ?? [];
                return (
                  <div key={id} className="clog-revised-row">
                    <div className="clog-revised-body">
                      <div className="clog-revised-title">{titleOf(id)}</div>
                      <div className="clog-revised-meta">
                        CERTIFIED AT V{certVersions[id]} // CHANGED IN
                      </div>
                      {/* Releases, not their prose. `changes[]` is written about
                          the whole course, so reprinting it here would file six
                          bullets about other modules under this one and make
                          the block unreadable. The release history below is
                          where that prose belongs, tagged where it touches
                          this record. */}
                      <div className="clog-revised-rels">
                        {oldestFirst(since).map((e) => (
                          <span key={e.version} className="clog-revised-rel">
                            V{e.version} <span className="clog-revised-rel-date">{e.date}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="clog-rerun"
                      onClick={() => onOpenModule(id)}
                    >
                      [ RE-RUN MODULE ]
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {unknown > 0 && (
          <div className="clog-unknown">
            &gt; {unknown} CERTIFIED MODULE(S) PREDATE VERSION TRACKING. Revision status unknown, so
            nothing is claimed about them.
          </div>
        )}

        <SectionLabel text="RELEASE HISTORY" />
        <div className="clog-list">
          {log.length ? log.map((e, i) => (
            <div key={e.version ?? i} className={`clog-entry${affectsYou(e) ? ' affects' : ''}`}>
              <div className="clog-entry-hdr">
                <span className="clog-entry-ver">V{e.version}</span>
                <span className="clog-entry-date">{e.date}</span>
                {affectsYou(e) && <span className="clog-entry-tag">AFFECTS YOUR RECORD</span>}
              </div>
              <div className="clog-entry-mods">
                {(e.modules ?? []).length ? (
                  (e.modules ?? []).map((id) => (
                    <span
                      key={id}
                      className={`clog-mod-chip${revised[id] ? ' revised' : ''}`}
                      title={titleOf(id)}
                    >
                      {id.toUpperCase()}
                    </span>
                  ))
                ) : (
                  <span className="clog-mod-none">NO MODULE CONTENT CHANGED</span>
                )}
              </div>
              <ul className="clog-entry-changes">
                {(e.changes ?? []).map((line, j) => <li key={j}><Md text={line} /></li>)}
              </ul>
            </div>
          )) : (
            <div className="modal-empty">&gt; NO RELEASES ON RECORD FOR THIS COURSE.</div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
