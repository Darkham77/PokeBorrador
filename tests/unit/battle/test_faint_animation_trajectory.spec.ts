import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildFaintTimeline } from '@/components/battle/helpers/combatantActionAnims';
import { useBattleCaptureAnimations } from '@/composables/battle/useBattleCaptureAnimations';
import type { Pokemon } from '@/types/pokemon/pokemon';
import { gameBus } from '@/logic/events/gameBus';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import { gsap } from 'gsap';
import {
  COMBATANT_FAINT_Y_OFFSET,
  COMBATANT_FAINT_DURATION_SEC,
} from '@/logic/constants/animations';

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

describe('Faint Animation Trajectory and Divergence (Wild vs Owned)', () => {
  let spriteEl: HTMLElement;
  let shadowEl: HTMLElement;

  beforeEach(() => {
    setActivePinia(createPinia());
    spriteEl = document.createElement('div');
    shadowEl = document.createElement('div');
    vi.restoreAllMocks();
  });

  it('buildFaintTimeline drops wild sprite +80px with power2.in and hides ground shadow', () => {
    const mockPokemon: Pokemon = {
      id: 'caterpie',
      name: 'Caterpie',
      uid: 'wild-caterpie-1'
    } as Pokemon;

    const cryEvents: Array<{ name: string; isFaint?: boolean }> = [];
    const onCry = (e: Event) => {
      cryEvents.push((e as CustomEvent).detail);
    };
    gameBus.on('PLAY_CRY', onCry);

    const tl = buildFaintTimeline(spriteEl, mockPokemon, shadowEl);
    expect(tl).not.toBeNull();

    // Trigger any callback passed to tl.add
    const addCalls = (tl.add as ReturnType<typeof vi.fn>).mock.calls;
    for (const call of addCalls) {
      if (typeof call[0] === 'function') {
        call[0]();
      }
    }

    gameBus.off('PLAY_CRY', onCry);

    expect(cryEvents.length).toBeGreaterThan(0);
    expect(cryEvents[0]?.name).toBe('caterpie');
    expect(cryEvents[0]?.isFaint).toBe(true);

    // Verify gsap.set was called to hide shadow and disable transition
    expect(gsap.set).toHaveBeenCalledWith(shadowEl, { display: 'none' });
    expect(gsap.set).toHaveBeenCalledWith(spriteEl, { transition: 'none' });

    // Find the fall tween parameters passed to tl.to
    const toCalls = (tl.to as ReturnType<typeof vi.fn>).mock.calls;
    expect(toCalls.length).toBeGreaterThan(0);

    const fallVars = toCalls[0]![1] as Record<string, unknown>;
    expect(fallVars.y).toBe(COMBATANT_FAINT_Y_OFFSET);
    expect(fallVars.duration).toBe(COMBATANT_FAINT_DURATION_SEC);
    expect(fallVars.ease).toBe('power2.in');
  });

  it('handleFaintAnim triggers Pokéball recall (energy-catching) for owned/trainer Pokémon instead of falling slide', async () => {
    const mockBattleStore = {
      state: ref({ isTrainer: true, isGym: false }),
      player: { id: 'pikachu', name: 'Pikachu', uid: 'player-pika-1' } as Pokemon,
      enemy: { id: 'geodude', name: 'Geodude', uid: 'enemy-geo-1' } as Pokemon
    } as any;

    const captureAnims = useBattleCaptureAnimations(mockBattleStore, mockBattleStore.enemy);

    const cryEvents: Array<{ name: string; isFaint?: boolean }> = [];
    const soundEvents: string[] = [];

    const onCry = (e: Event) => {
      cryEvents.push((e as CustomEvent).detail);
    };
    const onSound = (e: Event) => {
      soundEvents.push((e as CustomEvent).detail);
    };

    gameBus.on('PLAY_CRY', onCry);
    gameBus.on('PLAY_SOUND', onSound);

    await captureAnims.handleFaintAnim({ side: 'player' });

    gameBus.off('PLAY_CRY', onCry);
    gameBus.off('PLAY_SOUND', onSound);

    expect(soundEvents).toContain('ballHit');
    expect(cryEvents.some((c) => c.name === 'pikachu' && c.isFaint === true)).toBe(true);
    expect(captureAnims.isFaintInProgress.value).toBe(false);
  });
});
