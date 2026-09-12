import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { DBRouter } from '@/logic/db/dbRouter';
import { executePollMatchmaking, getMatchmakingTimeoutSec } from '@/logic/pvp/livePvPMatchmakingHandler';
import { executePassiveMatchmakingFallback, parsePassiveTeamSnapshot } from '@/logic/pvp/passiveMatchmakingHelper';
import { executeStartPassiveBattle } from '@/logic/pvp/livePvPPassiveFallbackHandler';
import { createPassiveTeamSnapshot } from '@/logic/pvp/pvpTeamHelper';
import { useDebugStore } from '@/stores/debug';
import { useAuthStore } from '@/stores/auth';

describe('Ranked Matchmaking & Passive Fallback (No Team Preview, Strict ELO, Zero Bots)', () => {
  const createFakePoke = (uid: string, name: string): Pokemon => {
    return {
      uid,
      id: name.toLowerCase() as any,
      name,
      level: 50,
      hp: 100,
      maxHp: 100,
      moves: [{ name: 'Thunderbolt', maxPP: 15 }],
      isIllegal: false,
      isShiny: false
    } as unknown as Pokemon;
  };

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('Online Matchmaking strictly by ELO (ranked_queue)', () => {
    it('rejects candidates outside allowed tier gap (maxGap = 1) and matches closest ELO candidate in range', async () => {
      const myUserId = 'user-bronce-1000';
      const myElo = 1000; // Bronce

      // Queue has:
      // 1. Maestro candidate (3400 ELO) -> Gap 5 (DISALLOWED)
      // 2. Plata candidate (1250 ELO) -> Gap 1 (ALLOWED)
      const queueEntries = [
        { user_id: 'user-maestro-3400', elo: 3400, created_at: '2026-09-10T10:00:00Z' },
        { user_id: 'user-plata-1250', elo: 1250, created_at: '2026-09-10T10:01:00Z' }
      ];

      let insertedInvite: any = null;
      const mockDb = {
        from: vi.fn((table: string) => {
          if (table === 'ranked_queue') {
            return {
              select: vi.fn().mockReturnThis(),
              neq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockImplementation(() => Promise.resolve({ data: queueEntries })),
              delete: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ error: null })
              })
            };
          }
          if (table === 'battle_invites') {
            return {
              insert: vi.fn().mockImplementation((payload: any) => {
                insertedInvite = { id: 'inv-123', ...payload };
                return {
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: insertedInvite, error: null })
                  })
                };
              })
            };
          }
          return {};
        })
      } as unknown as DBRouter;

      const isSearching = ref(true);
      const searchPhase = ref<'human' | 'passive_fallback' | 'matched'>('human');
      const killSearchCountdown = vi.fn();
      const onMatched = vi.fn();

      await executePollMatchmaking({
        db: mockDb,
        userId: myUserId,
        myElo,
        isSearching,
        searchPhase,
        killSearchCountdown,
        onMatched
      } as any);

      // Must NOT match with Maestro (3400)
      expect(insertedInvite?.opponent_id).toBe('user-plata-1250');
      expect(onMatched).toHaveBeenCalled();
      expect(killSearchCountdown).toHaveBeenCalled();
      expect(searchPhase.value).toBe('matched');
    });

    it('does not match and keeps searching if only out-of-tier candidates are in queue', async () => {
      const myUserId = 'user-bronce-1000';
      const myElo = 1000; // Bronce

      // Only Maestro in queue
      const queueEntries = [
        { user_id: 'user-maestro-3400', elo: 3400, created_at: '2026-09-10T10:00:00Z' }
      ];

      const mockDb = {
        from: vi.fn((table: string) => {
          if (table === 'ranked_queue') {
            return {
              select: vi.fn().mockReturnThis(),
              neq: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
              limit: vi.fn().mockImplementation(() => Promise.resolve({ data: queueEntries }))
            };
          }
          return {};
        })
      } as unknown as DBRouter;

      const isSearching = ref(true);
      const searchPhase = ref<'human' | 'passive_fallback' | 'matched'>('human');
      const killSearchCountdown = vi.fn();
      const onMatched = vi.fn();

      await executePollMatchmaking({
        db: mockDb,
        userId: myUserId,
        myElo,
        isSearching,
        searchPhase,
        killSearchCountdown,
        onMatched
      } as any);

      expect(onMatched).not.toHaveBeenCalled();
      expect(isSearching.value).toBe(true);
      expect(searchPhase.value).toBe('human');
    });
  });

  describe('Passive Fallback: No Bots, Clear Toast, and Direct Battle Start', () => {
    it('emits clear toast and creates zero bots when no players have active passive defense', async () => {
      const notifyFn = vi.fn();
      const mockDb = {
        from: vi.fn((table: string) => {
          if (table === 'passive_teams') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [] })
              })
            };
          }
          return {};
        })
      } as unknown as DBRouter;

      const result = await executePassiveMatchmakingFallback({
        db: mockDb,
        userUid: 'my-user-id',
        myElo: 1000,
        seasonRules: null,
        notify: notifyFn
      });

      expect(result).toBeNull();
      expect(notifyFn).toHaveBeenCalledWith(
        'No hay jugadores disponibles en la arena ranked en este momento. Por favor, intenta más tarde.',
        '🛡️'
      );
    });

    it('executeStartPassiveBattle starts battle immediately without team preview', async () => {
      const myPoke = createFakePoke('p1', 'Pikachu');
      const enemyPoke = createFakePoke('e1', 'Gengar');

      const battleStore = {
        startBattle: vi.fn().mockResolvedValue(undefined)
      } as any;

      const timerManager = {
        resetStrikes: vi.fn(),
        startTurnTimer: vi.fn()
      } as any;

      const battleState: any = {
        active: false,
        isHost: false,
        isRanked: false,
        phase: 'sync',
        myTeam: [],
        enemyTeam: [],
        myHp: [],
        enemyHp: [],
        logs: []
      };

      const ctx: any = {
        resolvePvpTeam: vi.fn().mockReturnValue([myPoke]),
        notify: vi.fn(),
        timerManager,
        afkStrikes: { value: 0 },
        battleState,
        battleStore
      };

      executeStartPassiveBattle(
        {
          opponentId: 'rival-123',
          opponentName: 'Rival Passive',
          opponentElo: 1050,
          enemyTeam: [enemyPoke]
        },
        ctx
      );

      // Must NOT be 'team_preview'
      expect(battleState.phase).toBe('choosing');
      await Promise.resolve();
      expect(timerManager.startTurnTimer).toHaveBeenCalled();
      expect(battleStore.startBattle).toHaveBeenCalledWith(
        enemyPoke,
        expect.objectContaining({
          isPvP: true,
          isRanked: true,
          isAsynchronous: true,
          pvpOpponentName: 'Rival Passive',
          enemyTeam: [enemyPoke]
        })
      );
    });
  });

  describe('1:1 Canonical Team Persistence & Corrupted Data Pruning', () => {
    it('serializes and deserializes team 1:1 preserving ability, nature, ivs, and full moves', () => {
      const fullPoke: Pokemon = {
        uid: 'gyarados-123',
        id: 'gyarados',
        species: 'gyarados',
        name: 'Gyarados',
        level: 50,
        exp: 10000,
        expNeeded: 12000,
        hp: 30, // damaged
        maxHp: 150,
        atk: 125,
        def: 79,
        spa: 60,
        spd: 100,
        spe: 81,
        type: 'water',
        type2: 'flying',
        status: 'psn', // poisoned in battle
        isShiny: false,
        gender: 'm',
        ability: 'intimidate',
        nature: 'adamant',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: [{ id: 'waterfall', name: 'Waterfall', pp: 15, maxPP: 15, power: 80 }]
      } as unknown as Pokemon;

      const serializedJson = createPassiveTeamSnapshot([fullPoke]);
      expect(serializedJson).toContain('"ability":"intimidate"');
      expect(serializedJson).toContain('"nature":"adamant"');

      const deserializedTeam = parsePassiveTeamSnapshot(serializedJson);
      expect(deserializedTeam).toHaveLength(1);
      const restored = deserializedTeam[0];
      expect(restored).toBeDefined();
      if (!restored) throw new Error('Expected restored to be defined');
      expect(restored.ability).toBe('intimidate');
      expect(restored.nature).toBe('adamant');
      expect(restored.hp).toBe(150); // restored to full health
      expect(restored.status).toBe(''); // cured
      expect(restored.moves[0]?.id).toBe('waterfall');
      expect(restored.gender).toBe('m');
    });

    it('prunes and deactivates candidates in passive_teams that lack an ability', async () => {
      const corruptPokeJson = JSON.stringify([{
        uid: 'corrupt-gyarados',
        id: 'gyarados',
        name: 'Gyarados',
        level: 50,
        hp: 100,
        maxHp: 100,
        // Missing ability!
        moves: [{ name: 'Waterfall', pp: 15 }]
      }]);

      let deactivatedUserId = '';
      const mockDb = {
        from: vi.fn((table: string) => {
          if (table === 'passive_teams') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    {
                      user_id: 'user-with-corrupt-team',
                      elo_rating: 1000,
                      team_data: corruptPokeJson,
                      is_active: true
                    }
                  ]
                })
              }),
              update: vi.fn().mockImplementation((payload: any) => ({
                eq: vi.fn().mockImplementation((col: string, val: string) => {
                  if (col === 'user_id' && payload.is_active === false) {
                    deactivatedUserId = val;
                  }
                  return Promise.resolve({ error: null });
                })
              }))
            };
          }
          return {};
        })
      } as unknown as DBRouter;

      const notifyFn = vi.fn();
      const result = await executePassiveMatchmakingFallback({
        db: mockDb,
        userUid: 'my-clean-user',
        myElo: 1000,
        seasonRules: null,
        notify: notifyFn
      });

      // Must NOT return the corrupt candidate
      expect(result).toBeNull();
      // Must deactivate the corrupted candidate in DB
      expect(deactivatedUserId).toBe('user-with-corrupt-team');
      expect(notifyFn).toHaveBeenCalledWith(
        'No hay jugadores disponibles en la arena ranked en este momento. Por favor, intenta más tarde.',
        '🛡️'
      );
    });
  });

  describe('Ranked Matchmaking Delay Toggle (Debug Tool)', () => {
    it('returns standard 60s timeout by default, and 5s when fastRankedDelay is active', () => {
      const globalTarget = typeof window !== 'undefined' ? window : (globalThis as unknown as Window);
      if (!globalTarget.__VITE_DEBUG__) globalTarget.__VITE_DEBUG__ = {};
      globalTarget.__VITE_DEBUG__.fastRankedDelay = false;

      expect(getMatchmakingTimeoutSec()).toBe(60);

      globalTarget.__VITE_DEBUG__.fastRankedDelay = true;
      expect(getMatchmakingTimeoutSec()).toBe(5);

      globalTarget.__VITE_DEBUG__.fastRankedDelay = false;
      expect(getMatchmakingTimeoutSec()).toBe(60);
    });

    it('toggles fastRankedDelay through debug store and updates window proxy', () => {
      const authStore = useAuthStore();
      authStore.sessionMode = 'offline';
      const globalTarget = typeof window !== 'undefined' ? window : (globalThis as unknown as Window);
      const debugStore = useDebugStore();
      debugStore.updateGlobalProxy();
      debugStore.fastRankedDelay = false;
      expect(debugStore.fastRankedDelay).toBe(false);
      expect(getMatchmakingTimeoutSec()).toBe(60);

      debugStore.fastRankedDelay = true;
      expect(debugStore.fastRankedDelay).toBe(true);
      expect(globalTarget.__VITE_DEBUG__?.fastRankedDelay).toBe(true);
      expect(getMatchmakingTimeoutSec()).toBe(5);

      debugStore.fastRankedDelay = false;
      expect(getMatchmakingTimeoutSec()).toBe(60);
    });
  });
});
