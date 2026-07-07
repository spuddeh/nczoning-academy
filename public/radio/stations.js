/* NC RADIO — station data (procedural synth engine reads this).
 *
 * window.RADIO_STATIONS is the full dial. Array order == dial order.
 * The engine converts each prog chord's note-names -> frequencies at load time
 * via its own note parser (sharps only, e.g. 'A2', 'C#4'; octave 4 = middle).
 *
 * Canonical source of truth for the stations. Validated by
 * scripts/validate-radio.mjs against schema/radio-station.schema.json.
 * `id` is a stable slug used for validation/reference; the engine ignores it.
 *
 * Field names are EXACTLY what the engine reads — do not rename:
 *   id      stable slug (validation/reference only; engine ignores it)
 *   name    station display name
 *   freq    dial frequency label (string, shown in the UI; not the audio pitch)
 *   genre   genre label shown under the station name
 *   bpm     tempo — drives the 16-step scheduler and echo time
 *   cut     lowpass filter cutoff in Hz (brightness/haze)
 *   swing   0..1 — how late odd 16th-notes are nudged (shuffle feel)
 *   crackle vinyl/tape crackle intensity (relative; may exceed 1)
 *   kick / snare / clap / hat  — 16-step trigger patterns (step indices 0..15)
 *   bass    bass mode flag:  'sustain' | 'deep' | 'root8' | 'eighths' | 'funk'
 *   lead    lead mode flag:  'arp' | 'sparse' | 'penta' | 'bell'
 *   pad     pad mode flag:   'gated' | 'stab' | 'wash' | 'power' | 'none'
 *   style   drum-voicing flag passed to kick/snare/hat synths:
 *           'synth' | 'lofi' | 'synthpop' | 'rock' | 'vapor' | 'citypop' | 'ambient'
 *   prog    4-bar chord progression; each bar is { bass, pad, lead } where
 *           bass = one note-name, pad = chord note-names, lead = melody note-names
 */
window.RADIO_STATIONS = [
  // 1 · SYNTHWAVE — driving eighth-note arp, gated pad, four-square backbeat.
  { id:'night-city-fm', name:'NIGHT CITY FM', freq:'101.9', genre:'SYNTHWAVE', bpm:70, cut:2600, swing:0, crackle:0.7,
    kick:[0,8], snare:[4,12], clap:[], hat:[2,6,10,14], bass:'sustain', lead:'arp', pad:'gated', style:'synth', prog:[
    { bass:'A2', pad:['A3','C4','E4','G4'], lead:['A4','C5','E5','C5'] },
    { bass:'F2', pad:['F3','A3','C4','E4'], lead:['F4','A4','C5','A4'] },
    { bass:'C3', pad:['C4','E4','G4','B4'], lead:['C5','E5','G5','E5'] },
    { bass:'G2', pad:['G3','B3','D4','F4'], lead:['G4','B4','D5','B4'] } ] },

  // 2 · LO-FI HIP HOP — swung boom-bap, dusty jazz 9th stabs, sparse melody, heavy vinyl.
  { id:'dusk-memory', name:'DUSK MEMORY', freq:'89.1', genre:'LO-FI HIP HOP', bpm:74, cut:1900, swing:0.55, crackle:1.6,
    kick:[0,7,10], snare:[4,12], clap:[], hat:[2,6,10,14], bass:'sustain', lead:'sparse', pad:'stab', style:'lofi', prog:[
    { bass:'F2', pad:['A3','C4','E4','G4'], lead:['C5','E5','G5','A5'] },
    { bass:'D2', pad:['F3','A3','C4','E4'], lead:['A4','C5','E5','F5'] },
    { bass:'G2', pad:['B3','D4','F4','A4'], lead:['D5','F5','A5','B5'] },
    { bass:'C3', pad:['E4','G4','B4','D5'], lead:['G5','B5','D5','E5'] } ] },

  // 3 · SYNTHPOP — bright major, four-on-the-floor kick, claps, bouncy octave bass.
  { id:'galleria', name:'GALLERIA', freq:'106.7', genre:'SYNTHPOP', bpm:112, cut:3400, swing:0, crackle:0.5,
    kick:[0,4,8,12], snare:[4,12], clap:[4,12], hat:[2,6,10,14], bass:'eighths', lead:'arp', pad:'stab', style:'synthpop', prog:[
    { bass:'C3', pad:['C4','E4','G4','B4'], lead:['C5','E5','G5','E5'] },
    { bass:'G2', pad:['G3','B3','D4','F#4'], lead:['G4','B4','D5','B4'] },
    { bass:'A2', pad:['A3','C4','E4','G4'], lead:['A4','C5','E5','C5'] },
    { bass:'F2', pad:['F3','A3','C4','E4'], lead:['F4','A4','C5','A4'] } ] },

  // 4 · 80s ROCK — power chords, palm-mute eighth bass, hard backbeat, pentatonic riff.
  { id:'badlands-fm', name:'BADLANDS FM', freq:'95.8', genre:'80s ROCK', bpm:120, cut:4200, swing:0, crackle:0.4,
    kick:[0,6,8,14], snare:[4,12], clap:[], hat:[0,2,4,6,8,10,12,14], bass:'root8', lead:'penta', pad:'power', style:'rock', prog:[
    { bass:'E2', pad:['E3','B3','E4'], lead:['E4','G4','A4','B4'] },
    { bass:'C3', pad:['C3','G3','C4'], lead:['C4','E4','G4','A4'] },
    { bass:'G2', pad:['G2','D3','G3'], lead:['G4','B4','D5','B4'] },
    { bass:'D3', pad:['D3','A3','D4'], lead:['D4','F#4','A4','D5'] } ] },

  // 5 · VAPORWAVE — half-time crawl, huge detuned wash, slow pitch-bent melody, deep bass.
  { id:'mall-soft', name:'MALL SOFT', freq:'99.5', genre:'VAPORWAVE', bpm:56, cut:1600, swing:0, crackle:1.3,
    kick:[0], snare:[8], clap:[], hat:[], bass:'deep', lead:'sparse', pad:'wash', style:'vapor', prog:[
    { bass:'D#2', pad:['D#3','G3','A#3','D4'], lead:['A#4','D5','F5','D5'] },
    { bass:'C2', pad:['C3','D#3','G3','A#3'], lead:['G4','A#4','D5','A#4'] },
    { bass:'G#2', pad:['G#3','C4','D#4','G4'], lead:['D#5','G5','A#5','G5'] },
    { bass:'A#2', pad:['A#3','D4','F4','A4'], lead:['F5','A5','C5','A5'] } ] },

  // 6 · CITY POP / FUNK — smooth maj9, syncopated funk bass, tight offbeat hats.
  { id:'pacifica-gold', name:'PACIFICA GOLD', freq:'104.2', genre:'CITY POP', bpm:100, cut:3200, swing:0.12, crackle:0.5,
    kick:[0,8], snare:[4,12], clap:[], hat:[2,6,10,14], bass:'funk', lead:'sparse', pad:'stab', style:'citypop', prog:[
    { bass:'A2', pad:['C#4','E4','G#4','B4'], lead:['E5','G#5','B5','A5'] },
    { bass:'F#2', pad:['A3','C#4','E4','G#4'], lead:['C#5','E5','G#5','F#5'] },
    { bass:'D2', pad:['F#3','A3','C#4','E4'], lead:['A4','C#5','E5','D5'] },
    { bass:'E2', pad:['G#3','B3','D4','F#4'], lead:['B4','D5','F#5','E5'] } ] },

  // 7 · AMBIENT / DOWNTEMPO — beatless, evolving pads, sparse bell tones, deep reverb-y space.
  { id:'neon-rain', name:'NEON RAIN', freq:'88.3', genre:'AMBIENT', bpm:62, cut:2000, swing:0, crackle:0.8,
    kick:[], snare:[], clap:[], hat:[], bass:'deep', lead:'bell', pad:'wash', style:'ambient', prog:[
    { bass:'A2', pad:['A3','E4','B4','C#5'], lead:['E5','B4','C#5','A4'] },
    { bass:'F#2', pad:['F#3','C#4','G#4','A4'], lead:['C#5','G#4','A4','F#4'] },
    { bass:'D2', pad:['D3','A3','E4','F#4'], lead:['A4','E5','F#4','D5'] },
    { bass:'E2', pad:['E3','B3','F#4','G#4'], lead:['B4','F#4','G#4','E4'] } ]}
];
