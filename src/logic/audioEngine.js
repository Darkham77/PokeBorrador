/**
 * ===== 8-BIT AUDIO ENGINE (Synthesized) =====
 * Centralized logic for generating chiptune sounds using Web Audio API.
 */

/**
 * Play a single 8-bit beep note.
 */
function playNote(ctx, dest, freq, start, dur, vol = 0.35, type = 'square') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);

  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol, start + 0.01);
  gain.gain.setValueAtTime(vol, start + dur - 0.02);
  gain.gain.linearRampToValueAtTime(0, start + dur);

  osc.connect(gain);
  gain.connect(dest || ctx.destination);

  osc.start(start);
  osc.stop(start + dur);
}

/**
 * Glide between two frequencies.
 */
function playGlide(ctx, dest, freqStart, freqEnd, start, dur, vol = 0.35, type = 'square') {
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
  gain.connect(dest || ctx.destination);

  osc.start(start);
  osc.stop(start + dur);
}

/**
 * Noise burst.
 */
function playNoise(ctx, dest, start, dur, vol = 0.15, filterFreq = 2000) {
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
  gain.connect(dest || ctx.destination);

  source.start(start);
  source.stop(start + dur);
}

/**
 * SHINY SOUND
 */
export function playShinySound(ctx, dest) {
  const t = ctx.currentTime + 0.05;
  const arpNotes = [523.25, 659.25, 783.99, 880.00, 1046.50];
  const arpGap = 0.10;

  arpNotes.forEach((freq, i) => {
    playNote(ctx, dest, freq, t + i * arpGap, 0.11, 0.28, 'triangle');
  });

  const sparkleStart = t + arpNotes.length * arpGap + 0.05;
  playGlide(ctx, dest, 880, 2093, sparkleStart, 0.25, 0.18, 'triangle');
  playNoise(ctx, dest, sparkleStart, 0.08, 0.08, 3500);
}

/**
 * RIVAL ENCOUNTER SOUND
 */
export function playRivalEncounterSound(ctx, dest) {
  const t = ctx.currentTime + 0.05;
  playGlide(ctx, dest, 80, 40, t, 0.22, 0.55, 'sawtooth');
  playNoise(ctx, dest, t, 0.18, 0.40, 180);

  const stingerT = t + 0.18;
  playNote(ctx, dest, 82.41, stingerT, 0.55, 0.40, 'square');
  playNote(ctx, dest, 123.47, stingerT + 0.02, 0.50, 0.30, 'square');
}

/**
 * LEVEL UP SOUND
 */
export function playLevelUpSound(ctx, dest) {
  const t = ctx.currentTime + 0.05;
  const notes = [392.00, 493.88, 587.33, 783.99];
  notes.forEach((freq, i) => {
    playNote(ctx, dest, freq, t + i * 0.1, 0.1, 0.3, 'square');
  });
}

/**
 * CAPTURE SUCCESS
 */
export function playCaptureSuccessSound(ctx, dest) {
  const t = ctx.currentTime + 0.05;
  playNote(ctx, dest, 392.00, t, 0.12, 0.30, 'square');
  playNote(ctx, dest, 369.99, t + 0.12, 0.12, 0.30, 'square');
  playNote(ctx, dest, 392.00, t + 0.24, 0.12, 0.30, 'square');
  playNote(ctx, dest, 493.88, t + 0.36, 0.30, 0.35, 'square');
}

/**
 * FAINT SOUND
 */
export function playFaintSound(ctx, dest) {
  const t = ctx.currentTime + 0.05;
  playGlide(ctx, dest, 330, 110, t, 0.6, 0.4, 'sawtooth');
}

/**
 * EVOLUTION SOUND
 */
export function playEvolutionSound(ctx, dest) {
  const t = ctx.currentTime + 0.05;
  for (let i = 0; i < 8; i++) {
    playGlide(ctx, dest, 220, 880, t + i * 0.1, 0.1, 0.2, 'square');
  }
}

/**
 * HEAL SOUND
 */
export function playHealSound(ctx, dest) {
  const t = ctx.currentTime + 0.05;
  const notes = [392.00, 392.00, 493.88, 392.00, 659.25];
  notes.forEach((freq, i) => {
    playNote(ctx, dest, freq, t + i * 0.15, 0.12, 0.25, 'square');
  });
}

/**
 * FLEE SOUND
 */
export function playFleeSound(ctx, dest) {
  const t = ctx.currentTime + 0.05;
  playGlide(ctx, dest, 880, 110, t, 0.3, 0.4, 'sine');
}

/**
 * ITEM PICKUP SOUND
 */
export function playItemSound(ctx, dest) {
  const t = ctx.currentTime + 0.05;
  playGlide(ctx, dest, 987.77, 1318.51, t, 0.1, 0.3, 'square');
}

/**
 * MESSAGE RECEIVED
 */
export function playMessageReceivedSound(ctx, dest) {
  const t = ctx.currentTime + 0.05;
  playNote(ctx, dest, 1318.51, t, 0.05, 0.15, 'square');
  playNote(ctx, dest, 1567.98, t + 0.08, 0.06, 0.12, 'square');
}

/**
 * MESSAGE SENT
 */
export function playMessageSentSound(ctx, dest) {
  const t = ctx.currentTime + 0.05;
  playNote(ctx, dest, 1174.66, t, 0.04, 0.10, 'sine');
}

/**
 * MONEY SOUND
 */
export function playMoneySound(ctx, dest) {
  const t = ctx.currentTime + 0.05;
  for (let i = 0; i < 3; i++) {
    playNote(ctx, dest, 1975.53, t + i * 0.06, 0.05, 0.2, 'square');
  }
}
