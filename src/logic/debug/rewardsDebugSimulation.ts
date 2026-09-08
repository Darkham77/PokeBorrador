/**
 * src/logic/debug/rewardsDebugSimulation.ts
 *
 * Testing and debugging engine for simulated past tournaments, events, and claims.
 * Identifies the most recent past event occurrence relative to the current time,
 * picks an official reward tier, injects a valid award, finished class mission,
 * and GTS claim, then redirects cleanly to HOME.
 */

import { normalizeZonedDateTime } from '@/logic/utils/timeUtils'
import type { PendingAward } from '@/types/system/stores'
import type { useEventStore } from '@/stores/events'
import type { useGameStore } from '@/stores/game'
import type { useAuthStore } from '@/stores/auth'
import type { useUIStore } from '@/stores/ui'
import type { useModalStore } from '@/stores/modals'
import type { useGTSStore } from '@/stores/gts'
import type { usePvPStore } from '@/stores/pvp'
import type { MarketListing } from '@/logic/economy/market'
import { isRankedRewardMilestoneId, getSeasonalThemeForMonth, type RankedRewardMilestoneId } from '@/data/system/rankedData'
import { safeStorage } from '@/logic/utils/storage'
import type { AuthUser } from '@/types/auth/auth'
import {
  findLatestPastEvent,
  pickRandomPrize,
  type PastEventMatch
} from './rewardsDebugOccurrenceHelper.ts'

export { findLatestPastEvent, pickRandomPrize, type PastEventMatch }

const DEFAULT_RESET_ELO = 1000 as const;

/**
 * Injects a full testing reward bundle:
 * 1. An official award from the latest past event
 * 2. A completed class deployment mission
 * 3. A pending GTS market claim
 * Automatically saves state and redirects to the HOME tab.
 */
export async function simulatePastEventAndMissionsReward(
  eventStore: ReturnType<typeof useEventStore>,
  gameStore: ReturnType<typeof useGameStore>,
  authStore: ReturnType<typeof useAuthStore>,
  uiStore: ReturnType<typeof useUIStore>,
  modalStore?: ReturnType<typeof useModalStore>,
  gtsStore?: ReturnType<typeof useGTSStore>,
  pvpStore?: ReturnType<typeof usePvPStore>
): Promise<string> {
  const isOnlineDb = gameStore.db?.mode === 'online'

  // 1. Ensure events are loaded
  if (!eventStore.allEvents || eventStore.allEvents.length === 0) {
    await eventStore.fetchEvents(true)
  }

  const nowZdt = normalizeZonedDateTime()
  const pastMatch = findLatestPastEvent(eventStore.allEvents || [], nowZdt)

  let eventSummary = 'Evento Pasado'
  if (pastMatch) {
    const { event, endedAt } = pastMatch
    const { prize, rankLabel, categoryId, categoryName } = pickRandomPrize(event)
    const awardId = isOnlineDb ? crypto.randomUUID() : `test_award_${Temporal.Now.instant().epochMilliseconds}`
    const prizeStr = JSON.stringify(prize)

    const newAward: PendingAward = {
      id: awardId,
      winner_id: authStore.user?.id || 'player_test',
      event_id: event.id,
      category_id: categoryId || 'general',
      category_name: categoryName || 'Torneo Oficial',
      prize: prizeStr,
      prize_summary: `${event.name} - ${rankLabel}`,
      received_at: null,
      awarded_at: endedAt.toString()
    }

    // Try DB insert if available with only database table columns
    if (gameStore.db) {
      try {
        const dbWinnerId = (gameStore.db.mode === 'online' && (!authStore.user?.id || authStore.user.id.length !== 36))
          ? '00000000-0000-0000-0000-000000000000'
          : (authStore.user?.id || 'player_test')

        const dbRow = {
          id: awardId,
          event_id: event.id,
          winner_id: dbWinnerId,
          winner_name: authStore.user?.user_metadata?.username || 'Entrenador Test',
          winner_email: 'test_reward@pokevicio.com',
          prize: typeof prize === 'string' ? JSON.parse(prize) : prize,
          awarded_at: endedAt.toString(),
          claimed: false,
          received_at: null
        }
        await gameStore.db.from('awards').insert([dbRow])
        const { persistSQLite } = await import('@/logic/db/sqliteEngine')
        await persistSQLite()
      } catch {
        // in-memory fallback
      }
    }

    // 1b. Inject unclaimable legacy archived event award (only discardable)
    const archivedAwardId = isOnlineDb ? crypto.randomUUID() : `test_archived_award_${Temporal.Now.instant().epochMilliseconds}`
    const archivedPrize = { money: 10000, item: 'rarecandy', qty: 2 }
    const archivedAward: PendingAward = {
      id: archivedAwardId,
      winner_id: authStore.user?.id || 'player_test',
      event_id: 'legacy_archived_tournament_2024',
      category_id: 'general',
      category_name: 'Torneo Kanto 2024 (Archivado)',
      prize: JSON.stringify(archivedPrize),
      prize_summary: 'Torneo Kanto 2024 (Archivado) - Premio Conmemorativo',
      received_at: null,
      awarded_at: '2024-01-01T00:00:00Z'
    }

    if (gameStore.db) {
      try {
        const dbWinnerId = (gameStore.db.mode === 'online' && (!authStore.user?.id || authStore.user.id.length !== 36))
          ? '00000000-0000-0000-0000-000000000000'
          : (authStore.user?.id || 'player_test')

        const dbArchivedRow = {
          id: archivedAwardId,
          event_id: 'legacy_archived_tournament_2024',
          winner_id: dbWinnerId,
          winner_name: authStore.user?.user_metadata?.username || 'Entrenador Test',
          winner_email: 'test_reward@pokevicio.com',
          prize: archivedPrize,
          awarded_at: '2024-01-01T00:00:00Z',
          claimed: false,
          received_at: null
        }
        await gameStore.db.from('awards').insert([dbArchivedRow])
        const { persistSQLite } = await import('@/logic/db/sqliteEngine')
        await persistSQLite()
      } catch {
        // in-memory fallback
      }
    }

    eventStore.pendingAwards = [
      newAward,
      archivedAward,
      ...(eventStore.pendingAwards || []).filter(a => a.id !== awardId && a.id !== archivedAwardId)
    ]
    eventSummary = `${event.name} (${rankLabel}) y Torneo Archivado 2024`
  }

  // 2. Inject finished Class Mission
  const nowMs = Temporal.Now.instant().epochMilliseconds
  gameStore.state.classData = {
    ...gameStore.state.classData,
    activeMission: {
      id: 'mission_6h',
      startedAt: nowMs - (7 * 3600 * 1000),
      endsAt: nowMs - (1 * 3600 * 1000),
      projectedReward: 5000
    }
  }

  // 3. Inject pending GTS Claim Queue items:
  // 3a. Sold item transaction (15,000 money + nugget)
  // 3b. Received Pokémon (Eevee Nv. 15)
  const claimId = isOnlineDb ? crypto.randomUUID() : `test_claim_${Temporal.Now.instant().epochMilliseconds}`
  const pokeClaimId = isOnlineDb ? crypto.randomUUID() : `test_claim_poke_${Temporal.Now.instant().epochMilliseconds}`
  const numericListingId = Math.floor(Temporal.Now.instant().epochMilliseconds % 2147483647)
  const listingId = isOnlineDb ? crypto.randomUUID() : String(numericListingId)
  const pokeListingId = isOnlineDb ? crypto.randomUUID() : String(numericListingId + 1)
  const buyerId = crypto.randomUUID()
  const nowIso = Temporal.Now.instant().toString()
  const sellerId = authStore.user?.id || 'local_user'
  const sellerName = (gameStore.state?.trainer as { name?: string } | undefined)?.name || 'Entrenador'

  if (!authStore.user) {
    const fallbackUser: AuthUser = {
      id: sellerId,
      email: 'local@pokevicio.com',
      user_metadata: { username: sellerName }
    }
    authStore.user = fallbackUser
  }
  safeStorage.setItem('pokevicio_local_user', JSON.stringify(authStore.user))

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
  }

  const simulatedPokemon = {
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
  }

  const pokeClaim = {
    id: pokeClaimId,
    user_id: sellerId,
    asset_data: {
      type: 'pokemon' as const,
      data: simulatedPokemon
    },
    source_type: 'gts',
    source_id: pokeListingId,
    created_at: nowIso
  }

  gameStore.state.claimQueue = [
    newClaim,
    pokeClaim,
    ...(gameStore.state.claimQueue || []).filter(c => !String(c.id).startsWith('test_claim_') && c.id !== claimId && c.id !== pokeClaimId)
  ]

  // Persist fake claims to DB claim_queue if available
  if (gameStore.db) {
    try {
      await gameStore.db.from('claim_queue').insert([
        {
          id: claimId,
          user_id: sellerId,
          source_type: 'gts',
          source_id: listingId,
          asset_data: newClaim.asset_data,
          created_at: nowIso
        },
        {
          id: pokeClaimId,
          user_id: sellerId,
          source_type: 'gts',
          source_id: pokeListingId,
          asset_data: pokeClaim.asset_data,
          created_at: nowIso
        }
      ])
      const { persistSQLite } = await import('@/logic/db/sqliteEngine')
      await persistSQLite()
    } catch {
      // ignore
    }
  }

  const fakeSoldListing: MarketListing = {
    id: listingId,
    seller_id: sellerId,
    seller_name: sellerName,
    listing_type: 'item',
    data: { name: 'nugget', qty: 1 },
    price: 15000,
    status: 'sold',
    buyer_id: buyerId,
    created_at: nowIso
  }

  // Persist fake sold listing to DB if available
  if (gameStore.db) {
    try {
      const isOnline = gameStore.db.mode === 'online'
      const dbListingId = isOnline ? crypto.randomUUID() : numericListingId
      await gameStore.db.from('market_listings').insert([
        {
          id: dbListingId,
          seller_id: sellerId,
          seller_name: sellerName,
          listing_type: 'item',
          data: { name: 'nugget', qty: 1 },
          price: 15000,
          status: 'sold',
          buyer_id: buyerId,
          created_at: nowIso
        }
      ])
      const { persistSQLite } = await import('@/logic/db/sqliteEngine')
      await persistSQLite()
    } catch {
      // ignore
    }
  }

  // Update gtsStore salesHistory if provided
  if (gtsStore) {
    gtsStore.salesHistory = [
      fakeSoldListing,
      ...(gtsStore.salesHistory || []).filter(l => String(l.id) !== listingId)
    ]
  }

  // 4. Simulate Coliseo Ranked Season Milestones & Season Payout
  const targetElo = 1400
  gameStore.state.rankedMaxElo = targetElo
  gameStore.state.eloRating = targetElo
  const unlockedMilestones: ReadonlySet<RankedRewardMilestoneId> = new Set<RankedRewardMilestoneId>([ // runtime-set: Fast O(1) membership lookup set
    'bronce_1000',
    'bronce_1100',
    'plata_1200',
    'plata_1400',
  ])
  if (pvpStore) {
    pvpStore.maxElo = targetElo
    pvpStore.elo = targetElo
    pvpStore.rewardsClaimed = (pvpStore.rewardsClaimed || []).filter(id => !isRankedRewardMilestoneId(id) || !unlockedMilestones.has(id))
    gameStore.state.rankedRewardsClaimed = [...pvpStore.rewardsClaimed]
  } else {
    gameStore.state.rankedRewardsClaimed = (gameStore.state.rankedRewardsClaimed || []).filter(id => !isRankedRewardMilestoneId(id) || !unlockedMilestones.has(id))
  }

  // Inject Season Conclusion Award into awards table
  const currentTheme = getSeasonalThemeForMonth(nowZdt.month)
  const tournamentName = pvpStore?.currentSeasonRules?.name || currentTheme.name
  const eventId = `ranked_season_${currentTheme.id}`

  const rankedAwardId = isOnlineDb ? crypto.randomUUID() : `test_ranked_award_${Temporal.Now.instant().epochMilliseconds}`
  const rankedSeasonAward: PendingAward = {
    id: rankedAwardId,
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
  }

  if (gameStore.db) {
    try {
      const dbWinnerId = (gameStore.db.mode === 'online' && (!sellerId || sellerId.length !== 36))
        ? '00000000-0000-0000-0000-000000000000'
        : sellerId

      const dbRow = {
        id: rankedAwardId,
        event_id: eventId,
        winner_id: dbWinnerId,
        winner_name: authStore.user?.user_metadata?.username || 'Entrenador Test',
        winner_email: 'test_reward@pokevicio.com',
        prize: {
          type: 'ranked_medal',
          tier: 'plata',
          season: tournamentName,
          tournamentName,
          themeId: currentTheme.id,
          rank: 12,
          elo: targetElo,
          battleCoins: 75
        },
        awarded_at: nowIso,
        claimed: false,
        received_at: null
      }
      await gameStore.db.from('awards').insert([dbRow])
      const { persistSQLite } = await import('@/logic/db/sqliteEngine')
      await persistSQLite()
    } catch {
      // in-memory fallback
    }
  }

  eventStore.pendingAwards = [
    rankedSeasonAward,
    ...(eventStore.pendingAwards || []).filter(a => a.id !== rankedAwardId)
  ]

  // 5. Save game state
  await gameStore.save(false)

  // 6. Close debug modal and redirect to HOME
  if (modalStore) {
    modalStore.closeAll()
  }
  uiStore.activeTab = 'home'

  const fullSummary = `Simulado con éxito: ${eventSummary}, Botín de Clase listo, Venta GTS (Pepita x1), Pokémon GTS (Eevee Nv.15) y Temporada Coliseo Ranked (1400 ELO).`
  uiStore.notify(fullSummary, '🎯')

  return fullSummary
}

/**
 * Removes all simulated test awards, class missions, GTS claims/listings, and ranked state.
 */
export async function clearDebugSimulatedRewards(
  eventStore: ReturnType<typeof useEventStore>,
  gameStore: ReturnType<typeof useGameStore>,
  uiStore: ReturnType<typeof useUIStore>,
  gtsStore?: ReturnType<typeof useGTSStore>,
  pvpStore?: ReturnType<typeof usePvPStore>
): Promise<void> {
  // 1. Remove test awards
  eventStore.pendingAwards = (eventStore.pendingAwards || []).filter(a =>
    !a.id.startsWith('test_award_') &&
    !a.id.startsWith('test_ranked_award_') &&
    !a.id.startsWith('test_archived_award_') &&
    a.event_id !== 'legacy_archived_tournament_2024' &&
    (a as { winner_email?: string }).winner_email !== 'test_reward@pokevicio.com'
  )
  if (gameStore.db) {
    try {
      await gameStore.db.from('awards').delete().eq('winner_email', 'test_reward@pokevicio.com')
    } catch {
      // ignore
    }
  }

  // 2. Clear test class mission if active
  const classData = gameStore.state.classData as { activeMission?: { id?: string; endsAt?: number } | null } | undefined
  const mission = classData?.activeMission
  if (mission && mission.id === 'mission_6h' && typeof mission.endsAt === 'number' && mission.endsAt < Temporal.Now.instant().epochMilliseconds) {
    if (gameStore.state.classData) {
      gameStore.state.classData.activeMission = null
    }
  }

  // 3. Clear test GTS claims
  gameStore.state.claimQueue = (gameStore.state.claimQueue || []).filter(c => !String(c.id).startsWith('test_claim_'))
  if (gameStore.db) {
    try {
      await gameStore.db.from('claim_queue').delete().ilike('id', 'test_claim_%')
    } catch {
      // ignore
    }
  }

  // 4. Clear test GTS sold listings
  if (gtsStore) {
    gtsStore.salesHistory = (gtsStore.salesHistory || []).filter(l => (l.data as { name?: string })?.name !== 'nugget')
  }
  if (gameStore.db) {
    try {
      await gameStore.db.from('market_listings').delete().eq('price', 15000).eq('status', 'sold')
      const { persistSQLite } = await import('@/logic/db/sqliteEngine')
      await persistSQLite()
    } catch {
      // ignore
    }
  }

  // 5. Reset Coliseo Ranked state
  gameStore.state.rankedMaxElo = DEFAULT_RESET_ELO
  gameStore.state.eloRating = DEFAULT_RESET_ELO
  if (pvpStore) {
    pvpStore.maxElo = DEFAULT_RESET_ELO
    pvpStore.elo = DEFAULT_RESET_ELO
  }

  await gameStore.save(false)
  uiStore.notify('Recompensas y cobros de prueba eliminados con éxito.', '🧹')
}
