/* NC RADIO — station data (procedural synth engine reads this).
 *
 * window.RADIO_STATIONS is the full dial. Array order == dial order.
 * v2 is MULTI-TRACK: a station carries identity + dial fields plus a `tracks`
 * array, and the engine rotates through a station's tracks. Each track is one
 * "song" — the musical fields the engine plays. The engine converts each prog
 * chord's note-names -> frequencies at load time via its own note parser
 * (sharps only, e.g. 'A2', 'C#4'; octave 4 = middle).
 *
 * Canonical source of truth for the stations. Validated by
 * scripts/validate-radio.mjs against schema/radio-station.schema.json
 * (radio-station/v2). `id` is a stable slug used for validation/reference; the
 * engine ignores it. Tracks are identified by `title` + array index.
 *
 * STATION fields (identity + dial) — EXACTLY what the engine reads:
 *   id      stable slug (validation/reference only; engine ignores it)
 *   name    station display name
 *   freq    dial frequency label (string, shown in the UI; not the audio pitch)
 *   genre   family/genre label shown under the station name
 *   tracks  >= 1 track objects; array order = play/rotation order
 *
 * TRACK fields (one song) — EXACTLY what the engine reads:
 *   title   thematic track name shown in the UI
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
 *
 * Tracks marked "TODO: author" below are placeholders to compose next (judged
 * by ear). Every track present here is a full, valid, playable song.
 */
window.RADIO_STATIONS = [
  // 1 · CHROME HORIZON — retro-future night drive: synthwave, darksynth, italo.
  { id:'chrome-horizon', name:'CHROME HORIZON', freq:'101.9', genre:'SYNTHWAVE // OUTRUN', tracks:[
    // driving eighth-note arp, gated pad, four-square backbeat (slow opener).
    { title:'Chrome Sunset', bpm:70, cut:2600, swing:0, crackle:0.7,
      kick:[0,8], snare:[4,12], clap:[], hat:[2,6,10,14], bass:'sustain', lead:'arp', pad:'gated', style:'synth', prog:[
      { bass:'A2', pad:['A3','C4','E4','G4'], lead:['A4','C5','E5','C5'] },
      { bass:'F2', pad:['F3','A3','C4','E4'], lead:['F4','A4','C5','A4'] },
      { bass:'C3', pad:['C4','E4','G4','B4'], lead:['C5','E5','G5','E5'] },
      { bass:'G2', pad:['G3','B3','D4','F4'], lead:['G4','B4','D5','B4'] } ] }
    // TODO: author 'Blackwall Run' (darksynth/outrun) — darker, faster (~110), minor
    // TODO: author 'Neon Autobahn' (italo disco) — ~120, four-on-floor, bright arp
  ] },

  // 2 · KABUKI AFTER DARK — hazy downtempo wander: lo-fi, chillwave, vaporwave.
  { id:'kabuki-after-dark', name:'KABUKI AFTER DARK', freq:'89.1', genre:'LO-FI // HAZE', tracks:[
    // swung boom-bap, dusty jazz 9th stabs, sparse melody, heavy vinyl.
    { title:'Neon Drizzle', bpm:74, cut:1900, swing:0.55, crackle:1.6,
      kick:[0,7,10], snare:[4,12], clap:[], hat:[2,6,10,14], bass:'sustain', lead:'sparse', pad:'stab', style:'lofi', prog:[
      { bass:'F2', pad:['A3','C4','E4','G4'], lead:['C5','E5','G5','A5'] },
      { bass:'D2', pad:['F3','A3','C4','E4'], lead:['A4','C5','E5','F5'] },
      { bass:'G2', pad:['B3','D4','F4','A4'], lead:['D5','F5','A5','B5'] },
      { bass:'C3', pad:['E4','G4','B4','D5'], lead:['G5','B5','D5','E5'] } ] },
    // TODO: author 'Faded Signal' (chillwave) — ~85, brighter than lo-fi, washed
    // half-time crawl, huge detuned wash, slow pitch-bent melody, deep bass.
    { title:'Closing Time', bpm:56, cut:1600, swing:0, crackle:1.3,
      kick:[0], snare:[8], clap:[], hat:[], bass:'deep', lead:'sparse', pad:'wash', style:'vapor', prog:[
      { bass:'D#2', pad:['D#3','G3','A#3','D4'], lead:['A#4','D5','F5','D5'] },
      { bass:'C2', pad:['C3','D#3','G3','A#3'], lead:['G4','A#4','D5','A#4'] },
      { bass:'G#2', pad:['G#3','C4','D#4','G4'], lead:['D#5','G5','A#5','G5'] },
      { bass:'A#2', pad:['A#3','D4','F4','A4'], lead:['F5','A5','C5','A5'] } ] }
  ] },

  // 3 · J-TOWN GOLD — bright groove/boogie: city pop, funk boogie, synthpop.
  { id:'j-town-gold', name:'J-TOWN GOLD', freq:'104.2', genre:'CITY POP // FUNK', tracks:[
    // smooth maj9, syncopated funk bass, tight offbeat hats.
    { title:'Gold Coast Cruise', bpm:100, cut:3200, swing:0.12, crackle:0.5,
      kick:[0,8], snare:[4,12], clap:[], hat:[2,6,10,14], bass:'funk', lead:'sparse', pad:'stab', style:'citypop', prog:[
      { bass:'A2', pad:['C#4','E4','G#4','B4'], lead:['E5','G#5','B5','A5'] },
      { bass:'F#2', pad:['A3','C#4','E4','G#4'], lead:['C#5','E5','G#5','F#5'] },
      { bass:'D2', pad:['F#3','A3','C#4','E4'], lead:['A4','C#5','E5','D5'] },
      { bass:'E2', pad:['G#3','B3','D4','F#4'], lead:['B4','D5','F#5','E5'] } ] },
    // TODO: author 'Payday Strut' (boogie/funk) — ~116, four-on-floor, brighter, disco
    // bright major, four-on-the-floor kick, claps, bouncy octave bass.
    { title:'Plaza Lights', bpm:112, cut:3400, swing:0, crackle:0.5,
      kick:[0,4,8,12], snare:[4,12], clap:[4,12], hat:[2,6,10,14], bass:'eighths', lead:'arp', pad:'stab', style:'synthpop', prog:[
      { bass:'C3', pad:['C4','E4','G4','B4'], lead:['C5','E5','G5','E5'] },
      { bass:'G2', pad:['G3','B3','D4','F#4'], lead:['G4','B4','D5','B4'] },
      { bass:'A2', pad:['A3','C4','E4','G4'], lead:['A4','C5','E5','C5'] },
      { bass:'F2', pad:['F3','A3','C4','E4'], lead:['F4','A4','C5','A4'] } ] }
  ] },

  // 4 · NEON RAIN — beatless dreamscape: ambient, dream pop, drone.
  { id:'neon-rain', name:'NEON RAIN', freq:'88.3', genre:'AMBIENT // DREAM', tracks:[
    // beatless, evolving pads, sparse bell tones, deep reverb-y space.
    { title:'Slow Static', bpm:62, cut:2000, swing:0, crackle:0.8,
      kick:[], snare:[], clap:[], hat:[], bass:'deep', lead:'bell', pad:'wash', style:'ambient', prog:[
      { bass:'A2', pad:['A3','E4','B4','C#5'], lead:['E5','B4','C#5','A4'] },
      { bass:'F#2', pad:['F#3','C#4','G#4','A4'], lead:['C#5','G#4','A4','F#4'] },
      { bass:'D2', pad:['D3','A3','E4','F#4'], lead:['A4','E5','F#4','D5'] },
      { bass:'E2', pad:['E3','B3','F#4','G#4'], lead:['B4','F#4','G#4','E4'] } ] }
    // TODO: author 'Ghost in the Smog' (dream pop) — ~70, soft beat, washed chords
    // TODO: author 'Cryo Sleep' (drone/space ambient) — beatless, very slow, deep
  ] },

  // 5 · BADLANDS FM — Aldecaldo 80s rock: anthem, grit, heartland synth-rock.
  { id:'badlands-fm', name:'BADLANDS FM', freq:'95.8', genre:'80s ROCK', tracks:[
    // power chords, palm-mute eighth bass, hard backbeat, pentatonic riff.
    { title:'Dust Devil', bpm:120, cut:4200, swing:0, crackle:0.4,
      kick:[0,6,8,14], snare:[4,12], clap:[], hat:[0,2,4,6,8,10,12,14], bass:'root8', lead:'penta', pad:'power', style:'rock', prog:[
      { bass:'E2', pad:['E3','B3','E4'], lead:['E4','G4','A4','B4'] },
      { bass:'C3', pad:['C3','G3','C4'], lead:['C4','E4','G4','A4'] },
      { bass:'G2', pad:['G2','D3','G3'], lead:['G4','B4','D5','B4'] },
      { bass:'D3', pad:['D3','A3','D4'], lead:['D4','F#4','A4','D5'] } ] }
    // TODO: author 'Wraiths on the 580' (rock grit) — dirtier, faster, minor pentatonic
    // TODO: author 'Long Haul' (heartland synth-rock) — mid-tempo, pad + power blend
  ] }
];
