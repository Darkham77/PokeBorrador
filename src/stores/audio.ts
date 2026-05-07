import { defineStore } from 'pinia';
import { ref } from 'vue';
import { logger } from '@/logic/utils/logger';
import { gameBus } from '@/logic/gameBus';
import * as engine from '@/logic/audioEngine';

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
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
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

  const initListeners = () => {
    gameBus.on('PLAY_SOUND', (e: any) => {
      const type = e.detail || e
      play(type)
    })
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
    }
  };

  return {
    isInitialized,
    init,
    resume,
    play,
    // Shortcuts
    shiny: () => play('shiny'),
    rival: () => play('rival'),
    levelUp: () => play('levelUp'),
    evolution: () => play('evolution'),
    caught: () => play('caught'),
    flee: () => play('flee'),
    item: () => play('item'),
    sentMsg: () => play('sentMsg'),
    receivedMsg: () => play('receivedMsg'),
    money: () => play('money'),
    heal: () => play('heal'),
    faint: () => play('faint'),
    wobble: () => play('wobble'),
    ballHit: () => play('ballHit'),
    statusDamage: () => play('statusDamage')
  };
});
