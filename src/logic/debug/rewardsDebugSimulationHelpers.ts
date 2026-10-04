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
import type { Pokemon } from '@/types/pokemon/pokemon';
import { isRankedRewardMilestoneId, getSeasonalThemeForMonth, type RankedRewardMilestoneId } from '@/data/system/rankedData';
import { safeStorage } from '@/logic/utils/storage';
import { logger } from '@/logic/utils/logger';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { findLatestPastEvent, pickRandomPrize } from './rewardsDebugOccurrenceHelper.ts';
import type { Event as GameEvent } from '@/logic/events/eventEngine';
import type { GameState } from '@/types/system/game';

export const DEFAULT_RESET_ELO = 1000 as const;
const UUID_STRING_LENGTH = 36 as const;
const SIMULATED_SALE_PRICE = 15000 as const;
const INT32_MAX = 2147483647 as const;
const SIMULATED_EEVEE_LEVEL = 15 as const;
const SIMULATED_TARGET_ELO = 1400 as const;
const SIMULATED_RANK_POSITION = 12 as const;
const SIMULATED_RANK_BATTLE_COINS = 75 as const;
const ARCHIVED_TOURNAMENT_PRIZE_MONEY = 10000 as const;
const SIMULATED_MISSION_PROJECTED_REWARD = 5000 as const;

async function persistAwardsToDb(
  db: DBRouter,
  user: AuthUser | null,
  awardId: string,
  eventId: string,
  prize: unknown,
  awardedAt: string
): Promise<void> {
  try {
    const dbWinnerId = (db.mode === 'online' && (!user?.id || user.id.length !== UUID_STRING_LENGTH))
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
  const archivedPrize = { money: ARCHIVED_TOURNAMENT_PRIZE_MONEY, item: 'rarecandy', qty: 2 };
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
      projectedReward: SIMULATED_MISSION_PROJECTED_REWARD
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

function createSimulatedEevee(): Pokemon {
  const mon = makePokemon('eevee', SIMULATED_EEVEE_LEVEL, { obtainedMethod: 'reward' });
  if (!mon) {
    throw new Error('Failed to create simulated Eevee');
  }
  return mon;
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
        price: SIMULATED_SALE_PRICE,
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
  const numericListingId = Math.floor(Temporal.Now.instant().epochMilliseconds % INT32_MAX);
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
      data: SIMULATED_SALE_PRICE,
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
      price: SIMULATED_SALE_PRICE,
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
    const dbWinnerId = (db.mode === 'online' && (!sellerId || sellerId.length !== UUID_STRING_LENGTH))
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
        rank: SIMULATED_RANK_POSITION,
        elo: targetElo,
        battleCoins: SIMULATED_RANK_BATTLE_COINS
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
  const targetElo = SIMULATED_TARGET_ELO;
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
      rank: SIMULATED_RANK_POSITION,
      elo: targetElo,
      battleCoins: SIMULATED_RANK_BATTLE_COINS
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
      await db.from('market_listings').delete().eq('price', SIMULATED_SALE_PRICE).eq('status', 'sold');
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
