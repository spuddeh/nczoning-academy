// Operator name prompt for the certificate (z 9999, cyan). Click-outside
// cancels; Enter/Escape are wired on the INPUT (not globally). The value is
// kept RAW while typing (maxLength 42); sanitation happens on confirm.
// Measured spec: docs/monolith-parity-spec.md, "Certificate + name prompt".

interface NamePromptDialogProps {
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function NamePromptDialog({ value, onChange, onConfirm, onCancel }: NamePromptDialogProps) {
  const valid = value.trim().length > 0;
  return (
    <div className="nameprompt-scrim" onClick={onCancel}>
      <div className="nameprompt-box" onClick={(e) => e.stopPropagation()}>
        <div className="nameprompt-titlebar">OPERATOR IDENTIFICATION</div>
        <div className="nameprompt-body">
          <div className="nameprompt-lead">
            &gt; The certificate must be issued in an operator name. Enter the name or callsign to print on the record.
          </div>
          <div className="nameprompt-label">OPERATOR NAME / CALLSIGN</div>
          <input
            className="nameprompt-input"
            autoFocus
            value={value}
            maxLength={42}
            placeholder="e.g. S. DORSETT"
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirm();
              if (e.key === 'Escape') onCancel();
            }}
          />
          <div className="nameprompt-actions">
            <button type="button" className="nameprompt-issue" disabled={!valid} onClick={valid ? onConfirm : undefined}>
              [ ISSUE CERTIFICATE ]
            </button>
            <button type="button" className="nameprompt-cancel" onClick={onCancel}>[ CANCEL ]</button>
          </div>
        </div>
      </div>
    </div>
  );
}
