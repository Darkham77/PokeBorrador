
/**
 * ===== 8-BIT AUDIO ENGINE (Synthesized) =====
 * Centralized logic for generating chiptune sounds using Web Audio API.
 */

/**
 * Play a single 8-bit beep note.
 */
function playNote(ctx: AudioContext, dest: AudioNode | null, freq: number, start: number, dur: number, vol: number = 0.35, type: OscillatorType = 'square') {
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
function playGlide(ctx: AudioContext, dest: AudioNode | null, freqStart: number, freqEnd: number, start: number, dur: number, vol: number = 0.35, type: OscillatorType = 'square') {
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
function playNoise(ctx: AudioContext, dest: AudioNode | null, start: number, dur: number, vol: number = 0.15, filterFreq: number = 2000) {
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
export function playShinySound(ctx: AudioContext, dest: AudioNode | null) {
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
export function playRivalEncounterSound(ctx: AudioContext, dest: AudioNode | null) {
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
export function playLevelUpSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + 0.05;
  const notes = [392.00, 493.88, 587.33, 783.99];
  notes.forEach((freq, i) => {
    playNote(ctx, dest, freq, t + i * 0.1, 0.1, 0.3, 'square');
  });
}

/**
 * CAPTURE SUCCESS
 */
export function playCaptureSuccessSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + 0.05;
  playNote(ctx, dest, 392.00, t, 0.12, 0.12, 'square');
  playNote(ctx, dest, 369.99, t + 0.12, 0.12, 0.12, 'square');
  playNote(ctx, dest, 392.00, t + 0.24, 0.12, 0.12, 'square');
  playNote(ctx, dest, 493.88, t + 0.36, 0.40, 0.15, 'square');
}

/**
 * POKEBALL HIT/HIT ENERGY
 */
export function playBallHitSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + 0.05;
  playNoise(ctx, dest, t, 0.1, 0.25, 1200);
  playGlide(ctx, dest, 880, 440, t, 0.15, 0.2, 'square');
}

/**
 * POKEBALL WOBBLE SOUND
 */
export function playWobbleSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + 0.05;
  playNote(ctx, dest, 220.00, t, 0.06, 0.20, 'square');
}

/**
 * FAINT SOUND
 */
export function playFaintSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + 0.05;
  playGlide(ctx, dest, 330, 110, t, 0.6, 0.4, 'sawtooth');
}

/**
 * EVOLUTION SOUND
 */
export function playEvolutionSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + 0.05;
  for (let i = 0; i < 8; i++) {
    playGlide(ctx, dest, 220, 880, t + i * 0.1, 0.1, 0.2, 'square');
  }
}

/**
 * HEAL SOUND
 */
export function playHealSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + 0.05;
  const notes = [392.00, 392.00, 493.88, 392.00, 659.25];
  notes.forEach((freq, i) => {
    playNote(ctx, dest, freq, t + i * 0.15, 0.12, 0.25, 'square');
  });
}

/**
 * FLEE SOUND
 */
export function playFleeSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + 0.05;
  playGlide(ctx, dest, 880, 110, t, 0.3, 0.4, 'sine');
}

/**
 * ITEM PICKUP SOUND
 */
export function playItemSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + 0.05;
  playGlide(ctx, dest, 987.77, 1318.51, t, 0.1, 0.3, 'square');
}

/**
 * MESSAGE RECEIVED
 */
export function playMessageReceivedSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + 0.05;
  playNote(ctx, dest, 1318.51, t, 0.05, 0.15, 'square');
  playNote(ctx, dest, 1567.98, t + 0.08, 0.06, 0.12, 'square');
}

/**
 * MESSAGE SENT
 */
export function playMessageSentSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + 0.05;
  playNote(ctx, dest, 1174.66, t, 0.04, 0.10, 'sine');
}

/**
 * MONEY SOUND
 */
export function playMoneySound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + 0.05;
  for (let i = 0; i < 3; i++) {
    playNote(ctx, dest, 1975.53, t + i * 0.06, 0.05, 0.2, 'square');
  }
}
/**
 * STATUS DAMAGE SOUND (8-bit impact)
 */
export function playStatusDamageSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + 0.05;
  playNoise(ctx, dest, t, 0.12, 0.25, 400); // Ruido sordo para el impacto
  playGlide(ctx, dest, 110, 55, t, 0.15, 0.2, 'square'); // Pulso bajo descendente
}

/**
 * VICTORY TRAINER SOUND
 */
export function playVictoryTrainerSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + 0.05;
  const notes = [392.00, 523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    playNote(ctx, dest, freq, t + i * 0.08, 0.08, 0.25, 'square');
  });
  playNote(ctx, dest, 1046.50, t + 0.32, 0.40, 0.25, 'square');
}

/**
 * DEFEAT SOUND
 */
export function playDefeatSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + 0.05;
  const notes = [523.25, 415.30, 392.00];
  notes.forEach((freq, i) => {
    playNote(ctx, dest, freq, t + i * 0.15, 0.12, 0.25, 'square');
  });
  playGlide(ctx, dest, 369.99, 185.00, t + 0.45, 0.50, 0.25, 'sawtooth');
  playNoise(ctx, dest, t + 0.45, 0.30, 0.15, 400);
}

/**
 * STEAL SOUND (Retro cartoon sliding/gliding frequency)
 */
export function playStealSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + 0.05;
  // Two swift rising slide sweeps to sound sneaky
  playGlide(ctx, dest, 440, 880, t, 0.12, 0.25, 'triangle');
  playGlide(ctx, dest, 554, 1109, t + 0.08, 0.12, 0.25, 'triangle');
}

/**
 * SIREN SOUND (Police sirens alternating pitch)
 */
export function playSirenSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + 0.05;
  // Alternating high and low slides (siren wail)
  playGlide(ctx, dest, 600, 900, t, 0.25, 0.2, 'sawtooth');
  playGlide(ctx, dest, 900, 600, t + 0.25, 0.25, 0.2, 'sawtooth');
  playGlide(ctx, dest, 600, 900, t + 0.5, 0.25, 0.2, 'sawtooth');
  playGlide(ctx, dest, 900, 600, t + 0.75, 0.25, 0.2, 'sawtooth');
}


