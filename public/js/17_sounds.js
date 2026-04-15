// ===== 8-BIT SOUND ENGINE =====
// Uses the Web Audio API to generate retro chiptune sounds.
// No external files required — everything is synthesized in-browser.

(function () {
  let _audioCtx = null;

  function getAudioCtx() {
    if (!_audioCtx || _audioCtx.state === 'closed') {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (_audioCtx.state === 'suspended') {
      _audioCtx.resume();
    }
    return _audioCtx;
  }

  /**
   * Play a single 8-bit beep note.
   * @param {AudioContext} ctx
   * @param {number} freq  - Frequency in Hz
   * @param {number} start - Start time (ctx.currentTime offset)
   * @param {number} dur   - Duration in seconds
   * @param {number} vol   - Volume 0..1
   * @param {string} type  - OscillatorType: 'square'|'sawtooth'|'triangle'|'sine'
   */
  function playNote(ctx, freq, start, dur, vol = 0.35, type = 'square') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.01);
    gain.gain.setValueAtTime(vol, start + dur - 0.02);
    gain.gain.linearRampToValueAtTime(0, start + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + dur);
  }

  /**
   * Glide between two frequencies (portamento / pitch sweep).
   */
  function playGlide(ctx, freqStart, freqEnd, start, dur, vol = 0.35, type = 'square') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, start);
    osc.frequency.exponentialRampToValueAtTime(freqEnd, start + dur);

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.01);
    gain.gain.setValueAtTime(vol, start + dur - 0.02);
    gain.gain.linearRampToValueAtTime(0, start + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + dur);
  }

  /**
   * Noise burst (for percussive / impact effects).
   */
  function playNoise(ctx, start, dur, vol = 0.15, filterFreq = 2000) {
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(start);
    source.stop(start + dur);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SHINY SOUND — Magical harp-like ascending arpeggio with sparkle finish
  // Evoca ese momento especial al encontrar un Pokémon shiny ✨
  // ─────────────────────────────────────────────────────────────────────────────
  function playShinySound() {
    const ctx = getAudioCtx();
    const t = ctx.currentTime + 0.05;

    // Ascending arpeggio — C major pentatonic (C5 E5 G5 A5 C6)
    const arpNotes = [523.25, 659.25, 783.99, 880.00, 1046.50];
    const arpDur   = 0.11; // each note
    const arpGap   = 0.10; // spacing

    arpNotes.forEach((freq, i) => {
      playNote(ctx, freq, t + i * arpGap, arpDur, 0.28, 'triangle');
    });

    // Second layer: square wave sub-chord slightly offset
    const chordNotes = [523.25, 783.99, 1046.50];
    chordNotes.forEach((freq, i) => {
      playNote(ctx, freq, t + i * arpGap * 0.9 + 0.04, arpDur * 1.3, 0.10, 'square');
    });

    // Glide up sparkle — the "shine" effect
    const sparkleStart = t + arpNotes.length * arpGap + 0.05;
    playGlide(ctx, 880, 2093, sparkleStart, 0.25, 0.18, 'triangle');
    playGlide(ctx, 1046.5, 2637, sparkleStart + 0.08, 0.22, 0.12, 'triangle');

    // Tiny noise burst for the glitter "ping"
    playNoise(ctx, sparkleStart, 0.08, 0.08, 3500);
    playNoise(ctx, sparkleStart + 0.09, 0.08, 0.06, 4500);

    // Final high glitter notes
    playNote(ctx, 2093, sparkleStart + 0.28, 0.15, 0.10, 'sine');
    playNote(ctx, 2637, sparkleStart + 0.32, 0.12, 0.08, 'sine');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RIVAL ENCOUNTER SOUND — Epic dramatic clash (¡!) stinger
  // Grave, impactante, con un "thump" y un acorde épico
  // ─────────────────────────────────────────────────────────────────────────────
  function playRivalEncounterSound() {
    const ctx = getAudioCtx();
    const t = ctx.currentTime + 0.05;

    // LOW IMPACT HIT — bass thud
    playGlide(ctx, 80, 40, t, 0.22, 0.55, 'sawtooth');
    playNoise(ctx, t, 0.18, 0.40, 180); // thud

    // Dramatic stinger chord after the thud (t + 0.18)
    const stingerT = t + 0.18;

    // Root: E2 — ominous low
    playNote(ctx, 82.41,  stingerT,        0.55, 0.40, 'square');
    // Fifth: B2
    playNote(ctx, 123.47, stingerT + 0.02, 0.50, 0.30, 'square');
    // Octave: E3
    playNote(ctx, 164.81, stingerT + 0.04, 0.50, 0.25, 'square');

    // Sawtooth layer for edge/grittiness
    playNote(ctx, 82.41,  stingerT,        0.55, 0.18, 'sawtooth');

    // High "alert" shriek — the exclamation mark "!" visual sound
    const shriekT = stingerT + 0.04;
    playGlide(ctx, 1200, 900, shriekT,        0.10, 0.22, 'square');
    playGlide(ctx, 900,  600, shriekT + 0.10, 0.10, 0.18, 'square');

    // Second thumps — building tension rhythm
    const thump2 = stingerT + 0.30;
    playNoise(ctx, thump2,        0.10, 0.30, 150);
    playNote (ctx, 82.41, thump2, 0.10, 0.30, 'sawtooth');

    const thump3 = thump2 + 0.18;
    playNoise(ctx, thump3,        0.08, 0.25, 150);
    playNote (ctx, 82.41, thump3, 0.08, 0.30, 'sawtooth');

    // Final dramatic swell
    const swellT = thump3 + 0.20;
    playGlide(ctx, 82.41,  164.81, swellT,        0.35, 0.40, 'square');
    playGlide(ctx, 123.47, 246.94, swellT + 0.02, 0.33, 0.25, 'square');
    playNoise(ctx, swellT,         0.30, 0.20, 250);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXPORT to global scope
  // ─────────────────────────────────────────────────────────────────────────────
  window.SFX = {
    shiny:         playShinySound,
    rivalEncounter: playRivalEncounterSound,
  };

  console.log('[SFX] 8-bit sound engine loaded. window.SFX =', Object.keys(window.SFX));
})();
