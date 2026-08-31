/**
 * AUDIO CONSTANTS (SINGLE SOURCE OF TRUTH)
 * Centralized constant definitions for audio volume levels, frequencies, and Web Audio API parameters.
 */

/** Default master gain volume level. */
export const DEFAULT_AUDIO_GAIN = 1.0;

/** Default audio fade-in/fade-out transition duration in seconds. */
export const AUDIO_FADE_DURATION_SEC = 0.5;

/** Standard audio context sample rate in Hz (44,100 Hz). */
export const AUDIO_STANDARD_SAMPLE_RATE_HZ = 44100;

/** Default volume for synthesized 8-bit note beeps. */
export const AUDIO_DEFAULT_NOTE_VOLUME = 0.2;

/** Default volume for synthesized 8-bit noise bursts. */
export const AUDIO_DEFAULT_NOISE_VOLUME = 0.15;

/** Default bandpass filter frequency in Hz for synthesized noise. */
export const AUDIO_DEFAULT_NOISE_FILTER_FREQ_HZ = 400;

/** Attack envelope duration in seconds for synthesized notes (0.005s). */
export const AUDIO_ENVELOPE_ATTACK_SEC = 0.005;

/** Release offset duration in seconds for synthesized notes (0.01s). */
export const AUDIO_ENVELOPE_RELEASE_OFFSET_SEC = 0.01;

/** Lead time delay in seconds for AudioContext scheduling (0.05s). */
export const AUDIO_SCHEDULER_LEAD_TIME_SEC = 0.05;

/** Noise buffer random ramp multiplier factor (2.0). */
export const AUDIO_NOISE_RAMP_FACTOR = 2.0;

/** Noise buffer random bias offset (1.0). */
export const AUDIO_NOISE_BIAS = 1.0;

/** Default Q quality factor for BiquadFilterNode (1.0). */
export const AUDIO_FILTER_DEFAULT_Q = 1.0;

/** Minimum exponential gain target for Web Audio volume ramps (0.0001). */
export const AUDIO_ENVELOPE_MIN_GAIN = 0.0001;

/** Initial lead delay in seconds for AudioContext play calls (0.05s). */
export const AUDIO_INITIAL_LEAD_TIME_SEC = 0.05;

/** Noise filter frequencies in Hz for sound effects. */
export const AUDIO_NOISE_FILTERS_HZ = {
  RIVAL_ENCOUNTER: 180,
  POKEBALL_HIT: 1200,
  SHINY_SPARKLE: 3500
} as const;

/** Standard chiptune musical note frequencies in Hz. */
export const AUDIO_FREQUENCIES_HZ = {
  A1: 55.00,
  E2: 82.41,
  A2: 110.00,
  B2: 123.47,
  E3: 164.81,
  FSHARP3: 185.00,
  A3: 220.00,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  FSHARP4: 369.99,
  G4: 392.00,
  GSHARP4: 415.30,
  A4: 440.00,
  B4: 493.88,
  C5: 523.25,
  CSHARP5: 554.37,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.00,
  B5: 987.77,
  C6: 1046.50,
  CSHARP6: 1108.73,
  D6: 1174.66,
  E6: 1318.51,
  G6: 1567.98,
  A6: 1760.00,
  B6: 1975.53,
  HIGH_GLIDE_END: 2000,
  SIREN_LOW: 600,
  SIREN_HIGH: 900,
  RIVAL_GLIDE_START: 80,
  RIVAL_GLIDE_END: 40,
} as const;

/** Total iteration steps for evolution sound sweep. */
export const EVOLUTION_SOUND_STEPS = 8;

/** Total iteration steps for money chime sound. */
export const MONEY_SOUND_STEPS = 3;

/**
 * Per-sound numeric parameters (durations, volumes, offsets).
 * Each key groups all magic numbers for a single sound function in audioEngine.ts.
 */
export const AUDIO_SOUND_PARAMS = {
  SHINY: {
    ARP_GAP_SEC: 0.10,
    NOTE_DURATION_SEC: 0.11,
    NOTE_VOLUME: 0.28,
    SPARKLE_GLIDE_DURATION_SEC: 0.25,
    SPARKLE_GLIDE_VOLUME: 0.18,
    SPARKLE_NOISE_DURATION_SEC: 0.08,
    SPARKLE_NOISE_VOLUME: 0.08
  },
  RIVAL: {
    GLIDE_DURATION_SEC: 0.22,
    GLIDE_VOLUME: 0.55,
    NOISE_DURATION_SEC: 0.18,
    NOISE_VOLUME: 0.40,
    STINGER_OFFSET_SEC: 0.18,
    E2_DURATION_SEC: 0.55,
    E2_VOLUME: 0.40,
    B2_OFFSET_SEC: 0.02,
    B2_DURATION_SEC: 0.50,
    B2_VOLUME: 0.30
  },
  LEVEL_UP: {
    STEP_GAP_SEC: 0.1,
    NOTE_DURATION_SEC: 0.1,
    NOTE_VOLUME: 0.3
  },
  CAPTURE_SUCCESS: {
    NOTE_DURATION_SEC: 0.12,
    NOTE_VOLUME: 0.12,
    FINAL_DURATION_SEC: 0.40,
    FINAL_VOLUME: 0.15
  },
  BALL_HIT: {
    NOISE_DURATION_SEC: 0.1,
    NOISE_VOLUME: 0.25,
    GLIDE_DURATION_SEC: 0.15,
    GLIDE_VOLUME: 0.2
  },
  WOBBLE: {
    NOTE_DURATION_SEC: 0.06,
    NOTE_VOLUME: 0.20
  },
  FAINT: {
    GLIDE_DURATION_SEC: 0.6,
    GLIDE_VOLUME: 0.4
  },
  EVOLUTION: {
    STEP_INTERVAL_SEC: 0.1,
    NOTE_DURATION_SEC: 0.1,
    NOTE_VOLUME: 0.2
  },
  HEAL: {
    STEP_INTERVAL_SEC: 0.15,
    NOTE_DURATION_SEC: 0.12,
    NOTE_VOLUME: 0.25
  },
  FLEE: {
    GLIDE_DURATION_SEC: 0.3,
    GLIDE_VOLUME: 0.4
  },
  ITEM: {
    GLIDE_DURATION_SEC: 0.1,
    GLIDE_VOLUME: 0.3
  },
  MESSAGE_RECEIVED: {
    E6_DURATION_SEC: 0.05,
    E6_VOLUME: 0.15,
    G6_OFFSET_SEC: 0.08,
    G6_DURATION_SEC: 0.06,
    G6_VOLUME: 0.12
  },
  MESSAGE_SENT: {
    NOTE_DURATION_SEC: 0.04,
    NOTE_VOLUME: 0.10
  },
  MONEY: {
    STEP_INTERVAL_SEC: 0.06,
    NOTE_DURATION_SEC: 0.05,
    NOTE_VOLUME: 0.2
  },
  STATUS_DAMAGE: {
    NOISE_DURATION_SEC: 0.12,
    NOISE_VOLUME: 0.25,
    GLIDE_DURATION_SEC: 0.15,
    GLIDE_VOLUME: 0.2
  },
  VICTORY_TRAINER: {
    STEP_INTERVAL_SEC: 0.08,
    NOTE_DURATION_SEC: 0.08,
    NOTE_VOLUME: 0.25,
    FINAL_OFFSET_SEC: 0.32,
    FINAL_DURATION_SEC: 0.40
  },
  DEFEAT: {
    STEP_INTERVAL_SEC: 0.15,
    NOTE_DURATION_SEC: 0.12,
    NOTE_VOLUME: 0.25,
    GLIDE_OFFSET_SEC: 0.45,
    GLIDE_DURATION_SEC: 0.50,
    GLIDE_VOLUME: 0.25,
    NOISE_OFFSET_SEC: 0.45,
    NOISE_DURATION_SEC: 0.30,
    NOISE_VOLUME: 0.15
  },
  STEAL: {
    GLIDE1_DURATION_SEC: 0.12,
    GLIDE1_VOLUME: 0.25,
    GLIDE2_OFFSET_SEC: 0.08,
    GLIDE2_DURATION_SEC: 0.12,
    GLIDE2_VOLUME: 0.25
  },
  SIREN: {
    SEGMENT_DURATION_SEC: 0.25,
    VOLUME: 0.2
  }
} as const;


/** Global master gain volume for the audio context (0.15 = ~15% loudness). */
export const AUDIO_MASTER_GAIN_VOLUME = 0.15;
