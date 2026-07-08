// Subtle UI audio — a WebAudio synth with no assets, ported 1:1 from the
// monolith (docs/monolith-parity-spec.md — "Sounds"). Square/saw tones give
// the dry 80s-terminal timbre; filtered white noise gives drive-seek texture.
//
// One instance for the app's lifetime. Gain is scaled by sfxVol and gated on
// muted; the AudioContext resumes lazily on the first user gesture.

export type SfxName =
  | 'tick' | 'nav' | 'ok' | 'err' | 'whoosh'
  | 'chime' | 'access' | 'drive' | 'drivehi';

export class Sfx {
  muted = false;
  sfxVol = 1;
  private ctx: AudioContext | null = null;

  private ac(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** The shared AudioContext (for the radio engine). Created on first use. */
  context(): AudioContext | null { return this.ac(); }

  close(): void { try { void this.ctx?.close(); } catch { /* already closed */ } }

  private tone(f1: number, f2: number, dur: number, type: OscillatorType, vol: number, when = 0, detune = 0): void {
    const ac = this.ac();
    if (!ac || ac.state !== 'running') return;
    const t = ac.currentTime + when;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    if (f2 && f2 !== f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(0.00012, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * this.sfxVol), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.00012, t + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  private noise(dur: number, vol: number, type: BiquadFilterType, f1: number, f2 = 0, when = 0): void {
    const ac = this.ac();
    if (!ac || ac.state !== 'running') return;
    const t = ac.currentTime + when;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const flt = ac.createBiquadFilter();
    flt.type = type;
    flt.frequency.setValueAtTime(f1, t);
    if (f2 && f2 !== f1) flt.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    flt.Q.value = 1.1;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * this.sfxVol), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(ac.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  play(name: SfxName): void {
    if (this.muted || this.sfxVol <= 0) return;
    switch (name) {
      // dry mechanical key
      case 'tick': this.tone(150, 124, 0.026, 'square', 0.03); this.noise(0.016, 0.012, 'highpass', 3200); break;
      // downward select blip
      case 'nav': this.tone(320, 190, 0.07, 'square', 0.045); break;
      // firm two-step terminal ACCEPT (not a happy jingle)
      case 'ok': this.tone(300, 300, 0.05, 'square', 0.05); this.tone(470, 470, 0.075, 'square', 0.045, 0.055, 6); break;
      // harsh denied buzzer
      case 'err': this.tone(94, 70, 0.30, 'sawtooth', 0.06); this.tone(122, 92, 0.30, 'sawtooth', 0.045, 0, 9); this.noise(0.1, 0.02, 'lowpass', 420, 200); break;
      // data spool / tape wind
      case 'whoosh': this.noise(0.34, 0.05, 'bandpass', 1700, 320); this.tone(210, 90, 0.30, 'sawtooth', 0.03); break;
      // low descending 'transfer complete'
      case 'chime': this.tone(196, 196, 0.09, 'square', 0.05); this.tone(262, 262, 0.10, 'square', 0.05, 0.085); this.tone(392, 392, 0.16, 'square', 0.04, 0.19, 7); break;
      // modem handshake / login
      case 'access': this.noise(0.14, 0.03, 'bandpass', 800, 1900); this.tone(160, 320, 0.14, 'square', 0.05, 0.02); this.tone(300, 300, 0.20, 'sawtooth', 0.04, 0.16, 11); break;
      // floppy / HDD head seek
      case 'drive': this.noise(0.09, 0.05, 'bandpass', 1500, 620); this.tone(68, 54, 0.06, 'square', 0.028); break;
      // fine head chatter while reading
      case 'drivehi': this.noise(0.05, 0.028, 'bandpass', 2400, 1300); break;
    }
  }
}

/** A soft tick on any pointer press over a clickable element (capture phase).
 *  Walks up to 6 ancestors looking for a button / role=button / pointer
 *  cursor; `data-nosfx` opts a subtree out. Returns the detach function. */
export function attachPointerTick(sfx: Sfx, root: Document | HTMLElement = document): () => void {
  const onDown = (ev: Event) => {
    try {
      let n = ev.target as HTMLElement | null;
      for (let i = 0; i < 6 && n && n !== document.body; i++) {
        if (n.getAttribute?.('data-nosfx')) return;
        const isBtn = n.tagName === 'BUTTON';
        if (isBtn && (n as HTMLButtonElement).disabled) return;
        if (isBtn || n.getAttribute?.('role') === 'button' || getComputedStyle(n).cursor === 'pointer') {
          sfx.play('tick');
          return;
        }
        n = n.parentElement;
      }
    } catch { /* never let audio break input */ }
  };
  root.addEventListener('pointerdown', onDown, true);
  return () => root.removeEventListener('pointerdown', onDown, true);
}
