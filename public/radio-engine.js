/* NC Zoning Academy: NC Radio engine (procedural synth + section scheduler).
 *
 * PORTABLE, DOM-FREE, no Progress, no ACADEMY_CONFIG. Owns MUSIC ONLY: UI sound
 * effects are a separate host concern and never live here. All station/track data
 * comes in from the host (radio/stations.js → window.RADIO_STATIONS); the engine
 * holds none of its own.
 *
 *   const radio = NCRadio.create({
 *     stations,                       // RADIO_STATIONS array, dial order (required)
 *     audioContext,                   // host-owned AudioContext, shared with SFX (required for sound)
 *     initialState,                   // { stationIndex, trackIndexByStation, cycle, musicVolume, musicMuted }
 *     autoRotate: true,               // scan the dial at track end (gated with `cycle`)
 *     onStateChange: (state) => {},   // fires on every DISCRETE change (host persists + re-renders)
 *   });
 *
 * Transport (paused) and mute (musicMuted) are INDEPENDENT:
 *   - pause()/play()/toggle() stop/start the sequencer (silence + clock frozen).
 *   - setMusicMuted(bool) rides gain to 0 but keeps the sequencer, clock, and
 *     (host-side) visualizer running.
 * getState() exposes BOTH `paused` and `musicMuted` distinctly, plus the current
 * track's `bpm` for a tempo-locked visualizer, and `trackProgress`/`trackDuration`
 * (runtime-only: poll these; they are NOT emitted through onStateChange).
 *
 * AudioContext is host-owned and injected. The engine NEVER calls ac.resume(); it
 * tolerates a suspended context (schedules nothing until it is running); the host
 * does the first-gesture resume(), then calls setActive(true)/play().
 *
 * Serializable state (what the host should persist to the shard):
 *   { stationIndex, trackIndexByStation, cycle, musicVolume, musicMuted }
 * `paused`, `active`, and track-progress are runtime-only.
 */
(function () {
  'use strict';

  var TRACK_TARGET_SEC = 210; // derived arrangements aim for ~3.5 min (no RNG)

  // Arrangement presets: each track's `form` picks one. An ordered list of section
  // templates; each gates drum rows (k/s/c/h) + melodic voices (pad/bass/lead) and sets
  // an `e` energy multiplier (→ filter cutoff + a dedicated gain). `rep:1` = repeatable
  // middle block; `eTo` = ramp energy across the section; `keepDrums:1` (drift) = never
  // gate the beat.
  var ARR = {
    build: [
      { b:8,  pad:1,bass:0,lead:0, k:0,s:0,c:0,h:0, e:0.5 },
      { b:8,  pad:1,bass:1,lead:0, k:0,s:0,c:0,h:0, e:0.6 },
      { b:16, rep:1, pad:1,bass:1,lead:1, k:1,s:0,c:0,h:1, e:0.8 },
      { b:16, rep:1, pad:1,bass:1,lead:1, k:1,s:1,c:1,h:1, e:1.0 },
      { b:8,  pad:1,bass:0,lead:1, k:0,s:0,c:0,h:1, e:0.6 },
      { b:16, rep:1, pad:1,bass:1,lead:1, k:1,s:1,c:1,h:1, e:1.0 },
      { b:8,  pad:1,bass:0,lead:0, k:0,s:0,c:0,h:0, e:0.4 }
    ],
    groove: [
      { b:4,  pad:1,bass:0,lead:0, k:0,s:0,c:0,h:1, e:0.7 },
      { b:16, rep:1, pad:1,bass:1,lead:1, k:1,s:1,c:0,h:1, e:0.85 },
      { b:16, rep:1, pad:1,bass:1,lead:1, k:1,s:1,c:1,h:1, e:1.0 },
      { b:8,  pad:0,bass:1,lead:1, k:0,s:0,c:1,h:1, e:0.7 },
      { b:16, rep:1, pad:1,bass:1,lead:1, k:1,s:1,c:1,h:1, e:1.0 },
      { b:4,  pad:1,bass:0,lead:0, k:0,s:0,c:0,h:0, e:0.5 }
    ],
    anthem: [
      { b:4,  pad:1,bass:0,lead:0, k:1,s:0,c:0,h:0, e:0.8 },
      { b:16, rep:1, pad:1,bass:1,lead:1, k:1,s:1,c:0,h:1, e:0.85 },
      { b:16, rep:1, pad:1,bass:1,lead:1, k:1,s:1,c:1,h:1, e:1.0 },
      { b:16, rep:1, pad:1,bass:1,lead:1, k:1,s:1,c:1,h:1, e:1.0 },
      { b:16, pad:1,bass:1,lead:1, k:1,s:1,c:1,h:1, e:1.0 },
      { b:4,  pad:1,bass:0,lead:0, k:0,s:0,c:0,h:0, e:0.6 }
    ],
    haze: [
      { b:8,  pad:1,bass:0,lead:1, k:0,s:0,c:0,h:1, e:0.6 },
      { b:16, rep:1, pad:1,bass:1,lead:1, k:1,s:1,c:1,h:1, e:0.8 },
      { b:8,  pad:1,bass:0,lead:1, k:0,s:0,c:0,h:1, e:0.5 },
      { b:16, rep:1, pad:1,bass:1,lead:1, k:1,s:1,c:1,h:1, e:0.8 },
      { b:8,  pad:1,bass:0,lead:0, k:0,s:0,c:0,h:0, e:0.4 }
    ],
    drift: [
      { b:16, keepDrums:1, pad:1,bass:0,lead:0, e:0.3, eTo:0.7 },
      { b:24, rep:1, keepDrums:1, pad:1,bass:1,lead:1, e:0.7 },
      { b:8,  keepDrums:1, pad:1,bass:0,lead:0, e:0.5 },
      { b:24, rep:1, keepDrums:1, pad:1,bass:1,lead:1, e:0.7 },
      { b:16, keepDrums:1, pad:1,bass:0,lead:0, e:0.3 }
    ]
  };

  // Note name (sharps only) -> frequency. Octave 4 = middle. e.g. 'A2', 'C#4'.
  function noteToFreq(n) {
    var A4 = 440, map = { C:-9,'C#':-8,D:-7,'D#':-6,E:-5,F:-4,'F#':-3,G:-2,'G#':-1,A:0,'A#':1,B:2 };
    var m = /^([A-G]#?)(-?\d)$/.exec(n);
    if (!m) return 440;
    var s = map[m[1]] + (parseInt(m[2], 10) - 4) * 12;
    return A4 * Math.pow(2, s / 12);
  }

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function Engine(opts) {
    opts = opts || {};
    this.ac = opts.audioContext || null;
    this.autoRotate = opts.autoRotate !== false;
    this.onStateChange = (typeof opts.onStateChange === 'function') ? opts.onStateChange : function () {};

    // ---- serializable state ----
    var init = opts.initialState || {};
    this.stationIndex = (typeof init.stationIndex === 'number') ? init.stationIndex : 0;
    this.trackIndexByStation = (init.trackIndexByStation && typeof init.trackIndexByStation === 'object') ? Object.assign({}, init.trackIndexByStation) : {};
    this.cycle = (typeof init.cycle === 'boolean') ? init.cycle : true;
    this.musicVolume = (typeof init.musicVolume === 'number') ? clamp01(init.musicVolume) : 0.4;
    this.musicMuted = (typeof init.musicMuted === 'boolean') ? init.musicMuted : false;

    // ---- runtime state (never persisted) ----
    this.paused = false;   // transport
    this.active = false;   // host lifecycle gate (false on boot / logged-out)

    // ---- audio graph / scheduler internals ----
    this.M = null; this.crackle = null; this.timer = null;
    this.trackDur = TRACK_TARGET_SEC; this.pausedElapsed = null;

    // convert station note-names -> frequencies once
    var src = Array.isArray(opts.stations) ? opts.stations : [];
    this.stations = src.map(function (st) {
      return Object.assign({}, st, {
        tracks: (st.tracks || []).map(function (tk) {
          return Object.assign({}, tk, {
            prog: (tk.prog || []).map(function (c) {
              return { bass: noteToFreq(c.bass), pad: (c.pad || []).map(noteToFreq), lead: (c.lead || []).map(noteToFreq) };
            })
          });
        })
      });
    });
    // clamp restored station index into range
    if (this.stations.length) this.stationIndex = ((this.stationIndex % this.stations.length) + this.stations.length) % this.stations.length;
  }

  Engine.prototype._emit = function () { try { this.onStateChange(this.getState()); } catch (e) {} };
  Engine.prototype._running = function () { return !!(this.ac && this.ac.state === 'running'); };

  Engine.prototype._station = function () { return this.stations[this.stationIndex] || this.stations[0] || null; };
  Engine.prototype._trackIdx = function () {
    var st = this._station(); if (!st) return 0;
    var n = (st.tracks || []).length; if (!n) return 0;
    var i = this.trackIndexByStation[this.stationIndex]; if (i == null) i = 0;
    return Math.max(0, Math.min(i | 0, n - 1));
  };
  Engine.prototype._track = function () { var st = this._station(); if (!st) return null; var tks = st.tracks || []; return tks[this._trackIdx()] || tks[0] || null; };
  Engine.prototype._musicTarget = function () { return this.musicMuted ? 0 : 0.42 * this.musicVolume; };

  // ---- graph ----
  Engine.prototype._music = function () {
    var ac = this.ac; if (!ac) return null;
    if (!this.M) {
      var master = ac.createGain(); master.gain.value = 0;
      var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.4;
      var energyGain = ac.createGain(); energyGain.gain.value = 1; master.connect(energyGain); energyGain.connect(lp); lp.connect(ac.destination);
      var delay = ac.createDelay(1.0); delay.delayTime.value = (60 / 70) * 0.75; var fb = ac.createGain(); fb.gain.value = 0.34; var wet = ac.createGain(); wet.gain.value = 0.5;
      delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
      var chorusLFO = ac.createOscillator(); chorusLFO.type = 'sine'; chorusLFO.frequency.value = 5; var chorusDepth = ac.createGain(); chorusDepth.gain.value = 6; chorusLFO.connect(chorusDepth); chorusLFO.start();
      var warbleLFO = ac.createOscillator(); warbleLFO.type = 'sine'; warbleLFO.frequency.value = 0.18; var warbleDepth = ac.createGain(); warbleDepth.gain.value = 9; warbleLFO.connect(warbleDepth); warbleLFO.start();
      this.M = { master: master, lp: lp, energyGain: energyGain, delaySend: delay, chorusDepth: chorusDepth, warbleDepth: warbleDepth, next: 0, step: 0, energy: 1, arr: null, curSec: null, trackStart: null, voices: [] };
    }
    return this.M;
  };

  // ---- transport lifecycle ----
  Engine.prototype._shouldRun = function () { return this.active && !this.paused && this._station(); };
  Engine.prototype._evalRun = function () { if (this._shouldRun()) this._startMusic(); else this._stopMusic(); };

  Engine.prototype._startMusic = function () {
    var ac = this.ac; if (!ac) return; var M = this._music(); if (!M) return; var T = this._track(); if (!T) return;
    if (ac.state !== 'running') return; // host owns resume(); tolerate suspended
    M.lp.frequency.setTargetAtTime(T.cut, ac.currentTime, 0.2);
    M.delaySend.delayTime.setTargetAtTime((60 / T.bpm) * 0.75, ac.currentTime, 0.05);
    M.master.gain.cancelScheduledValues(ac.currentTime);
    M.master.gain.setTargetAtTime(this._musicTarget(), ac.currentTime, 1.1);
    if (this.timer) return;
    this._startCrackle(T.crackle);
    M.next = ac.currentTime + 0.15; M.step = 0; M.voices = M.voices || [];
    if (this.pausedElapsed != null && this.trackDur) { M.trackStart = ac.currentTime - this.pausedElapsed; this.pausedElapsed = null; if (!M.arr) this._buildArr(); }
    else { M.trackStart = ac.currentTime; M.curSec = null; this._buildArr(); }
    var self = this; this.timer = setInterval(function () { self._scheduleMusic(); }, 30);
  };
  Engine.prototype._stopMusic = function () {
    var ac = this.ac, M = this.M;
    if (ac && M) { if (M.trackStart != null) this.pausedElapsed = ac.currentTime - M.trackStart; M.master.gain.cancelScheduledValues(ac.currentTime); M.master.gain.setTargetAtTime(0.0001, ac.currentTime, 0.5); }
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this._stopCrackle();
  };
  Engine.prototype._applyMusicGain = function (tc) {
    var ac = this.ac, M = this.M;
    if (ac && M && this.timer) { M.master.gain.cancelScheduledValues(ac.currentTime); M.master.gain.setTargetAtTime(Math.max(0.0001, this._musicTarget()), ac.currentTime, tc || 0.08); }
  };

  // Retune the live graph to the current track's cut/echo/crackle. fast=snap for manual change.
  Engine.prototype._retune = function (fast) {
    var ac = this.ac, M = this.M; if (!ac || !M) return; var T = this._track(); if (!T) return;
    M.lp.frequency.setTargetAtTime(T.cut * (M.energy || 1), ac.currentTime, fast ? 0.03 : 0.25);
    M.delaySend.delayTime.setTargetAtTime((60 / T.bpm) * 0.75, ac.currentTime, fast ? 0.03 : 0.12);
    this._setCrackle(T.crackle);
  };

  // ---- section scheduler ----
  Engine.prototype._buildArr = function () {
    var M = this.M; if (!M) return; var T = this._track(); if (!T) { this.trackDur = TRACK_TARGET_SEC; return; }
    var preset = ARR[T.form] || ARR.build; var beat = 60 / T.bpm, barSec = beat * 4;
    var fixedBars = 0, repBars = 0; preset.forEach(function (p) { if (p.rep) repBars += p.b; else fixedBars += p.b; });
    var targetBars = TRACK_TARGET_SEC / barSec; var R = 1; if (repBars > 0) { R = Math.round((targetBars - fixedBars) / repBars); R = Math.max(1, Math.min(8, R)); }
    var sections = []; var bar = 0;
    preset.forEach(function (p) {
      var times = p.rep ? R : 1;
      for (var r = 0; r < times; r++) {
        var bars = p.b;
        sections.push({ startBar: bar, bars: bars, endBar: bar + bars, voices: { pad: !!p.pad, bass: !!p.bass, lead: !!p.lead }, drums: { k: !!p.k, s: !!p.s, c: !!p.c, h: !!p.h }, keepDrums: !!p.keepDrums, e: p.e, eTo: (p.eTo != null ? p.eTo : null) });
        bar += bars;
      }
    });
    M.arr = { sections: sections, totalBars: bar, beat: beat, barSec: barSec }; this.trackDur = bar * barSec;
  };
  Engine.prototype._sectionAt = function (arr, bar) { var S = arr.sections; for (var i = 0; i < S.length; i++) { if (bar < S[i].endBar) return S[i]; } return S[S.length - 1]; };
  Engine.prototype._energyAt = function (sec, bar) { if (sec.eTo != null) { var p = Math.max(0, Math.min(1, (bar - sec.startBar) / Math.max(1, sec.bars - 1))); return sec.e + (sec.eTo - sec.e) * p; } return sec.e; };
  Engine.prototype._applyEnergy = function (e, t, barSec) { var M = this.M, T = this._track(); if (!M || !T) return; M.energy = e; var tc = Math.max(0.15, barSec * 0.5); M.lp.frequency.setTargetAtTime(Math.max(200, T.cut * e), t, tc); if (M.energyGain) M.energyGain.gain.setTargetAtTime(e, t, tc); };
  Engine.prototype._killVoices = function () { var ac = this.ac, M = this.M; if (!ac || !M || !M.voices) return; var t = ac.currentTime; M.voices.forEach(function (v) { try { v.gain.cancelScheduledValues(t); v.gain.setTargetAtTime(0.0001, t, 0.02); } catch (e) {} }); M.voices = []; };
  // Restart the sequencer on a fresh downbeat now: instant, no-crossfade track change.
  Engine.prototype._restartSeq = function () { var ac = this.ac, M = this.M; this.pausedElapsed = null; if (ac && M) { this._killVoices(); M.step = 0; M.curSec = null; this._buildArr(); if (this.timer) M.next = ac.currentTime + 0.04; M.trackStart = ac.currentTime; } };

  // ---- dial navigation (instant, no-crossfade) ----
  Engine.prototype._swapTrack = function (i) { this.trackIndexByStation[this.stationIndex] = i; this._retune(true); this._restartSeq(); this._emit(); };
  Engine.prototype._swapStation = function (i, t) { this.stationIndex = i; this.trackIndexByStation[i] = t; this._retune(true); this._restartSeq(); this._emit(); };
  // Auto-rotate scans the whole dial: track end → next track, off the last track → next station, wrapping.
  Engine.prototype._autoAdvance = function () {
    var stns = this.stations; if (!stns.length) return;
    var si = this.stationIndex, ti = this._trackIdx() + 1; var cur = stns[si] || stns[0]; var nt = (cur.tracks || []).length;
    if (ti >= nt) { ti = 0; si = (si + 1) % stns.length; }
    if (si === this.stationIndex) this._swapTrack(ti); else this._swapStation(si, ti);
  };

  // ---- sequencer ----
  Engine.prototype._scheduleMusic = function () {
    var ac = this.ac, M = this.M; if (!ac || !M) return; var T = this._track(); if (!T) return; var arr = M.arr; if (!arr) return;
    var beat = arr.beat, six = beat / 4, barSec = arr.barSec;
    while (M.next < ac.currentTime + 0.15) {
      var stepIdx = Math.max(0, Math.round((M.next - M.trackStart) / six));
      var absBar = Math.floor(stepIdx / 16), sInBar = stepIdx % 16;
      if (absBar >= arr.totalBars) { if (this.autoRotate && this.cycle) { this._autoAdvance(); return; } M.trackStart = M.next; continue; }
      if (sInBar === 0) { var sec = this._sectionAt(arr, absBar); this._applyEnergy(this._energyAt(sec, absBar), M.next, barSec); M.curSec = sec; }
      this._playStep(sInBar, M.next, beat, absBar, M.curSec || this._sectionAt(arr, absBar));
      M.next += six;
    }
    if (M.voices && M.voices.length > 64) M.voices = M.voices.filter(function (v) { return v.end > ac.currentTime; });
  };
  Engine.prototype._playStep = function (step, t, spb, absBar, sec) {
    var T = this._track(); var prog = T.prog; var bar = (absBar != null ? absBar : Math.floor(step / 16)) % 4; var s = step % 16; var ch = prog[bar] || prog[0]; var six = spb / 4;
    var V = (sec && sec.voices) || { pad: 1, bass: 1, lead: 1 }; var D = (sec && sec.drums) || { k: 1, s: 1, c: 1, h: 1 }; var keepD = !!(sec && sec.keepDrums);
    var tt = t + ((s % 2 === 1) ? (T.swing || 0) * six : 0);
    if (V.pad) { if (T.pad === 'stab') { if (s === 0 || s === 8) this._pad(ch.pad, tt, spb * 1.5, 'stab'); } else if (T.pad !== 'none' && s === 0) { this._pad(ch.pad, t, spb * 4, T.pad); } }
    if (V.bass) {
      var r = ch.bass, bm = T.bass;
      if (bm === 'sustain' || bm === 'deep') { if (s === 0 || s === 8) this._bass(r, tt, spb * 2.0, bm); }
      else if (bm === 'root8') { if (s % 2 === 0) this._bass(r, t, spb * 0.42, bm); }
      else if (bm === 'eighths') { if (s % 2 === 0) this._bass((s % 4 === 0) ? r : r * 2, tt, spb * 0.5, bm); }
      else if (bm === 'funk') { var fk = { 0: r, 3: r, 6: r * 2, 7: r, 10: r, 11: r * 1.5, 14: r * 2 }; if (fk[s]) this._bass(fk[s], tt, spb * 0.38, bm); }
    }
    if ((keepD || D.k) && T.kick.indexOf(s) >= 0) this._kick(t, T.style);
    if ((keepD || D.s) && T.snare.indexOf(s) >= 0) this._snare(t, T.style);
    if ((keepD || D.c) && T.clap && T.clap.indexOf(s) >= 0) this._clap(t);
    if ((keepD || D.h) && T.hat.indexOf(s) >= 0) this._hat(tt, T.style);
    if (V.lead) {
      var L = ch.lead, lm = T.lead;
      if (lm === 'arp') { if (s % 2 === 0) this._lead(L[(s / 2) % L.length], tt, 'arp'); }
      else if (lm === 'sparse') { if (s === 0) this._lead(L[0], tt, 'sparse'); else if (s === 6) this._lead(L[2 % L.length], tt, 'sparse'); else if (s === 11) this._lead(L[1 % L.length], tt, 'sparse'); }
      else if (lm === 'penta') { var rp = { 0: 0, 2: 1, 3: 2, 6: 1, 8: 3, 11: 2, 14: 0 }; if (rp[s] != null) this._lead(L[rp[s] % L.length], t, 'penta'); }
      else if (lm === 'bell') { if (s === 0) this._lead(L[0], tt, 'bell'); else if (s === 8) this._lead(L[2 % L.length], tt, 'bell'); }
    }
  };

  // ---- voices (verbatim synthesis; `ac`/`M` are the injected context + graph) ----
  Engine.prototype._pad = function (freqs, t, dur, mode) { var ac = this.ac, M = this.M; if (!ac || !M || mode === 'none') return; var cfg = ({ gated: { atk: 0.5, peak: 0.040, det: 11 }, wash: { atk: 1.3, peak: 0.050, det: 18 }, stab: { atk: 0.006, peak: 0.055, det: 8 }, power: { atk: 0.04, peak: 0.060, det: 5 } })[mode] || { atk: 0.5, peak: 0.040, det: 11 }; var sEnd = t + Math.max(cfg.atk + 0.02, dur * (mode === 'stab' ? 0.3 : 0.5)); freqs.forEach(function (f) { var o1 = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain(); o1.type = 'sawtooth'; o2.type = 'sawtooth'; o1.frequency.value = f; o2.frequency.value = f; o2.detune.value = cfg.det; M.chorusDepth.connect(o1.detune); M.chorusDepth.connect(o2.detune); M.warbleDepth.connect(o1.detune); M.warbleDepth.connect(o2.detune); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(cfg.peak, t + cfg.atk); g.gain.setValueAtTime(cfg.peak, sEnd); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o1.connect(g); o2.connect(g); g.connect(M.master); if (M.voices) M.voices.push({ gain: g, end: t + dur + 0.2 }); o1.start(t); o2.start(t); o1.stop(t + dur + 0.2); o2.stop(t + dur + 0.2); }); };
  Engine.prototype._bass = function (f, t, dur, mode) { var ac = this.ac, M = this.M; if (!ac || !M) return; var cfg = ({ sustain: { w: 'sawtooth', cut: 440, q: 3, peak: 0.13, atk: 0.04 }, deep: { w: 'sawtooth', cut: 300, q: 2, peak: 0.15, atk: 0.06 }, root8: { w: 'sawtooth', cut: 900, q: 1, peak: 0.12, atk: 0.006 }, eighths: { w: 'triangle', cut: 1200, q: 1, peak: 0.11, atk: 0.008 }, funk: { w: 'sawtooth', cut: 1100, q: 5, peak: 0.13, atk: 0.005 } })[mode] || { w: 'sawtooth', cut: 440, q: 3, peak: 0.13, atk: 0.04 }; var o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain(); o.type = cfg.w; o.frequency.setValueAtTime(f, t); lp.type = 'lowpass'; lp.frequency.value = cfg.cut; lp.Q.value = cfg.q; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(cfg.peak, t + cfg.atk); g.gain.setValueAtTime(cfg.peak, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(lp); lp.connect(g); g.connect(M.master); if (M.voices) M.voices.push({ gain: g, end: t + dur + 0.05 }); o.start(t); o.stop(t + dur + 0.05); };
  Engine.prototype._lead = function (f, t, mode, dur) { var ac = this.ac, M = this.M; if (!ac || !M) return; var cfg = ({ arp: { w: 'sawtooth', cut: 3200, peak: 0.045, d: 0.34 }, sparse: { w: 'triangle', cut: 2600, peak: 0.06, d: 0.9 }, penta: { w: 'square', cut: 4200, peak: 0.05, d: 0.2 }, bell: { w: 'sine', cut: 5200, peak: 0.075, d: 1.7 } })[mode] || { w: 'sawtooth', cut: 3200, peak: 0.045, d: 0.34 }; var d = dur || cfg.d; var o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain(); o.type = cfg.w; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = cfg.cut; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(cfg.peak, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(lp); lp.connect(g); g.connect(M.master); g.connect(M.delaySend); o.start(t); o.stop(t + d + 0.05); };
  Engine.prototype._kick = function (t, style) { var ac = this.ac, M = this.M; if (!ac || !M) return; var hard = (style === 'rock' || style === 'synthpop'); var o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(hard ? 135 : 116, t); o.frequency.exponentialRampToValueAtTime(hard ? 50 : 44, t + (hard ? 0.09 : 0.13)); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(hard ? 0.42 : 0.30, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + (hard ? 0.13 : 0.17)); o.connect(g); g.connect(M.master); o.start(t); o.stop(t + 0.2); };
  Engine.prototype._snare = function (t, style) { var ac = this.ac, M = this.M; if (!ac || !M) return; var bright = (style === 'rock' || style === 'synthpop'); var bpF = bright ? 2300 : (style === 'lofi' ? 1300 : 1900); var peak = style === 'lofi' ? 0.075 : (bright ? 0.13 : 0.11); var dec = style === 'lofi' ? 0.22 : 0.18; var len = Math.floor(ac.sampleRate * (dec + 0.02)); var buf = ac.createBuffer(1, len, ac.sampleRate); var d = buf.getChannelData(0); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2); var src = ac.createBufferSource(); src.buffer = buf; var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = bpF; bp.Q.value = 0.7; var g = ac.createGain(); g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dec); src.connect(bp); bp.connect(g); g.connect(M.master); g.connect(M.delaySend); src.start(t); src.stop(t + dec + 0.04); if (style === 'rock') { var o = ac.createOscillator(), g2 = ac.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(190, t); g2.gain.setValueAtTime(0.05, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); o.connect(g2); g2.connect(M.master); o.start(t); o.stop(t + 0.1); } };
  Engine.prototype._hat = function (t, style) { var ac = this.ac, M = this.M; if (!ac || !M) return; var vol = style === 'rock' ? 0.045 : (style === 'lofi' ? 0.020 : 0.03); var len = Math.floor(ac.sampleRate * 0.04); var buf = ac.createBuffer(1, len, ac.sampleRate); var d = buf.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; var src = ac.createBufferSource(); src.buffer = buf; var hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7500; var g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04); src.connect(hp); hp.connect(g); g.connect(M.master); src.start(t); src.stop(t + 0.06); };
  Engine.prototype._clap = function (t) { var ac = this.ac, M = this.M; if (!ac || !M) return; [0, 0.009, 0.019].forEach(function (off, i) { var len = Math.floor(ac.sampleRate * 0.07); var buf = ac.createBuffer(1, len, ac.sampleRate); var d = buf.getChannelData(0); for (var j = 0; j < len; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / len, 1.4); var src = ac.createBufferSource(); src.buffer = buf; var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1650; bp.Q.value = 0.9; var g = ac.createGain(); var v = i < 2 ? 0.045 : 0.085; g.gain.setValueAtTime(v, t + off); g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.1); src.connect(bp); bp.connect(g); g.connect(M.master); g.connect(M.delaySend); src.start(t + off); src.stop(t + off + 0.12); }); };
  Engine.prototype._startCrackle = function (level) { var ac = this.ac, M = this.M; if (!ac || !M || this.crackle) return; var len = Math.floor(ac.sampleRate * 2); var buf = ac.createBuffer(1, len, ac.sampleRate); var d = buf.getChannelData(0); for (var i = 0; i < len; i++) { d[i] = (Math.random() < 0.008) ? (Math.random() * 2 - 1) : 0; } var src = ac.createBufferSource(); src.buffer = buf; src.loop = true; var hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400; var g = ac.createGain(); g.gain.value = 0.05 * (level == null ? 1 : level); src.connect(hp); hp.connect(g); g.connect(M.master); src.start(); this.crackle = { src: src, gain: g }; };
  Engine.prototype._setCrackle = function (level) { var ac = this.ac; if (ac && this.crackle) { this.crackle.gain.gain.setTargetAtTime(0.05 * (level == null ? 1 : level), ac.currentTime, 0.2); } };
  Engine.prototype._stopCrackle = function () { if (this.crackle) { try { this.crackle.src.stop(); } catch (e) {} this.crackle = null; } };

  // ===== PUBLIC API =====
  Engine.prototype.play = function () { if (!this.paused) { this._evalRun(); return; } this.paused = false; this._evalRun(); this._emit(); };
  Engine.prototype.pause = function () { if (this.paused) return; this.paused = true; this._evalRun(); this._emit(); };
  Engine.prototype.toggle = function () { this.paused = !this.paused; this._evalRun(); this._emit(); };
  // Host lifecycle: music runs only while active (e.g. false on the boot/login screen).
  // Always re-evaluates: a gesture may re-poke after the context finally resumes.
  Engine.prototype.setActive = function (on) { this.active = !!on; this._evalRun(); };
  // Restore the serializable subset (login resume / slotted shard). Instant, no crossfade.
  Engine.prototype.restore = function (s) {
    if (!s || typeof s !== 'object') return;
    if (typeof s.stationIndex === 'number' && this.stations.length) this.stationIndex = ((s.stationIndex % this.stations.length) + this.stations.length) % this.stations.length;
    if (s.trackIndexByStation && typeof s.trackIndexByStation === 'object') this.trackIndexByStation = Object.assign({}, s.trackIndexByStation);
    if (typeof s.cycle === 'boolean') this.cycle = s.cycle;
    if (typeof s.musicVolume === 'number') this.musicVolume = clamp01(s.musicVolume);
    if (typeof s.musicMuted === 'boolean') this.musicMuted = s.musicMuted;
    this._retune(true); this._restartSeq(); this._applyMusicGain(0.1); this._emit();
  };
  Engine.prototype.next = function () { var st = this._station(); if (!st) return; var n = (st.tracks || []).length; if (n <= 1) return; this._swapTrack(((this._trackIdx() + 1) % n + n) % n); };
  Engine.prototype.prev = function () { var st = this._station(); if (!st) return; var n = (st.tracks || []).length; if (n <= 1) return; this._swapTrack(((this._trackIdx() - 1) % n + n) % n); };
  Engine.prototype.selectStation = function (idx) { var stns = this.stations; if (!stns.length) return; var n = stns.length; var i = ((idx % n) + n) % n; if (i === this.stationIndex) return; var tks = stns[i].tracks || []; var saved = (this.trackIndexByStation[i] != null) ? this.trackIndexByStation[i] : 0; this._swapStation(i, Math.max(0, Math.min(saved, tks.length - 1))); };
  Engine.prototype.setCycle = function (on) { on = !!on; if (this.cycle === on) return; this.cycle = on; this._emit(); };
  Engine.prototype.toggleCycle = function () { this.cycle = !this.cycle; this._emit(); };
  Engine.prototype.setMusicVolume = function (v) { this.musicVolume = clamp01(v); this._applyMusicGain(0.08); this._emit(); };
  Engine.prototype.setMusicMuted = function (m) { m = !!m; if (this.musicMuted === m) return; this.musicMuted = m; this._applyMusicGain(0.15); this._emit(); };
  Engine.prototype.toggleMusicMuted = function () { this.setMusicMuted(!this.musicMuted); };

  // Continuous runtime values (poll these; NOT emitted through onStateChange).
  Engine.prototype.getState = function () {
    var st = this._station(); var T = this._track(); var ac = this.ac, M = this.M;
    var elapsed = 0; if (ac && M && this.trackDur && this.timer && M.trackStart != null) elapsed = Math.max(0, ac.currentTime - M.trackStart);
    var prog = this.trackDur ? clamp01(elapsed / this.trackDur) : 0;
    return {
      // serializable
      stationIndex: this.stationIndex,
      trackIndexByStation: Object.assign({}, this.trackIndexByStation),
      cycle: this.cycle,
      musicVolume: this.musicVolume,
      musicMuted: this.musicMuted,
      // runtime
      paused: this.paused,
      active: this.active,
      playing: !!this.timer,
      // derived / convenience
      trackIndex: this._trackIdx(),
      stationCount: this.stations.length,
      trackCount: st ? (st.tracks || []).length : 0,
      station: st ? { id: st.id, name: st.name, freq: st.freq, genre: st.genre } : null,
      track: T ? { title: T.title, genre: T.genre, bpm: T.bpm } : null,
      bpm: T ? T.bpm : null,
      trackProgress: prog,
      trackElapsed: elapsed,
      trackDuration: this.trackDur,
      ready: this.stations.length > 0
    };
  };

  Engine.prototype.destroy = function () { this._stopMusic(); this.M = null; };

  window.NCRadio = { create: function (opts) { return new Engine(opts); } };
  // Production-site alias (window.NCZ layering); harmless in the prototype.
  if (typeof window.NCZ === 'object' && window.NCZ) window.NCZ.Radio = window.NCRadio;
})();
