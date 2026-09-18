/**
 * tests/unit/battle/pvp_and_ranked_battle_suite.spec.ts
 * Consolidated domain test suite for PvP mechanics, Ranked ELO calculations,
 * AFK/reconnection timers, and emergency team triggers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { 
  getEloTier, 
  isAllowedRankGap, 
  normalizeRankedRules, 
  validatePokemonForRanked 
} from '@/logic/pvp/rankedEngine';
import { PvPTimerManager } from '@/logic/pvp/pvpTimerHelper';
import { PVP_TURN_TIMEOUT_SEC, PVP_RECONNECT_WINDOW_SEC } from '@/types/battle/pvp';
import { useGameStore } from '@/stores/game';
import { useBoxStore } from '@/stores/box';
import { useLivePvPStore } from '@/stores/livePvP';
import { useAuthStore } from '@/stores/auth';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import type { Pokemon } from '@/types/pokemon/pokemon';

vi.mock('@/logic/battle/showdownWorkerClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/logic/battle/showdownWorkerClient')>();
  return {
    ...actual,
    executeTurnInWorker: vi.fn().mockResolvedValue({
      logs: ['|move|p1a: Pikachu|Tackle|p2a: Rattata', '|-damage|p2a: Rattata|50/80'],
      isOver: false,
      winner: null,
      p1Request: { active: [{ moves: [] }] },
      p2Request: { active: [{ moves: [] }] }
    }),
    syncTeamsFromLastWorkerState: vi.fn().mockResolvedValue(undefined)
  };
});

vi.mock('@/logic/battle/helpers/turnActionResolver', () => ({
  parseLogsWithSkip: vi.fn().mockResolvedValue(undefined),
  resolvePostTurnSwitchesAndFaints: vi.fn().mockResolvedValue(undefined)
}));

// =============================================================================
// 1. Ranked Engine & ELO Tier Suite
// =============================================================================
describe('Ranked Engine & ELO Calculations', () => {
  it('should return correct tiers for ELO', () => {
    expect(getEloTier(1000).name).toBe('Bronce');
    expect(getEloTier(1250).name).toBe('Plata');
    expect(getEloTier(1650).name).toBe('Oro');
    expect(getEloTier(2200).name).toBe('Platino');
    expect(getEloTier(2800).name).toBe('Diamante');
    expect(getEloTier(3500).name).toBe('Maestro');
  });

  it('should validate allowed rank gaps (Max Gap = 1)', () => {
    expect(isAllowedRankGap(1000, 1300)).toBe(true);  // Bronce vs Plata
    expect(isAllowedRankGap(1000, 1700)).toBe(false); // Bronce vs Oro
    expect(isAllowedRankGap(2700, 3500)).toBe(true);  // Diamante vs Maestro
    expect(isAllowedRankGap(1000, 3500)).toBe(false); // Bronce vs Maestro
  });

  it('should normalize rules correctly', () => {
    const raw = {
      maxPokemon: 3,
      levelCap: 50,
      allowedTypes: ['Fire', 'WATER'],
      bannedPokemonIds: ['MEWTWO']
    };
    const rules = normalizeRankedRules(raw, 'Test Season');
    
    expect(rules.maxPokemon).toBe(3);
    expect(rules.levelCap).toBe(50);
    expect(rules.allowedTypes).toContain('fire');
    expect(rules.bannedPokemonIds).toContain('mewtwo');
  });

  it('should validate pokemon against rules', () => {
    const rules = {
      seasonName: 'Test',
      maxPokemon: 3,
      levelCap: 50,
      allowedTypes: ['fire'],
      bannedPokemonIds: ['charizard']
    };

    const okPonyta = { id: 'ponyta', name: 'Ponyta', level: 20, type: 'fire' } as unknown as Pokemon;
    const overLeveled = { id: 'ponyta', level: 51, type: 'fire' } as unknown as Pokemon;
    const wrongType = { id: 'staryu', level: 20, type: 'water' } as unknown as Pokemon;
    const banned = { id: 'charizard', name: 'Charizard', level: 40, type: 'fire' } as unknown as Pokemon;

    expect(validatePokemonForRanked(okPonyta, rules).ok).toBe(true);
    expect(validatePokemonForRanked(overLeveled, rules).ok).toBe(false);
    expect(validatePokemonForRanked(wrongType, rules).ok).toBe(false);
    expect(validatePokemonForRanked(banned, rules).ok).toBe(false);
  });
});

// =============================================================================
// 2. PvPTimerManager (AFK & Reconnection Logic)
// =============================================================================
describe('PvPTimerManager (AFK & Reconnection Logic)', () => {
  let timer: PvPTimerManager;
  let onTurnTickMock: Mock<(seconds: number) => void>;
  let onTurnTimeoutMock: Mock<(strikes: number, isForfeit: boolean) => void>;
  let onReconnectTickMock: Mock<(seconds: number) => void>;
  let onReconnectTimeoutMock: Mock<() => void>;

  beforeEach(() => {
    onTurnTickMock = vi.fn();
    onTurnTimeoutMock = vi.fn();
    onReconnectTickMock = vi.fn();
    onReconnectTimeoutMock = vi.fn();

    timer = new PvPTimerManager({
      onTurnTick: onTurnTickMock,
      onTurnTimeout: onTurnTimeoutMock,
      onReconnectTick: onReconnectTickMock,
      onReconnectTimeout: onReconnectTimeoutMock
    });
  });

  afterEach(() => {
    timer.destroy();
  });

  it('should initialize with standard default values', () => {
    expect(timer.state.turnSecondsRemaining).toBe(PVP_TURN_TIMEOUT_SEC);
    expect(timer.state.reconnectSecondsRemaining).toBe(PVP_RECONNECT_WINDOW_SEC);
    expect(timer.state.afkStrikes).toBe(0);
    expect(timer.state.isReconnecting).toBe(false);
  });

  it('should issue Strike 1 without forfeit on first timeout', () => {
    timer.handleTurnTimeout();

    expect(timer.state.afkStrikes).toBe(1);
    expect(onTurnTimeoutMock).toHaveBeenCalledWith(1, false);
  });

  it('should issue Strike 2 and trigger forfeit on consecutive timeout', () => {
    timer.state.afkStrikes = 1;
    timer.handleTurnTimeout();

    expect(timer.state.afkStrikes).toBe(2);
    expect(onTurnTimeoutMock).toHaveBeenCalledWith(2, true);
  });

  it('should reset strikes when player makes a manual move', () => {
    timer.state.afkStrikes = 1;
    timer.resetStrikes();

    expect(timer.state.afkStrikes).toBe(0);
  });

  it('should activate reconnection state on startReconnectCountdown', () => {
    timer.startReconnectCountdown();

    expect(timer.state.isReconnecting).toBe(true);
    expect(timer.state.reconnectSecondsRemaining).toBe(PVP_RECONNECT_WINDOW_SEC);
    expect(onReconnectTickMock).toHaveBeenCalledWith(PVP_RECONNECT_WINDOW_SEC);
  });

  it('should deactivate reconnection state on stopReconnectCountdown', () => {
    timer.startReconnectCountdown();
    expect(timer.state.isReconnecting).toBe(true);

    timer.stopReconnectCountdown();
    expect(timer.state.isReconnecting).toBe(false);
  });
});

// =============================================================================
// 3. PvP Emergency Triggers Suite
// =============================================================================
describe('PvP Emergency Triggers', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const gs = useGameStore();
    Object.assign(gs.state, {
      team: [],
      box: [],
      pvpTeam: []
    });
    gs.save = vi.fn();
  });

  it('should trigger PvP auto-fill when team length increases (watch trigger)', async () => {
    const gs = useGameStore();
    
    // Initial state: empty
    expect(gs.state.pvpTeam).toHaveLength(0);

    // Add pokemon directly to team (bypassing addPokemon to test the watch)
    gs.state.team.push({ uid: 'p1', name: 'P1' } as unknown as Pokemon);
    
    // Wait for next tick for the watcher
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(gs.state.pvpTeam).toHaveLength(1);
    expect(gs.state.pvpTeam[0]).toBe('p1');
  });

  it('should fill PvP team from box if slots are available and team grows', async () => {
    const gs = useGameStore();
    gs.state.box = [{ uid: 'b1', name: 'B1' }] as unknown as Pokemon[];
    
    // Add to team
    gs.state.team.push({ uid: 'p1', name: 'P1' } as unknown as Pokemon);
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Should have both p1 and b1 in pvpTeam (up to 3)
    expect(gs.state.pvpTeam).toContain('p1');
    expect(gs.state.pvpTeam).toContain('b1');
    expect(gs.state.pvpTeam).toHaveLength(2);
  });

  it('should trigger auto-fill when moving from box to team via boxStore', () => {
    const gs = useGameStore();
    const bs = useBoxStore();
    
    gs.state.box = [{ uid: 'b1', name: 'B1' }] as unknown as Pokemon[];
    
    // Move from box to team
    bs.moveBoxToTeam(0);
    
    expect(gs.state.team).toHaveLength(1);
    expect(gs.state.team[0]!.uid).toBe('b1');
    expect(gs.state.pvpTeam).toHaveLength(1);
    expect(gs.state.pvpTeam[0]).toBe('b1');
  });

  it('should trigger auto-fill when swapping box with team via boxStore', () => {
    const gs = useGameStore();
    const bs = useBoxStore();
    
    // Setup: Team [p1], Box [b1], PvP [p1]
    gs.state.team = [{ uid: 'p1', name: 'P1', maxHp: 10, hp: 10 }] as unknown as Pokemon[];
    gs.state.box = [{ uid: 'b1', name: 'B1' }] as unknown as Pokemon[];
    gs.state.pvpTeam = ['p1'];
    
    // Swap p1 with b1
    bs.swapBoxWithTeam(0, 0);
    
    // Team should be [b1], Box [p1]
    expect(gs.state.team[0]!.uid).toBe('b1');
    expect(gs.state.box[0]!.uid).toBe('p1');
    
    // PvP should now contain both b1 and p1
    expect(gs.state.pvpTeam).toContain('b1');
    expect(gs.state.pvpTeam).toContain('p1');
    expect(gs.state.pvpTeam).toHaveLength(2);
  });
});

// =============================================================================
// 4. LivePvPStore (Combat Engine & Invites)
// =============================================================================
describe('LivePvPStore (Combat Engine)', () => {
  const dbMock = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'inv_1' }, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      send: vi.fn(),
      unsubscribe: vi.fn()
    })
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    const auth = useAuthStore();
    const game = useGameStore();
    
    auth.user = { id: 'user_1', user_metadata: { username: 'Player 1' } } as unknown as NonNullable<typeof auth.user>;
    
    // Setup insert chain
    dbMock.insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'inv_1' }, error: null })
      })
    });

    (game as unknown as { db: unknown }).db = dbMock;
    
    const pika = makePokemon('pikachu', 50)!;
    pika.uid = 'pika_1';
    Object.assign(game.state, {
      starterChosen: true,
      team: [pika],
      pvpTeam: ['pika_1'],
      box: []
    });
  });

  it('should send battle invite correctly', async () => {
    const pvp = useLivePvPStore();
    
    await pvp.sendInvite('user_2', 'Player 2');
    
    expect(dbMock.from).toHaveBeenCalledWith('battle_invites');
    expect(dbMock.insert).toHaveBeenCalledWith(expect.objectContaining({
      challenger_id: 'user_1',
      opponent_id: 'user_2',
      status: 'pending'
    }));
  });

  it('should resolve turn correctly when both players move', async () => {
    const pvp = useLivePvPStore();
    const { executeTurnInWorker } = await import('@/logic/battle/showdownWorkerClient');

    // Setup Battle
    pvp.startBattle({ id: 'inv_1', challenger_id: 'user_1', opponent_id: 'user_2' } as unknown as Parameters<typeof pvp.startBattle>[0], true, false);
    const rat = makePokemon('rattata', 50)!;
    pvp.battleState.enemyTeam = [rat];
    pvp.battleState.enemyHp = [80];
    pvp.battleState.phase = 'choosing';
    
    // Commit my pick
    pvp._commitPick({ type: 'move', moveIndex: 0 });
    expect(pvp.battleState.phase).toBe('waiting');
    
    // Simulate opponent pick (via handleOpponentPick)
    pvp.handleOpponentPick({ payload: { type: 'move', moveIndex: 0 } });
    
    // Allow async resolveTurn to finish
    await vi.waitFor(() => {
      expect(executeTurnInWorker).toHaveBeenCalled();
      expect(pvp.battleState.phase).toBe('choosing');
    });
  });

  it('should end battle when enemy team is defeated', async () => {
    const pvp = useLivePvPStore();
    const gs = useGameStore();
    vi.spyOn(gs, 'save').mockResolvedValue({ success: true });
    
    pvp.startBattle({ id: 'inv_1', challenger_id: 'user_1', opponent_id: 'user_2' } as unknown as Parameters<typeof pvp.startBattle>[0], true, false);
    pvp.battleState.enemyHp = [0];
    pvp.battleState.enemyActiveIdx = 0;
    
    // Trigger post-turn check
    pvp._checkPostTurn();
    
    expect(pvp.battleState.phase).toBe('over');
    expect(pvp.battleState.active).toBe(false);
  });
});
