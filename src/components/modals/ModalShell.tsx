// Shared overlay-modal shell (glossary + transaction history): dimmed
// blurred scrim (click closes), accent-bordered box (clicks stop), solid
// accent title bar with an [ ESC ] CLOSE button. Escape handling lives in
// App so it works while focus is in a modal input.
// Measured spec: docs/monolith-parity-spec.md, "Overlay modals".
import type { ReactNode } from 'react';

interface ModalShellProps {
  accent: 'cyan' | 'gold';
  title: string;
  sub: string;
  closeLabel: string;
  onClose: () => void;
  scrimClass?: string;
  children: ReactNode;
}

export function ModalShell({ accent, title, sub, closeLabel, onClose, scrimClass, children }: ModalShellProps) {
  return (
    <div className={`modal-scrim${scrimClass ? ` ${scrimClass}` : ''}`} onClick={onClose}>
      <div className={`modal-box ${accent}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-titlebar">
          <div className="modal-title">
            {/* its own element so the truncation can live on it: text-overflow
                does not apply to a flex container, which .modal-title is */}
            <span className="modal-title-txt">{title}</span>
            <span className="modal-title-sub">{sub}</span>
          </div>
          <button type="button" className="modal-close" aria-label={closeLabel} onClick={onClose}>
            {/* the key hint is a desktop affordance; a phone has no Esc key and
                the titlebar has no room for one (#5) */}
            <span className="modal-close-key">[ ESC ] </span>CLOSE
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
