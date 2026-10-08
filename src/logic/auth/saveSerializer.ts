/**
 * src/logic/auth/saveSerializer.ts
 *
 * Pure serialization logic for GameState into persistent SaveDataDto.
 * Zero UI / Pinia dependencies.
 */

import type { GameState } from '@/types/system/game';
import type { SaveDataDto } from '@/logic/validation/schemas';
import { serializeActiveBattle } from './battleSerializerHelper.ts';
import { parseMarketSoldSeenIds } from './saveSanitizerHelpers.ts';

function serializeMapData(map: (GameState | SaveDataDto)['map']): SaveDataDto['map'] {
  return {
    currentMap: map?.currentMap ?? 'route1',
    region: map?.region ?? 'kanto',
    lastNavigateAt: map?.lastNavigateAt ?? 0,
  };
}

function serializeTicketBuffs(state: GameState | SaveDataDto) {
  return {
    safariTicketSecs: state.safariTicketSecs ?? 0,
    ceruleanTicketSecs: state.ceruleanTicketSecs ?? 0,
    articunoTicketSecs: state.articunoTicketSecs ?? 0,
    mewtwoTicketSecs: state.mewtwoTicketSecs ?? 0,
    repelSecs: state.repelSecs ?? 0,
  };
}

function serializeToolBuffs(state: GameState | SaveDataDto) {
  return {
    fishingRodSecs: state.fishingRodSecs ?? 0,
    fishingRodType: state.fishingRodType ?? null,
    pickaxeSecs: state.pickaxeSecs ?? 0,
    pickaxeType: state.pickaxeType ?? null,
    brushSecs: state.brushSecs ?? 0,
    brushType: state.brushType ?? null,
    incenseSecs: state.incenseSecs ?? 0,
    incenseType: state.incenseType ?? null,
  };
}

function serializeBoosterBuffs(state: GameState | SaveDataDto) {
  return {
    shinyBoostSecs: state.shinyBoostSecs ?? 0,
    amuletCoinSecs: state.amuletCoinSecs ?? 0,
    luckyEggSecs: state.luckyEggSecs ?? 0,
    ivScannerSecs: state.ivScannerSecs ?? 0,
    daycare_berry_egg_time: state.daycare_berry_egg_time ?? 0,
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
    faction: state.faction ?? null,
    lastResolvedWeek: state.lastResolvedWeek ?? null,
    warTeam: state.warTeam ?? [],
    warSlots: state.warSlots ?? 6,
  };
}

function serializeWarEconomy(state: GameState | SaveDataDto) {
  return {
    warCoins: state.warCoins,
    warCoinsSpent: state.warCoinsSpent,
    warDailyCap: state.warDailyCap as SaveDataDto['warDailyCap'],
    warDailyCoins: state.warDailyCoins as SaveDataDto['warDailyCoins'],
    warMyPtsLocal: state.warMyPtsLocal as SaveDataDto['warMyPtsLocal'],
    warPointsAccumulator: state.warPointsAccumulator,
  };
}

function serializeWarState(state: GameState | SaveDataDto) {
  return {
    ...serializeWarOverview(state),
    ...serializeWarEconomy(state),
  };
}

function serializeBlackMarketDaily(daily: unknown) {
  const d = daily as NonNullable<NonNullable<GameState['classData']>['blackMarketDaily']> | null | undefined;
  return {
    date: d?.date ?? '',
    items: d?.items ?? [],
    purchased: d?.purchased ?? [],
  };
}

function serializeClassActiveMission(mission: NonNullable<GameState['classData'] | SaveDataDto['classData']>['activeMission']) {
  if (!mission) return null;
  return {
    id: mission.id,
    startedAt: Number(mission.startedAt),
    endsAt: Number(mission.endsAt),
    targetPokemonUid: mission.targetPokemonUid,
    targetPokemonIdx: mission.targetPokemonIdx,
    targetPokemonSpecies: mission.targetPokemonSpecies,
    targetZone: mission.targetZone,
    streak: mission.streak,
    projectedReward: mission.projectedReward,
    rewards: mission.rewards
  };
}

function serializeTrainerIdentity(state: GameState | SaveDataDto) {
  return {
    trainer: state.trainer,
    gender: state.gender ?? 'h',
    last_renamed_at: state.last_renamed_at ?? null,
    badges: state.badges,
    balls: state.balls,
    money: state.money,
    battleCoins: state.battleCoins,
    eggs: state.eggs as SaveDataDto['eggs'],
    trainerLevel: state.trainerLevel,
    trainerExp: state.trainerExp,
    trainerExpNeeded: state.trainerExpNeeded,
    trainerChance: state.trainerChance ?? 1,
    nick_style: state.nick_style ?? null,
    avatar_style: state.avatar_style ?? null,
  };
}

function serializeGymAndPokedex(state: GameState | SaveDataDto) {
  return {
    pokedex: state.pokedex,
    seenPokedex: state.seenPokedex,
    defeatedGyms: state.defeatedGyms,
    gymProgress: state.gymProgress,
    lastGymWins: state.lastGymWins,
    lastGymAttempts: state.lastGymAttempts,
    dailyGymRematches: state.dailyGymRematches as SaveDataDto['dailyGymRematches'],
  };
}

function serializeRankedAndPvP(state: GameState | SaveDataDto) {
  return {
    eloRating: state.eloRating,
    pvpStats: state.pvpStats,
    rankedMaxElo: state.rankedMaxElo,
    rankedRewardsClaimed: state.rankedRewardsClaimed,
    lastRankedSeason: state.lastRankedSeason ?? null,
    rankedMedals: (state.rankedMedals ?? []) as SaveDataDto['rankedMedals'],
    pvpTeam: state.pvpTeam,
    pvpTeam6: state.pvpTeam6,
    pvpMatchHistory: state.pvpMatchHistory as SaveDataDto['pvpMatchHistory'],
    lastResolvedSeasonId: state.lastResolvedSeasonId ?? '',
  };
}

function serializeDaycareAndPassive(state: GameState | SaveDataDto) {
  return {
    passiveTeamUids: state.passiveTeamUids,
    passiveTeamActive: Boolean(state.passiveTeamActive),
    daycare_missions: state.daycare_missions as SaveDataDto['daycare_missions'],
    daycare_mission_refreshes: state.daycare_mission_refreshes,
    daycareWarehouse: state.daycareWarehouse as SaveDataDto['daycareWarehouse'],
  };
}

function serializeCollections(state: GameState | SaveDataDto) {
  return {
    inventory: state.inventory as SaveDataDto['inventory'],
    team: state.team as SaveDataDto['team'],
    box: state.box as SaveDataDto['box'],
    stats: state.stats,
    guardianCaptures: (state.guardianCaptures ?? {}) as SaveDataDto['guardianCaptures'],
    chats: state.chats,
    claimQueue: state.claimQueue as SaveDataDto['claimQueue'],
    notificationHistory: state.notificationHistory as SaveDataDto['notificationHistory'],
  };
}

function serializeSessionState(state: GameState | SaveDataDto) {
  return {
    boxCount: state.boxCount,
    starterChosen: Boolean(state.starterChosen),
    marketSoldSeenIds: parseMarketSoldSeenIds(state.marketSoldSeenIds),
    lastPokemonCenterHeal: state.lastPokemonCenterHeal ?? 0,
    playtime: state.playtime ?? 0,
    activeBattle: serializeActiveBattle(state) as SaveDataDto['activeBattle'],
    map: serializeMapData(state.map),
  };
}

function serializeClassRoutes(cd: NonNullable<GameState['classData'] | SaveDataDto['classData']>) {
  return {
    extortedRouteId: cd.extortedRouteId ?? null,
    extortedRouteTimestamp: cd.extortedRouteTimestamp ?? null,
    officialRouteId: cd.officialRouteId ?? null,
    officialRouteTimestamp: cd.officialRouteTimestamp ?? null,
  };
}

function serializeClassProgress(cd: NonNullable<GameState['classData'] | SaveDataDto['classData']>) {
  return {
    captureStreak: cd.captureStreak,
    longestStreak: cd.longestStreak,
    reputation: cd.reputation,
    blackMarketSales: cd.blackMarketSales,
    criminality: cd.criminality,
    lastEggScanDate: cd.lastEggScanDate ?? null,
    kitCaptures: cd.kitCaptures ?? 0,
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
    playerClass: state.playerClass ?? null,
    classLevel: state.classLevel ?? 1,
    classXP: state.classXP ?? 0,
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
