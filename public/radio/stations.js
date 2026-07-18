/* NC RADIO: station data (procedural synth engine reads this).
 *
 * window.RADIO_STATIONS is the full dial. Array order == dial order.
 * v2 is MULTI-TRACK: a station carries identity + dial fields plus a `tracks`
 * array, and the engine rotates through a station's tracks. Each track is one
 * "song": the musical fields the engine plays. The engine converts each prog
 * chord's note-names -> frequencies at load time via its own note parser
 * (sharps only, e.g. 'A2', 'C#4'; octave 4 = middle).
 *
 * Canonical source of truth for the stations. Validated by
 * scripts/validate-radio.mjs against schema/radio-station.schema.json
 * (radio-station/v2). `id` is a stable slug used for validation/reference; the
 * engine ignores it. Tracks are identified by `title` + array index.
 *
 * STATION fields (identity + dial), EXACTLY what the engine reads:
 *   id      stable slug (validation/reference only; engine ignores it)
 *   name    station display name
 *   freq    dial frequency label (string, shown in the UI; not the audio pitch)
 *   genre   family/genre label shown under the station name
 *   tracks  >= 1 track objects; array order = play/rotation order
 *
 * TRACK fields (one song), EXACTLY what the engine reads:
 *   title   thematic track name shown in the UI
 *   form    song-arrangement preset the engine expands into sections
 *           (intro/build/peak/breakdown/outro). The engine owns each preset's
 *           shape; this is the per-track choice. Track LENGTH is derived from
 *           the expanded arrangement + bpm, never authored here.
 *           'drift' | 'build' | 'groove' | 'anthem' | 'haze'
 *   bpm     tempo, drives the 16-step scheduler and echo time
 *   cut     lowpass filter cutoff in Hz (brightness/haze)
 *   swing   0..1, how late odd 16th-notes are nudged (shuffle feel)
 *   crackle vinyl/tape crackle intensity (relative; may exceed 1)
 *   kick / snare / clap / hat  : 16-step trigger patterns (step indices 0..15)
 *   bass    bass mode flag:  'sustain' | 'deep' | 'root8' | 'eighths' | 'funk'
 *   lead    lead mode flag:  'arp' | 'sparse' | 'penta' | 'bell'
 *   pad     pad mode flag:   'gated' | 'stab' | 'wash' | 'power' | 'none'
 *   style   drum-voicing flag passed to kick/snare/hat synths:
 *           'synth' | 'lofi' | 'synthpop' | 'rock' | 'vapor' | 'citypop' | 'ambient'
 *   prog    4-bar chord progression; each bar is { bass, pad, lead } where
 *           bass = one note-name, pad = chord note-names, lead = melody note-names
 */
window.RADIO_STATIONS = [
  // 1 · CHROME HORIZON, retro-future night drive: synthwave, darksynth, italo.
  { id:'chrome-horizon', name:'CHROME HORIZON', freq:'101.9', genre:'SYNTHWAVE // OUTRUN', tracks:[
    // driving eighth-note arp, gated pad, four-square backbeat (slow opener).
    { title:'Chrome Sunset', form:'build', bpm:70, cut:2600, swing:0, crackle:0.7,
      kick:[0,8], snare:[4,12], clap:[], hat:[2,6,10,14], bass:'sustain', lead:'arp', pad:'gated', style:'synth', prog:[
      { bass:'A2', pad:['A3','C4','E4','G4'], lead:['A4','C5','E5','C5'] },
      { bass:'F2', pad:['F3','A3','C4','E4'], lead:['F4','A4','C5','A4'] },
      { bass:'C3', pad:['C4','E4','G4','B4'], lead:['C5','E5','G5','E5'] },
      { bass:'G2', pad:['G3','B3','D4','F4'], lead:['G4','B4','D5','B4'] } ] },
    // darker, faster outrun: four-on-floor drive, minor key, gated pad bite.
    { title:'Blackwall Run', form:'build', bpm:110, cut:2200, swing:0, crackle:0.5,
      kick:[0,4,8,12], snare:[4,12], clap:[], hat:[2,6,10,14], bass:'eighths', lead:'arp', pad:'gated', style:'synth', prog:[
      { bass:'A2', pad:['A3','C4','E4'], lead:['A4','C5','E5','A5'] },
      { bass:'F2', pad:['F3','A3','C4'], lead:['F4','A4','C5','F5'] },
      { bass:'D2', pad:['D3','F3','A3'], lead:['D5','F5','A5','D5'] },
      { bass:'E2', pad:['E3','G#3','B3'], lead:['E5','G#5','B5','E5'] } ] },
    // italo disco: bright four-on-floor, bouncy octave bass, emotive F-major lift.
    { title:'Neon Autobahn', form:'build', bpm:120, cut:3600, swing:0, crackle:0.4,
      kick:[0,4,8,12], snare:[4,12], clap:[4,12], hat:[2,6,10,14], bass:'eighths', lead:'arp', pad:'stab', style:'synthpop', prog:[
      { bass:'D2', pad:['D3','F3','A3'], lead:['D5','F5','A5','D5'] },
      { bass:'A#2', pad:['A#3','D4','F4'], lead:['A#4','D5','F5','A#4'] },
      { bass:'F2', pad:['F3','A3','C4'], lead:['F4','A4','C5','F5'] },
      { bass:'C3', pad:['C4','E4','G4'], lead:['C5','E5','G5','C5'] } ] }
  ] },

  // 2 · KABUKI AFTER DARK, hazy downtempo wander: lo-fi, chillwave, vaporwave.
  { id:'kabuki-after-dark', name:'KABUKI AFTER DARK', freq:'89.1', genre:'LO-FI // HAZE', tracks:[
    // swung boom-bap, dusty jazz 9th stabs, sparse melody, heavy vinyl.
    { title:'Neon Drizzle', form:'haze', bpm:74, cut:1900, swing:0.55, crackle:1.6,
      kick:[0,7,10], snare:[4,12], clap:[], hat:[2,6,10,14], bass:'sustain', lead:'sparse', pad:'stab', style:'lofi', prog:[
      { bass:'F2', pad:['A3','C4','E4','G4'], lead:['C5','E5','G5','A5'] },
      { bass:'D2', pad:['F3','A3','C4','E4'], lead:['A4','C5','E5','F5'] },
      { bass:'G2', pad:['B3','D4','F4','A4'], lead:['D5','F5','A5','B5'] },
      { bass:'C3', pad:['E4','G4','B4','D5'], lead:['G5','B5','D5','E5'] } ] },
    // chillwave: brighter dreamy midpoint, soft dusty beat, big wash pad, bell lead.
    { title:'Faded Signal', form:'haze', bpm:85, cut:2400, swing:0.2, crackle:0.9,
      kick:[0,8], snare:[4,12], clap:[], hat:[2,6,10,14], bass:'sustain', lead:'bell', pad:'wash', style:'lofi', prog:[
      { bass:'C3', pad:['C4','E4','G4','B4'], lead:['E5','G5','B4','C5'] },
      { bass:'A2', pad:['A3','C4','E4','G4'], lead:['C5','E5','A4','G4'] },
      { bass:'F2', pad:['F3','A3','C4','E4'], lead:['A4','C5','F5','E5'] },
      { bass:'G2', pad:['G3','B3','D4','F4'], lead:['B4','D5','G5','F5'] } ] },
    // half-time crawl, huge detuned wash, slow pitch-bent melody, deep bass.
    { title:'Closing Time', form:'drift', bpm:56, cut:1600, swing:0, crackle:1.3,
      kick:[0], snare:[8], clap:[], hat:[], bass:'deep', lead:'sparse', pad:'wash', style:'vapor', prog:[
      { bass:'D#2', pad:['D#3','G3','A#3','D4'], lead:['A#4','D5','F5','D5'] },
      { bass:'C2', pad:['C3','D#3','G3','A#3'], lead:['G4','A#4','D5','A#4'] },
      { bass:'G#2', pad:['G#3','C4','D#4','G4'], lead:['D#5','G5','A#5','G5'] },
      { bass:'A#2', pad:['A#3','D4','F4','A4'], lead:['F5','A5','C5','A5'] } ] }
  ] },

  // 3 · J-TOWN GOLD, bright groove/boogie: city pop, funk boogie, synthpop.
  { id:'j-town-gold', name:'J-TOWN GOLD', freq:'104.2', genre:'CITY POP // FUNK', tracks:[
    // smooth maj9, syncopated funk bass, tight offbeat hats.
    { title:'Gold Coast Cruise', form:'groove', bpm:100, cut:3200, swing:0.12, crackle:0.5,
      kick:[0,8], snare:[4,12], clap:[], hat:[2,6,10,14], bass:'funk', lead:'sparse', pad:'stab', style:'citypop', prog:[
      { bass:'A2', pad:['C#4','E4','G#4','B4'], lead:['E5','G#5','B5','A5'] },
      { bass:'F#2', pad:['A3','C#4','E4','G#4'], lead:['C#5','E5','G#5','F#5'] },
      { bass:'D2', pad:['F#3','A3','C#4','E4'], lead:['A4','C#5','E5','D5'] },
      { bass:'E2', pad:['G#3','B3','D4','F#4'], lead:['B4','D5','F#5','E5'] } ] },
    // boogie/funk: faster four-on-floor disco-funk, syncopated funk bass, bright stabs.
    { title:'Payday Strut', form:'groove', bpm:116, cut:3600, swing:0.08, crackle:0.4,
      kick:[0,4,8,12], snare:[4,12], clap:[4,12], hat:[2,6,10,14], bass:'funk', lead:'arp', pad:'stab', style:'citypop', prog:[
      { bass:'G2', pad:['G3','B3','D4','F#4'], lead:['D5','B4','G5','D5'] },
      { bass:'C3', pad:['C4','E4','G4','B4'], lead:['E5','C5','G5','E5'] },
      { bass:'D3', pad:['D4','F#4','A4','C5'], lead:['F#5','D5','A5','F#5'] },
      { bass:'E2', pad:['E3','G3','B3','D4'], lead:['G5','E5','B4','G5'] } ] },
    // bright major, four-on-the-floor kick, claps, bouncy octave bass.
    { title:'Plaza Lights', form:'groove', bpm:112, cut:3400, swing:0, crackle:0.5,
      kick:[0,4,8,12], snare:[4,12], clap:[4,12], hat:[2,6,10,14], bass:'eighths', lead:'arp', pad:'stab', style:'synthpop', prog:[
      { bass:'C3', pad:['C4','E4','G4','B4'], lead:['C5','E5','G5','E5'] },
      { bass:'G2', pad:['G3','B3','D4','F#4'], lead:['G4','B4','D5','B4'] },
      { bass:'A2', pad:['A3','C4','E4','G4'], lead:['A4','C5','E5','C5'] },
      { bass:'F2', pad:['F3','A3','C4','E4'], lead:['F4','A4','C5','A4'] } ] }
  ] },

  // 4 · NEON RAIN, beatless dreamscape: ambient, dream pop, drone.
  { id:'neon-rain', name:'NEON RAIN', freq:'88.3', genre:'AMBIENT // DREAM', tracks:[
    // beatless, evolving pads, sparse bell tones, deep reverb-y space.
    { title:'Slow Static', form:'drift', bpm:62, cut:2000, swing:0, crackle:0.8,
      kick:[], snare:[], clap:[], hat:[], bass:'deep', lead:'bell', pad:'wash', style:'ambient', prog:[
      { bass:'A2', pad:['A3','E4','B4','C#5'], lead:['E5','B4','C#5','A4'] },
      { bass:'F#2', pad:['F#3','C#4','G#4','A4'], lead:['C#5','G#4','A4','F#4'] },
      { bass:'D2', pad:['D3','A3','E4','F#4'], lead:['A4','E5','F#4','D5'] },
      { bass:'E2', pad:['E3','B3','F#4','G#4'], lead:['B4','F#4','G#4','E4'] } ] },
    // dream pop: soft slow beat, lush major-7 wash, bell melody.
    { title:'Ghost in the Smog', form:'drift', bpm:70, cut:2200, swing:0.1, crackle:0.7,
      kick:[0,10], snare:[8], clap:[], hat:[], bass:'deep', lead:'bell', pad:'wash', style:'vapor', prog:[
      { bass:'D2', pad:['D3','F#3','A3','C#4'], lead:['F#4','A4','D5','C#5'] },
      { bass:'B2', pad:['B3','D4','F#4','A4'], lead:['D5','F#5','B4','A4'] },
      { bass:'G2', pad:['G3','B3','D4','F#4'], lead:['B4','D5','G5','F#5'] },
      { bass:'A2', pad:['A3','C#4','E4','G4'], lead:['C#5','E5','A5','G5'] } ] },
    // drone / space ambient: beatless, very slow, deep and dark, minimal movement.
    { title:'Cryo Sleep', form:'drift', bpm:50, cut:1400, swing:0, crackle:0.5,
      kick:[], snare:[], clap:[], hat:[], bass:'deep', lead:'bell', pad:'wash', style:'ambient', prog:[
      { bass:'C2', pad:['C3','D#3','G3','C4'], lead:['G4','D#4','C5','G4'] },
      { bass:'G#2', pad:['G#3','C4','D#4','G#4'], lead:['D#5','C5','G#4','D#4'] },
      { bass:'D#2', pad:['D#3','G3','A#3','D#4'], lead:['A#4','G4','D#5','A#4'] },
      { bass:'A#2', pad:['A#2','D#3','F3','A#3'], lead:['F4','A#4','D#4','F4'] } ] }
  ] },

  // 5 · BADLANDS FM, Aldecaldo 80s rock: anthem, grit, heartland synth-rock.
  { id:'badlands-fm', name:'BADLANDS FM', freq:'95.8', genre:'80s ROCK', tracks:[
    // power chords, palm-mute eighth bass, hard backbeat, pentatonic riff.
    { title:'Dust Devil', form:'anthem', bpm:120, cut:4200, swing:0, crackle:0.4,
      kick:[0,6,8,14], snare:[4,12], clap:[], hat:[0,2,4,6,8,10,12,14], bass:'root8', lead:'penta', pad:'power', style:'rock', prog:[
      { bass:'E2', pad:['E3','B3','E4'], lead:['E4','G4','A4','B4'] },
      { bass:'C3', pad:['C3','G3','C4'], lead:['C4','E4','G4','A4'] },
      { bass:'G2', pad:['G2','D3','G3'], lead:['G4','B4','D5','B4'] },
      { bass:'D3', pad:['D3','A3','D4'], lead:['D4','F#4','A4','D5'] } ] },
    // rock grit: dirtier and faster, minor pentatonic, all-16ths hats, harder kick.
    { title:'Wraiths on the 580', form:'anthem', bpm:128, cut:4600, swing:0, crackle:0.5,
      kick:[0,4,6,8,12,14], snare:[4,12], clap:[], hat:[0,2,4,6,8,10,12,14], bass:'root8', lead:'penta', pad:'power', style:'rock', prog:[
      { bass:'A2', pad:['A2','E3','A3'], lead:['A4','C5','D5','E5'] },
      { bass:'G2', pad:['G2','D3','G3'], lead:['G4','A4','C5','D5'] },
      { bass:'F2', pad:['F2','C3','F3'], lead:['F4','G4','A4','C5'] },
      { bass:'E2', pad:['E2','B2','E3'], lead:['E4','G4','A4','B4'] } ] },
    // heartland synth-rock: mid-tempo anthem, major key, steady backbeat.
    { title:'Long Haul', form:'anthem', bpm:104, cut:3800, swing:0, crackle:0.4,
      kick:[0,8], snare:[4,12], clap:[], hat:[2,6,10,14], bass:'root8', lead:'penta', pad:'power', style:'rock', prog:[
      { bass:'D2', pad:['D3','A3','D4'], lead:['D4','F#4','A4','D5'] },
      { bass:'A2', pad:['A2','E3','A3'], lead:['A4','C#5','E5','A4'] },
      { bass:'B2', pad:['B2','F#3','B3'], lead:['B4','D5','F#5','D5'] },
      { bass:'G2', pad:['G2','D3','G3'], lead:['G4','B4','D5','G5'] } ] }
  ] }
];
