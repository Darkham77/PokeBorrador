/**
 * src/logic/debug/rewardsDebugSimulation.ts
 *
 * Testing and debugging engine for simulated past tournaments, events, and claims.
 * Identifies the most recent past event occurrence relative to the current time,
 * picks an official reward tier, injects a valid award, finished class mission,
 * and GTS claim, then redirects cleanly to HOME.
 */

import { normalizeZonedDateTime } from '@/logic/utils/timeUtils';
import type { useEventStore } from '@/stores/events';
import type { useGameStore } from '@/stores/game';
import type { useAuthStore } from '@/stores/auth';
import type { useUIStore } from '@/stores/ui';
import type { useModalStore } from '@/stores/modals';
import type { useGTSStore } from '@/stores/gts';
import type { usePvPStore } from '@/stores/pvp';
import { isRankedRewardMilestoneId } from '@/data/system/rankedData';
import {
  DEFAULT_RESET_ELO,
  injectSimulatedPastEventAwards,
  injectSimulatedClassMission,
  injectSimulatedGtsClaimsAndListings,
  injectSimulatedRankedSeason,
  clearSimulatedAwards,
  clearSimulatedClassMission,
  clearSimulatedGts,
  clearSimulatedRankedState
} from './rewardsDebugSimulationHelpers.ts';

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
  const isOnlineDb = gameStore.db?.mode === 'online';

  if (!eventStore.allEvents || eventStore.allEvents.length === 0) {
    await eventStore.fetchEvents(true);
  }

  const nowZdt = normalizeZonedDateTime();

  // 1. Inject Past Event Awards
  const { eventSummary, pendingAwards } = await injectSimulatedPastEventAwards(
    eventStore.allEvents || [],
    nowZdt,
    gameStore.db,
    authStore.user,
    isOnlineDb,
    eventStore.pendingAwards || []
  );
  eventStore.pendingAwards = pendingAwards;

  // 2. Inject finished Class Mission
  injectSimulatedClassMission(gameStore.state);

  // 3. Inject GTS Claims & Market Listings
  await injectSimulatedGtsClaimsAndListings(
    gameStore.state,
    gameStore.db,
    authStore.user,
    isOnlineDb,
    gtsStore ? (listing) => {
      gtsStore.salesHistory = [
        listing,
        ...(gtsStore.salesHistory || []).filter(l => String(l.id) !== listing.id)
      ];
    } : undefined
  );

  // 4. Inject Ranked Season Milestones & Payout
  await injectSimulatedRankedSeason(
    gameStore.state,
    gameStore.db,
    authStore.user,
    isOnlineDb,
    nowZdt,
    pvpStore?.currentSeasonRules?.name,
    pvpStore ? (targetElo, unlockedMilestones) => {
      pvpStore.maxElo = targetElo;
      pvpStore.elo = targetElo;
      const updatedRewards = (pvpStore.rewardsClaimed || []).filter(id => !isRankedRewardMilestoneId(id) || !unlockedMilestones.has(id));
      pvpStore.rewardsClaimed = updatedRewards;
      return updatedRewards;
    } : undefined,
    (award) => {
      eventStore.pendingAwards = [
        award,
        ...(eventStore.pendingAwards || []).filter(a => a.id !== award.id)
      ];
    }
  );

  // 5. Save state and notify
  await gameStore.save(false);

  if (modalStore) {
    modalStore.closeAll();
  }
  uiStore.activeTab = 'home';

  const fullSummary = `Simulado con éxito: ${eventSummary}, Botín de Clase listo, Venta GTS (Pepita x1), Pokémon GTS (Eevee Nv.15) y Temporada Coliseo Ranked (1400 ELO).`;
  uiStore.notify(fullSummary, '🎯');

  return fullSummary;
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
  eventStore.pendingAwards = await clearSimulatedAwards(
    eventStore.pendingAwards || [],
    gameStore.db
  );

  clearSimulatedClassMission(gameStore.state);

  await clearSimulatedGts(
    gameStore.state,
    gameStore.db,
    gtsStore ? () => {
      gtsStore.salesHistory = (gtsStore.salesHistory || []).filter(l => (l.data as { name?: string })?.name !== 'nugget');
    } : undefined
  );

  clearSimulatedRankedState(
    gameStore.state,
    pvpStore ? () => {
      pvpStore.maxElo = DEFAULT_RESET_ELO;
      pvpStore.elo = DEFAULT_RESET_ELO;
    } : undefined
  );

  await gameStore.save(false);
  uiStore.notify('Recompensas y cobros de prueba eliminados con éxito.', '🧹');
}
