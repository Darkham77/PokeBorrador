import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useBattleCombatantState } from '@/components/battle/useBattleCombatantState';
import gsap from 'gsap';
import { setActivePinia, createPinia } from 'pinia';
import { FLEE_SLIDE_DISTANCE_PX } from '@/logic/constants/animations';

describe('Knockback, Teleport, and Flee Escape Trajectories', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('triggers knockback escape tween with back.in(1.7) ease and scale 0.5', () => {
    const gsapToSpy = vi.spyOn(gsap, 'to');
    const mockSprite = document.createElement('div');
    const spriteRef = ref(mockSprite);
    const emit = vi.fn();

    const props = {
      side: 'enemy' as const,
      pokemon: { id: 'machop', uid: 'enemy-machop-1', name: 'Machop', hp: 50, maxHp: 50, moves: [] },
      position: { x: 500, y: 300 },
      baseSize: 64
    };

    const state = useBattleCombatantState(props as any, emit, spriteRef);
    state.runEscapeAnimation('knockback');

    expect(gsapToSpy).toHaveBeenCalled();
    const callArgs = gsapToSpy.mock.calls[0];
    expect(callArgs).toBeDefined();

    const tweenProps = callArgs![1] as gsap.TweenVars;
    expect(tweenProps.x).toBe(FLEE_SLIDE_DISTANCE_PX);
    expect(tweenProps.scale).toBe(0.5);
    expect(tweenProps.opacity).toBe(0);
    expect(tweenProps.ease).toBe('back.in(1.7)');
    expect(tweenProps.duration).toBe(0.35);
  });

  it('triggers teleport escape tween with vertical stretch scaleY 2.0, scaleX 0.1, and brightness flare', () => {
    const mockTimeline = {
      to: vi.fn().mockReturnThis()
    };
    vi.spyOn(gsap, 'timeline').mockReturnValue(mockTimeline as any);

    const mockSprite = document.createElement('div');
    const spriteRef = ref(mockSprite);
    const emit = vi.fn();

    const props = {
      side: 'enemy' as const,
      pokemon: { id: 'abra', uid: 'wild-abra-1', name: 'Abra', hp: 25, maxHp: 25, moves: [] },
      position: { x: 500, y: 300 },
      baseSize: 64
    };

    const state = useBattleCombatantState(props as any, emit, spriteRef);
    state.runEscapeAnimation('teleport');

    expect(mockTimeline.to).toHaveBeenCalled();
    const callArgs = mockTimeline.to.mock.calls[0];
    expect(callArgs).toBeDefined();

    const tweenProps = callArgs![1] as gsap.TweenVars;
    expect(tweenProps.scaleY).toBe(2.0);
    expect(tweenProps.scaleX).toBe(0.1);
    expect(tweenProps.opacity).toBe(0);
    expect(tweenProps.filter).toBe('brightness(3) contrast(1.5)');
    expect(tweenProps.duration).toBe(0.4);
    expect(tweenProps.ease).toBe('power3.in');
  });

  it('triggers flee escape with smoke particles burst and horizontal slide', () => {
    const gsapToSpy = vi.spyOn(gsap, 'to');
    const mockSprite = document.createElement('div');
    const spriteRef = ref(mockSprite);
    const emit = vi.fn();

    const props = {
      side: 'player' as const,
      pokemon: { id: 'rattata', uid: 'player-rattata-1', name: 'Rattata', hp: 20, maxHp: 20, moves: [] },
      position: { x: 100, y: 200 },
      baseSize: 64
    };

    const state = useBattleCombatantState(props as any, emit, spriteRef);
    state.runEscapeAnimation('flee');

    // Smoke particles should be generated
    expect(state.smokeParticles.value.length).toBeGreaterThan(0);

    expect(gsapToSpy).toHaveBeenCalled();
    const callArgs = gsapToSpy.mock.calls[0];
    expect(callArgs).toBeDefined();

    const tweenProps = callArgs![1] as gsap.TweenVars;
    // Player flees towards left (negative x)
    expect(tweenProps.x).toBe(-FLEE_SLIDE_DISTANCE_PX);
    expect(tweenProps.scale).toBe(0.7);
    expect(tweenProps.opacity).toBe(0);
    expect(tweenProps.ease).toBe('power2.in');
    expect(tweenProps.duration).toBe(0.45);
  });
});
