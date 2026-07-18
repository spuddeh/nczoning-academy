// Live incident banner (issue #10): a slim bar under the app header that
// renders ONLY while an alert-level broadcast is live, on every post-login
// view. An operator mid-module during an outage sees "it's the system, not
// you" without visiting the dashboard. Dismiss is per message and in-memory:
// a still-live alert returns on refresh; it disappears for good when ops
// posts the resolved follow-up (which reuses the alert's id and level).
import type { SysMessage } from '../lib/types';

interface AlertStripProps {
  messages: SysMessage[];
  dismissed: string[];
  onDismiss: (id: string) => void;
}

export function AlertStrip({ messages, dismissed, onDismiss }: AlertStripProps) {
  const live = messages.filter((m) => m.level === 'alert' && !dismissed.includes(m.id));
  if (live.length === 0) return null;
  return (
    <>
      {live.map((m) => (
        <div className="alert-strip" key={m.id} role="alert">
          <span className="alert-strip-tag">⚠ ALERT</span>
          <span className="alert-strip-text">
            {m.title}
            {m.body ? ` // ${m.body}` : ''}
          </span>
          <button
            type="button"
            className="alert-strip-dismiss"
            title="Dismiss for this session"
            onClick={() => onDismiss(m.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </>
  );
}
