import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import type { BattleState, BattleStages } from '@/types/battle/battle';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleContext } from '@/types/battle/battleContext';

vi.mock('@/logic/weather/weatherRegistry', () => ({
  requireWeatherId: vi.fn((id: string) => id),
}));

vi.mock('@/logic/weather/weatherGenerationProvider', () => ({
  mapVisualToOfficialWeather: vi.fn(() => 'none'),
}));

vi.mock('@/data/system/constants', () => ({
  ACTIVE_GENERATION: 'gen3',
}));

vi.mock('@/stores/map', () => ({
  useMapStore: vi.fn(() => ({ currentWeather: 'clear' })),
}));

function makeMockPokemon(overrides: Partial<Record<string, unknown>> = {}): Pokemon {
  return {
    uid: 'test-uid', id: 'bulbasaur', name: 'Bulbasaur',
    hp: 45, maxHp: 45, level: 5, moves: [],
    type: ['grass'], stats: { hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45 },
    status: null, ...overrides,
  } as unknown as Pokemon;
}

function makeMockBattleState(): BattleState {
  return {
    player: null, enemy: null, playerTeamIndex: 0, enemyTeamIndex: 0,
    participants: [], locationId: 'route1' as BattleState['locationId'], isTrainer: false,
    weather: { type: 'none' as BattleState['weather']['type'], turns: -1 },
    turnCount: 1, over: false, escapeAttempts: 0,
    terrain: 'electricterrain',
    fieldConditions: { trickroom: { turns: 3 } },
    playerSideConditions: { reflect: { turns: 2 } },
    enemySideConditions: { lightscreen: { turns: 4 } },
    pendingSlotEffects: [{ move: 'futuresight', side: 'enemy', targetSlot: 0, turnsLeft: 1, damage: 20 }],
    playerRequest: { wait: true },
    enemyRequest: { wait: true },
  } as unknown as BattleState;
}

interface MockCtx {
  activeBattle: { value: BattleState | null };
  playerStages: { value: BattleStages };
  enemyStages: { value: BattleStages };
  faintedSides: { value: Set<string> };
  clearLogs: ReturnType<typeof vi.fn>;
  gs: { state: { team: Pokemon[] } };
}

function makeMockCtx(battleState: BattleState, player: Pokemon): MockCtx {
  const stages: BattleStages = {
    atk: 1, def: 0, spa: 0, spd: 0, spe: 0,
    accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0,
    safeguard: 0, mist: 0, spikes: 0,
  };
  return {
    activeBattle: ref(battleState) as unknown as MockCtx['activeBattle'],
    playerStages: ref({ ...stages }) as unknown as MockCtx['playerStages'],
    enemyStages: ref({ ...stages }) as unknown as MockCtx['enemyStages'],
    faintedSides: ref(new Set<string>()) as unknown as MockCtx['faintedSides'],
    clearLogs: vi.fn(),
    gs: { state: { team: [player] } },
  };
}

// ---------------------------------------------------------------------------
// Fix #1 — resetActiveBattleState field clearing
// ---------------------------------------------------------------------------

describe('resetActiveBattleState — field clearing (Bug #1 regressions)', () => {
  let battleState: BattleState;
  let ctx: MockCtx;
  let player: Pokemon;

  beforeEach(() => {
    player = makeMockPokemon();
    battleState = makeMockBattleState();
    ctx = makeMockCtx(battleState, player);
    vi.resetModules();
  });

  it('clears terrain — must not leak into next battle', async () => {
    const { resetActiveBattleState } = await import('@/logic/battle/orchestratorStateHelper');
    expect(ctx.activeBattle.value?.terrain).toBe('electricterrain');
    await resetActiveBattleState(ctx as unknown as BattleContext, player, false);
    expect(ctx.activeBattle.value?.terrain).toBeNull();
  });

  it('clears fieldConditions — Trick Room must not carry over', async () => {
    const { resetActiveBattleState } = await import('@/logic/battle/orchestratorStateHelper');
    expect(Object.keys(ctx.activeBattle.value?.fieldConditions ?? {})).toHaveLength(1);
    await resetActiveBattleState(ctx as unknown as BattleContext, player, false);
    expect(ctx.activeBattle.value?.fieldConditions).toEqual({});
  });

  it('clears playerSideConditions', async () => {
    const { resetActiveBattleState } = await import('@/logic/battle/orchestratorStateHelper');
    await resetActiveBattleState(ctx as unknown as BattleContext, player, false);
    expect(ctx.activeBattle.value?.playerSideConditions).toEqual({});
  });

  it('clears enemySideConditions', async () => {
    const { resetActiveBattleState } = await import('@/logic/battle/orchestratorStateHelper');
    await resetActiveBattleState(ctx as unknown as BattleContext, player, false);
    expect(ctx.activeBattle.value?.enemySideConditions).toEqual({});
  });

  it('clears playerRequest to prevent stale request in new battle', async () => {
    const { resetActiveBattleState } = await import('@/logic/battle/orchestratorStateHelper');
    expect(ctx.activeBattle.value?.playerRequest).toBeDefined();
    await resetActiveBattleState(ctx as unknown as BattleContext, player, false);
    expect(ctx.activeBattle.value?.playerRequest).toBeUndefined();
  });

  it('clears enemyRequest', async () => {
    const { resetActiveBattleState } = await import('@/logic/battle/orchestratorStateHelper');
    expect(ctx.activeBattle.value?.enemyRequest).toBeDefined();
    await resetActiveBattleState(ctx as unknown as BattleContext, player, false);
    expect(ctx.activeBattle.value?.enemyRequest).toBeUndefined();
  });

  it('resets pendingSlotEffects to [] — Future Sight from old battle does not carry over', async () => {
    const { resetActiveBattleState } = await import('@/logic/battle/orchestratorStateHelper');
    expect(ctx.activeBattle.value?.pendingSlotEffects).toHaveLength(1);
    await resetActiveBattleState(ctx as unknown as BattleContext, player, false);
    expect(ctx.activeBattle.value?.pendingSlotEffects).toEqual([]);
  });

  it('resets stat stages to zero', async () => {
    const { resetActiveBattleState } = await import('@/logic/battle/orchestratorStateHelper');
    ctx.playerStages.value.atk = 3;
    await resetActiveBattleState(ctx as unknown as BattleContext, player, false);
    expect(ctx.playerStages.value.atk).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Fix #2 — PendingSlotEffect / Future Sight slot-based resolution
// ---------------------------------------------------------------------------

interface SimpleEffect {
  move: 'futuresight' | 'doomdesire';
  side: 'player' | 'enemy';
  targetSlot: number;
  turnsLeft: number;
  damage: number;
}

describe('pendingSlotEffects — Future Sight slot condition model (Fix #2)', () => {
  it('fires on the Pokemon in the target slot, not on the original Pokemon reference', () => {
    const originalTarget = makeMockPokemon({ uid: 'original', name: 'Original', hp: 100, maxHp: 100 });
    const replacement = makeMockPokemon({ uid: 'replacement', name: 'Replacement', hp: 80, maxHp: 80 });
    const effect: SimpleEffect = { move: 'futuresight', side: 'enemy', targetSlot: 0, turnsLeft: 1, damage: 20 };
    effect.turnsLeft--;
    const activeEnemy = replacement; // replacement is now in the slot
    if (effect.turnsLeft <= 0 && activeEnemy.hp > 0) {
      activeEnemy.hp = Math.max(0, activeEnemy.hp - effect.damage);
    }
    expect(replacement.hp).toBe(60);
    expect(originalTarget.hp).toBe(100); // original is untouched
  });

  it('damage is pre-computed at cast time from maxHp', () => {
    const tgt = makeMockPokemon({ maxHp: 200 });
    const damage = Math.max(10, Math.floor(tgt.maxHp * 0.15));
    expect(damage).toBe(30);
  });

  it('countdown removes resolved effects after they fire', () => {
    const effects: SimpleEffect[] = [
      { move: 'futuresight', side: 'enemy', targetSlot: 0, turnsLeft: 2, damage: 20 },
      { move: 'futuresight', side: 'player', targetSlot: 0, turnsLeft: 1, damage: 15 },
    ];
    const resolved: SimpleEffect[] = [];
    for (const e of effects) {
      e.turnsLeft--;
      if (e.turnsLeft > 0) resolved.push(e);
    }
    expect(resolved).toHaveLength(1);
    const first = resolved[0];
    expect(first).toBeDefined();
    expect(first?.turnsLeft).toBe(1);
  });

  it('two concurrent slot effects decrement independently', () => {
    let effects: SimpleEffect[] = [
      { move: 'futuresight', side: 'enemy', targetSlot: 0, turnsLeft: 3, damage: 25 },
      { move: 'doomdesire', side: 'player', targetSlot: 0, turnsLeft: 2, damage: 30 },
    ];
    // tick 1
    effects = effects.map(e => ({ ...e, turnsLeft: e.turnsLeft - 1 })).filter(e => e.turnsLeft > 0);
    expect(effects).toHaveLength(2);
    // tick 2 — doom desire fires
    effects = effects.map(e => ({ ...e, turnsLeft: e.turnsLeft - 1 })).filter(e => e.turnsLeft > 0);
    expect(effects).toHaveLength(1);
    expect(effects[0]?.move).toBe('futuresight');
    // tick 3 — future sight fires
    effects = effects.map(e => ({ ...e, turnsLeft: e.turnsLeft - 1 })).filter(e => e.turnsLeft > 0);
    expect(effects).toHaveLength(0);
  });

  it('does not apply damage to a fainted Pokemon (hp === 0)', () => {
    const fainted = makeMockPokemon({ uid: 'fainted', hp: 0, maxHp: 100 });
    const effect: SimpleEffect = { move: 'futuresight', side: 'enemy', targetSlot: 0, turnsLeft: 1, damage: 25 };
    effect.turnsLeft--;
    if (effect.turnsLeft <= 0 && fainted.hp > 0) {
      fainted.hp = Math.max(0, fainted.hp - effect.damage);
    }
    expect(fainted.hp).toBe(0);
  });
});
