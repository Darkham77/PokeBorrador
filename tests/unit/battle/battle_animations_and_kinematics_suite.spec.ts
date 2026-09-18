// @vitest-environment jsdom
/**
 * tests/unit/battle/battle_animations_and_kinematics_suite.spec.ts
 * Consolidated domain test suite for battle animations and kinematics:
 * Combatant feedback animations (heal, recoil, shake, status flash, ball wobble),
 * attack action trajectories (physical dash, special pulse, status rotation, self-destruct),
 * and escape trajectories (whirlwind, knockback, teleport, flee).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import gsap from 'gsap';
import { isFlying } from '@/composables/battle/useBattleShadows';
import {
  animateCombatantEmerging,
  animateCombatantHeal,
  animateCombatantRecoil,
  animatePokeballWobble,
  animatePokeballBlink,
  animateSpriteShake,
  animateSpriteBlink,
  animateStatusFlash,
  executeCatchingTween,
  executeReleasingTween,
  STATUS_FLASH_COLORS
} from '@/components/battle/helpers/combatantFeedbackAnims';
import { buildAttackTimeline } from '@/components/battle/helpers/combatantActionAnims';
import { useBattleCombatantState } from '@/components/battle/useBattleCombatantState';
import { FLEE_SLIDE_DISTANCE_PX } from '@/logic/constants/animations';
import {
  ATTACK_PHYSICAL_PREP_DURATION_SEC,
  ATTACK_PHYSICAL_DASH_DURATION_SEC,
  ATTACK_PHYSICAL_RETURN_DURATION_SEC,
  ATTACK_SPECIAL_SCALE,
  ATTACK_SPECIAL_BRIGHTNESS,
  ATTACK_SPECIAL_DURATION_SEC,
  ATTACK_STATUS_ROTATION_DEG,
  ATTACK_STATUS_SCALE,
  ATTACK_STATUS_BRIGHTNESS,
  ATTACK_STATUS_DURATION_SEC,
  SELFKO_EXPLODE_SCALE,
  SELFKO_EXPLODE_BRIGHTNESS,
  SELFKO_EXPLODE_UP_DURATION_SEC,
  SELFKO_EXPLODE_DOWN_DURATION_SEC,
  SELFKO_SETTLE_DURATION_SEC
} from '@/logic/constants/animations';
import { gameBus } from '@/logic/events/gameBus';
import type { BattleCombatantProps } from '@/types/battle/battle';
import type { Pokemon } from '@/types/pokemon/pokemon';

// =============================================================================
// 1. Combatant Feedback & Status Animations
// =============================================================================
describe('Combatant Feedback Animations (combatantFeedbackAnims)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('correctly detects floating status for shadows and idle animations', () => {
    expect(isFlying({ id: 'butterfree' } as Pokemon)).toBe(true);
    expect(isFlying({ id: 'pikachu' } as Pokemon)).toBe(false);
  });

  it('provides valid hex colors for all major status conditions', () => {
    expect(STATUS_FLASH_COLORS.brn).toBe('#ff4500');
    expect(STATUS_FLASH_COLORS.psn).toBe('#9400d3');
    expect(STATUS_FLASH_COLORS.par).toBe('#ffd700');
    expect(STATUS_FLASH_COLORS.frz).toBe('#00ffff');
    expect(STATUS_FLASH_COLORS.slp).toBe('#ffffff');
    expect(STATUS_FLASH_COLORS.tox).toBe('#9400d3');
  });

  it('runs emerging, heal, and recoil animations without throwing', () => {
    const el = document.createElement('div');
    expect(() => animateCombatantEmerging(el)).not.toThrow();
    expect(() => animateCombatantHeal(el)).not.toThrow();
    expect(() => animateCombatantRecoil(el, true)).not.toThrow();
    expect(() => animateCombatantRecoil(el, false)).not.toThrow();
  });

  it('runs pokeball wobble, blink, sprite shake and sprite blink without throwing', () => {
    const el = document.createElement('div');
    expect(() => animatePokeballWobble(el)).not.toThrow();
    expect(() => animatePokeballBlink(el)).not.toThrow();
    expect(() => animateSpriteShake(el, true)).not.toThrow();
    expect(() => animateSpriteShake(el, false)).not.toThrow();
    expect(() => animateSpriteBlink(el, true)).not.toThrow();
    expect(() => animateSpriteBlink(el, false)).not.toThrow();
    expect(() => animateStatusFlash(el, 'brn')).not.toThrow();
  });

  it('executes catching and releasing tweens successfully with callbacks', () => {
    const sprite = document.createElement('div');
    const shadow = document.createElement('div');
    const rotation = document.createElement('div');
    const onCatchDone = vi.fn();
    const onReleaseDone = vi.fn();

    const catchTween = executeCatchingTween(sprite, shadow, rotation, '50% 100%', { x: 10, y: 20 }, onCatchDone);
    expect(catchTween).toBeDefined();

    const releaseTween = executeReleasingTween(sprite, shadow, rotation, '50% 100%', { x: 10, y: 20 }, 'pikachu', onReleaseDone);
    expect(releaseTween).toBeDefined();
  });
});

// =============================================================================
// 2. Attack Action Animations (buildAttackTimeline)
// =============================================================================
describe('Attack Action Animations (buildAttackTimeline)', () => {
  let spriteEl: HTMLElement;
  let rotationEl: HTMLElement;

  beforeEach(() => {
    spriteEl = document.createElement('div');
    rotationEl = document.createElement('div');
    vi.clearAllMocks();
  });

  it('returns null if no activeMove is present in props', () => {
    const props: BattleCombatantProps = {
      side: 'player',
      pokemon: { id: 'pikachu', name: 'Pikachu' } as Pokemon,
      position: { x: 100, y: 200 },
      baseSize: 64,
      activeMove: null
    };

    const tl = buildAttackTimeline(spriteEl, rotationEl, props);
    expect(tl).toBeNull();
  });

  it('creates physical attack dash timeline with prep, dash, and return steps', () => {
    const props: BattleCombatantProps = {
      side: 'player',
      pokemon: { id: 'pikachu', name: 'Pikachu' } as Pokemon,
      position: { x: 100, y: 200 },
      baseSize: 64,
      activeMove: {
        id: 'tackle',
        name: 'Placaje',
        cat: 'physical',
        side: 'player'
      }
    };

    const tl = buildAttackTimeline(spriteEl, rotationEl, props);
    expect(tl).not.toBeNull();

    // Verify calls to tl.to
    const toCalls = (tl!.to as ReturnType<typeof vi.fn>).mock.calls;
    expect(toCalls.length).toBe(3);

    // Call 0: Prep
    const prepVars = toCalls[0]![1] as Record<string, unknown>;
    expect(Number(prepVars.x)).toBeLessThan(0);
    expect(prepVars.duration).toBe(ATTACK_PHYSICAL_PREP_DURATION_SEC);

    // Call 1: Dash
    const dashVars = toCalls[1]![1] as Record<string, unknown>;
    expect(Number(dashVars.x)).toBeGreaterThan(0);
    expect(dashVars.scale).toBe(ATTACK_SPECIAL_SCALE);
    expect(dashVars.duration).toBe(ATTACK_PHYSICAL_DASH_DURATION_SEC);

    // Call 2: Return
    const returnVars = toCalls[2]![1] as Record<string, unknown>;
    expect(returnVars.x).toBe(0);
    expect(returnVars.scale).toBe(1);
    expect(returnVars.duration).toBe(ATTACK_PHYSICAL_RETURN_DURATION_SEC);
  });

  it('inverts horizontal direction for enemy physical attack (nx < 0)', () => {
    const props: BattleCombatantProps = {
      side: 'enemy',
      pokemon: { id: 'rattata', name: 'Rattata' } as Pokemon,
      position: { x: 500, y: 300 },
      baseSize: 64,
      activeMove: {
        id: 'scratch',
        name: 'Arañazo',
        cat: 'physical',
        side: 'enemy'
      }
    };

    const tl = buildAttackTimeline(spriteEl, rotationEl, props);
    expect(tl).not.toBeNull();

    const toCalls = (tl!.to as ReturnType<typeof vi.fn>).mock.calls;
    const dashVars = toCalls[1]![1] as Record<string, unknown>;
    expect(Number(dashVars.x)).toBeLessThan(0);
  });

  it('calculates enemy attack trajectory towards player shadow with reverse windup (prep)', () => {
    const playerPos = { x: 1000, y: 1233 };
    const enemyPos = { x: 1600, y: 1167 };
    const enemyBase = 200;

    const enemyProps: BattleCombatantProps = {
      side: 'enemy',
      pokemon: { id: 'pidgey', name: 'Pidgey' } as Pokemon,
      position: enemyPos,
      targetPosition: playerPos,
      baseSize: enemyBase,
      activeMove: { id: 'tackle', name: 'Placaje', cat: 'physical', side: 'enemy' }
    };
    const enemyTl = buildAttackTimeline(spriteEl, rotationEl, enemyProps);
    expect(enemyTl).not.toBeNull();
    const enemyCalls = (enemyTl!.to as ReturnType<typeof vi.fn>).mock.calls;
    const enemyPrep = enemyCalls[0]![1] as Record<string, number>;
    const enemyDash = enemyCalls[1]![1] as Record<string, number>;

    // Enemy dash must aim down-left towards player shadow (nx < 0, ny > 0)
    expect(enemyDash.x).toBeLessThan(0);
    expect(enemyDash.y).toBeGreaterThan(0);
    // Enemy prep (retroceso) must aim in the exact opposite direction (up-right: x > 0, y < 0)
    expect(enemyPrep.x).toBeGreaterThan(0);
    expect(enemyPrep.y).toBeLessThan(0);
  });

  it('calculates player attack trajectory towards enemy shadow with reverse windup (prep)', () => {
    const playerPos = { x: 1000, y: 1233 };
    const enemyPos = { x: 1600, y: 1167 };
    const playerBase = 300;

    const playerProps: BattleCombatantProps = {
      side: 'player',
      pokemon: { id: 'gengar', name: 'Gengar' } as Pokemon,
      position: playerPos,
      targetPosition: enemyPos,
      baseSize: playerBase,
      activeMove: { id: 'shadowpunch', name: 'Puño Sombra', cat: 'physical', side: 'player' }
    };
    const playerTl = buildAttackTimeline(spriteEl, rotationEl, playerProps);
    expect(playerTl).not.toBeNull();
    const playerCalls = (playerTl!.to as ReturnType<typeof vi.fn>).mock.calls;
    const playerPrep = playerCalls[0]![1] as Record<string, number>;
    const playerDash = playerCalls[1]![1] as Record<string, number>;

    // Player dash must aim up-right towards enemy shadow (nx > 0, ny < 0)
    expect(playerDash.x).toBeGreaterThan(0);
    expect(playerDash.y).toBeLessThan(0);
    // Player prep (retroceso) must aim in the exact opposite direction (down-left: x < 0, y > 0)
    expect(playerPrep.x).toBeLessThan(0);
    expect(playerPrep.y).toBeGreaterThan(0);
  });

  it('dynamically adjusts attack angle to target seat in 2v2 multi-seat setups', () => {
    const playerSeat1Pos = { x: 1000, y: 1233 };
    const enemySeat2Pos = { x: 1600, y: 1167 };
    const enemySeat4Pos = { x: 1900, y: 950 };

    // Player 1 attacks Enemy 1 (Seat 2)
    const attackSeat2Props: BattleCombatantProps = {
      side: 'player',
      pokemon: { id: 'gengar', name: 'Gengar' } as Pokemon,
      position: playerSeat1Pos,
      targetPosition: enemySeat2Pos,
      baseSize: 300,
      activeMove: { id: 'shadowpunch', name: 'Puño Sombra', cat: 'physical', side: 'player' }
    };
    const tlSeat2 = buildAttackTimeline(spriteEl, rotationEl, attackSeat2Props);
    const dashSeat2 = (tlSeat2!.to as ReturnType<typeof vi.fn>).mock.calls[1]![1] as Record<string, number>;
    const dashSeat2X = Number(dashSeat2.x);
    const dashSeat2Y = Number(dashSeat2.y);

    vi.clearAllMocks();

    // Player 1 attacks Enemy 2 (Seat 4)
    const attackSeat4Props: BattleCombatantProps = {
      side: 'player',
      pokemon: { id: 'gengar', name: 'Gengar' } as Pokemon,
      position: playerSeat1Pos,
      targetPosition: enemySeat4Pos,
      baseSize: 300,
      activeMove: { id: 'shadowpunch', name: 'Puño Sombra', cat: 'physical', side: 'player' }
    };
    const tlSeat4 = buildAttackTimeline(spriteEl, rotationEl, attackSeat4Props);
    const dashSeat4 = (tlSeat4!.to as ReturnType<typeof vi.fn>).mock.calls[1]![1] as Record<string, number>;
    const dashSeat4X = Number(dashSeat4.x);
    const dashSeat4Y = Number(dashSeat4.y);

    // The angle towards Seat 4 must be distinct from Seat 2 and reflect the higher and further position
    expect(dashSeat4X).toBeGreaterThan(0);
    expect(dashSeat4Y).toBeLessThan(0);
    expect(dashSeat4X).not.toBeCloseTo(dashSeat2X, 2);
    expect(dashSeat4Y).not.toBeCloseTo(dashSeat2Y, 2);

    vi.clearAllMocks();

    // Enemy 2 (Seat 4) counterattacks Player 1 (Seat 1) -> must be exact opposite trajectory
    const counterProps: BattleCombatantProps = {
      side: 'enemy',
      pokemon: { id: 'aerodactyl', name: 'Aerodactyl' } as Pokemon,
      position: enemySeat4Pos,
      targetPosition: playerSeat1Pos,
      baseSize: 200,
      activeMove: { id: 'bite', name: 'Mordisco', cat: 'physical', side: 'enemy' }
    };
    const tlCounter = buildAttackTimeline(spriteEl, rotationEl, counterProps);
    const dashCounter = (tlCounter!.to as ReturnType<typeof vi.fn>).mock.calls[1]![1] as Record<string, number>;

    expect(Number(dashCounter.x)).toBeCloseTo(-dashSeat4X, 2);
    expect(Number(dashCounter.y)).toBeCloseTo(-dashSeat4Y, 2);
  });

  it('creates special attack timeline with radial pulse and brightness flare', () => {
    const props: BattleCombatantProps = {
      side: 'player',
      pokemon: { id: 'charizard', name: 'Charizard' } as Pokemon,
      position: { x: 100, y: 200 },
      baseSize: 96,
      activeMove: {
        id: 'flamethrower',
        name: 'Lanzallamas',
        cat: 'special',
        side: 'player'
      }
    };

    const tl = buildAttackTimeline(spriteEl, rotationEl, props);
    expect(tl).not.toBeNull();

    const fromToCalls = (tl!.fromTo as ReturnType<typeof vi.fn>).mock.calls;
    expect(fromToCalls.length).toBe(1);

    const toVars = fromToCalls[0]![2] as Record<string, unknown>;
    expect(toVars.scale).toBe(ATTACK_SPECIAL_SCALE);
    expect(toVars.filter).toBe(`Brightness(${ATTACK_SPECIAL_BRIGHTNESS})`);
    expect(toVars.yoyo).toBe(true);
    expect(toVars.repeat).toBe(1);
    expect(toVars.duration).toBe(ATTACK_SPECIAL_DURATION_SEC);
  });

  it('creates status attack timeline on spriteRotationEl with lateral rotation wobble', () => {
    const props: BattleCombatantProps = {
      side: 'player',
      pokemon: { id: 'butterfree', name: 'Butterfree' } as Pokemon,
      position: { x: 100, y: 200 },
      baseSize: 64,
      activeMove: {
        id: 'sleeppowder',
        name: 'Somnífero',
        cat: 'status',
        side: 'player'
      }
    };

    const tl = buildAttackTimeline(spriteEl, rotationEl, props);
    expect(tl).not.toBeNull();

    const fromToCalls = (tl!.fromTo as ReturnType<typeof vi.fn>).mock.calls;
    expect(fromToCalls.length).toBe(1);

    const targetEl = fromToCalls[0]![0];
    expect(targetEl).toBe(rotationEl);

    const toVars = fromToCalls[0]![2] as Record<string, unknown>;
    expect(toVars.rotation).toBe(ATTACK_STATUS_ROTATION_DEG);
    expect(toVars.scale).toBe(ATTACK_STATUS_SCALE);
    expect(toVars.filter).toBe(`Brightness(${ATTACK_STATUS_BRIGHTNESS})`);
    expect(toVars.yoyo).toBe(true);
    expect(toVars.repeat).toBe(1);
    expect(toVars.duration).toBe(ATTACK_STATUS_DURATION_SEC);
  });

  it('creates self-KO explosion timeline for selfdestruct and explosion moves', () => {
    const props: BattleCombatantProps = {
      side: 'enemy',
      pokemon: { id: 'voltorb', name: 'Voltorb' } as Pokemon,
      position: { x: 500, y: 300 },
      baseSize: 64,
      activeMove: {
        id: 'explosion',
        name: 'Explosión',
        cat: 'physical',
        side: 'enemy'
      }
    };

    const tl = buildAttackTimeline(spriteEl, rotationEl, props);
    expect(tl).not.toBeNull();

    const toCalls = (tl!.to as ReturnType<typeof vi.fn>).mock.calls;
    expect(toCalls.length).toBeGreaterThanOrEqual(3);

    // Explode Up
    const explodeUpVars = toCalls[toCalls.length - 3]![1] as Record<string, unknown>;
    expect(explodeUpVars.scale).toBe(SELFKO_EXPLODE_SCALE);
    expect(explodeUpVars.filter).toContain(`Brightness(${SELFKO_EXPLODE_BRIGHTNESS})`);
    expect(explodeUpVars.duration).toBe(SELFKO_EXPLODE_UP_DURATION_SEC);

    // Collapse
    const collapseVars = toCalls[toCalls.length - 2]![1] as Record<string, unknown>;
    expect(collapseVars.scale).toBe(0);
    expect(collapseVars.opacity).toBe(0);
    expect(collapseVars.duration).toBe(SELFKO_EXPLODE_DOWN_DURATION_SEC);

    // Settle / Reset
    const settleVars = toCalls[toCalls.length - 1]![1] as Record<string, unknown>;
    expect(settleVars.scale).toBe(1);
    expect(settleVars.opacity).toBe(1);
    expect(settleVars.clearProps).toBe('all');
    expect(settleVars.duration).toBe(SELFKO_SETTLE_DURATION_SEC);
  });

  it('emits PLAY_CRY for voice-based sound moves', () => {
    const cryEvents: Array<{ name: string }> = [];
    const onCry = (e: Event) => {
      cryEvents.push((e as CustomEvent).detail);
    };
    gameBus.on('PLAY_CRY', onCry);

    const props: BattleCombatantProps = {
      side: 'player',
      pokemon: { id: 'jigglypuff', name: 'Jigglypuff' } as Pokemon,
      position: { x: 100, y: 200 },
      baseSize: 64,
      activeMove: {
        id: 'sing',
        name: 'Canto',
        cat: 'status',
        side: 'player'
      }
    };

    const tl = buildAttackTimeline(spriteEl, rotationEl, props);
    expect(tl).not.toBeNull();

    const addCalls = (tl!.add as ReturnType<typeof vi.fn>).mock.calls;
    for (const call of addCalls) {
      if (typeof call[0] === 'function') {
        call[0]();
      }
    }

    gameBus.off('PLAY_CRY', onCry);

    expect(cryEvents.length).toBeGreaterThan(0);
    expect(cryEvents[0]?.name).toBe('jigglypuff');
  });
});

// =============================================================================
// 3. Escape Trajectories (Whirlwind, Knockback, Teleport, Flee)
// =============================================================================
describe('Escape Trajectories & GSAP Tweens', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  afterEach(() => {
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

    expect(tweenProps.x).toBe(-200);
    expect(tweenProps.y).toBe(-180);
    expect(tweenProps.rotation).toBe(720);
    expect(tweenProps.scale).toBe(0.1);
    expect(tweenProps.opacity).toBe(0);
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

    expect(state.smokeParticles.value.length).toBeGreaterThan(0);

    expect(gsapToSpy).toHaveBeenCalled();
    const callArgs = gsapToSpy.mock.calls[0];
    expect(callArgs).toBeDefined();

    const tweenProps = callArgs![1] as gsap.TweenVars;
    expect(tweenProps.x).toBe(-FLEE_SLIDE_DISTANCE_PX);
    expect(tweenProps.opacity).toBe(0);
  });
});
