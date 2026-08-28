import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useBattleCombatantState } from '@/components/battle/useBattleCombatantState';
import gsap from 'gsap';

describe('Whirlwind Animation Trajectory & GSAP Tweens', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers whirlwind escape tween with upward and outward diagonal trajectory for enemy', () => {
    const gsapToSpy = vi.spyOn(gsap, 'to');
    const mockSprite = document.createElement('div');
    const spriteRef = ref(mockSprite);
    const emit = vi.fn();

    const props = {
      side: 'enemy' as const,
      pokemon: { id: 'caterpie', uid: 'enemy-caterpie-1', name: 'Caterpie', hp: 18, maxHp: 18, moves: [] },
      modelValue: { id: 'caterpie', uid: 'enemy-caterpie-1', name: 'Caterpie', hp: 18, maxHp: 18, moves: [] },
      playerCombatantRef: null,
      enemyCombatantRef: null,
      playerModel: null,
      enemyModel: null,
      isExiting: false,
      isIntro: false,
      isCapturing: false,
      activeMove: null,
      position: { x: 100, y: 100 }
    };

    const state = useBattleCombatantState(props as any, emit, spriteRef);
    state.runEscapeAnimation('whirlwind');

    expect(gsapToSpy).toHaveBeenCalled();
    const callArgs = gsapToSpy.mock.calls[0];
    expect(callArgs).toBeDefined();
    const tweenProps = callArgs![1] as gsap.TweenVars;

    // Must move diagonally UP (negative y) and to the right (positive x for enemy)
    expect(tweenProps.x).toBe(200);
    expect(tweenProps.y).toBe(-180);
    expect(tweenProps.rotation).toBe(720);
    expect(tweenProps.scale).toBe(0.1);
    expect(tweenProps.opacity).toBe(0);
  });

  it('triggers whirlwind escape tween with upward and outward diagonal trajectory for player', () => {
    const gsapToSpy = vi.spyOn(gsap, 'to');
    const mockSprite = document.createElement('div');
    const spriteRef = ref(mockSprite);
    const emit = vi.fn();

    const props = {
      side: 'player' as const,
      pokemon: { id: 'pidgeot', uid: 'player-pidgeot-1', name: 'Pidgeot', hp: 92, maxHp: 92, moves: [] },
      modelValue: { id: 'pidgeot', uid: 'player-pidgeot-1', name: 'Pidgeot', hp: 92, maxHp: 92, moves: [] },
      playerCombatantRef: null,
      enemyCombatantRef: null,
      playerModel: null,
      enemyModel: null,
      isExiting: false,
      isIntro: false,
      isCapturing: false,
      activeMove: null,
      position: { x: 100, y: 100 }
    };

    const state = useBattleCombatantState(props as any, emit, spriteRef);
    state.runEscapeAnimation('whirlwind');

    expect(gsapToSpy).toHaveBeenCalled();
    const callArgs = gsapToSpy.mock.calls[0];
    expect(callArgs).toBeDefined();
    const tweenProps = callArgs![1] as gsap.TweenVars;

    // Must move diagonally UP (negative y) and to the left (negative x for player)
    expect(tweenProps.x).toBe(-200);
    expect(tweenProps.y).toBe(-180);
    expect(tweenProps.rotation).toBe(720);
    expect(tweenProps.scale).toBe(0.1);
    expect(tweenProps.opacity).toBe(0);
  });
});
