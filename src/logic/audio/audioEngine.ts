
import {
  AUDIO_FREQUENCIES_HZ,
  AUDIO_DEFAULT_NOTE_VOLUME,
  AUDIO_DEFAULT_NOISE_VOLUME,
  AUDIO_DEFAULT_NOISE_FILTER_FREQ_HZ,
  AUDIO_ENVELOPE_ATTACK_SEC,
  AUDIO_ENVELOPE_RELEASE_OFFSET_SEC,
  AUDIO_NOISE_RAMP_FACTOR,
  AUDIO_NOISE_BIAS,
  AUDIO_FILTER_DEFAULT_Q,
  AUDIO_ENVELOPE_MIN_GAIN,
  AUDIO_INITIAL_LEAD_TIME_SEC,
  AUDIO_NOISE_FILTERS_HZ,
  EVOLUTION_SOUND_STEPS,
  MONEY_SOUND_STEPS,
  AUDIO_SOUND_PARAMS
} from '@/logic/constants/audio';

/**
 * ===== 8-BIT AUDIO ENGINE (Synthesized) =====
 * Centralized logic for generating chiptune sounds using Web Audio API.
 */

/**
 * Play a single 8-bit beep note.
 */
function playNote(ctx: AudioContext, dest: AudioNode | null, freq: number, start: number, dur: number, vol: number = AUDIO_DEFAULT_NOTE_VOLUME, type: OscillatorType = 'square') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);

  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol, start + AUDIO_ENVELOPE_ATTACK_SEC);
  gain.gain.setValueAtTime(vol, start + dur - AUDIO_ENVELOPE_RELEASE_OFFSET_SEC);
  gain.gain.linearRampToValueAtTime(0, start + dur);

  osc.connect(gain);
  gain.connect(dest || ctx.destination);

  osc.start(start);
  osc.stop(start + dur);
}

/**
 * Glide between two frequencies.
 */
function playGlide(ctx: AudioContext, dest: AudioNode | null, freqStart: number, freqEnd: number, start: number, dur: number, vol: number = AUDIO_DEFAULT_NOTE_VOLUME, type: OscillatorType = 'square') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, start);
  osc.frequency.exponentialRampToValueAtTime(freqEnd, start + dur);

  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol, start + AUDIO_ENVELOPE_ATTACK_SEC);
  gain.gain.setValueAtTime(vol, start + dur - AUDIO_ENVELOPE_RELEASE_OFFSET_SEC);
  gain.gain.linearRampToValueAtTime(0, start + dur);

  osc.connect(gain);
  gain.connect(dest || ctx.destination);

  osc.start(start);
  osc.stop(start + dur);
}

/**
 * Noise burst.
 */
function playNoise(ctx: AudioContext, dest: AudioNode | null, start: number, dur: number, vol: number = AUDIO_DEFAULT_NOISE_VOLUME, filterFreq: number = AUDIO_DEFAULT_NOISE_FILTER_FREQ_HZ) {
  const bufferSize = ctx.sampleRate * dur;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * AUDIO_NOISE_RAMP_FACTOR - AUDIO_NOISE_BIAS;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = AUDIO_FILTER_DEFAULT_Q;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(AUDIO_ENVELOPE_MIN_GAIN, start + dur);

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
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const arpNotes = [
    AUDIO_FREQUENCIES_HZ.C5,
    AUDIO_FREQUENCIES_HZ.E5,
    AUDIO_FREQUENCIES_HZ.G5,
    AUDIO_FREQUENCIES_HZ.A5,
    AUDIO_FREQUENCIES_HZ.C6
  ];
  const { ARP_GAP_SEC, NOTE_DURATION_SEC, NOTE_VOLUME, SPARKLE_GLIDE_DURATION_SEC, SPARKLE_GLIDE_VOLUME, SPARKLE_NOISE_DURATION_SEC, SPARKLE_NOISE_VOLUME } = AUDIO_SOUND_PARAMS.SHINY;

  arpNotes.forEach((freq, i) => {
    playNote(ctx, dest, freq, t + i * ARP_GAP_SEC, NOTE_DURATION_SEC, NOTE_VOLUME, 'triangle');
  });

  const sparkleStart = t + arpNotes.length * ARP_GAP_SEC + AUDIO_INITIAL_LEAD_TIME_SEC;
  playGlide(ctx, dest, AUDIO_FREQUENCIES_HZ.A5, AUDIO_FREQUENCIES_HZ.HIGH_GLIDE_END, sparkleStart, SPARKLE_GLIDE_DURATION_SEC, SPARKLE_GLIDE_VOLUME, 'triangle');
  playNoise(ctx, dest, sparkleStart, SPARKLE_NOISE_DURATION_SEC, SPARKLE_NOISE_VOLUME, AUDIO_NOISE_FILTERS_HZ.SHINY_SPARKLE);
}

/**
 * RIVAL ENCOUNTER SOUND
 */
export function playRivalEncounterSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const { GLIDE_DURATION_SEC, GLIDE_VOLUME, NOISE_DURATION_SEC, NOISE_VOLUME, STINGER_OFFSET_SEC, E2_DURATION_SEC, E2_VOLUME, B2_OFFSET_SEC, B2_DURATION_SEC, B2_VOLUME } = AUDIO_SOUND_PARAMS.RIVAL;
  playGlide(ctx, dest, AUDIO_FREQUENCIES_HZ.RIVAL_GLIDE_START, AUDIO_FREQUENCIES_HZ.RIVAL_GLIDE_END, t, GLIDE_DURATION_SEC, GLIDE_VOLUME, 'sawtooth');
  playNoise(ctx, dest, t, NOISE_DURATION_SEC, NOISE_VOLUME, AUDIO_NOISE_FILTERS_HZ.RIVAL_ENCOUNTER);

  const stingerT = t + STINGER_OFFSET_SEC;
  playNote(ctx, dest, AUDIO_FREQUENCIES_HZ.E2, stingerT, E2_DURATION_SEC, E2_VOLUME, 'square');
  playNote(ctx, dest, AUDIO_FREQUENCIES_HZ.B2, stingerT + B2_OFFSET_SEC, B2_DURATION_SEC, B2_VOLUME, 'square');
}

/**
 * LEVEL UP SOUND
 */
export function playLevelUpSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const notes = [
    AUDIO_FREQUENCIES_HZ.G4,
    AUDIO_FREQUENCIES_HZ.B4,
    AUDIO_FREQUENCIES_HZ.D5,
    AUDIO_FREQUENCIES_HZ.G5
  ];
  const { STEP_GAP_SEC, NOTE_DURATION_SEC, NOTE_VOLUME } = AUDIO_SOUND_PARAMS.LEVEL_UP;
  notes.forEach((freq, i) => {
    playNote(ctx, dest, freq, t + i * STEP_GAP_SEC, NOTE_DURATION_SEC, NOTE_VOLUME, 'square');
  });
}

/**
 * CAPTURE SUCCESS
 */
export function playCaptureSuccessSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const { NOTE_DURATION_SEC, NOTE_VOLUME, FINAL_DURATION_SEC, FINAL_VOLUME } = AUDIO_SOUND_PARAMS.CAPTURE_SUCCESS;
  playNote(ctx, dest, AUDIO_FREQUENCIES_HZ.G4, t, NOTE_DURATION_SEC, NOTE_VOLUME, 'square');
  playNote(ctx, dest, AUDIO_FREQUENCIES_HZ.FSHARP4, t + NOTE_DURATION_SEC, NOTE_DURATION_SEC, NOTE_VOLUME, 'square');
  playNote(ctx, dest, AUDIO_FREQUENCIES_HZ.G4, t + NOTE_DURATION_SEC * 2, NOTE_DURATION_SEC, NOTE_VOLUME, 'square');
  playNote(ctx, dest, AUDIO_FREQUENCIES_HZ.B4, t + NOTE_DURATION_SEC * 3, FINAL_DURATION_SEC, FINAL_VOLUME, 'square');
}

/**
 * POKEBALL HIT/HIT ENERGY
 */
export function playBallHitSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const { NOISE_DURATION_SEC, NOISE_VOLUME, GLIDE_DURATION_SEC, GLIDE_VOLUME } = AUDIO_SOUND_PARAMS.BALL_HIT;
  playNoise(ctx, dest, t, NOISE_DURATION_SEC, NOISE_VOLUME, AUDIO_NOISE_FILTERS_HZ.POKEBALL_HIT);
  playGlide(ctx, dest, AUDIO_FREQUENCIES_HZ.A5, AUDIO_FREQUENCIES_HZ.A4, t, GLIDE_DURATION_SEC, GLIDE_VOLUME, 'square');
}

/**
 * POKEBALL WOBBLE SOUND
 */
export function playWobbleSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const { NOTE_DURATION_SEC, NOTE_VOLUME } = AUDIO_SOUND_PARAMS.WOBBLE;
  playNote(ctx, dest, AUDIO_FREQUENCIES_HZ.A3, t, NOTE_DURATION_SEC, NOTE_VOLUME, 'square');
}

/**
 * FAINT SOUND
 */
export function playFaintSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const { GLIDE_DURATION_SEC, GLIDE_VOLUME } = AUDIO_SOUND_PARAMS.FAINT;
  playGlide(ctx, dest, AUDIO_FREQUENCIES_HZ.E4, AUDIO_FREQUENCIES_HZ.A2, t, GLIDE_DURATION_SEC, GLIDE_VOLUME, 'sawtooth');
}

/**
 * EVOLUTION SOUND
 */
export function playEvolutionSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const { STEP_INTERVAL_SEC, NOTE_DURATION_SEC, NOTE_VOLUME } = AUDIO_SOUND_PARAMS.EVOLUTION;
  for (let i = 0; i < EVOLUTION_SOUND_STEPS; i++) {
    playGlide(ctx, dest, AUDIO_FREQUENCIES_HZ.A3, AUDIO_FREQUENCIES_HZ.A5, t + i * STEP_INTERVAL_SEC, NOTE_DURATION_SEC, NOTE_VOLUME, 'square');
  }
}

/**
 * HEAL SOUND
 */
export function playHealSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const notes = [
    AUDIO_FREQUENCIES_HZ.G4,
    AUDIO_FREQUENCIES_HZ.G4,
    AUDIO_FREQUENCIES_HZ.B4,
    AUDIO_FREQUENCIES_HZ.G4,
    AUDIO_FREQUENCIES_HZ.E5
  ];
  const { STEP_INTERVAL_SEC, NOTE_DURATION_SEC, NOTE_VOLUME } = AUDIO_SOUND_PARAMS.HEAL;
  notes.forEach((freq, i) => {
    playNote(ctx, dest, freq, t + i * STEP_INTERVAL_SEC, NOTE_DURATION_SEC, NOTE_VOLUME, 'square');
  });
}

/**
 * FLEE SOUND
 */
export function playFleeSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const { GLIDE_DURATION_SEC, GLIDE_VOLUME } = AUDIO_SOUND_PARAMS.FLEE;
  playGlide(ctx, dest, AUDIO_FREQUENCIES_HZ.A5, AUDIO_FREQUENCIES_HZ.A2, t, GLIDE_DURATION_SEC, GLIDE_VOLUME, 'sine');
}

/**
 * ITEM PICKUP SOUND
 */
export function playItemSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const { GLIDE_DURATION_SEC, GLIDE_VOLUME } = AUDIO_SOUND_PARAMS.ITEM;
  playGlide(ctx, dest, AUDIO_FREQUENCIES_HZ.B5, AUDIO_FREQUENCIES_HZ.E6, t, GLIDE_DURATION_SEC, GLIDE_VOLUME, 'square');
}

/**
 * MESSAGE RECEIVED
 */
export function playMessageReceivedSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const { E6_DURATION_SEC, E6_VOLUME, G6_OFFSET_SEC, G6_DURATION_SEC, G6_VOLUME } = AUDIO_SOUND_PARAMS.MESSAGE_RECEIVED;
  playNote(ctx, dest, AUDIO_FREQUENCIES_HZ.E6, t, E6_DURATION_SEC, E6_VOLUME, 'square');
  playNote(ctx, dest, AUDIO_FREQUENCIES_HZ.G6, t + G6_OFFSET_SEC, G6_DURATION_SEC, G6_VOLUME, 'square');
}

/**
 * MESSAGE SENT
 */
export function playMessageSentSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const { NOTE_DURATION_SEC, NOTE_VOLUME } = AUDIO_SOUND_PARAMS.MESSAGE_SENT;
  playNote(ctx, dest, AUDIO_FREQUENCIES_HZ.D6, t, NOTE_DURATION_SEC, NOTE_VOLUME, 'sine');
}

/**
 * MONEY SOUND
 */
export function playMoneySound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const { STEP_INTERVAL_SEC, NOTE_DURATION_SEC, NOTE_VOLUME } = AUDIO_SOUND_PARAMS.MONEY;
  for (let i = 0; i < MONEY_SOUND_STEPS; i++) {
    playNote(ctx, dest, AUDIO_FREQUENCIES_HZ.B6, t + i * STEP_INTERVAL_SEC, NOTE_DURATION_SEC, NOTE_VOLUME, 'square');
  }
}
/**
 * STATUS DAMAGE SOUND (8-bit impact)
 */
export function playStatusDamageSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const { NOISE_DURATION_SEC, NOISE_VOLUME, GLIDE_DURATION_SEC, GLIDE_VOLUME } = AUDIO_SOUND_PARAMS.STATUS_DAMAGE;
  playNoise(ctx, dest, t, NOISE_DURATION_SEC, NOISE_VOLUME, AUDIO_DEFAULT_NOISE_FILTER_FREQ_HZ);
  playGlide(ctx, dest, AUDIO_FREQUENCIES_HZ.A2, AUDIO_FREQUENCIES_HZ.A1, t, GLIDE_DURATION_SEC, GLIDE_VOLUME, 'square');
}

/**
 * VICTORY TRAINER SOUND
 */
export function playVictoryTrainerSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const notes = [
    AUDIO_FREQUENCIES_HZ.G4,
    AUDIO_FREQUENCIES_HZ.C5,
    AUDIO_FREQUENCIES_HZ.E5,
    AUDIO_FREQUENCIES_HZ.G5
  ];
  const { STEP_INTERVAL_SEC, NOTE_DURATION_SEC, NOTE_VOLUME, FINAL_OFFSET_SEC, FINAL_DURATION_SEC } = AUDIO_SOUND_PARAMS.VICTORY_TRAINER;
  notes.forEach((freq, i) => {
    playNote(ctx, dest, freq, t + i * STEP_INTERVAL_SEC, NOTE_DURATION_SEC, NOTE_VOLUME, 'square');
  });
  playNote(ctx, dest, AUDIO_FREQUENCIES_HZ.C6, t + FINAL_OFFSET_SEC, FINAL_DURATION_SEC, NOTE_VOLUME, 'square');
}

/**
 * DEFEAT SOUND
 */
export function playDefeatSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const notes = [
    AUDIO_FREQUENCIES_HZ.C5,
    AUDIO_FREQUENCIES_HZ.GSHARP4,
    AUDIO_FREQUENCIES_HZ.G4
  ];
  const { STEP_INTERVAL_SEC, NOTE_DURATION_SEC, NOTE_VOLUME, GLIDE_OFFSET_SEC, GLIDE_DURATION_SEC, GLIDE_VOLUME, NOISE_OFFSET_SEC, NOISE_DURATION_SEC, NOISE_VOLUME } = AUDIO_SOUND_PARAMS.DEFEAT;
  notes.forEach((freq, i) => {
    playNote(ctx, dest, freq, t + i * STEP_INTERVAL_SEC, NOTE_DURATION_SEC, NOTE_VOLUME, 'square');
  });
  playGlide(ctx, dest, AUDIO_FREQUENCIES_HZ.FSHARP4, AUDIO_FREQUENCIES_HZ.FSHARP3, t + GLIDE_OFFSET_SEC, GLIDE_DURATION_SEC, GLIDE_VOLUME, 'sawtooth');
  playNoise(ctx, dest, t + NOISE_OFFSET_SEC, NOISE_DURATION_SEC, NOISE_VOLUME, AUDIO_DEFAULT_NOISE_FILTER_FREQ_HZ);
}

/**
 * STEAL SOUND (Retro cartoon sliding/gliding frequency)
 */
export function playStealSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const { GLIDE1_DURATION_SEC, GLIDE1_VOLUME, GLIDE2_OFFSET_SEC, GLIDE2_DURATION_SEC, GLIDE2_VOLUME } = AUDIO_SOUND_PARAMS.STEAL;
  playGlide(ctx, dest, AUDIO_FREQUENCIES_HZ.A4, AUDIO_FREQUENCIES_HZ.A5, t, GLIDE1_DURATION_SEC, GLIDE1_VOLUME, 'triangle');
  playGlide(ctx, dest, AUDIO_FREQUENCIES_HZ.CSHARP5, AUDIO_FREQUENCIES_HZ.CSHARP6, t + GLIDE2_OFFSET_SEC, GLIDE2_DURATION_SEC, GLIDE2_VOLUME, 'triangle');
}

/**
 * SIREN SOUND (Police sirens alternating pitch)
 */
export function playSirenSound(ctx: AudioContext, dest: AudioNode | null) {
  const t = ctx.currentTime + AUDIO_INITIAL_LEAD_TIME_SEC;
  const { SEGMENT_DURATION_SEC, VOLUME } = AUDIO_SOUND_PARAMS.SIREN;
  playGlide(ctx, dest, AUDIO_FREQUENCIES_HZ.SIREN_LOW, AUDIO_FREQUENCIES_HZ.SIREN_HIGH, t, SEGMENT_DURATION_SEC, VOLUME, 'sawtooth');
  playGlide(ctx, dest, AUDIO_FREQUENCIES_HZ.SIREN_HIGH, AUDIO_FREQUENCIES_HZ.SIREN_LOW, t + SEGMENT_DURATION_SEC, SEGMENT_DURATION_SEC, VOLUME, 'sawtooth');
  playGlide(ctx, dest, AUDIO_FREQUENCIES_HZ.SIREN_LOW, AUDIO_FREQUENCIES_HZ.SIREN_HIGH, t + SEGMENT_DURATION_SEC * 2, SEGMENT_DURATION_SEC, VOLUME, 'sawtooth');
  playGlide(ctx, dest, AUDIO_FREQUENCIES_HZ.SIREN_HIGH, AUDIO_FREQUENCIES_HZ.SIREN_LOW, t + SEGMENT_DURATION_SEC * 3, SEGMENT_DURATION_SEC, VOLUME, 'sawtooth');
}


