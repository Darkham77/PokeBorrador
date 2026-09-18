/**
 * src/logic/auth/saveSerializer.ts
 *
 * Pure serialization logic for GameState into persistent SaveDataDto.
 * Zero UI / Pinia dependencies.
 */

import type { Pokemon, PokemonEgg, PokemonGender } from '@/types/pokemon/pokemon';
import type { GameState } from '@/types/system/game';
import type { SaveDataDto } from '@/logic/validation/schemas';
import type { GenderName } from '@pkmn/sim';
import { cloneReactive } from '@/logic/utils/cloneUtils.ts';
import { serializeActiveBattle, type ActiveBattleSerialized } from './battleSerializerHelper.ts';

export type PersistedPokemon = Omit<Pokemon, 'gender'> & { gender: GenderName };
type PersistedPokemonEgg = Omit<PokemonEgg, 'gender'> & { gender: GenderName };

function toPersistedPokemonGender(gender: PokemonGender | undefined): GenderName {
  if (gender === 'm') return 'M';
  if (gender === 'f') return 'F';
  return 'N';
}

export function withPersistedPokemonGender(pokemon: Pokemon): PersistedPokemon {
  return {
    ...pokemon,
    gender: toPersistedPokemonGender(pokemon.gender),
  };
}

/**
 * Serializes a team of Pokemon 1:1 into persistent format,
 * identical to how teams are serialized in game_saves.
 * Restores full HP, empty status, and cleans volatile in-combat fields.
 */
export function serializePokemonTeam(team: (Pokemon | null)[]): PersistedPokemon[] {
  const cloned = cloneReactive(team);
  const result: PersistedPokemon[] = [];
  for (const mon of cloned) {
    if (!mon) continue;
    const maxHp = Number(mon.maxHp ?? mon.hp ?? 100);
    const sanitized: Pokemon = {
      ...mon,
      hp: maxHp,
      maxHp,
      status: '',
      statusTurns: 0,
      sleepTurns: 0,
      fainted: false,
      cursed: false,
      confused: 0,
      flinched: false,
      substitute: 0,
      seeded: false,
      attracted: false,
      isGuardian: false,
      volatileCounters: {}
    };
    result.push(withPersistedPokemonGender(sanitized));
  }
  return result;
}

/**
 * Deserializes a persistent Pokemon team (from string or array) 1:1 into canonical runtime Pokemon[],
 * normalizing genders and ensuring healthy combat readiness.
 */
function parseRawTeamArray(rawTeam: unknown): unknown[] {
  if (!rawTeam) return [];
  if (Array.isArray(rawTeam)) return rawTeam;
  if (typeof rawTeam === 'string') {
    try {
      const decoded = JSON.parse(rawTeam);
      return Array.isArray(decoded) ? decoded : [];
    } catch (_e) { // catch-ok: Return empty list on corrupted serialized team payload
      return [];
    }
  }
  return [];
}

function ensurePokemonUid(rawUid: string | undefined): string {
  if (rawUid) return rawUid;
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mon_${Math.random()}`;
}

function sanitizeDeserializedPokemon(rawMon: Pokemon): Pokemon {
  normalizeRuntimePokemonGender(rawMon);
  const maxHp = Number(rawMon.maxHp ?? rawMon.hp ?? 100);
  return {
    ...rawMon,
    hp: maxHp,
    maxHp,
    status: '',
    statusTurns: 0,
    sleepTurns: 0,
    fainted: false,
    cursed: false,
    confused: 0,
    flinched: false,
    substitute: 0,
    seeded: false,
    attracted: false,
    isGuardian: false,
    volatileCounters: {},
    uid: ensurePokemonUid(rawMon.uid)
  };
}

export function deserializePokemonTeam(rawTeam: unknown): Pokemon[] {
  const parsed = parseRawTeamArray(rawTeam);
  const result: Pokemon[] = [];
  for (const item of parsed) {
    if (item && typeof item === 'object') {
      result.push(sanitizeDeserializedPokemon(item as Pokemon));
    }
  }
  return result;
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

function serializeMapData(map: (GameState | SaveDataDto)['map']): SaveDataDto['map'] {
  if (!map) {
    return {
      currentMap: 'route1',
      region: 'kanto',
      lastNavigateAt: 0,
    };
  }
  return {
    currentMap: map.currentMap,
    region: map.region,
    lastNavigateAt: map.lastNavigateAt || 0,
  };
}

function serializeTicketBuffs(state: GameState | SaveDataDto) {
  return {
    safariTicketSecs: state.safariTicketSecs || 0,
    ceruleanTicketSecs: state.ceruleanTicketSecs || 0,
    articunoTicketSecs: state.articunoTicketSecs || 0,
    mewtwoTicketSecs: state.mewtwoTicketSecs || 0,
    repelSecs: state.repelSecs || 0,
  };
}

function serializeToolBuffs(state: GameState | SaveDataDto) {
  return {
    fishingRodSecs: state.fishingRodSecs || 0,
    fishingRodType: state.fishingRodType || null,
    pickaxeSecs: state.pickaxeSecs || 0,
    pickaxeType: state.pickaxeType || null,
    brushSecs: state.brushSecs || 0,
    brushType: state.brushType || null,
    incenseSecs: state.incenseSecs || 0,
    incenseType: state.incenseType || null,
  };
}

function serializeBoosterBuffs(state: GameState | SaveDataDto) {
  return {
    shinyBoostSecs: state.shinyBoostSecs || 0,
    amuletCoinSecs: state.amuletCoinSecs || 0,
    luckyEggSecs: state.luckyEggSecs || 0,
    ivScannerSecs: state.ivScannerSecs || 0,
    daycare_berry_egg_time: state.daycare_berry_egg_time || 0,
  };
}

function serializeTimedBuffs(state: GameState | SaveDataDto) {
  return {
    ...serializeTicketBuffs(state),
    ...serializeToolBuffs(state),
    ...serializeBoosterBuffs(state),
  };
}

function serializeWarOverview(state: GameState | SaveDataDto) {
  return {
    faction: state.faction || null,
    lastResolvedWeek: state.lastResolvedWeek || null,
    warTeam: state.warTeam || [],
    warSlots: state.warSlots || 6,
  };
}

function serializeWarEconomy(state: GameState | SaveDataDto) {
  return {
    warCoins: state.warCoins || 0,
    warCoinsSpent: state.warCoinsSpent || 0,
    warDailyCap: (state.warDailyCap || {}) as SaveDataDto['warDailyCap'],
    warDailyCoins: (state.warDailyCoins || {}) as SaveDataDto['warDailyCoins'],
    warMyPtsLocal: (state.warMyPtsLocal || {}) as SaveDataDto['warMyPtsLocal'],
    warPointsAccumulator: state.warPointsAccumulator || 0,
  };
}

function serializeWarState(state: GameState | SaveDataDto) {
  return {
    ...serializeWarOverview(state),
    ...serializeWarEconomy(state),
  };
}

function serializeMarketSoldSeenIds(rawIds: unknown): string[] {
  if (!Array.isArray(rawIds)) return [];
  const validIds = (rawIds as (string | number)[])
    .map(id => (id !== null && id !== undefined ? String(id).trim() : ''))
    .filter(id => id.length > 0 && !id.includes('invalid'));
  return [...new Set(validIds)];
}

function serializeBlackMarketDaily(daily: unknown) {
  if (!daily || typeof daily !== 'object') {
    return { date: '', items: [], purchased: [] };
  }
  const d = daily as NonNullable<NonNullable<GameState['classData']>['blackMarketDaily']>;
  return {
    date: d.date || '',
    items: d.items || [],
    purchased: d.purchased || [],
  };
}

function serializeClassActiveMission(mission: NonNullable<GameState['classData'] | SaveDataDto['classData']>['activeMission']) {
  if (!mission) return null;
  return {
    id: mission.id,
    startedAt: Number(mission.startedAt),
    endsAt: Number(mission.endsAt),
    ...(mission.targetPokemonUid ? { targetPokemonUid: mission.targetPokemonUid } : {}),
    ...(typeof mission.targetPokemonIdx === 'number' ? { targetPokemonIdx: mission.targetPokemonIdx } : {}),
    ...(mission.targetPokemonSpecies ? { targetPokemonSpecies: mission.targetPokemonSpecies } : {}),
    ...(mission.targetZone ? { targetZone: mission.targetZone } : {}),
    ...(typeof mission.streak === 'number' ? { streak: mission.streak } : {}),
    ...(typeof mission.projectedReward === 'number' ? { projectedReward: mission.projectedReward } : {}),
    ...(mission.rewards ? { rewards: mission.rewards } : {})
  };
}

function serializeTrainerIdentity(state: GameState | SaveDataDto) {
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
    nick_style: state.nick_style || null,
    avatar_style: state.avatar_style || null,
  };
}

function serializeGymAndPokedex(state: GameState | SaveDataDto) {
  return {
    pokedex: state.pokedex,
    seenPokedex: state.seenPokedex || [],
    defeatedGyms: state.defeatedGyms,
    gymProgress: state.gymProgress || {},
    lastGymWins: state.lastGymWins || {},
    lastGymAttempts: state.lastGymAttempts || {},
    dailyGymRematches: (state.dailyGymRematches || {}) as SaveDataDto['dailyGymRematches'],
  };
}

function serializeRankedAndPvP(state: GameState | SaveDataDto) {
  return {
    eloRating: state.eloRating,
    pvpStats: state.pvpStats,
    rankedMaxElo: state.rankedMaxElo,
    rankedRewardsClaimed: state.rankedRewardsClaimed || [],
    lastRankedSeason: state.lastRankedSeason || null,
    rankedMedals: (state.rankedMedals || []) as SaveDataDto['rankedMedals'],
    pvpTeam: state.pvpTeam || [],
    pvpTeam6: state.pvpTeam6 || [],
    pvpMatchHistory: (state.pvpMatchHistory || []) as SaveDataDto['pvpMatchHistory'],
    lastResolvedSeasonId: state.lastResolvedSeasonId || '',
  };
}

function serializeDaycareAndPassive(state: GameState | SaveDataDto) {
  return {
    passiveTeamUids: state.passiveTeamUids || [],
    passiveTeamActive: Boolean(state.passiveTeamActive),
    daycare_missions: (state.daycare_missions || []) as SaveDataDto['daycare_missions'],
    daycare_mission_refreshes: state.daycare_mission_refreshes,
    daycareWarehouse: (state.daycareWarehouse || []) as SaveDataDto['daycareWarehouse'],
  };
}

function serializeCollections(state: GameState | SaveDataDto) {
  return {
    inventory: (state.inventory || {}) as SaveDataDto['inventory'],
    team: (state.team || []) as SaveDataDto['team'],
    box: (state.box || []) as SaveDataDto['box'],
    stats: state.stats || {},
    guardianCaptures: (state.guardianCaptures || {}) as SaveDataDto['guardianCaptures'],
    chats: state.chats || {},
    claimQueue: (state.claimQueue || []) as SaveDataDto['claimQueue'],
    notificationHistory: (state.notificationHistory || []) as SaveDataDto['notificationHistory'],
  };
}

function serializeSessionState(state: GameState | SaveDataDto) {
  return {
    boxCount: state.boxCount,
    starterChosen: Boolean(state.starterChosen),
    marketSoldSeenIds: serializeMarketSoldSeenIds(state.marketSoldSeenIds),
    lastPokemonCenterHeal: state.lastPokemonCenterHeal || 0,
    playtime: state.playtime || 0,
    activeBattle: serializeActiveBattle(state) as SaveDataDto['activeBattle'],
    map: serializeMapData(state.map),
  };
}

function serializeClassRoutes(cd: NonNullable<GameState['classData'] | SaveDataDto['classData']>) {
  return {
    extortedRouteId: cd.extortedRouteId || null,
    extortedRouteTimestamp: cd.extortedRouteTimestamp || null,
    officialRouteId: cd.officialRouteId || null,
    officialRouteTimestamp: cd.officialRouteTimestamp || null,
  };
}

function serializeClassProgress(cd: NonNullable<GameState['classData'] | SaveDataDto['classData']>) {
  return {
    captureStreak: cd.captureStreak ?? 0,
    longestStreak: cd.longestStreak ?? 0,
    reputation: cd.reputation ?? 0,
    blackMarketSales: cd.blackMarketSales ?? 0,
    criminality: cd.criminality ?? 0,
    lastEggScanDate: cd.lastEggScanDate || null,
    kitCaptures: cd.kitCaptures || 0,
  };
}

function serializeClassData(cd: GameState['classData'] | SaveDataDto['classData']): SaveDataDto['classData'] {
  if (!cd) {
    return {
      captureStreak: 0,
      longestStreak: 0,
      reputation: 0,
      blackMarketSales: 0,
      criminality: 0,
      blackMarketDaily: serializeBlackMarketDaily(null),
      activeMission: null,
      extortedRouteId: null,
      extortedRouteTimestamp: null,
      lastEggScanDate: null,
      officialRouteId: null,
      officialRouteTimestamp: null,
      kitCaptures: 0,
    };
  }
  return {
    ...serializeClassProgress(cd),
    ...serializeClassRoutes(cd),
    blackMarketDaily: serializeBlackMarketDaily(cd.blackMarketDaily),
    activeMission: serializeClassActiveMission(cd.activeMission),
  };
}

function serializePlayerClass(state: GameState | SaveDataDto) {
  const cd = serializeClassData(state.classData);
  return {
    playerClass: state.playerClass || null,
    classLevel: state.classLevel || 1,
    classXP: state.classXP || 0,
    classData: {
      captureStreak: cd.captureStreak,
      longestStreak: cd.longestStreak,
      reputation: cd.reputation,
      blackMarketSales: cd.blackMarketSales,
      criminality: cd.criminality,
      blackMarketDaily: cd.blackMarketDaily,
      activeMission: cd.activeMission,
      extortedRouteId: cd.extortedRouteId,
      extortedRouteTimestamp: cd.extortedRouteTimestamp,
      lastEggScanDate: cd.lastEggScanDate,
      officialRouteId: cd.officialRouteId,
      officialRouteTimestamp: cd.officialRouteTimestamp,
      kitCaptures: cd.kitCaptures
    },
  };
}

export function serializeState(state: GameState | SaveDataDto): SaveDataDto {
  return {
    ...serializeTrainerIdentity(state),
    ...serializeCollections(state),
    ...serializeSessionState(state),
    ...serializePlayerClass(state),
    ...serializeGymAndPokedex(state),
    ...serializeRankedAndPvP(state),
    ...serializeDaycareAndPassive(state),
    ...serializeTimedBuffs(state),
    ...serializeWarState(state),
  };
}
