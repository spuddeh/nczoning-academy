// The admin surface at /admin (issue #8).
//
// A FORM, NOT A JSON EDITOR. Posting an announcement used to mean a shell, an
// authenticated wrangler, a hand-written payload, and remembering two rules that
// are easy to forget under pressure. The verbs here match the real lifecycle
// (Post, Mark resolved, Clear) and the rules are enforced by the UI rather than
// by a human: `alert` routes itself to the ops channel, and resolving an
// incident reuses its id in the key it already lives in.
//
// STANDALONE, not inside the app shell. There is no header, no radio, no audio
// gate and no operator login: the lock-screen login is a named local profile,
// not access control, and requiring it during an incident would be friction
// with no security value. Cloudflare Access is the gate, verified by the
// endpoint itself.
//
// The endpoint is the truth. Every write is followed by a re-read; nothing here
// predicts a result.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearKey, deriveId, entriesOf, getSnapshot, isError, keyForLevel, putKey,
  removeFrom, replaceIn, today,
} from '../lib/admin';
import type { AdminSnapshot, KeyName, KeyState } from '../lib/admin';
import { MESSAGE_LEVELS } from '../lib/messages';
import type { SysLevel, SysMessage } from '../lib/types';

// The schema's limits, mirrored for live feedback. The endpoint is the wall;
// these exist so an administrator sees the ceiling before submitting, not after.
//
// Deliberately NOT `maxLength` on the fields. A pasted paragraph would then be
// silently truncated, and an announcement that quietly lost its last sentence is
// worse than one the form refuses to send while showing 260 / 240.
const TITLE_MAX = 60;
const BODY_MAX = 240;

const LEVELS: SysLevel[] = ['update', 'info', 'alert', 'resolved'];
const KEY_LABEL: Record<KeyName, string> = { ops: 'OPS', manual: 'MANUAL' };

interface Draft {
  level: SysLevel;
  title: string;
  body: string;
  date: string;
}

const emptyDraft = (): Draft => ({ level: 'update', title: '', body: '', date: today() });

export function Admin() {
  const [snap, setSnap] = useState<AdminSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<{ key: KeyName; id: string } | null>(null);
  const alive = useRef(true);

  useEffect(() => () => { alive.current = false; }, []);

  const load = useCallback(async () => {
    const r = await getSnapshot();
    if (!alive.current) return;
    setLoading(false);
    if (isError(r)) { setError([r.message, ...(r.errors ?? [])]); return; }
    setError(null);
    setSnap(r);
  }, []);

  useEffect(() => { void load(); }, [load]);

  /**
   * Run one mutation, then re-read. Both outcomes are reported: a silent
   * success on a write endpoint is indistinguishable from a lost tap, which is
   * the wrong thing to be unsure about mid-incident.
   */
  const mutate = useCallback(
    async (label: string, run: () => Promise<unknown>) => {
      setBusy(true);
      setNotice(null);
      const r = await run();
      if (!alive.current) return false;
      if (isError(r)) {
        setError([r.message, ...(r.errors ?? [])]);
        setBusy(false);
        return false;
      }
      setError(null);
      const warnings = (r as { warnings?: string[] }).warnings ?? [];
      setNotice(warnings.length ? `${label}. ${warnings.join(' ')}` : label);
      await load();
      if (alive.current) setBusy(false);
      return true;
    },
    [load],
  );

  const ops = snap ? entriesOf(snap.ops) : [];
  const manual = snap ? entriesOf(snap.manual) : [];
  const takenIds = [...ops, ...manual].map((m) => m.id);

  // ---- verbs ----

  async function post() {
    if (!snap) return;
    const key = keyForLevel(draft.level);
    const list = key === 'ops' ? ops : manual;
    const entry: SysMessage = {
      id: deriveId(draft.title, takenIds),
      level: draft.level,
      date: draft.date,
      title: draft.title.trim(),
      body: draft.body.trim(),
    };
    const ok = await mutate(`Posted to ${KEY_LABEL[key]}`, () => putKey(key, [entry, ...list]));
    if (ok) setDraft(emptyDraft());
  }

  /**
   * Resolve IN PLACE, in the key the entry already lives in.
   *
   * The one rule that must not follow the alert-routes-to-ops rule. Moving a
   * resolved entry to `manual` would leave the original alert alive in `ops`,
   * where it shadows the same id and wins, so the amber banner would never
   * change. Enforcing it here is the whole point of having a UI.
   */
  function resolve(key: KeyName, entry: SysMessage) {
    const list = key === 'ops' ? ops : manual;
    const resolved: SysMessage = { ...entry, level: 'resolved', date: today() };
    void mutate(`Marked "${entry.title}" resolved`, () => putKey(key, replaceIn(list, resolved)));
  }

  function remove(key: KeyName, entry: SysMessage) {
    const list = key === 'ops' ? ops : manual;
    const next = removeFrom(list, entry.id);
    void mutate(
      `Removed "${entry.title}"`,
      () => (next.length ? putKey(key, next) : clearKey(key)),
    );
  }

  function edit(key: KeyName, entry: SysMessage) {
    // Editing is a re-post: the form is the only writer, so an amended entry
    // goes through exactly the same validation as a new one. The id is kept, so
    // it replaces rather than stacks.
    setDraft({
      level: entry.level ?? 'info',
      title: entry.title ?? '',
      body: entry.body ?? '',
      date: (entry.date ?? today()).slice(0, 10),
    });
    setEditing({ key, id: entry.id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveEdit() {
    if (!editing) return;
    const list = editing.key === 'ops' ? ops : manual;
    const entry: SysMessage = {
      id: editing.id,
      level: draft.level,
      date: draft.date,
      title: draft.title.trim(),
      body: draft.body.trim(),
    };
    const ok = await mutate(
      `Updated "${entry.title}"`,
      () => putKey(editing.key, replaceIn(list, entry)),
    );
    if (ok) { setEditing(null); setDraft(emptyDraft()); }
  }

  const titleOver = draft.title.length > TITLE_MAX;
  const bodyOver = draft.body.length > BODY_MAX;
  const canSubmit =
    !busy && draft.title.trim().length > 0 && draft.body.trim().length > 0 && !titleOver && !bodyOver;

  return (
    <main className="admin">
      <header className="admin-head">
        <div>
          <h1 className="admin-title">BROADCAST CONTROL</h1>
          <p className="admin-sub">
            SYSTEM BROADCAST // {snap ? snap.email : 'AUTHENTICATING'}
          </p>
        </div>
        <a className="admin-exit" href="/">RETURN TO TERMINAL</a>
      </header>

      {error && (
        <div className="admin-banner danger" role="alert">
          {error.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}
      {notice && <div className="admin-banner ok" role="status">{notice}</div>}

      <section className="admin-form">
        <h2 className="admin-section-title">{editing ? 'EDIT ENTRY' : 'NEW ANNOUNCEMENT'}</h2>

        <div className="admin-levels" role="radiogroup" aria-label="Level">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              role="radio"
              aria-checked={draft.level === lvl}
              className={`admin-level ${lvl} ${draft.level === lvl ? 'on' : ''}`}
              onClick={() => setDraft((d) => ({ ...d, level: lvl }))}
            >
              {MESSAGE_LEVELS[lvl].tag}
            </button>
          ))}
        </div>
        <p className="admin-hint">
          {editing
            ? `Stays in ${KEY_LABEL[editing.key]}. An entry never changes key once posted.`
            : `Posts to ${KEY_LABEL[keyForLevel(draft.level)]}. ALERT pins to the top of the panel.`}
        </p>

        <label className="admin-label" htmlFor="admin-title">TITLE</label>
        <input
          id="admin-title"
          className="admin-input"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder="ACADEMY ONLINE"
        />
        <div className={`admin-count ${titleOver ? 'over' : ''}`}>
          {draft.title.length} / {TITLE_MAX}
        </div>

        <label className="admin-label" htmlFor="admin-body">BODY</label>
        <textarea
          id="admin-body"
          className="admin-input admin-textarea"
          value={draft.body}
          rows={4}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          placeholder="What an operator needs to know, in one or two sentences."
        />
        <div className={`admin-count ${bodyOver ? 'over' : ''}`}>
          {draft.body.length} / {BODY_MAX}
        </div>

        <label className="admin-label" htmlFor="admin-date">DATE</label>
        <input
          id="admin-date"
          className="admin-input admin-date"
          type="date"
          value={draft.date.slice(0, 10)}
          onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
        />

        <div className="admin-actions">
          <button
            type="button"
            className="admin-btn primary"
            disabled={!canSubmit}
            onClick={() => void (editing ? saveEdit() : post())}
          >
            {editing ? '[ SAVE ]' : '[ POST ]'}
          </button>
          {editing && (
            <button
              type="button"
              className="admin-btn"
              disabled={busy}
              onClick={() => { setEditing(null); setDraft(emptyDraft()); }}
            >
              CANCEL
            </button>
          )}
        </div>
      </section>

      <section className="admin-live">
        <h2 className="admin-section-title">LIVE</h2>
        {loading && <p className="admin-empty">READING BROADCAST STORE...</p>}
        {snap && (
          <>
            <KeyPanel
              name="ops"
              state={snap.ops}
              busy={busy}
              onEdit={edit}
              onResolve={resolve}
              onRemove={remove}
              onClear={() => void mutate('Cleared OPS', () => clearKey('ops'))}
            />
            <KeyPanel
              name="manual"
              state={snap.manual}
              busy={busy}
              onEdit={edit}
              onResolve={resolve}
              onRemove={remove}
              onClear={() => void mutate('Cleared MANUAL', () => clearKey('manual'))}
            />
          </>
        )}
      </section>
    </main>
  );
}

interface KeyPanelProps {
  name: KeyName;
  state: KeyState;
  busy: boolean;
  onEdit: (key: KeyName, entry: SysMessage) => void;
  onResolve: (key: KeyName, entry: SysMessage) => void;
  onRemove: (key: KeyName, entry: SysMessage) => void;
  onClear: () => void;
}

/**
 * One KV key and everything in it.
 *
 * Automated entries are not a separate case. A health check writes `ops`, and an
 * operator amends, resolves or clears it from here like anything else; that is
 * why GET returns the keys unmerged.
 */
function KeyPanel({ name, state, busy, onEdit, onResolve, onRemove, onClear }: KeyPanelProps) {
  const entries = entriesOf(state);
  return (
    <div className="admin-key">
      <div className="admin-key-head">
        <span className={`admin-key-tag ${name}`}>{KEY_LABEL[name]}</span>
        <span className="admin-key-note">
          {name === 'ops' ? 'alerts, including automated ones' : 'hand-written posts'}
        </span>
        <button
          type="button"
          className="admin-btn small danger"
          disabled={busy || state.state === 'absent'}
          onClick={onClear}
        >
          CLEAR
        </button>
      </div>

      {state.state === 'absent' && <p className="admin-empty">EMPTY</p>}

      {state.state === 'invalid' && (
        <div className="admin-banner danger">
          <div>This key holds a value the schema rejects. It was not written from here.</div>
          {state.errors.map((e, i) => <div key={i}>{e}</div>)}
          <pre className="admin-raw">{state.raw}</pre>
          <div>CLEAR removes it.</div>
        </div>
      )}

      {state.state === 'ok' && state.warnings.map((w, i) => (
        <div className="admin-banner warn" key={i}>{w}</div>
      ))}

      {entries.map((m) => {
        const lvl = MESSAGE_LEVELS[(m.level ?? 'info') as SysLevel] ?? MESSAGE_LEVELS.info;
        return (
          <div className={`admin-entry ${lvl.className}`} key={m.id}>
            <div className="admin-entry-head">
              <span className="admin-entry-tag">{lvl.tag}</span>
              <span className="admin-entry-title">{m.title}</span>
              <span className="admin-entry-date">{m.date?.slice(0, 10)}</span>
            </div>
            <div className="admin-entry-body">{m.body}</div>
            <div className="admin-entry-actions">
              <button type="button" className="admin-btn small" disabled={busy} onClick={() => onEdit(name, m)}>
                EDIT
              </button>
              {m.level === 'alert' && (
                <button type="button" className="admin-btn small green" disabled={busy} onClick={() => onResolve(name, m)}>
                  MARK RESOLVED
                </button>
              )}
              <button type="button" className="admin-btn small danger" disabled={busy} onClick={() => onRemove(name, m)}>
                REMOVE
              </button>
            </div>
            <div className="admin-entry-id">id: {m.id}</div>
          </div>
        );
      })}
    </div>
  );
}
