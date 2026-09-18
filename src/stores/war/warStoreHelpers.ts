/**
 * src/stores/war/warStoreHelpers.ts
 *
 * Modular helper functions and pure domain calculations for the War Store.
 */

import {
  DAILY_MAP_CAP,
  DAILY_COIN_CAP,
  WAR_POINTS_PER_COIN,
  WEEKLY_REWARD_MILESTONES,
  FACTION_VICTORY_BONUS_COINS,
  GUARDIAN_DEFEAT_POINTS_MULTIPLIER,
  getPointReward
} from '@/logic/war/warEngine.ts';
import { requireMapRouteId, type MapRouteId } from '@/data/world/map-assets.ts';
import { requireFactionId, type FactionId } from '@/types/system/game.ts';
import type { DominanceInfo } from '@/types/system/stores.ts';
import type { DBRouter } from '@/logic/db/dbRouter.ts';
import { logger } from '@/logic/utils/logger.ts';
import type { WarWinnerFaction } from '../war.ts';

interface GuardianCaptureEntry {
  map_id: MapRouteId;
}

export interface GuardianCapturesState {
  guardianCaptures?: Partial<Record<MapRouteId, string>>;
}

export interface WarPointsRecord {
  map_id: MapRouteId;
  faction: FactionId;
  points: number;
}

export interface DominanceRecord {
  map_id: MapRouteId;
  winner_faction: WarWinnerFaction | null;
}

export interface WarCoinsCalculationResult {
  allowedCoins: number;
  nextAccumulator: number;
  nextDailyCoins: number;
}

export function calculateWarCoinsAwarded(
  currentDailyCoins: number,
  currentAccumulator: number,
  ptsEarned: number,
  dailyCap: number = DAILY_COIN_CAP,
  ptsPerCoin: number = WAR_POINTS_PER_COIN
): WarCoinsCalculationResult {
  if (currentDailyCoins >= dailyCap) {
    return { allowedCoins: 0, nextAccumulator: currentAccumulator, nextDailyCoins: currentDailyCoins };
  }

  const updatedAccumulator = currentAccumulator + ptsEarned;
  if (updatedAccumulator < ptsPerCoin) {
    return { allowedCoins: 0, nextAccumulator: updatedAccumulator, nextDailyCoins: currentDailyCoins };
  }

  const newCoins = Math.floor(updatedAccumulator / ptsPerCoin);
  const allowedCoins = Math.min(newCoins, dailyCap - currentDailyCoins);
  const nextDailyCoins = currentDailyCoins + allowedCoins;
  const nextAccumulator = updatedAccumulator % ptsPerCoin;

  return { allowedCoins, nextAccumulator, nextDailyCoins };
}

function computeMilestoneCoins(userPts: number): number {
  let milestoneCoins = 0;
  for (const milestone of WEEKLY_REWARD_MILESTONES) {
    if (userPts >= milestone.pt) {
      milestoneCoins = milestone.coins;
    }
  }
  return milestoneCoins;
}

interface FactionWinsTally {
  unionWins: number;
  poderWins: number;
}

function countFactionWins(domData: DominanceRecord[]): FactionWinsTally {
  let unionWins = 0;
  let poderWins = 0;
  for (const d of domData) {
    if (d.winner_faction === 'union') unionWins++;
    else if (d.winner_faction === 'poder') poderWins++;
  }
  return { unionWins, poderWins };
}

function isFactionVictor(userFaction: FactionId, unionWins: number, poderWins: number): boolean {
  if (userFaction === 'union') return unionWins > poderWins;
  if (userFaction === 'poder') return poderWins > unionWins;
  return false;
}

function computeVictoryBonus(
  domData: DominanceRecord[] | null,
  userFaction: FactionId | null,
  bonusAmount: number = FACTION_VICTORY_BONUS_COINS
): number {
  if (!domData || !Array.isArray(domData) || !userFaction) return 0;
  const { unionWins, poderWins } = countFactionWins(domData);
  return isFactionVictor(userFaction, unionWins, poderWins) ? bonusAmount : 0;
}

interface DominancePayloadRow {
  week_id: string; // infra-id-ok: Temporal ISO week identifier string (YYYY-Www)
  map_id: MapRouteId;
  winner_faction: string;
}

function computeWeeklyMapDominanceRows(
  pointsList: WarPointsRecord[],
  prevWeek: string
): DominancePayloadRow[] {
  const mapTotals: Partial<Record<MapRouteId, { union: number; poder: number }>> = {};
  for (const row of pointsList) {
    const routeId = requireMapRouteId(row.map_id);
    const factionId = requireFactionId(row.faction);
    if (!mapTotals[routeId]) mapTotals[routeId] = { union: 0, poder: 0 };
    mapTotals[routeId]![factionId] += row.points;
  }

  return Object.entries(mapTotals).map(([map_id, totals]) => {
    let winner_faction = 'tie';
    if (totals.union > totals.poder) winner_faction = 'union';
    else if (totals.poder > totals.union) winner_faction = 'poder';

    return {
      week_id: prevWeek,
      map_id: requireMapRouteId(map_id),
      winner_faction
    };
  });
}

export function calculateAllowedMapPoints(
  dailyCap: Partial<Record<string, Partial<Record<MapRouteId, number>>>>,
  today: string,
  routeId: MapRouteId,
  pts: number,
  maxDailyMapCap: number = DAILY_MAP_CAP
): number {
  if (!dailyCap[today]) dailyCap[today] = {};
  const currentMapPts = dailyCap[today]![routeId] || 0;
  if (currentMapPts >= maxDailyMapCap) return 0;
  return Math.min(pts, maxDailyMapCap - currentMapPts);
}

function syncGuardianCapturesState(
  state: GuardianCapturesState,
  typedGuardians: GuardianCaptureEntry[],
  today: string
): MapRouteId[] {
  if (!state.guardianCaptures) {
    state.guardianCaptures = {};
  }
  const routeIds: MapRouteId[] = [];
  for (const g of typedGuardians) {
    const routeId = requireMapRouteId(g.map_id);
    routeIds.push(routeId);
    state.guardianCaptures[routeId] = today;
  }
  return routeIds;
}

export interface UserWeeklyProgressData {
  weeklyPoints: number;
  guardianRoutes: MapRouteId[];
}

export async function fetchUserWeeklyProgress(
  db: DBRouter,
  userId: string,
  weekId: string, // infra-id-ok: Temporal ISO week identifier string (YYYY-Www)
  state: GuardianCapturesState,
  today: string
): Promise<UserWeeklyProgressData> {
  const { data: pts } = await db.from('war_user_points')
    .select('points')
    .eq('user_id', userId)
    .eq('week_id', weekId);

  const weeklyPoints = (pts as Array<{ points: number }> | null)?.reduce((acc, r) => acc + (r.points || 0), 0) || 0;

  const { data: guardians } = await db.from('guardian_captures')
    .select('map_id')
    .eq('user_id', userId)
    .eq('capture_date', today);

  const typedGuardians = (guardians as GuardianCaptureEntry[] | null) || [];
  const guardianRoutes = syncGuardianCapturesState(state, typedGuardians, today);

  return { weeklyPoints, guardianRoutes };
}

export function registerGuardianLockout(
  state: GuardianCapturesState,
  dailyCaptures: MapRouteId[],
  routeId: MapRouteId,
  today: string
): void {
  if (!state.guardianCaptures) {
    state.guardianCaptures = {};
  }
  state.guardianCaptures[routeId] = today;
  if (!dailyCaptures.includes(routeId)) {
    dailyCaptures.push(routeId);
  }
}

export function parsePointsToDominance(
  points: WarPointsRecord[] | null
): Partial<Record<MapRouteId, DominanceInfo>> {
  const newDom: Partial<Record<MapRouteId, DominanceInfo>> = {};
  if (!points) return newDom;
  for (const row of points) {
    const routeId = requireMapRouteId(row.map_id);
    const factionId = requireFactionId(row.faction);
    if (!newDom[routeId]) newDom[routeId] = { union: 0, poder: 0, winner: null };
    newDom[routeId]![factionId] = row.points;
  }
  return newDom;
}

export function mergeSettledWinners(
  domMap: Partial<Record<MapRouteId, DominanceInfo>>,
  domRecords: DominanceRecord[] | null
): void {
  if (!domRecords) return;
  for (const row of domRecords) {
    const routeId = requireMapRouteId(row.map_id);
    if (!domMap[routeId]) domMap[routeId] = { union: 0, poder: 0, winner: null };
    domMap[routeId]!.winner = (!row.winner_faction || row.winner_faction === 'tie') ? null : requireFactionId(row.winner_faction);
  }
}

export function calculateGuardianRewardPoints(basePts: number, isDefeat: boolean): number {
  return isDefeat ? Math.floor(basePts * GUARDIAN_DEFEAT_POINTS_MULTIPLIER) : basePts;
}

export async function persistGuardianCapture(
  db: DBRouter,
  userId: string,
  routeId: MapRouteId,
  today: string,
  faction: FactionId | null,
  ptsAwarded: number
): Promise<boolean> {
  const { error } = await db.from('guardian_captures').insert({
    capture_date: today,
    map_id: routeId,
    user_id: userId,
    winner_faction: faction,
    pts_awarded: ptsAwarded
  });
  return !error;
}

export function resolveRewardPoints(eventType: string, success: boolean, customPoints?: number): number {
  return customPoints !== undefined ? customPoints : getPointReward(eventType, success);
}

async function upsertDominanceRows(db: DBRouter, rows: DominancePayloadRow[]): Promise<void> {
  try {
    const { error } = await db.from('war_dominance').upsert(rows);
    if (error) {
      const errMsg = (error as { message?: string })?.message ?? String(error);
      logger.warn('WarStore', `Failed to upsert war dominance: ${errMsg}`);
    }
  } catch (err) {
    logger.warn('WarStore', `Error resolving weekly dominance: ${(err as Error).message}`);
  }
}

export async function executeResolveWeekDominance(
  db: DBRouter,
  prevWeek: string // infra-id-ok: Temporal ISO week identifier string (YYYY-Www)
): Promise<void> {
  const { data: existingDom } = await db.from('war_dominance')
    .select('map_id')
    .eq('week_id', prevWeek);

  if (Array.isArray(existingDom) && existingDom.length > 0) return;

  const { data: pointsData } = await db.from('war_points')
    .select('map_id, faction, points')
    .eq('week_id', prevWeek);

  const pointsList = pointsData as WarPointsRecord[] | null;
  if (!pointsList || pointsList.length === 0) return;

  const dominanceRows = computeWeeklyMapDominanceRows(pointsList, prevWeek);
  if (dominanceRows.length === 0) return;

  await upsertDominanceRows(db, dominanceRows);
}

function sumPoints(pts: Array<{ points: number }> | null): number {
  return pts?.reduce((acc, r) => acc + (r.points || 0), 0) || 0;
}

export interface WeeklyRewardResult {
  milestoneCoins: number;
  victoryBonus: number;
  totalReward: number;
}

export async function fetchWeeklyRewardCalculation(
  db: DBRouter,
  userId: string,
  prevWeek: string, // infra-id-ok: Temporal ISO week identifier string (YYYY-Www)
  userFaction: FactionId
): Promise<WeeklyRewardResult | null> {
  const { data: ptsData } = await db.from('war_user_points')
    .select('points')
    .eq('user_id', userId)
    .eq('week_id', prevWeek);

  const userPts = sumPoints(ptsData as Array<{ points: number }> | null);
  if (userPts <= 0) return null;

  const milestoneCoins = computeMilestoneCoins(userPts);

  const { data: domData } = await db.from('war_dominance')
    .select('winner_faction')
    .eq('week_id', prevWeek);

  const victoryBonus = computeVictoryBonus(domData as DominanceRecord[] | null, userFaction);
  const totalReward = milestoneCoins + victoryBonus;

  if (totalReward <= 0) return null;

  return { milestoneCoins, victoryBonus, totalReward };
}

export function formatWeeklyRewardNotification(milestoneCoins: number, victoryBonus: number, totalReward: number): string {
  const victoryText = victoryBonus > 0 ? ` + ${FACTION_VICTORY_BONUS_COINS} por victoria de facción` : '';
  return `¡Recompensa semanal recibida! ⚡+${totalReward} Monedas de Guerra (${milestoneCoins} por hitos${victoryText}).`;
}


