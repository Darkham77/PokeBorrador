import { describe, it, expect } from 'vitest';
import { serializeState } from '@/logic/auth/saveService';
import type { GameState } from '@/types/system/game';
import type { BattleState } from '@/types/battle/battle';
import { INITIAL_STATE } from '@/stores/gameInitialState';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';

function requirePokemon(id: Parameters<typeof makePokemon>[0], level: number) {
  const p = makePokemon(id, level);
  if (!p) throw new Error(`Pokemon creation failed for ${id}`);
  return p;
}

describe('serializeState - Active Battle serialization', () => {
  it('should serialize activeBattle successfully when a battle is active', () => {
    const enemyPk = requirePokemon('rhydon', 50);
    const playerPk = requirePokemon('bulbasaur', 5);
    const activeBattle: BattleState = {
      player: playerPk,
      enemy: enemyPk,
      playerTeamIndex: 0,
      enemyTeamIndex: 0,
      turnCount: 1,
      escapeAttempts: 0,
      weather: { type: 'clear', visual: 'clear', turns: -1 },
      isGym: true,
      gymId: 'pewter',
      isTrainer: true,
      trainerName: 'Brock',
      locationId: 'pewter_city',
      over: false,
      enemyTeam: [enemyPk],
      participants: [playerPk.uid, enemyPk.uid]
    };

    const mockState: GameState = {
      ...INITIAL_STATE,
      starterChosen: true,
      team: [requirePokemon('bulbasaur', 5)],
      box: [],
      activeBattle
    };

    const serialized = serializeState(mockState);
    const battle = serialized.activeBattle as Record<string, unknown> | null;
    expect(battle).not.toBeNull();
    expect(battle?.['isGym']).toBe(true);
    expect(battle?.['gymId']).toBe('pewter');
    expect(battle?.['trainerName']).toBe('Brock');
    expect((battle?.['enemyTeam'] as Array<{ hp: number }>)?.[0]?.hp).toBeGreaterThan(0);
  });

  it('should return null for activeBattle if there is no active battle', () => {
    const mockState: GameState = {
      ...INITIAL_STATE,
      starterChosen: true,
      team: [requirePokemon('bulbasaur', 5)],
      box: [],
      activeBattle: null
    };

    const serialized = serializeState(mockState);
    expect(serialized.activeBattle).toBeNull();
  });

  it('should persist playerClass, faction, and class progression in serialized save data', () => {
    const mockState: GameState = {
      ...INITIAL_STATE,
      trainer: 'Ash',
      starterChosen: true,
      team: [requirePokemon('pikachu', 25)],
      box: [],
      playerClass: 'rocket',
      classLevel: 5,
      classXP: 1200,
      faction: 'poder',
      activeBattle: null
    };

    const serialized = serializeState(mockState);
    expect(serialized.playerClass).toBe('rocket');
    expect(serialized.classLevel).toBe(5);
    expect(serialized.classXP).toBe(1200);
    expect(serialized.faction).toBe('poder');
  });

  it('debe serializar y validar correctamente el 100% de los campos del estado del juego', async () => {
    const { validateAndSanitize } = await import('@/logic/auth/saveSanitizer');
    const { makePokemon } = await import('@/logic/pokemon/pokemonFactory');
    const charizard = makePokemon('charizard', 85);
    if (!charizard) throw new Error('Failed to create charizard');
    charizard.uid = 'p-1';

    const fullMockState: GameState = {
      trainer: 'Red',
      gender: 'm',
      badges: 8,
      balls: 50,
      money: 150000,
      battleCoins: 450,
      eggs: [],
      trainerLevel: 42,
      trainerExp: 8500,
      trainerExpNeeded: 10000,
      trainerChance: 8,
      inventory: { pokeball: 20, potion: 10 },
      map: {
        currentMap: 'cerulean_cave',
        region: 'kanto',
        lastNavigateAt: 1700000000000
      },
      team: [charizard],
      box: [],
      pokedex: ['charizard', 'pikachu'],
      seenPokedex: ['charizard', 'pikachu', 'mewtwo'],
      defeatedGyms: ['pewter', 'cerulean', 'vermilion'],
      gymProgress: { pewter: { easy: true, normal: true, hard: false, attempts: 2 } },
      lastGymWins: { pewter: 1700000000000 },
      lastGymAttempts: { pewter: 2 },
      battle: null,
      starterChosen: true,
      lastPokemonCenterHeal: 1700000000000,
      lastRankedSeason: 'season_1',
      nick_style: 'golden',
      avatar_style: 'champion',
      stats: { totalBattles: 150, wins: 140 },
      guardianCaptures: { route1: '2026-08-23' },
      eloRating: 1650,
      pvpStats: { wins: 30, losses: 5, draws: 1 },
      rankedMaxElo: 1720,
      passiveTeamUids: ['p-1'],
      passiveTeamActive: true,
      rankedRewardsClaimed: ['tier_1', 'tier_2'],
      activeBattle: null,
      daycare_missions: [],
      daycare_mission_refreshes: 3,
      safariTicketSecs: 300,
      ceruleanTicketSecs: 0,
      articunoTicketSecs: 0,
      mewtwoTicketSecs: 600,
      repelSecs: 120,
      fishingRodSecs: 0,
      fishingRodType: 'super',
      pickaxeSecs: 0,
      pickaxeType: 'good',
      brushSecs: 0,
      brushType: 'standard',
      shinyBoostSecs: 1800,
      amuletCoinSecs: 0,
      luckyEggSecs: 3600,
      ivScannerSecs: 900,
      incenseType: null,
      incenseSecs: 0,
      daycare_berry_egg_time: 0,
      boxCount: 8,
      chats: { global: true },
      playerClass: 'cazabichos',
      classLevel: 10,
      classXP: 5000,
      classData: {
        captureStreak: 12,
        longestStreak: 25,
        reputation: 150,
        blackMarketSales: 3,
        criminality: 0,
        blackMarketDaily: { date: '2026-08-23', items: ['netball'], purchased: [] },
        extortedRouteId: null,
        officialRouteId: 'route1',
        kitCaptures: 5
      },
      faction: 'union',
      warCoins: 2500,
      warCoinsSpent: 1000,
      warDailyCap: { '2026-08-23': { route1: 500 } },
      warDailyCoins: { '2026-08-23': 200 },
      warMyPtsLocal: { route1: 350 },
      warPointsAccumulator: 1200,
      lastResolvedWeek: '2026-W34',
      claimQueue: [
        {
          id: 'claim-1',
          type: 'currency',
          asset_data: { type: 'money', data: 500 },
          source_type: 'market',
          source_id: 'sale-99',
          created_at: '2026-08-23'
        }
      ],
      pvpTeam: ['p-1'],
      warTeam: ['p-1'],
      warSlots: 6,
      notificationHistory: [],
      marketSoldSeenIds: ['sale-99'],
      playtime: 360000
    };

    const serialized = serializeState(fullMockState);
    const validation = validateAndSanitize(serialized);

    expect(validation.valid).toBe(true);
    if (!validation.valid) throw new Error(validation.error);

    expect(validation.data.map?.currentMap).toBe('cerulean_cave');
    expect(validation.data.trainerChance).toBe(8);
    expect(validation.data.guardianCaptures?.['route1']).toBe('2026-08-23');
    expect(validation.data.pvpTeam).toEqual(['p-1']);
    expect(validation.data.warTeam).toEqual(['p-1']);
    expect(validation.data.warSlots).toBe(6);
    expect(validation.data.warPointsAccumulator).toBe(1200);
    expect(validation.data.lastResolvedWeek).toBe('2026-W34');
    expect(validation.data.claimQueue?.[0]?.id).toBe('claim-1');
    expect(validation.data.playerClass).toBe('cazabichos');
    expect(validation.data.faction).toBe('union');
  });

  it('debe tener paridad contractual del 100% de propiedades entre INITIAL_STATE, serializeState y saveDataSchema', async () => {
    const { INITIAL_STATE } = await import('@/stores/gameInitialState');
    const { saveDataSchema } = await import('@/logic/validation/schemas');

    const serialized = serializeState(INITIAL_STATE);
    const serializedKeys = new Set(Object.keys(serialized));
    const schemaKeys = new Set(Object.keys(saveDataSchema.entries));

    // battle es estado volátil en memoria y se mapea a activeBattle para persistencia
    const TRANSIENT_INITIAL_STATE_KEYS = new Set(['battle']);

    for (const key of Object.keys(INITIAL_STATE)) {
      if (TRANSIENT_INITIAL_STATE_KEYS.has(key)) continue;
      expect(
        serializedKeys.has(key),
        `La clave "${key}" de INITIAL_STATE no está siendo serializada en serializeState()`
      ).toBe(true);
    }

    for (const key of serializedKeys) {
      expect(
        schemaKeys.has(key),
        `La clave serializada "${key}" no existe en el esquema de validación saveDataSchema`
      ).toBe(true);
    }
  });
});
