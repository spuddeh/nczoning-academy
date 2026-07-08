// Collapsed NC Radio pill: 4 EQ bars beating at the track's bpm, the station
// frequency, and a bouncing-marquee track name. Opens the radio panel when
// that slice lands. Measured spec: docs/monolith-parity-spec.md — "App shell".
import { useEffect, useRef } from 'react';
import { applyMarquee, stations } from '../lib/academy';

interface RadioPillProps {
  stationIdx: number;
  trackIdx: number;
  playing: boolean;
}

export function RadioPill({ stationIdx, trackIdx, playing }: RadioPillProps) {
  const all = stations();
  const station = all[stationIdx] ?? all[0];
  const tracks = station?.tracks ?? [];
  const track = tracks[trackIdx] ?? tracks[0];
  const trackRef = useRef<HTMLSpanElement>(null);

  useEffect(() => { applyMarquee(trackRef.current); });

  if (!station) return null;
  const beat = 60 / (track?.bpm ?? 120);

  return (
    <button className="radio-pill" type="button" title="Open NC Radio">
      <div className="radio-eq">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="radio-eq-bar"
            style={{
              animation: `eqbar ${(beat * 0.5 * (1 + (i % 4) * 0.28)).toFixed(3)}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.06}s`,
              animationPlayState: playing ? 'running' : 'paused',
              opacity: playing ? 1 : 0.25,
            }}
          />
        ))}
      </div>
      <span className="radio-freq">{station.freq}</span>
      <div className="radio-track-window">
        <span className="radio-track" ref={trackRef}>&#9834; {track?.title ?? ''}</span>
      </div>
    </button>
  );
}
