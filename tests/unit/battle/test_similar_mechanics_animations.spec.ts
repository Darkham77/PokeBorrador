import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildFaintTimeline, buildAttackTimeline } from '@/components/battle/helpers/combatantActionAnims';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';
import type { BattleCombatantProps } from '@/types/battle/battle';
import { gameBus } from '@/logic/events/gameBus';
import { setActivePinia, createPinia } from 'pinia';
import { gsap } from 'gsap';
import {
  COMBATANT_FAINT_Y_OFFSET,
  COMBATANT_FAINT_DURATION_SEC,
  SELFKO_EXPLODE_SCALE,
  SELFKO_EXPLODE_UP_DURATION_SEC
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

describe('Animation Parity for Similar Battle Mechanics (Pivots, Phazing, Inmolation, and Double Faint)', () => {
  let spriteEl: HTMLElement;
  let shadowEl: HTMLElement;
  let rotationEl: HTMLElement;

  beforeEach(() => {
    setActivePinia(createPinia());
    spriteEl = document.createElement('div');
    shadowEl = document.createElement('div');
    rotationEl = document.createElement('div');
    vi.restoreAllMocks();
  });

  it('Faint Animation on Recoil KO / Double KO: triggers faint cry and drops sprite with ground shadow suppression', () => {
    const mockMon: Pokemon = {
      id: 'golem',
      name: 'Golem',
      uid: 'p1-golem'
    } as Pokemon;

    const cryEvents: Array<{ name: string; isFaint?: boolean }> = [];
    const onCry = (e: Event) => {
      cryEvents.push((e as CustomEvent).detail);
    };
    gameBus.on('PLAY_CRY', onCry);

    const tl = buildFaintTimeline(spriteEl, mockMon, shadowEl);
    expect(tl).not.toBeNull();

    // Trigger all timeline callbacks
    const addCalls = (tl.add as ReturnType<typeof vi.fn>).mock.calls;
    for (const call of addCalls) {
      if (typeof call[0] === 'function') {
        call[0]();
      }
    }

    gameBus.off('PLAY_CRY', onCry);

    expect(cryEvents.length).toBeGreaterThan(0);
    expect(cryEvents[0]?.name).toBe('golem');
    expect(cryEvents[0]?.isFaint).toBe(true);

    expect(gsap.set).toHaveBeenCalledWith(shadowEl, { display: 'none' });
    expect(gsap.set).toHaveBeenCalledWith(spriteEl, { transition: 'none' });

    const toCalls = (tl.to as ReturnType<typeof vi.fn>).mock.calls;
    expect(toCalls.length).toBeGreaterThan(0);
    const dropTween = toCalls.find((call) => call[1]?.y === COMBATANT_FAINT_Y_OFFSET);
    expect(dropTween).toBeDefined();
    expect(dropTween?.[1]?.duration).toBe(COMBATANT_FAINT_DURATION_SEC);
  });

  it('Inmolation / Self-Destruct Animation: triggers explosion shake and scale bloom', () => {
    const props: BattleCombatantProps = {
      pokemon: { id: 'golem', name: 'Golem', uid: 'p1-golem' } as Pokemon,
      side: 'player',
      activeMove: { id: 'explosion', name: 'Explosion', cat: 'physical' } as Move,
      position: { x: 100, y: 200 },
      baseSize: 64,
      targetPosition: { x: 300, y: 200 }
    } as BattleCombatantProps;

    const tl = buildAttackTimeline(spriteEl, rotationEl, props);
    expect(tl).not.toBeNull();

    const toCalls = (tl!.to as ReturnType<typeof vi.fn>).mock.calls;
    expect(toCalls.length).toBeGreaterThan(0);

    // Find the explosion scale tween
    const explodeTween = toCalls.find((call) => call[1]?.scale === SELFKO_EXPLODE_SCALE);
    expect(explodeTween).toBeDefined();
    expect(explodeTween?.[1]?.duration).toBe(SELFKO_EXPLODE_UP_DURATION_SEC);
  });

  it('Physical Pivot & Phazing Move Animations (U-turn / Dragon Tail): triggers forward dash and return', () => {
    const props: BattleCombatantProps = {
      pokemon: { id: 'crobat', name: 'Crobat', uid: 'p1-crobat' } as Pokemon,
      side: 'player',
      activeMove: { id: 'uturn', name: 'U-turn', cat: 'physical' } as Move,
      position: { x: 100, y: 200 },
      baseSize: 64,
      targetPosition: { x: 300, y: 200 }
    } as BattleCombatantProps;

    const tl = buildAttackTimeline(spriteEl, rotationEl, props);
    expect(tl).not.toBeNull();

    const toCalls = (tl!.to as ReturnType<typeof vi.fn>).mock.calls;
    expect(toCalls.length).toBeGreaterThan(0);

    // Verify physical prep and dash forward
    const dashCall = toCalls.find((call) => typeof call[1]?.x === 'number' && typeof call[1]?.y === 'number');
    expect(dashCall).toBeDefined();
  });

  it('Special Pivot Move Animation (Volt Switch): triggers special pulse and brightness bloom', () => {
    const props: BattleCombatantProps = {
      pokemon: { id: 'tapukoko', name: 'Tapu Koko', uid: 'p1-tapukoko' } as Pokemon,
      side: 'player',
      activeMove: { id: 'voltswitch', name: 'Volt Switch', cat: 'special' } as Move,
      position: { x: 100, y: 200 },
      baseSize: 64,
      targetPosition: { x: 300, y: 200 }
    } as BattleCombatantProps;

    const tl = buildAttackTimeline(spriteEl, rotationEl, props);
    expect(tl).not.toBeNull();

    const fromToCalls = (tl!.fromTo as ReturnType<typeof vi.fn>).mock.calls;
    expect(fromToCalls.length).toBeGreaterThan(0);

    const specialPulseCall = fromToCalls.find((call) => typeof call[2]?.filter === 'string' && call[2]?.filter.includes('Brightness'));
    expect(specialPulseCall).toBeDefined();
    expect(specialPulseCall?.[2]?.yoyo).toBe(true);
  });
});
