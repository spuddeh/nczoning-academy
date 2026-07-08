// Fixed bottom-left telemetry readout. Mirrors the map's model: every 2s roll
// a new sync offset — 85% nominal (0-200ms), 10% elevated (200-800ms),
// 5% critical (800-1800ms). Status text + LED colour follow the tier.
// Deliberately keeps running under prefers-reduced-motion (it's an ambient
// text/opacity readout, not transform motion) so the terminal reads as live.
import { useEffect, useState } from 'react';

type Tier = 'NOMINAL' | 'ELEVATED' | 'CRITICAL';

export function SysReadout() {
  const [offset, setOffset] = useState(88.4);
  const [tier, setTier] = useState<Tier>('NOMINAL');

  useEffect(() => {
    const t = window.setInterval(() => {
      const roll = Math.random();
      let next: number;
      if (roll < 0.85) next = Math.random() * 200;
      else if (roll < 0.95) next = 200 + Math.random() * 600;
      else next = 800 + Math.random() * 1000;
      setOffset(next);
      setTier(next > 800 ? 'CRITICAL' : next > 200 ? 'ELEVATED' : 'NOMINAL');
    }, 2000);
    return () => window.clearInterval(t);
  }, []);

  const tierClass = tier === 'CRITICAL' ? ' critical' : tier === 'ELEVATED' ? ' elevated' : '';
  return (
    <div className={`sys-readout${tierClass}`}>
      <span className="sys-status">[SYSTEM_STATUS: {tier}]</span>
      <span className="sys-led statusled" />
      <span className="sys-offset">SYNC_OFFSET: {offset.toFixed(2)}ms</span>
    </div>
  );
}
