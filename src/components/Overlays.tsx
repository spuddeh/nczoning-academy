// Economy overlays: eddies flyers (award deltas flying to the balance box)
// and the module-completion TRANSFER sequence. Timings measured from the
// monolith (docs/monolith-parity-spec.md — "Economy + ledger").
export interface Flyer {
  id: number;
  txt: string;
  color: string;
  fx: number; fy: number; // from (source centre)
  tx: number; ty: number; // to (balance box centre)
  moved: boolean;
}

export interface TransferState {
  phase: 'transferring' | 'transfer';
  progress: number;
  amount: number;
  display: number;
}

export function FlyerLayer({ flyers }: { flyers: Flyer[] }) {
  return (
    <>
      {flyers.map((f) => {
        const x = f.moved ? f.tx : f.fx;
        const y = f.moved ? f.ty : f.fy;
        return (
          <div
            key={f.id}
            className="eddies-flyer"
            style={{
              transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${f.moved ? 0.65 : 1})`,
              opacity: f.moved ? 0.75 : 1,
              color: f.color,
              textShadow: `0 0 14px ${f.color}`,
            }}
          >
            {f.txt}
          </div>
        );
      })}
    </>
  );
}

export function TransferOverlay({ t, symbol }: { t: TransferState | null; symbol: string }) {
  if (!t) return null;
  return (
    <div className="transfer-overlay">
      <div className={`transfer-box${t.phase === 'transfer' ? ' done' : ''}`}>
        {t.phase === 'transferring' ? (
          <div className="transfer-pad">
            <div className="transfer-warn-row">
              <span className="transfer-warn-glyph ledblink">⚠</span>
              <span className="transfer-warn-text">TRANSFERRING FUNDS...</span>
            </div>
            <div className="transfer-bar">
              <div className="transfer-bar-fill" style={{ width: `${t.progress}%` }} />
            </div>
            <div className="transfer-caption">CURRENT PROGRESS {t.progress} %</div>
          </div>
        ) : (
          <div className="transfer-pad">
            <div className="transfer-amt">TRANSFER&nbsp;&nbsp; {symbol} {t.amount}</div>
            <div className="transfer-rule" />
            <div className="transfer-bal-label">ACCOUNT BALANCE</div>
            <div className="transfer-bal">{symbol} {t.display}</div>
          </div>
        )}
      </div>
    </div>
  );
}
