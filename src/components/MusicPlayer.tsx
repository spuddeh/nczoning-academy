// NC Radio — collapsed pill and expanded panel (monolith renderMusicPlayer).
// The host (App) owns the engine and all state; this renders it and forwards
// intents. Measured spec: docs/monolith-parity-spec.md — "Radio panel".
import { useEffect, useRef } from 'react';
import { applyMarquee, stations } from '../lib/academy';
import type { Sfx } from '../lib/sfx';

// Mirror of the engine's discrete state (host keeps it via onStateChange).
export interface RadioUiState {
  station: number;
  track: number;
  stationTracks: Record<string, number>;
  cycle: boolean;
  musicVol: number;
  musicMuted: boolean;
  paused: boolean;
}

interface MusicPlayerProps {
  open: boolean;
  st: RadioUiState;
  trackProg: number; // 0..1 fraction (polled while open)
  trackDur: number; // seconds
  sfxMuted: boolean;
  sfxVol: number;
  sfx: Sfx;
  onToggleOpen: () => void;
  onPrev: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  onToggleCycle: () => void;
  onSelectStation: (i: number) => void;
  onMusicVol: (v: number) => void;
  onSfxVol: (v: number) => void;
  onToggleMusic: () => void;
  onToggleMute: () => void;
}

const fmtTime = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// EQ bars beating at the track bpm. Same formula at both sizes (pill 4x16,
// panel 10x32). One animation shorthand per bar — mixing it with longhand
// animation-* props makes React warn on every rerender.
function EqBars({ n, height, beat, playing }: { n: number; height: number; beat: number; playing: boolean }) {
  return (
    <div className="radio-eq" style={{ height }}>
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className="radio-eq-bar"
          style={{
            animation: `eqbar ${(beat * 0.5 * (1 + (i % 4) * 0.28)).toFixed(3)}s ease-in-out ${(i * 0.06).toFixed(2)}s infinite alternate ${playing ? 'running' : 'paused'}`,
            opacity: playing ? 1 : 0.25,
          }}
        />
      ))}
    </div>
  );
}

// Speaker icon: waves when live, X when muted.
function Speaker({ muted }: { muted: boolean }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="currentColor" />
      {muted
        ? <><line x1={23} y1={9} x2={17} y2={15} /><line x1={17} y1={9} x2={23} y2={15} /></>
        : <><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></>}
    </svg>
  );
}

// One volume row: mute button + label, % readout, slider. Right-click
// anywhere on the row resets to the default (with a tick).
function VolRow(props: {
  label: string; value: number; muted: boolean; dflt: number;
  onSet: (v: number) => void; onMute: () => void; sfx: Sfx;
}) {
  const { label, value, muted, dflt, onSet, onMute, sfx } = props;
  return (
    <div
      className="radio-volrow"
      title="Right-click to reset to default"
      onContextMenu={(e) => { e.preventDefault(); onSet(dflt); sfx.play('tick'); }}
    >
      <div className="radio-volhead">
        <div>
          <button className={`radio-volmute${muted ? ' muted' : ''}`} type="button" title={muted ? 'Unmute' : 'Mute'} onClick={onMute}>
            <Speaker muted={muted} />
          </button>
          <span className="radio-vollabel">{label}</span>
        </div>
        <span className={`radio-volval${muted ? ' muted' : ''}`}>{muted ? 'MUTED' : `${Math.round(value * 100)}%`}</span>
      </div>
      <input
        className="radio-volrange"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={muted ? 0 : value}
        disabled={muted}
        onChange={(e) => onSet(parseFloat(e.target.value))}
      />
    </div>
  );
}

export function MusicPlayer({
  open, st, trackProg, trackDur, sfxMuted, sfxVol, sfx,
  onToggleOpen, onPrev, onNext, onTogglePlay, onToggleCycle,
  onSelectStation, onMusicVol, onSfxVol, onToggleMusic, onToggleMute,
}: MusicPlayerProps) {
  const all = stations();
  const station = all[st.station] ?? all[0];
  const tracks = station?.tracks ?? [];
  const track = tracks[st.track] ?? tracks[0];
  const trackRef = useRef<HTMLSpanElement>(null);

  useEffect(() => { if (!open) applyMarquee(trackRef.current); });

  if (!station) return null; // no station data — the radio hides
  const beat = 60 / (track?.bpm ?? 120);
  const playing = !st.paused && !st.musicMuted;
  const dim = st.musicMuted || st.paused;

  // Collapsed: the corner station pill.
  if (!open) {
    return (
      <button
        className={`radio-pill${st.musicMuted ? ' muted' : ''}`}
        type="button"
        title="Open NC Radio"
        onClick={onToggleOpen}
      >
        <EqBars n={4} height={16} beat={beat} playing={playing} />
        <span className="radio-freq">{station.freq}</span>
        <div className="radio-track-window">
          <span className="radio-track" ref={trackRef}>{'♪ '}{track?.title || station.name}</span>
        </div>
      </button>
    );
  }

  // Expanded panel.
  const tcount = tracks.length;
  const tnum = tcount ? (st.track % tcount) + 1 : 0;
  const dur = trackDur || 240;
  const prog = Math.max(0, Math.min(1, trackProg || 0));
  return (
    <div className="radio-panel">
      <div className="radio-panel-titlebar">
        <span>{'♫'} NC RADIO</span>
        <button className="radio-minimize" type="button" title="Minimize" onClick={onToggleOpen}>{'–'}</button>
      </div>
      <div className="radio-panel-body">
        <div className="radio-now">
          <div className="radio-now-top">
            <div>
              <div className={`radio-now-freq${dim ? ' dim' : ''}`}>{station.freq}</div>
              <div className={`radio-now-station${dim ? ' dim' : ''}`}>{station.name}</div>
            </div>
            <EqBars n={10} height={32} beat={beat} playing={playing} />
          </div>
          <div className={`radio-now-title${dim ? ' dim' : ''}`}>{'♪ '}{track?.title ?? ''}</div>
          <div className="radio-now-status">
            {st.paused ? '‖ PAUSED' : st.musicMuted ? '■ MUTED' : `▸ ${station.genre} · ${track?.bpm} BPM`}
          </div>
          <div className="radio-prog">
            <div className="radio-prog-bar">
              <div className={`radio-prog-fill${dim ? ' dim' : ''}`} style={{ width: `${(prog * 100).toFixed(2)}%` }} />
            </div>
            <div className="radio-prog-times">
              <span>{fmtTime(prog * dur)}</span>
              <span>{fmtTime(dur)}</span>
            </div>
          </div>
        </div>
        <div className="radio-transport">
          <button className="radio-tbtn" type="button" onClick={onPrev}>{'⏮'}</button>
          <button className="radio-tbtn big" type="button" onClick={onTogglePlay}>
            {st.paused ? '▶ PLAY' : '⏸ PAUSE'}
          </button>
          <button className="radio-tbtn" type="button" onClick={onNext}>{'⏭'}</button>
        </div>
        <div className="radio-caption">{`TRACK ${tnum} / ${tcount}  ·  ⏮ ⏭ STEP TRACKS`}</div>
        <div className="radio-chips">
          {all.map((stn, i) => (
            <button
              key={i}
              className={`radio-chip${i === st.station ? ' on' : ''}`}
              type="button"
              title={typeof stn.name === 'string' ? stn.name : undefined}
              onClick={() => onSelectStation(i)}
            >
              {stn.freq}
            </button>
          ))}
        </div>
        <button
          className={`radio-cycle${st.cycle ? ' on' : ''}`}
          type="button"
          title={st.cycle ? 'Auto-advancing through this station’s tracks' : 'Holding this track — click to auto-advance tracks'}
          onClick={onToggleCycle}
        >
          {/* no JSX space: the flex gap is the spacing, as in the monolith */}
          <span>{'⟳'}</span>{st.cycle ? 'AUTO-ROTATE · ON' : 'AUTO-ROTATE · OFF'}
        </button>
        <VolRow label="MUSIC" value={st.musicVol} muted={st.musicMuted} dflt={0.4} onSet={onMusicVol} onMute={onToggleMusic} sfx={sfx} />
        <VolRow label="SYSTEM SOUNDS" value={sfxVol} muted={sfxMuted} dflt={0.8} onSet={onSfxVol} onMute={onToggleMute} sfx={sfx} />
      </div>
    </div>
  );
}
