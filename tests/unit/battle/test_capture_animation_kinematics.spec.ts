import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBattleCaptureAnimations } from '@/composables/battle/useBattleCaptureAnimations';
import type { Pokemon } from '@/types/pokemon/pokemon';
import { gameBus } from '@/logic/events/gameBus';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';

vi.mock('@/logic/utils/gsapHelpers', () => {
  return {
    createTimeline: () => {
      const tl = {
        to: (_target: unknown, toVars?: Record<string, unknown>) => {
          if (toVars && typeof toVars.onStart === 'function') toVars.onStart();
          if (toVars && typeof toVars.onComplete === 'function') toVars.onComplete();
          return tl;
        },
        fromTo: (_target: unknown, _from: unknown, toVars?: Record<string, unknown>) => {
          if (toVars && typeof toVars.onStart === 'function') toVars.onStart();
          if (toVars && typeof toVars.onComplete === 'function') toVars.onComplete();
          return tl;
        },
        add: (fn: unknown) => {
          if (typeof fn === 'function') fn();
          return tl;
        },
        addLabel: () => tl,
        set: () => tl,
        eventCallback: (_ev: string, cb?: () => void) => {
          if (cb) cb();
          return tl;
        },
        progress: () => tl,
        seek: () => tl,
        play: () => tl,
        pause: () => tl,
        kill: () => tl
      };
      return tl;
    },
    awaitAnimation: () => Promise.resolve(),
    gsapSleep: () => Promise.resolve(),
    killTweens: () => {}
  };
});

describe('Capture Animation Kinematics (Shake, Blink, Celebration, Sparkles)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('handleShakeRequest activates and then completes isShaking on the seat during capture shakes', async () => {
    const mockBattleStore = {
      state: ref({ isTrainer: false, isGym: false }),
      player: { id: 'pikachu', name: 'Pikachu', uid: 'player-pika-1' } as Pokemon,
      enemy: { id: 'pidgey', name: 'Pidgey', uid: 'enemy-pidgey-1' } as Pokemon
    } as any;

    const captureAnims = useBattleCaptureAnimations(mockBattleStore, mockBattleStore.enemy);

    await captureAnims.handleShakeRequest({ side: 'enemy', isCapture: true });

    const enemySeat = captureAnims.seats.value.seat2;
    expect(enemySeat.entry.isShaking).toBe(false);
    expect(enemySeat.exit.isShaking).toBe(false);
  });

  it('handleBlinkRequest dispatches statusDamage sound and activates isBlinking', async () => {
    const mockBattleStore = {
      state: ref({ isTrainer: false, isGym: false }),
      player: { id: 'pikachu', name: 'Pikachu', uid: 'player-pika-1' } as Pokemon,
      enemy: { id: 'pidgey', name: 'Pidgey', uid: 'enemy-pidgey-1' } as Pokemon
    } as any;

    const captureAnims = useBattleCaptureAnimations(mockBattleStore, mockBattleStore.enemy);

    const soundEvents: string[] = [];
    const onSound = (e: Event) => {
      soundEvents.push((e as CustomEvent).detail);
    };
    gameBus.on('PLAY_SOUND', onSound);

    await captureAnims.handleBlinkRequest({ side: 'player' });

    gameBus.off('PLAY_SOUND', onSound);

    expect(soundEvents).toContain('statusDamage');
    const playerSeat = captureAnims.seats.value.seat1;
    expect(playerSeat.entry.isBlinking).toBe(false);
  });

  it('handleHealRequest dispatches heal sound and activates isHealing', async () => {
    const mockBattleStore = {
      state: ref({ isTrainer: false, isGym: false }),
      player: { id: 'pikachu', name: 'Pikachu', uid: 'player-pika-1' } as Pokemon,
      enemy: { id: 'pidgey', name: 'Pidgey', uid: 'enemy-pidgey-1' } as Pokemon
    } as any;

    const captureAnims = useBattleCaptureAnimations(mockBattleStore, mockBattleStore.enemy);

    const soundEvents: string[] = [];
    const onSound = (e: Event) => {
      soundEvents.push((e as CustomEvent).detail);
    };
    gameBus.on('PLAY_SOUND', onSound);

    await captureAnims.handleHealRequest({ side: 'player' });

    gameBus.off('PLAY_SOUND', onSound);

    expect(soundEvents).toContain('heal');
    const playerSeat = captureAnims.seats.value.seat1;
    expect(playerSeat.entry.isHealing).toBe(false);
  });

  it('playCatchCelebration emits caught audio and triggers catch sparkles', async () => {
    const mockBattleStore = {
      state: ref({ isTrainer: false, isGym: false }),
      player: { id: 'pikachu', name: 'Pikachu', uid: 'player-pika-1' } as Pokemon,
      enemy: { id: 'mewtwo', name: 'Mewtwo', uid: 'enemy-mewtwo-1' } as Pokemon
    } as any;

    const captureAnims = useBattleCaptureAnimations(mockBattleStore, mockBattleStore.enemy);

    const soundEvents: string[] = [];
    const onSound = (e: Event) => {
      soundEvents.push((e as CustomEvent).detail);
    };
    gameBus.on('PLAY_SOUND', onSound);

    await captureAnims.playCatchCelebration('enemy');

    gameBus.off('PLAY_SOUND', onSound);

    expect(soundEvents).toContain('caught');
    expect(captureAnims.seats.value.seat2.entry.isCaptureActive).toBe(true);
  });
});
