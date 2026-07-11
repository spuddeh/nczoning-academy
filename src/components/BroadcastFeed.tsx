// SYSTEM BROADCAST panel — shared by the lock screen and the dashboard
// (issue #10). One renderer, so the level chips, pinning presentation and
// list cap read identically on both surfaces. Container spacing belongs to
// the caller's context, not this component.
import { MESSAGE_LEVELS } from '../lib/messages';
import type { SysLevel, SysMessage } from '../lib/types';

export function BroadcastFeed({ messages }: { messages: SysMessage[] }) {
  if (messages.length === 0) return null; // an empty feed hides — emptiness is a choice
  return (
    <div className="broadcast">
      <div className="broadcast-head">
        <span className="broadcast-led statusled" />
        <span className="broadcast-title">SYSTEM BROADCAST</span>
      </div>
      <div className="broadcast-list">
        {messages.map((m) => {
          const lvl = MESSAGE_LEVELS[(m.level ?? 'info') as SysLevel] ?? MESSAGE_LEVELS.info;
          return (
            <div className={`bc-msg ${lvl.className}`} key={m.id}>
              <span className="bc-msg-dot" />
              <div className="bc-msg-body">
                <div className="bc-msg-head">
                  <span className="bc-msg-tag">{lvl.tag}</span>
                  <span className="bc-msg-title">{m.title}</span>
                  <span className="bc-msg-date">{m.date?.slice(0, 10)}</span>
                </div>
                <div className="bc-msg-text">{m.body}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
