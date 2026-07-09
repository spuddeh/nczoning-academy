// Shared overlay-modal shell (glossary + transaction history): dimmed
// blurred scrim (click closes), accent-bordered box (clicks stop), solid
// accent title bar with an [ ESC ] CLOSE button. Escape handling lives in
// App so it works while focus is in a modal input.
// Measured spec: docs/monolith-parity-spec.md — "Overlay modals".
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
            <span>{title}</span>
            <span className="modal-title-sub">{sub}</span>
          </div>
          <button type="button" className="modal-close" aria-label={closeLabel} onClick={onClose}>
            [ ESC ] CLOSE
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
