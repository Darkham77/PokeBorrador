import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildAttackTimeline } from '@/components/battle/helpers/combatantActionAnims';
import type { BattleCombatantProps } from '@/types/battle/battle';
import type { Pokemon } from '@/types/pokemon/pokemon';
import { gameBus } from '@/logic/events/gameBus';
import {
  ATTACK_DASH_DISTANCE_PX,
  ATTACK_PREP_DISTANCE_PX,
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
  SELFKO_SETTLE_DURATION_SEC,
} from '@/logic/constants/animations';

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
    expect(prepVars.x).toBe(ATTACK_PREP_DISTANCE_PX);
    expect(prepVars.duration).toBe(ATTACK_PHYSICAL_PREP_DURATION_SEC);

    // Call 1: Dash
    const dashVars = toCalls[1]![1] as Record<string, unknown>;
    expect(dashVars.x).toBe(ATTACK_DASH_DISTANCE_PX);
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
    expect(dashVars.x).toBe(-ATTACK_DASH_DISTANCE_PX);
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
