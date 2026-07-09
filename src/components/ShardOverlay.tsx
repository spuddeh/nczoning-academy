// Shard reader overlay — one component for both directions: eject (chip
// slides OUT of the reader while the record encodes) and slot (chip slides
// IN while it decodes). Measured spec: docs/monolith-parity-spec.md —
// "exportRecord + renderEject" / "importRecord / slotShard / renderSlot".
// z 9998: under the red confirm dialogs; the radio pill wins by DOM order.

export interface ShardIOState {
  mode: 'eject' | 'slot';
  phase: 'writing' | 'reading' | 'ejected' | 'slotted' | 'error';
  progress: number;
  fname?: string;
  err?: string;
}

export function ShardOverlay({ io }: { io: ShardIOState }) {
  const eject = io.mode === 'eject';
  const settled = io.phase === 'ejected' || io.phase === 'slotted';
  const err = io.phase === 'error';
  const accent = err ? 'red' : settled ? 'green' : 'cyan';
  const title = eject
    ? (err ? 'EJECT FAILED' : settled ? 'SHARD EJECTED' : 'WRITING SERVICE RECORD SHARD...')
    : (settled ? 'RECORD SLOTTED' : 'READING SERVICE RECORD SHARD...');
  // Second reader LED: gold while busy; at rest it dies out on eject (gray,
  // the shard took the data with it) but goes green on slot (record live).
  const led2 = settled ? (eject ? 'gray' : 'green') : 'gold';
  const chipOut = eject ? settled : !settled;
  const chipStyle = {
    transform: `translateX(${chipOut ? 120 : 0}px)`,
    opacity: err ? 0.35 : (!eject && settled) ? 0.95 : 1,
  };

  return (
    <div className="shard-scrim">
      <div className={`shard-box ${accent}`}>
        <div className="shard-hdr">
          <span className={`shard-led${settled || err ? '' : ' ledblink'}`} />
          <span className="shard-hdr-title">{title}</span>
        </div>
        <div className="shard-stage-wrap">
          <div className="shard-stage">
            <div className="shard-reader">
              <div className="shard-lip" />
              <div className="shard-leds">
                <span className={`shard-led-sm${settled || err ? '' : ' ledblink'}`} />
                <span className={`shard-led-sm ${led2}`} />
              </div>
            </div>
            <div className={`shard-chip${settled ? ' settled' : ''}`} style={chipStyle}>
              <div className="shard-chip-body">
                <img src="/assets/shard-icon.svg" width={48} height={23} alt="" />
              </div>
            </div>
          </div>
        </div>
        <div className="shard-footer">
          {!settled && !err ? (
            <div>
              <div className="shard-bar">
                <div className="shard-bar-fill" style={{ width: `${io.progress}%` }} />
              </div>
              {/* the monolith's two source spaces collapse to one when rendered */}
              <div className="shard-bar-caption">
                {eject ? 'ENCODING RECORD' : 'DECODING RECORD'} {io.progress} %
              </div>
            </div>
          ) : (
            <div className={`shard-result${err ? ' err' : ''}`}>
              {err ? `> ${io.err || 'unknown error'}`
                : eject ? `> ${io.fname}`
                : '> RECORD RESTORED TO TERMINAL'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
