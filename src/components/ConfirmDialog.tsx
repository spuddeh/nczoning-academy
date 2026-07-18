// Red destructive-action confirm (slot overwrite / purge). Click-outside
// cancels; deliberately NOT Escape-wired (the monolith wires Escape only for
// the glossary and ledger modals). Measured spec:
// docs/monolith-parity-spec.md, "renderSlotConfirm + renderPurgeConfirm".

interface ConfirmDialogProps {
  title: string;
  lead: string;
  detail: string;
  primaryLabel: string;
  onPrimary: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, lead, detail, primaryLabel, onPrimary, onCancel }: ConfirmDialogProps) {
  return (
    <div className="confirm-scrim" onClick={onCancel}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-titlebar">⚠ {title}</div>
        <div className="confirm-body">
          <div className="confirm-lead">{lead}</div>
          <div className="confirm-detail">&gt; {detail}</div>
          <div className="confirm-actions">
            <button type="button" className="confirm-primary" onClick={onPrimary}>[ {primaryLabel} ]</button>
            <button type="button" className="confirm-cancel" onClick={onCancel}>[ CANCEL ]</button>
          </div>
        </div>
      </div>
    </div>
  );
}
