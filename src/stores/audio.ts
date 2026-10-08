import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { logger } from '@/logic/utils/logger';
import { gameBus } from '@/logic/events/gameBus';
import { AUDIO_MASTER_GAIN_VOLUME } from '@/logic/constants/audio';
import { dispatchSound } from '@/logic/audio/soundDispatchMap';
import { playPokemonCry } from '@/logic/audio/pokemonCryPlayer';

const AUDIO_DEBOUNCE_WINDOW_MS = 60;

/**
 * AudioStore
 * Handles 8-bit sound synthesis using Web Audio API via audioEngine logic.
 */
export const useAudioStore = defineStore('audio', () => {
  const context = shallowRef<AudioContext | null>(null);
  const masterGain = shallowRef<GainNode | null>(null);
  const isInitialized = ref(false);
  const lastPlayTimeMap = new Map<string, number>();

  /**
   * Initializes the audio context.
   */
  const init = () => {
    if (isInitialized.value) return;

    try {
      const AudioContextClass = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      context.value = ctx;
      const gain = ctx.createGain();
      gain.gain.value = AUDIO_MASTER_GAIN_VOLUME; // Global volume
      gain.connect(ctx.destination);
      masterGain.value = gain;
      isInitialized.value = true;
      initListeners();
    } catch (e) {
      logger.error('Audio', `Web Audio API not supported: ${(e as Error).message}`);
    }
  };

  /**
   * Resumes the context.
   */
  const resume = async () => {
    if (!context.value) init();
    if (context.value && context.value.state === 'suspended') {
      await context.value.resume();
    }
  };

  const playCry = async (pokemonName: string, isFaint = false) => {
    if (!isInitialized.value) init();
    await resume();

    const ctx = context.value;
    const dest = masterGain.value;
    if (!ctx || !dest) return;

    await playPokemonCry(pokemonName, ctx, dest, isFaint);
  };

  const initListeners = () => {
    gameBus.on('PLAY_SOUND', (e: Event) => {
      const type = (e as CustomEvent).detail as string;
      if (type) play(type);
    });
    gameBus.on('PLAY_CRY', (e: Event) => {
      const detail = (e as CustomEvent).detail as { name: string; isFaint?: boolean } | undefined;
      if (detail && detail.name) {
        playCry(detail.name, detail.isFaint || false);
      }
    });
  };

  /**
   * Plays a sound using the centralized engine.
   */
  const play = async (type: string) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Temporal.Now.instant().epochMilliseconds;
    const lastTime = lastPlayTimeMap.get(type) ?? 0;
    if (now - lastTime < AUDIO_DEBOUNCE_WINDOW_MS) {
      return;
    }
    lastPlayTimeMap.set(type, now);

    if (!isInitialized.value) init();
    await resume();

    const ctx = context.value;
    const dest = masterGain.value;
    if (!ctx || !dest) return;

    dispatchSound(type, ctx, dest);
  };

  return {
    init,
    resume,
    play,
  };
});
