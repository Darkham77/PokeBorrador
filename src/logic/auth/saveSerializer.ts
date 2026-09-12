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
export function deserializePokemonTeam(rawTeam: unknown): Pokemon[] {
  if (!rawTeam) return [];

  let parsed: unknown[] = [];
  if (typeof rawTeam === 'string') {
    try {
      const decoded = JSON.parse(rawTeam);
      if (Array.isArray(decoded)) {
        parsed = decoded;
      }
    } catch {
      return [];
    }
  } else if (Array.isArray(rawTeam)) {
    parsed = rawTeam;
  }

  const result: Pokemon[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const rawMon = item as Pokemon;
    normalizeRuntimePokemonGender(rawMon);
    const maxHp = Number(rawMon.maxHp ?? rawMon.hp ?? 100);
    const mon: Pokemon = {
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
      uid: rawMon.uid || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mon_${Math.random()}`)
    };
    result.push(mon);
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
    starterChosen: Boolean(state.starterChosen),
    lastRankedSeason: state.lastRankedSeason || null,
    rankedMedals: (state.rankedMedals || []) as SaveDataDto['rankedMedals'],
    nick_style: state.nick_style || null,
    avatar_style: state.avatar_style || null,
    stats: state.stats || {},
    guardianCaptures: (state.guardianCaptures || {}) as SaveDataDto['guardianCaptures'],
    eloRating: state.eloRating,
    pvpStats: state.pvpStats,
    rankedMaxElo: state.rankedMaxElo,
    rankedRewardsClaimed: state.rankedRewardsClaimed || [],
    passiveTeamUids: state.passiveTeamUids || [],
    passiveTeamActive: Boolean(state.passiveTeamActive),
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
    daycareWarehouse: (state.daycareWarehouse || []) as SaveDataDto['daycareWarehouse'],
    boxCount: state.boxCount,
    chats: state.chats || {},
    playerClass: state.playerClass || null,
    classLevel: state.classLevel || 1,
    classXP: state.classXP || 0,
    classData: state.classData ? {
      captureStreak: state.classData.captureStreak || 0,
      longestStreak: state.classData.longestStreak || 0,
      reputation: state.classData.reputation || 0,
      blackMarketSales: state.classData.blackMarketSales || 0,
      criminality: state.classData.criminality || 0,
      blackMarketDaily: state.classData.blackMarketDaily ? {
        date: state.classData.blackMarketDaily.date || '',
        items: state.classData.blackMarketDaily.items || [],
        purchased: state.classData.blackMarketDaily.purchased || []
      } : { date: '', items: [], purchased: [] },
      activeMission: state.classData.activeMission ? {
        id: state.classData.activeMission.id,
        startedAt: Number(state.classData.activeMission.startedAt),
        endsAt: Number(state.classData.activeMission.endsAt),
        ...(state.classData.activeMission.targetPokemonUid ? { targetPokemonUid: state.classData.activeMission.targetPokemonUid } : {}),
        ...(typeof state.classData.activeMission.targetPokemonIdx === 'number' ? { targetPokemonIdx: state.classData.activeMission.targetPokemonIdx } : {}),
        ...(state.classData.activeMission.targetPokemonSpecies ? { targetPokemonSpecies: state.classData.activeMission.targetPokemonSpecies } : {}),
        ...(state.classData.activeMission.targetZone ? { targetZone: state.classData.activeMission.targetZone } : {}),
        ...(typeof state.classData.activeMission.streak === 'number' ? { streak: state.classData.activeMission.streak } : {}),
        ...(typeof state.classData.activeMission.projectedReward === 'number' ? { projectedReward: state.classData.activeMission.projectedReward } : {}),
        ...(state.classData.activeMission.rewards ? { rewards: state.classData.activeMission.rewards } : {})
      } : null,
      extortedRouteId: state.classData.extortedRouteId || null,
      extortedRouteTimestamp: state.classData.extortedRouteTimestamp || null,
      lastEggScanDate: state.classData.lastEggScanDate || null,
      officialRouteId: state.classData.officialRouteId || null,
      officialRouteTimestamp: state.classData.officialRouteTimestamp || null,
      kitCaptures: state.classData.kitCaptures || 0
    } : {
      captureStreak: 0,
      longestStreak: 0,
      reputation: 0,
      blackMarketSales: 0,
      criminality: 0,
      blackMarketDaily: { date: '', items: [], purchased: [] },
      activeMission: null,
      extortedRouteId: null,
      extortedRouteTimestamp: null,
      lastEggScanDate: null,
      officialRouteId: null,
      officialRouteTimestamp: null,
      kitCaptures: 0
    },
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
    pvpTeam6: state.pvpTeam6 || [],
    pvpMatchHistory: (state.pvpMatchHistory || []) as SaveDataDto['pvpMatchHistory'],
    lastResolvedSeasonId: state.lastResolvedSeasonId || '',
    dailyGymRematches: (state.dailyGymRematches || {}) as SaveDataDto['dailyGymRematches'],
    warTeam: state.warTeam || [],
    warSlots: state.warSlots || 6,
    notificationHistory: (state.notificationHistory || []) as SaveDataDto['notificationHistory'],
    marketSoldSeenIds: Array.isArray(state.marketSoldSeenIds)
      ? [...new Set((state.marketSoldSeenIds as (string | number)[]).map(id => (id !== null && id !== undefined ? String(id).trim() : '')).filter(id => id.length > 0 && !id.includes('invalid')))]
      : [],
    lastPokemonCenterHeal: state.lastPokemonCenterHeal || 0,
    playtime: state.playtime || 0,
    activeBattle: activeBattle as SaveDataDto['activeBattle'],
  };
}
