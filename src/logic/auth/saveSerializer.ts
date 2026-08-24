/**
 * src/logic/auth/saveSerializer.ts
 *
 * Pure serialization logic for GameState into persistent SaveDataDto.
 * Zero UI / Pinia dependencies.
 */

import type { Pokemon, PokemonEgg, PokemonGender, PokemonIVs } from '@/types/pokemon/pokemon';
import type { GameState } from '@/types/system/game';
import type { BattleLog, BattleStages } from '@/types/battle/battle';
import type { SaveDataDto } from '@/logic/validation/schemas';
import { requireAbilityId } from '@/data/battle/abilities';
import { logger } from '@/logic/utils/logger';
import type { GenderName } from '@pkmn/sim';

const DEFAULT_POKEMON_FRIENDSHIP_FALLBACK = 70;

interface EnemyPokemonSerialized {
  uid: string;
  id: string;
  name: string;
  emoji?: string;
  type: string;
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  moves: unknown[];
  status: string | null;
  isShiny: boolean;
  gender: string | null;
  ivs: PokemonIVs;
  nature: string;
  ability: string;
  exp: number;
  expNeeded: number;
  friendship: number;
  _revealed: boolean;
  _gymLeader: string | null;
  _gymBadge: string | null;
}

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
  battleLogs?: BattleLog[];
  playerStages?: BattleStages | null;
  enemyStages?: BattleStages | null;
  enemyTeam: EnemyPokemonSerialized[] | null;
  timestamp: number;
  isPvP?: boolean;
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
    enemyTeam: battle.enemyTeam.map(enemy => ({
      ...enemy,
      gender: toPersistedPokemonGender(enemy.gender === 'm' || enemy.gender === 'f' ? enemy.gender : null),
    })),
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

export function serializeState(state: GameState | SaveDataDto): SaveDataDto {
  let activeBattle: ActiveBattleSerialized | null = null;
  const battle = state.activeBattle;

  const isBattleInSearching = battle && 'wasSearching' in battle && (battle as { wasSearching?: boolean }).wasSearching && (!('player' in battle && (battle as { player?: unknown }).player) || !('enemy' in battle && (battle as { enemy?: unknown }).enemy))

  if (battle && !('over' in battle && (battle as { over?: boolean }).over) && (battle.isTrainer || battle.isGym) && !isBattleInSearching) {
    try {
      const serialized: ActiveBattleSerialized = {
        isGym: battle.isGym || false,
        gymId: battle.gymId || null,
        isTrainer: battle.isTrainer || false,
        trainerName: battle.trainerName || null,
        trainerSprite: battle.trainerSprite || null,
        trainerArchetype: battle.trainerArchetype || null,
        quote: battle.quote || null,
        locationId: battle.locationId || null,
        wasSearching: Boolean(battle.wasSearching),
        participants: Array.isArray(battle.participants) ? battle.participants : [],
        enemyTeamIndex: typeof battle.enemyTeamIndex === 'number' ? battle.enemyTeamIndex : 0,
        battleLogs: Array.isArray(battle.battleLogs) ? battle.battleLogs : [],
        playerStages: battle.playerStages || null,
        enemyStages: battle.enemyStages || null,
        enemyTeam: battle.enemyTeam
          ? (battle.enemyTeam as Pokemon[]).map(p => ({
              uid: p.uid,
              id: p.id,
              name: p.name,
              emoji: (p as Pokemon & { emoji?: string }).emoji,
              type: p.type,
              level: p.level,
              hp: p.hp,
              maxHp: p.maxHp,
              atk: p.atk,
              def: p.def,
              spa: p.spa,
              spd: p.spd,
              spe: p.spe,
              moves: p.moves,
              status: p.status || null,
              isShiny: p.isShiny || false,
              gender: p.gender || null,
              ivs: p.ivs,
              nature: p.nature,
              ability: p.ability ? requireAbilityId(p.ability) : '',
              exp: p.exp || 0,
              expNeeded: p.expNeeded || 1,
              friendship: p.friendship || DEFAULT_POKEMON_FRIENDSHIP_FALLBACK,
              _revealed: (p as Pokemon & { _revealed?: boolean })._revealed || false,
              _gymLeader: (p as Pokemon & { _gymLeader?: string })._gymLeader || null,
              _gymBadge: (p as Pokemon & { _gymBadge?: string })._gymBadge || null,
            }))
          : null,
        timestamp: Temporal.Now.instant().epochMilliseconds,
      };
      activeBattle = serialized;
    } catch(e) {
      logger.warn('SAVE', `Error serializando batalla activa: ${(e as Error).message}`);
      activeBattle = null;
    }
  } else if (state.activeBattle && state.activeBattle.isPvP) {
    const b = state.activeBattle;
    activeBattle = {
      isGym: Boolean(b.isGym),
      gymId: b.gymId || null,
      isTrainer: Boolean(b.isTrainer),
      trainerName: b.trainerName || null,
      locationId: b.locationId || null,
      enemyTeam: null,
      timestamp: Temporal.Now.instant().epochMilliseconds,
      isPvP: true
    };
  }

  return {
    trainer: state.trainer,
    gender: state.gender || 'h',
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
