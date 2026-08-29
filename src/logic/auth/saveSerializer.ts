/**
 * src/logic/auth/saveSerializer.ts
 *
 * Pure serialization logic for GameState into persistent SaveDataDto.
 * Zero UI / Pinia dependencies.
 */

import type { Pokemon, PokemonEgg, PokemonGender } from '@/types/pokemon/pokemon';
import type { GameState } from '@/types/system/game';
import type { BattleLog, BattleStages, BattleWeather, BattleTimedCondition, PendingSlotEffect, BattleConditionKey, BattleSide, BattleDifficulty, BattleMinigame, BattleState } from '@/types/battle/battle';
import type { Inventory } from '@/types/inventory/items';
import type { SaveDataDto } from '@/logic/validation/schemas';
import { requireAbilityId } from '@/data/battle/abilities';
import { requireWeatherId } from '@/logic/weather/weatherRegistry';
import { requireMapRouteId } from '@/data/world/map-assets';
import { logger } from '@/logic/utils/logger';
import type { GenderName } from '@pkmn/sim';

const DEFAULT_POKEMON_FRIENDSHIP_FALLBACK = 70;

interface ActiveBattleSerialized {
  isGym: boolean;
  gymId: string | null;
  isTrainer: boolean;
  trainerName: string | null;
  trainerSprite?: string | null;
  trainerArchetype?: string | null;
  quote?: string | null;
  locationId: string | null;
  wasSearching?: boolean;
  participants?: string[];
  enemyTeamIndex?: number;
  playerTeamIndex?: number;
  turnCount?: number;
  turn?: BattleSide | null;
  escapeAttempts?: number;
  cannotEscape?: boolean;
  weather?: BattleWeather | null;
  initialMapWeather?: string | null;
  terrain?: string | null;
  fieldConditions?: Partial<Record<BattleConditionKey, BattleTimedCondition>> | null;
  playerSideConditions?: Partial<Record<BattleConditionKey, BattleTimedCondition>> | null;
  enemySideConditions?: Partial<Record<BattleConditionKey, BattleTimedCondition>> | null;
  pendingSlotEffects?: PendingSlotEffect[];
  minigame?: BattleMinigame | null;
  isCave?: boolean;
  isIndoors?: boolean;
  isCrystalCave?: boolean;
  difficulty?: BattleDifficulty | null;
  rarity?: number;
  enemyMoney?: number | null;
  enemyMaxLevel?: number | null;
  rewardTM?: string | null;
  enemyInventory?: Inventory | null;
  stolenResources?: { money: number; items: Inventory } | null;
  fled?: boolean;
  isCapture?: boolean;
  lastDamage?: number;
  enemyUsedItem?: boolean;
  playerUsedItem?: boolean;
  battleLogs?: BattleLog[];
  playerStages?: BattleStages | null;
  enemyStages?: BattleStages | null;
  enemyTeam: Pokemon[] | null;
  timestamp: number;
  isPvP?: boolean;
  isRival?: boolean;
  over?: boolean;
}

type PersistedPokemon = Omit<Pokemon, 'gender'> & { gender: GenderName };
type PersistedPokemonEgg = Omit<PokemonEgg, 'gender'> & { gender: GenderName };

function toPersistedPokemonGender(gender: PokemonGender | undefined): GenderName {
  if (gender === 'm') return 'M';
  if (gender === 'f') return 'F';
  return 'N';
}

function withPersistedPokemonGender(pokemon: Pokemon): PersistedPokemon {
  return {
    ...pokemon,
    gender: toPersistedPokemonGender(pokemon.gender),
  };
}

function withPersistedEggGender(egg: PokemonEgg): PersistedPokemonEgg {
  return {
    ...egg,
    gender: toPersistedPokemonGender(egg.gender),
  };
}

function serializeActiveBattleGenderCodes(activeBattle: unknown): unknown {
  if (!activeBattle || typeof activeBattle !== 'object') return activeBattle;
  const battle = activeBattle as ActiveBattleSerialized;
  if (!battle.enemyTeam) return activeBattle;
  return {
    ...battle,
    enemyTeam: battle.enemyTeam.map(enemy => (enemy ? withPersistedPokemonGender(enemy as Pokemon) : null)),
  };
}

export function serializeSaveGenderCodes(data: SaveDataDto): unknown {
  return {
    ...data,
    team: data.team.map((p) => withPersistedPokemonGender(p as Pokemon)),
    box: data.box.map((p) => (p ? withPersistedPokemonGender(p as Pokemon) : null)),
    eggs: (data.eggs || []).map(egg => {
      if (!egg || typeof egg !== 'object' || !('gender' in egg)) return egg;
      return withPersistedEggGender(egg as PokemonEgg);
    }),
    activeBattle: serializeActiveBattleGenderCodes(data.activeBattle),
  };
}

export function normalizeRuntimePokemonGender(pokemon: { gender?: string | null }): void {
  if (Object.is(pokemon.gender, 'M')) pokemon.gender = 'm';
  if (Object.is(pokemon.gender, 'F')) pokemon.gender = 'f';
  if (Object.is(pokemon.gender, 'N')) pokemon.gender = null;
}

function serializeActiveBattle(state: GameState | SaveDataDto): ActiveBattleSerialized | null {
  const battle = state.activeBattle as (BattleState & Partial<ActiveBattleSerialized> & { enemy?: Pokemon }) | null;
  if (!battle || battle.over) return null;

  const hasActiveEnemy = Boolean(battle.enemy || (battle.enemyTeam && battle.enemyTeam.length > 0));
  const isActualCombat = Boolean((battle.turnCount && battle.turnCount > 0) || battle.isTrainer || battle.isGym || (hasActiveEnemy && !(battle as { inSearchPhase?: boolean }).inSearchPhase));

  if ((battle.isTrainer || battle.isGym || hasActiveEnemy) && isActualCombat) {
    try {
      const rawEnemyTeam = battle.enemyTeam && battle.enemyTeam.length > 0
        ? battle.enemyTeam
        : (battle.enemy ? [battle.enemy] : null);

      return {
        isGym: battle.isGym || false,
        gymId: battle.gymId || null,
        isTrainer: battle.isTrainer || false,
        isRival: Boolean((battle as { isRival?: boolean }).isRival || (battle as { trainerArchetype?: string }).trainerArchetype === 'rival'),
        trainerName: battle.trainerName || null,
        trainerSprite: battle.trainerSprite || null,
        trainerArchetype: battle.trainerArchetype || null,
        quote: battle.quote || null,
        locationId: battle.locationId || null,
        wasSearching: Boolean(battle.wasSearching),
        participants: Array.isArray(battle.participants) ? battle.participants : [],
        enemyTeamIndex: typeof battle.enemyTeamIndex === 'number' ? battle.enemyTeamIndex : 0,
        playerTeamIndex: typeof battle.playerTeamIndex === 'number' ? battle.playerTeamIndex : 0,
        turnCount: typeof battle.turnCount === 'number' ? battle.turnCount : 1,
        turn: battle.turn || null,
        escapeAttempts: typeof battle.escapeAttempts === 'number' ? battle.escapeAttempts : 0,
        cannotEscape: Boolean(battle.cannotEscape),
        weather: battle.weather ? { type: requireWeatherId(battle.weather.type), visual: battle.weather.visual || undefined, turns: battle.weather.turns } : null,
        initialMapWeather: battle.initialMapWeather || null,
        terrain: battle.terrain || null,
        fieldConditions: battle.fieldConditions || null,
        playerSideConditions: battle.playerSideConditions || null,
        enemySideConditions: battle.enemySideConditions || null,
        pendingSlotEffects: Array.isArray(battle.pendingSlotEffects)
          ? battle.pendingSlotEffects.map((effect: PendingSlotEffect) => ({
              move: effect.move,
              side: effect.side,
              targetSlot: effect.targetSlot,
              turnsLeft: effect.turnsLeft,
              damage: effect.damage,
              ...(effect.sourceName ? { sourceName: effect.sourceName } : {}),
            }))
          : [],
        minigame: null, // minigames are strictly non-persisted for anti-cheat governance
        isCave: Boolean(battle.isCave),
        isIndoors: Boolean(battle.isIndoors),
        isCrystalCave: Boolean(battle.isCrystalCave),
        difficulty: battle.difficulty || null,
        rarity: typeof battle.rarity === 'number' ? battle.rarity : undefined,
        enemyMoney: typeof battle.enemyMoney === 'number' ? battle.enemyMoney : null,
        enemyMaxLevel: typeof battle.enemyMaxLevel === 'number' ? battle.enemyMaxLevel : null,
        rewardTM: battle.rewardTM || null,
        enemyInventory: battle.enemyInventory || null,
        stolenResources: battle.stolenResources ? { money: battle.stolenResources.money, items: { ...battle.stolenResources.items } } : null,
        fled: Boolean(battle.fled),
        over: Boolean(battle.over),
        isCapture: Boolean(battle.isCapture),
        lastDamage: typeof battle.lastDamage === 'number' ? battle.lastDamage : undefined,
        enemyUsedItem: Boolean(battle.enemyUsedItem),
        playerUsedItem: Boolean(battle.playerUsedItem),
        battleLogs: Array.isArray(battle.battleLogs) ? battle.battleLogs : [],
        playerStages: battle.playerStages || null,
        enemyStages: battle.enemyStages || null,
        enemyTeam: rawEnemyTeam
          ? (rawEnemyTeam as Pokemon[]).map(p => ({
              ...p,
              ability: p.ability ? requireAbilityId(p.ability) : p.ability,
              friendship: p.friendship ?? DEFAULT_POKEMON_FRIENDSHIP_FALLBACK,
              exp: p.exp ?? 0,
              expNeeded: p.expNeeded ?? 1,
            }))
          : null,
        timestamp: Temporal.Now.instant().epochMilliseconds,
      };
    } catch (e) {
      logger.warn('SAVE', `Error serializando batalla activa: ${(e as Error).message}`);
      return null;
    }
  }

  if (battle.isPvP) {
    const b = state.activeBattle;
    return {
      isGym: Boolean(b?.isGym),
      gymId: b?.gymId || null,
      isTrainer: Boolean(b?.isTrainer),
      trainerName: b?.trainerName || null,
      locationId: b?.locationId || null,
      enemyTeam: null,
      timestamp: Temporal.Now.instant().epochMilliseconds,
      isPvP: true
    };
  }

  if (battle.wasSearching || (!battle.isTrainer && !battle.isGym)) {
    return {
      isGym: false,
      gymId: null,
      isTrainer: false,
      isRival: false,
      trainerName: null,
      trainerSprite: null,
      trainerArchetype: null,
      quote: null,
      locationId: battle.locationId ? requireMapRouteId(battle.locationId) : (state.map?.currentMap ? requireMapRouteId(state.map.currentMap) : null),
      wasSearching: true,
      minigame: null, // minigames are strictly non-persisted for anti-cheat governance
      isCave: Boolean(battle.isCave),
      isIndoors: Boolean(battle.isIndoors),
      isCrystalCave: Boolean(battle.isCrystalCave),
      enemyTeam: null,
      timestamp: Temporal.Now.instant().epochMilliseconds,
    };
  }

  return null;
}

export function serializeState(state: GameState | SaveDataDto): SaveDataDto {
  const activeBattle = serializeActiveBattle(state);

  return {
    trainer: state.trainer,
    gender: state.gender || 'h',
    last_renamed_at: state.last_renamed_at || null,
    badges: state.badges,
    balls: state.balls,
    money: state.money,
    battleCoins: state.battleCoins || 0,
    eggs: (state.eggs || []) as SaveDataDto['eggs'],
    trainerLevel: state.trainerLevel,
    trainerExp: state.trainerExp,
    trainerExpNeeded: state.trainerExpNeeded,
    trainerChance: state.trainerChance ?? 1,
    inventory: (state.inventory || {}) as SaveDataDto['inventory'],
    map: state.map ? {
      currentMap: state.map.currentMap,
      region: state.map.region,
      lastNavigateAt: state.map.lastNavigateAt || 0
    } : {
      currentMap: 'route1',
      region: 'kanto',
      lastNavigateAt: 0
    },
    team: (state.team || []) as SaveDataDto['team'],
    box: (state.box || []) as SaveDataDto['box'],
    pokedex: state.pokedex,
    seenPokedex: state.seenPokedex || [],
    defeatedGyms: state.defeatedGyms,
    gymProgress: state.gymProgress || {},
    lastGymWins: state.lastGymWins || {},
    lastGymAttempts: state.lastGymAttempts || {},
    starterChosen: state.starterChosen || false,
    lastRankedSeason: state.lastRankedSeason || null,
    nick_style: state.nick_style || null,
    avatar_style: state.avatar_style || null,
    stats: state.stats || {},
    guardianCaptures: (state.guardianCaptures || {}) as SaveDataDto['guardianCaptures'],
    eloRating: state.eloRating,
    pvpStats: state.pvpStats,
    rankedMaxElo: state.rankedMaxElo,
    rankedRewardsClaimed: state.rankedRewardsClaimed || [],
    passiveTeamUids: state.passiveTeamUids || [],
    passiveTeamActive: state.passiveTeamActive,
    daycare_missions: (state.daycare_missions || []) as SaveDataDto['daycare_missions'],
    daycare_mission_refreshes: state.daycare_mission_refreshes,
    safariTicketSecs: state.safariTicketSecs || 0,
    ceruleanTicketSecs: state.ceruleanTicketSecs || 0,
    articunoTicketSecs: state.articunoTicketSecs || 0,
    mewtwoTicketSecs: state.mewtwoTicketSecs || 0,
    repelSecs: state.repelSecs || 0,
    fishingRodSecs: state.fishingRodSecs || 0,
    fishingRodType: state.fishingRodType || null,
    pickaxeSecs: state.pickaxeSecs || 0,
    pickaxeType: state.pickaxeType || null,
    brushSecs: state.brushSecs || 0,
    brushType: state.brushType || null,
    shinyBoostSecs: state.shinyBoostSecs || 0,
    amuletCoinSecs: state.amuletCoinSecs || 0,
    luckyEggSecs: state.luckyEggSecs || 0,
    ivScannerSecs: state.ivScannerSecs || 0,
    incenseSecs: state.incenseSecs || 0,
    incenseType: state.incenseType || null,
    daycare_berry_egg_time: state.daycare_berry_egg_time || 0,
    boxCount: state.boxCount,
    chats: state.chats || {},
    playerClass: state.playerClass || null,
    classLevel: state.classLevel || 1,
    classXP: state.classXP || 0,
    classData: (state.classData || {
      captureStreak: 0,
      longestStreak: 0,
      reputation: 0,
      blackMarketSales: 0,
      criminality: 0,
      blackMarketDaily: { date: '', items: [], purchased: [] },
      extortedRouteId: null,
      officialRouteId: null,
      kitCaptures: 0
    }) as SaveDataDto['classData'],
    faction: state.faction || null,
    warCoins: state.warCoins || 0,
    warCoinsSpent: state.warCoinsSpent || 0,
    warDailyCap: (state.warDailyCap || {}) as SaveDataDto['warDailyCap'],
    warDailyCoins: (state.warDailyCoins || {}) as SaveDataDto['warDailyCoins'],
    warMyPtsLocal: (state.warMyPtsLocal || {}) as SaveDataDto['warMyPtsLocal'],
    warPointsAccumulator: state.warPointsAccumulator || 0,
    lastResolvedWeek: state.lastResolvedWeek || null,
    claimQueue: (state.claimQueue || []) as SaveDataDto['claimQueue'],
    pvpTeam: state.pvpTeam || [],
    warTeam: state.warTeam || [],
    warSlots: state.warSlots || 6,
    notificationHistory: (state.notificationHistory || []) as SaveDataDto['notificationHistory'],
    marketSoldSeenIds: state.marketSoldSeenIds || [],
    lastPokemonCenterHeal: state.lastPokemonCenterHeal || 0,
    playtime: state.playtime || 0,
    activeBattle: activeBattle as SaveDataDto['activeBattle'],
  };
}
