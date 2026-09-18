/**
 * src/logic/debug/rewardsDebugSimulationHelpers.ts
 *
 * Modular injection and clearing helpers for rewards debug simulation.
 */

import type { PendingAward } from '@/types/system/stores';
import type { MarketListing } from '@/logic/economy/market';
import type { AuthUser } from '@/types/auth/auth';
import type { DBRouter } from '@/logic/db/dbRouter';
import type { SeasonalThemeId } from '@/types/battle/pvp';
import { isRankedRewardMilestoneId, getSeasonalThemeForMonth, type RankedRewardMilestoneId } from '@/data/system/rankedData';
import { safeStorage } from '@/logic/utils/storage';
import { logger } from '@/logic/utils/logger';
import { findLatestPastEvent, pickRandomPrize } from './rewardsDebugOccurrenceHelper.ts';
import type { Event as GameEvent } from '@/logic/events/eventEngine';
import type { GameState } from '@/types/system/game';

export const DEFAULT_RESET_ELO = 1000 as const;

async function persistAwardsToDb(
  db: DBRouter,
  user: AuthUser | null,
  awardId: string,
  eventId: string,
  prize: unknown,
  awardedAt: string
): Promise<void> {
  try {
    const dbWinnerId = (db.mode === 'online' && (!user?.id || user.id.length !== 36))
      ? '00000000-0000-0000-0000-000000000000'
      : (user?.id || 'player_test');

    const dbRow = {
      id: awardId,
      event_id: eventId,
      winner_id: dbWinnerId,
      winner_name: user?.user_metadata?.username || 'Entrenador Test',
      winner_email: 'test_reward@pokevicio.com',
      prize: typeof prize === 'string' ? JSON.parse(prize) : prize,
      awarded_at: awardedAt,
      claimed: false,
      received_at: null
    };
    await db.from('awards').insert([dbRow]);
    const { persistSQLite } = await import('@/logic/db/sqliteEngine');
    await persistSQLite();
  } catch (err) {
    logger.warn('[rewardsDebugSimulation] Fallo al insertar award en DB:', err);
  }
}

export async function injectSimulatedPastEventAwards(
  allEvents: GameEvent[],
  nowZdt: Temporal.ZonedDateTime,
  db: DBRouter | null,
  user: AuthUser | null,
  isOnlineDb: boolean,
  existingAwards: PendingAward[]
): Promise<{ eventSummary: string; pendingAwards: PendingAward[] }> {
  const pastMatch = findLatestPastEvent(allEvents, nowZdt);
  if (!pastMatch) {
    return { eventSummary: 'Evento Pasado', pendingAwards: existingAwards };
  }

  const { event, endedAt } = pastMatch;
  const { prize, rankLabel, categoryId, categoryName } = pickRandomPrize(event);
  const awardId = isOnlineDb ? crypto.randomUUID() : `test_award_${Temporal.Now.instant().epochMilliseconds}`;
  const prizeStr = JSON.stringify(prize);

  const newAward: PendingAward = {
    id: awardId,
    winner_id: user?.id || 'player_test',
    event_id: event.id,
    category_id: categoryId || 'general',
    category_name: categoryName || 'Torneo Oficial',
    prize: prizeStr,
    prize_summary: `${event.name} - ${rankLabel}`,
    received_at: null,
    awarded_at: endedAt.toString()
  };

  const archivedAwardId = isOnlineDb ? crypto.randomUUID() : `test_archived_award_${Temporal.Now.instant().epochMilliseconds}`;
  const archivedPrize = { money: 10000, item: 'rarecandy', qty: 2 };
  const archivedAward: PendingAward = {
    id: archivedAwardId,
    winner_id: user?.id || 'player_test',
    event_id: 'legacy_archived_tournament_2024',
    category_id: 'general',
    category_name: 'Torneo Kanto 2024 (Archivado)',
    prize: JSON.stringify(archivedPrize),
    prize_summary: 'Torneo Kanto 2024 (Archivado) - Premio Conmemorativo',
    received_at: null,
    awarded_at: '2024-01-01T00:00:00Z'
  };

  if (db) {
    await persistAwardsToDb(db, user, awardId, event.id, prize, endedAt.toString());
    await persistAwardsToDb(db, user, archivedAwardId, 'legacy_archived_tournament_2024', archivedPrize, '2024-01-01T00:00:00Z');
  }

  const updatedAwards = [
    newAward,
    archivedAward,
    ...existingAwards.filter(a => a.id !== awardId && a.id !== archivedAwardId)
  ];

  return {
    eventSummary: `${event.name} (${rankLabel}) y Torneo Archivado 2024`,
    pendingAwards: updatedAwards
  };
}

export function injectSimulatedClassMission(state: GameState): void {
  const nowMs = Temporal.Now.instant().epochMilliseconds;
  if (!state.playerClass) {
    state.playerClass = 'entrenador';
  }
  state.classData = {
    ...state.classData,
    activeMission: {
      id: 'mission_6h',
      startedAt: nowMs - (7 * 3600 * 1000),
      endsAt: nowMs - (1 * 3600 * 1000),
      projectedReward: 5000
    }
  };
}

function ensureLocalAuthUser(user: AuthUser | null, sellerId: string, sellerName: string): void {
  if (!user) {
    const fallbackUser: AuthUser = {
      id: sellerId,
      email: 'local@pokevicio.com',
      user_metadata: { username: sellerName }
    };
    safeStorage.setItem('pokevicio_local_user', JSON.stringify(fallbackUser));
  } else {
    safeStorage.setItem('pokevicio_local_user', JSON.stringify(user));
  }
}

function createSimulatedEevee() {
  return {
    uid: `poke-sim-${Temporal.Now.instant().epochMilliseconds}`,
    id: 'eevee',
    species: 'eevee',
    name: 'Eevee',
    level: 15,
    exp: 1000,
    expNeeded: 2500,
    hp: 45,
    maxHp: 45,
    atk: 25,
    def: 20,
    spa: 20,
    spd: 30,
    spe: 25,
    type: 'normal',
    isShiny: false,
    friendship: 70,
    nature: 'jolly',
    gender: 'm',
    status: '',
    ability: 'runaway',
    vigor: 100,
    maxVigor: 100,
    ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    moves: [{ id: 'tackle', name: 'Placaje', type: 'normal', power: 40, pp: 35, maxPP: 35 }],
    obtainedAt: Temporal.Now.instant().epochMilliseconds,
    obtainedMethod: 'reward' as const
  };
}

async function persistGtsClaimsAndListingToDb(
  db: DBRouter,
  sellerId: string,
  sellerName: string,
  claimId: string,
  pokeClaimUid: string,
  listingId: string,
  pokeListingUid: string,
  buyerId: string,
  nowIso: string,
  moneyAssetData: unknown,
  pokeAssetData: unknown,
  numericListingId: number
): Promise<void> {
  try {
    await db.from('claim_queue').insert([
      {
        id: claimId,
        user_id: sellerId,
        source_type: 'gts',
        source_id: listingId,
        asset_data: moneyAssetData,
        created_at: nowIso
      },
      {
        id: pokeClaimUid,
        user_id: sellerId,
        source_type: 'gts',
        source_id: pokeListingUid,
        asset_data: pokeAssetData,
        created_at: nowIso
      }
    ]);

    const isOnline = db.mode === 'online';
    const dbListingId = isOnline ? crypto.randomUUID() : numericListingId;
    await db.from('market_listings').insert([
      {
        id: dbListingId,
        seller_id: sellerId,
        seller_name: sellerName,
        price: 15000,
        listing_type: 'item',
        data: { name: 'nugget', qty: 1 },
        created_at: nowIso,
        status: 'sold',
        buyer_id: buyerId
      }
    ]);
    const { persistSQLite } = await import('@/logic/db/sqliteEngine');
    await persistSQLite();
  } catch (err) {
    logger.warn('[rewardsDebugSimulation] Fallo al insertar claims en DB:', err);
    throw err;
  }
}

export async function injectSimulatedGtsClaimsAndListings(
  state: GameState,
  db: DBRouter | null,
  user: AuthUser | null,
  isOnlineDb: boolean,
  setSalesHistory?: (listing: MarketListing) => void
): Promise<void> {
  const claimId = isOnlineDb ? crypto.randomUUID() : `test_claim_${Temporal.Now.instant().epochMilliseconds}`;
  const pokeClaimUid = isOnlineDb ? crypto.randomUUID() : `test_claim_poke_${Temporal.Now.instant().epochMilliseconds}`;
  const numericListingId = Math.floor(Temporal.Now.instant().epochMilliseconds % 2147483647);
  const listingId = isOnlineDb ? crypto.randomUUID() : String(numericListingId);
  const pokeListingUid = isOnlineDb ? crypto.randomUUID() : String(numericListingId + 1);
  const buyerId = crypto.randomUUID();
  const nowIso = Temporal.Now.instant().toString();
  const sellerId = user?.id || 'local_user';
  const sellerName = (state.trainer as { name?: string } | undefined)?.name || 'Entrenador';

  ensureLocalAuthUser(user, sellerId, sellerName);

  const newClaim = {
    id: claimId,
    user_id: sellerId,
    asset_data: {
      type: 'money' as const,
      data: 15000,
      sold_item: { name: 'nugget', qty: 1 }
    },
    source_type: 'gts',
    source_id: listingId,
    created_at: nowIso
  };

  const simulatedPokemon = createSimulatedEevee();

  const pokeClaim = {
    id: pokeClaimUid,
    user_id: sellerId,
    asset_data: {
      type: 'pokemon' as const,
      data: simulatedPokemon
    },
    source_type: 'gts',
    source_id: pokeListingUid,
    created_at: nowIso
  };

  state.claimQueue = [
    newClaim,
    pokeClaim,
    ...(state.claimQueue || []).filter(c => !String(c.id).startsWith('test_claim_') && c.id !== claimId && c.id !== pokeClaimUid)
  ];

  if (db) {
    await persistGtsClaimsAndListingToDb(db, sellerId, sellerName, claimId, pokeClaimUid, listingId, pokeListingUid, buyerId, nowIso, newClaim.asset_data, pokeClaim.asset_data, numericListingId);
  }

  if (setSalesHistory) {
    setSalesHistory({
      id: listingId,
      seller_id: sellerId,
      seller_name: sellerName,
      listing_type: 'item',
      data: { name: 'nugget', qty: 1 },
      price: 15000,
      status: 'sold',
      buyer_id: buyerId,
      created_at: nowIso
    });
  }
}

async function persistRankedAwardToDb(
  db: DBRouter,
  user: AuthUser | null,
  sellerId: string,
  rankedAwardUid: string,
  eventId: string,
  tournamentName: string,
  themeId: SeasonalThemeId,
  targetElo: number,
  nowIso: string
): Promise<void> {
  try {
    const dbWinnerId = (db.mode === 'online' && (!sellerId || sellerId.length !== 36))
      ? '00000000-0000-0000-0000-000000000000'
      : sellerId;

    const dbRow = {
      id: rankedAwardUid,
      event_id: eventId,
      winner_id: dbWinnerId,
      winner_name: user?.user_metadata?.username || 'Entrenador Test',
      winner_email: 'test_reward@pokevicio.com',
      prize: {
        type: 'ranked_medal',
        tier: 'plata',
        season: tournamentName,
        tournamentName,
        themeId,
        rank: 12,
        elo: targetElo,
        battleCoins: 75
      },
      awarded_at: nowIso,
      claimed: false,
      received_at: null
    };
    await db.from('awards').insert([dbRow]);
    const { persistSQLite } = await import('@/logic/db/sqliteEngine');
    await persistSQLite();
  } catch (err) {
    logger.warn('[rewardsDebugSimulation] Fallo al insertar award ranked en DB:', err);
  }
}

export async function injectSimulatedRankedSeason(
  state: GameState,
  db: DBRouter | null,
  user: AuthUser | null,
  isOnlineDb: boolean,
  nowZdt: Temporal.ZonedDateTime,
  currentSeasonRulesName?: string,
  syncPvpStore?: (targetElo: number, unlockedMilestones: ReadonlySet<RankedRewardMilestoneId>) => string[],
  addPendingAward?: (award: PendingAward) => void
): Promise<void> {
  const targetElo = 1400;
  state.rankedMaxElo = targetElo;
  state.eloRating = targetElo;
  const unlockedMilestones: ReadonlySet<RankedRewardMilestoneId> = new Set<RankedRewardMilestoneId>([ // runtime-set: Fast O(1) membership lookup set
    'bronce_1000',
    'bronce_1100',
    'plata_1200',
    'plata_1400',
  ]);

  if (syncPvpStore) {
    const rewards = syncPvpStore(targetElo, unlockedMilestones);
    state.rankedRewardsClaimed = rewards;
  } else {
    state.rankedRewardsClaimed = (state.rankedRewardsClaimed || []).filter(id => !isRankedRewardMilestoneId(id) || !unlockedMilestones.has(id));
  }

  const currentTheme = getSeasonalThemeForMonth(nowZdt.month);
  const tournamentName = currentSeasonRulesName || currentTheme.name;
  const eventId = `ranked_season_${currentTheme.id}`;
  const nowIso = Temporal.Now.instant().toString();
  const sellerId = user?.id || 'local_user';

  const rankedAwardUid = isOnlineDb ? crypto.randomUUID() : `test_ranked_award_${Temporal.Now.instant().epochMilliseconds}`;
  const rankedSeasonAward: PendingAward = {
    id: rankedAwardUid,
    winner_id: sellerId,
    event_id: eventId,
    category_id: 'plata',
    category_name: 'Temporada Ranked',
    prize: JSON.stringify({
      type: 'ranked_medal',
      tier: 'plata',
      season: tournamentName,
      tournamentName,
      themeId: currentTheme.id,
      rank: 12,
      elo: targetElo,
      battleCoins: 75
    }),
    prize_summary: `Temporada Ranked: ${tournamentName} - Rango Plata`,
    received_at: null,
    awarded_at: nowIso
  };

  if (db) {
    await persistRankedAwardToDb(db, user, sellerId, rankedAwardUid, eventId, tournamentName, currentTheme.id, targetElo, nowIso);
  }

  if (addPendingAward) {
    addPendingAward(rankedSeasonAward);
  }
}

export async function clearSimulatedAwards(
  pendingAwards: PendingAward[],
  db: DBRouter | null
): Promise<PendingAward[]> {
  const filtered = pendingAwards.filter(a =>
    !a.id.startsWith('test_award_') &&
    !a.id.startsWith('test_ranked_award_') &&
    !a.id.startsWith('test_archived_award_') &&
    a.event_id !== 'legacy_archived_tournament_2024' &&
    (a as { winner_email?: string }).winner_email !== 'test_reward@pokevicio.com'
  );

  if (db) {
    try {
      await db.from('awards').delete().eq('winner_email', 'test_reward@pokevicio.com');
    } catch (err) {
      logger.warn('[rewardsDebugSimulation] Fallo al eliminar awards de prueba en DB:', err);
    }
  }

  return filtered;
}

export function clearSimulatedClassMission(state: GameState): void {
  const classData = state.classData as { activeMission?: { id?: string; endsAt?: number } | null } | undefined;
  const mission = classData?.activeMission;
  if (mission && mission.id === 'mission_6h' && typeof mission.endsAt === 'number' && mission.endsAt < Temporal.Now.instant().epochMilliseconds) {
    if (state.classData) {
      state.classData.activeMission = null;
    }
  }
}

export async function clearSimulatedGts(
  state: GameState,
  db: DBRouter | null,
  filterSalesHistory?: () => void
): Promise<void> {
  state.claimQueue = (state.claimQueue || []).filter(c => !String(c.id).startsWith('test_claim_'));

  if (filterSalesHistory) {
    filterSalesHistory();
  }

  if (db) {
    try {
      await db.from('claim_queue').delete().ilike('id', 'test_claim_%');
      await db.from('market_listings').delete().eq('price', 15000).eq('status', 'sold');
      const { persistSQLite } = await import('@/logic/db/sqliteEngine');
      await persistSQLite();
    } catch (err) {
      logger.warn('[rewardsDebugSimulation] Fallo al eliminar claims/listings de prueba en DB:', err);
    }
  }
}

export function clearSimulatedRankedState(
  state: GameState,
  resetPvpStore?: () => void
): void {
  state.rankedMaxElo = DEFAULT_RESET_ELO;
  state.eloRating = DEFAULT_RESET_ELO;
  if (resetPvpStore) {
    resetPvpStore();
  }
}
