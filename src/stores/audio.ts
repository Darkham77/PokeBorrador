import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { logger } from '@/logic/utils/logger';
import { gameBus } from '@/logic/events/gameBus';
import * as engine from '@/logic/audio/audioEngine';
import { getPokemonCryFilename } from '@/data/pokemon/pokemonCriesDatabase.ts';
import { toID } from '@/logic/utils/strings.ts';
import { AUDIO_MASTER_GAIN_VOLUME } from '@/logic/constants/audio';

type SoundDispatcher = (eng: typeof engine, ctx: AudioContext, dest: AudioNode) => void;

const SOUND_DISPATCH_MAP: Record<string, SoundDispatcher> = {
  shiny: (eng, ctx, dest) => eng.playShinySound(ctx, dest),
  rival: (eng, ctx, dest) => eng.playRivalEncounterSound(ctx, dest),
  levelUp: (eng, ctx, dest) => eng.playLevelUpSound(ctx, dest),
  evolution: (eng, ctx, dest) => eng.playEvolutionSound(ctx, dest),
  caught: (eng, ctx, dest) => eng.playCaptureSuccessSound(ctx, dest),
  flee: (eng, ctx, dest) => eng.playFleeSound(ctx, dest),
  item: (eng, ctx, dest) => eng.playItemSound(ctx, dest),
  sentMsg: (eng, ctx, dest) => eng.playMessageSentSound(ctx, dest),
  receivedMsg: (eng, ctx, dest) => eng.playMessageReceivedSound(ctx, dest),
  money: (eng, ctx, dest) => eng.playMoneySound(ctx, dest),
  heal: (eng, ctx, dest) => eng.playHealSound(ctx, dest),
  faint: (eng, ctx, dest) => eng.playFaintSound(ctx, dest),
  wobble: (eng, ctx, dest) => eng.playWobbleSound(ctx, dest),
  ballHit: (eng, ctx, dest) => eng.playBallHitSound(ctx, dest),
  statusDamage: (eng, ctx, dest) => eng.playStatusDamageSound(ctx, dest),
  victoryTrainer: (eng, ctx, dest) => eng.playVictoryTrainerSound(ctx, dest),
  defeat: (eng, ctx, dest) => eng.playDefeatSound(ctx, dest),
  steal: (eng, ctx, dest) => eng.playStealSound(ctx, dest),
  siren: (eng, ctx, dest) => eng.playSirenSound(ctx, dest),
  pvpChallenge: (eng, ctx, dest) => eng.playPvPChallengeSound(ctx, dest),
  criticalThrow: (eng, ctx, dest) => eng.playCriticalThrowSound(ctx, dest),
};

/**
 * AudioStore
 * Handles 8-bit sound synthesis using Web Audio API via audioEngine logic.
 */
export const useAudioStore = defineStore('audio', () => {
  const context = shallowRef<AudioContext | null>(null);
  const masterGain = shallowRef<GainNode | null>(null);
  const isInitialized = ref(false);

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

  const cryCache = new Map<string, AudioBuffer>();
  const cryPromiseCache = new Map<string, Promise<AudioBuffer>>();

  const fetchCryBuffer = async (name: string, ctx: AudioContext): Promise<AudioBuffer> => {
    const safeName = encodeURIComponent(name.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
    const safeBase = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
    const cryUrl = new URL(`${safeBase}cries/${safeName}.mp3`, window.location.origin);
    // fallow-ignore-next-line security-sink
    const response = await fetch(cryUrl.href);
    if (!response.ok) {
      throw new Error(`Cry file not found: ${cryUrl.pathname}`);
    }
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error(`Cry file not found (HTML redirect fallback): ${cryUrl.pathname}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  };

  const playCry = async (pokemonName: string, isFaint = false) => {
    if (!isInitialized.value) init();
    await resume();

    const ctx = context.value;
    const dest = masterGain.value;
    if (!ctx || !dest) return;

    const cleanName = toID(pokemonName);
    const cryToFetch = getPokemonCryFilename(cleanName);

    let buffer = cryCache.get(cryToFetch);

    if (!buffer) {
      const fetchPromise = cryPromiseCache.getOrInsertComputed(cryToFetch, () => fetchCryBuffer(cryToFetch, ctx));
      try {
        buffer = await fetchPromise;
        cryCache.set(cryToFetch, buffer);
        if (cryToFetch !== cleanName) {
          cryCache.set(cleanName, buffer);
        }
      } catch (err) {
        cryPromiseCache.delete(cryToFetch);
        logger.error('Audio', `Failed to load cry for ${pokemonName} (resolved to ${cryToFetch}): ${String(err)}`);
        return;
      }
    }

    if (!buffer) return;

    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      if (isFaint) {
        source.playbackRate.setValueAtTime(0.6, ctx.currentTime);
      } else {
        source.playbackRate.setValueAtTime(1.0, ctx.currentTime);
      }
      source.connect(dest);
      source.start(ctx.currentTime);
    } catch (err) {
      logger.error('Audio', `Failed to play cry for ${pokemonName}: ${String(err)}`);
    }
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
  }


  /**
   * Resumes the context.
   */
  const resume = async () => {
    if (!context.value) init();
    if (context.value && context.value.state === 'suspended') {
      await context.value.resume();
    }
  };

  const AUDIO_DEBOUNCE_WINDOW_MS = 60;
  const lastPlayTimeMap = new Map<string, number>();

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

    const dispatcher = SOUND_DISPATCH_MAP[type];
    if (dispatcher) {
      dispatcher(engine, ctx, dest);
    }
  };

  return {
    init,
    resume,
    play,
  };
});
