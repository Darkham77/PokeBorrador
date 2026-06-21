// fallow-ignore-file security-sink
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { logger } from '@/logic/utils/logger';
import { gameBus } from '@/logic/events/gameBus';
import * as engine from '@/logic/audio/audioEngine';

/**
 * AudioStore
 * Handles 8-bit sound synthesis using Web Audio API via audioEngine logic.
 */
export const useAudioStore = defineStore('audio', () => {
  const context = ref<AudioContext | null>(null);
  const masterGain = ref<GainNode | null>(null);
  const isInitialized = ref(false);

  /**
   * Initializes the audio context.
   */
  const init = () => {
    if (isInitialized.value) return;

    try {
      const win = window as unknown as { AudioContext: typeof AudioContext; webkitAudioContext: typeof AudioContext };
      const AudioContextClass = win.AudioContext || win.webkitAudioContext;
      context.value = new AudioContextClass();
      masterGain.value = context.value.createGain();
      masterGain.value.gain.value = 0.15; // Global volume
      masterGain.value.connect(context.value.destination);
      isInitialized.value = true;
      initListeners();
    } catch (e) {
      logger.error('Audio', `Web Audio API not supported: ${(e as Error).message}`);
    }
  };

  const cryCache = new Map<string, AudioBuffer>();

  const playCry = async (pokemonName: string, isFaint = false) => {
    if (!isInitialized.value) init();
    await resume();

    const ctx = context.value;
    const dest = masterGain.value;
    if (!ctx || !dest) return;

    const cleanName = pokemonName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let buffer = cryCache.get(cleanName);

    if (!buffer) {
      try {
        const response = await fetch(`/cries/${cleanName}.mp3`);
        if (!response.ok) {
          throw new Error(`Cry file not found: /cries/${cleanName}.mp3`);
        }
        const arrayBuffer = await response.arrayBuffer();
        buffer = await ctx.decodeAudioData(arrayBuffer);
        cryCache.set(cleanName, buffer);
      } catch (err) {
        logger.error('Audio', `Failed to load cry for ${pokemonName}: ${String(err)}`);
        return;
      }
    }

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

  /**
   * Plays a sound using the centralized engine.
   */
  const play = async (type: string) => {
    if (!isInitialized.value) init();
    await resume();

    const ctx = context.value;
    const dest = masterGain.value;
    if (!ctx || !dest) return;

    switch (type) {
      case 'shiny': engine.playShinySound(ctx, dest); break;
      case 'rival': engine.playRivalEncounterSound(ctx, dest); break;
      case 'levelUp': engine.playLevelUpSound(ctx, dest); break;
      case 'evolution': engine.playEvolutionSound(ctx, dest); break;
      case 'caught': engine.playCaptureSuccessSound(ctx, dest); break;
      case 'flee': engine.playFleeSound(ctx, dest); break;
      case 'item': engine.playItemSound(ctx, dest); break;
      case 'sentMsg': engine.playMessageSentSound(ctx, dest); break;
      case 'receivedMsg': engine.playMessageReceivedSound(ctx, dest); break;
      case 'money': engine.playMoneySound(ctx, dest); break;
      case 'heal': engine.playHealSound(ctx, dest); break;
      case 'faint': engine.playFaintSound(ctx, dest); break;
      case 'wobble': engine.playWobbleSound(ctx, dest); break;
      case 'ballHit': engine.playBallHitSound(ctx, dest); break;
      case 'statusDamage': engine.playStatusDamageSound(ctx, dest); break;
      case 'victoryTrainer': engine.playVictoryTrainerSound(ctx, dest); break;
      case 'defeat': engine.playDefeatSound(ctx, dest); break;
      case 'steal': engine.playStealSound(ctx, dest); break;
      case 'siren': engine.playSirenSound(ctx, dest); break;
    }
  };

  return {
    isInitialized,
    init,
    resume,
    play,
  };
});
