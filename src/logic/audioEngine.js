/**
 * ===== 8-BIT AUDIO ENGINE (Synthesized) =====
 * Ported from legacy 17_sounds.js to ES6 Module.
 * Uses Web Audio API to generate chiptune sounds without external files.
 */

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

/**
 * SHINY SOUND — Magical harp-like ascending arpeggio with sparkle finish
 */
export function playShinySound() {
  const ctx = getAudioCtx();
  const t = ctx.currentTime + 0.05;

  const arpNotes = [523.25, 659.25, 783.99, 880.00, 1046.50];
  const arpDur   = 0.11;
  const arpGap   = 0.10;

  arpNotes.forEach((freq, i) => {
    playNote(ctx, freq, t + i * arpGap, arpDur, 0.28, 'triangle');
  });

  const chordNotes = [523.25, 783.99, 1046.50];
  chordNotes.forEach((freq, i) => {
    playNote(ctx, freq, t + i * arpGap * 0.9 + 0.04, arpDur * 1.3, 0.10, 'square');
  });

  const sparkleStart = t + arpNotes.length * arpGap + 0.05;
  playGlide(ctx, 880, 2093, sparkleStart, 0.25, 0.18, 'triangle');
  playGlide(ctx, 1046.5, 2637, sparkleStart + 0.08, 0.22, 0.12, 'triangle');

  playNoise(ctx, sparkleStart, 0.08, 0.08, 3500);
  playNoise(ctx, sparkleStart + 0.09, 0.08, 0.06, 4500);

  playNote(ctx, 2093, sparkleStart + 0.28, 0.15, 0.10, 'sine');
  playNote(ctx, 2637, sparkleStart + 0.32, 0.12, 0.08, 'sine');
}

/**
 * RIVAL ENCOUNTER SOUND — Epic dramatic clash (¡!) stinger
 */
export function playRivalEncounterSound() {
  const ctx = getAudioCtx();
  const t = ctx.currentTime + 0.05;

  playGlide(ctx, 80, 40, t, 0.22, 0.55, 'sawtooth');
  playNoise(ctx, t, 0.18, 0.40, 180);

  const stingerT = t + 0.18;
  playNote(ctx, 82.41,  stingerT,        0.55, 0.40, 'square');
  playNote(ctx, 123.47, stingerT + 0.02, 0.50, 0.30, 'square');
  playNote(ctx, 164.81, stingerT + 0.04, 0.50, 0.25, 'square');
  playNote(ctx, 82.41,  stingerT,        0.55, 0.18, 'sawtooth');

  const shriekT = stingerT + 0.04;
  playGlide(ctx, 1200, 900, shriekT,        0.10, 0.22, 'square');
  playGlide(ctx, 900,  600, shriekT + 0.10, 0.10, 0.18, 'square');

  const thump2 = stingerT + 0.30;
  playNoise(ctx, thump2,        0.10, 0.30, 150);
  playNote (ctx, 82.41, thump2, 0.10, 0.30, 'sawtooth');

  const thump3 = thump2 + 0.18;
  playNoise(ctx, thump3,        0.08, 0.25, 150);
  playNote (ctx, 82.41, thump3, 0.08, 0.30, 'sawtooth');

  const swellT = thump3 + 0.20;
  playGlide(ctx, 82.41,  164.81, swellT,        0.35, 0.40, 'square');
  playGlide(ctx, 123.47, 246.94, swellT + 0.02, 0.33, 0.25, 'square');
  playNoise(ctx, swellT,         0.30, 0.20, 250);
}
/**
 * LEVEL UP SOUND — Short celebratory victory fanfare
 */
export function playLevelUpSound() {
  const ctx = getAudioCtx();
  const t = ctx.currentTime + 0.05;
  const vol = 0.30;

  playNote(ctx, 392.00, t,        0.10, vol, 'square');
  playNote(ctx, 493.88, t + 0.10, 0.10, vol, 'square');
  playNote(ctx, 587.33, t + 0.20, 0.10, vol, 'square');
  playNote(ctx, 783.99, t + 0.30, 0.40, vol, 'square');
}

/**
 * CAPTURE SUCCESS — Iconic catch tune
 */
export function playCaptureSuccessSound() {
  const ctx = getAudioCtx();
  const t = ctx.currentTime + 0.05;
  
  playNote(ctx, 392.00, t,        0.12, 0.30, 'square');
  playNote(ctx, 369.99, t + 0.12, 0.12, 0.30, 'square');
  playNote(ctx, 392.00, t + 0.24, 0.12, 0.30, 'square');
  playNote(ctx, 493.88, t + 0.36, 0.30, 0.35, 'square');
}

/**
 * FAINT SOUND — Decreasing pitch and frequency
 */
export function playFaintSound() {
  const ctx = getAudioCtx();
  const t = ctx.currentTime + 0.05;
  
  playGlide(ctx, 330, 110, t, 0.6, 0.4, 'sawtooth');
  playNoise(ctx, t, 0.6, 0.15, 400);
}

/**
 * EVOLUTION SOUND — High-tension ascending loops
 */
export function playEvolutionSound() {
  const ctx = getAudioCtx();
  const t = ctx.currentTime + 0.05;
  
  [0, 0.4].forEach(offset => {
    playGlide(ctx, 220, 880, t + offset, 0.3, 0.25, 'square');
  });
  
  playNote(ctx, 1174.66, t + 0.8, 0.5, 0.35, 'square');
  playNote(ctx, 1760.00, t + 0.85, 0.45, 0.25, 'triangle');
}

/**
 * HEAL SOUND — Classic Pokemon Center jingle
 */
export function playHealSound() {
  const ctx = getAudioCtx();
  const t = ctx.currentTime + 0.05;
  const vol = 0.25;

  // G4, G4, B4, G4, E5 (classic 5-note jingle)
  const notes = [392.00, 392.00, 493.88, 392.00, 659.25];
  const times = [0, 0.15, 0.30, 0.45, 0.60];
  const durs  = [0.12, 0.12, 0.12, 0.12, 0.25];

  notes.forEach((freq, i) => {
    playNote(ctx, freq, t + times[i], durs[i], vol, 'square');
  });
}

/**
 * MESSAGE RECEIVED — Short, high double blip
 */
export function playMessageReceivedSound() {
  const ctx = getAudioCtx();
  const t = ctx.currentTime + 0.05;
  playNote(ctx, 1318.51, t, 0.05, 0.15, 'square'); // E6
  playNote(ctx, 1567.98, t + 0.08, 0.06, 0.12, 'square'); // G6
}

/**
 * MESSAGE SENT — Single quick high pip
 */
export function playMessageSentSound() {
  const ctx = getAudioCtx();
  const t = ctx.currentTime + 0.05;
  playNote(ctx, 1174.66, t, 0.04, 0.10, 'sine'); // D6
}

/**
 * SOCIAL ALERT — Friend requests / generic social notifications
 */
export function playSocialAlertSound() {
  const ctx = getAudioCtx();
  const t = ctx.currentTime + 0.05;
  playNote(ctx, 523.25, t, 0.08, 0.20, 'square'); // C5
  playNote(ctx, 659.25, t + 0.12, 0.15, 0.18, 'square'); // E5
}

/**
 * TRADE INVITE — Distinct syncopated jingle
 */
export function playTradeInviteSound() {
  const ctx = getAudioCtx();
  const t = ctx.currentTime + 0.05;
  playNote(ctx, 783.99, t, 0.1, 0.20, 'triangle'); // G5
  playNote(ctx, 783.99, t + 0.15, 0.08, 0.15, 'triangle');
  playNote(ctx, 1046.50, t + 0.25, 0.2, 0.18, 'square'); // C6
}

