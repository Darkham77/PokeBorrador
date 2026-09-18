// src/composables/rewards/useUnifiedRewards.ts
import { ref, computed, getCurrentInstance, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useEventStore } from '@/stores/events'
import { usePvPStore } from '@/stores/pvp'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import { useGameStore } from '@/stores/game'
import { useBreedingStore } from '@/stores/breeding'
import { useGTSStore } from '@/stores/gts'
import { useUIStore } from '@/stores/ui'
import { isAwardClaimable } from '@/logic/events/eventValidators'
import { getEventDisplayName as getEventDisplayNameCore } from '@/logic/events/eventEngine'
import { resolveAwardCategory } from '@/logic/events/eventCompetitions'
import { RANKED_REWARD_MILESTONES, isRankedRewardMilestoneId } from '@/data/system/rankedData'
import { CLASS_MISSIONS_BY_ID, isMissionId } from '@/data/player/playerClasses'
import { GAME_TIMEZONE } from '@/logic/utils/timeUtils'
import { logger } from '@/logic/utils/logger'
import { parsePrize, buildRewardPills } from './rewardsPillExtractor.ts'
import type { PendingAward, PastEventHistoryItem } from '@/types/system/stores'
import type { DaycareMission } from '@/types/breeding/breeding'
import type { UnifiedRewardItem } from '@/types/rewards/rewards'
import type { Event as GameEvent } from '@/logic/events/eventEngine'
import type { ActiveMission } from '@/types/system/game'
import { isPokemonEligibleForMission } from '@/logic/breeding/missionEngine'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { buildGtsClaimRewardItems } from './gtsRewardClaimHelpers.ts'

function getEventAwardDisplayName(eventId: string, allEvents: readonly GameEvent[], awardedAt?: string): string {
  if (eventId.startsWith('ranked_season_')) {
    const seasonName = eventId.replace('ranked_season_', '').replace(/_/g, ' ')
    return `Premios de Temporada: ${seasonName.toUpperCase()}`
  }
  const ev = (allEvents || []).find(e => e.id === eventId)
  if (!ev) return 'Evento desconocido'
  if (awardedAt) {
    try {
      const awardedZdt = Temporal.Instant.from(awardedAt).toZonedDateTimeISO(GAME_TIMEZONE)
      return getEventDisplayNameCore(ev, awardedZdt)
    } catch (err) {
      logger.warn('[useUnifiedRewards] Error parseando awardedAt:', err)
    }
  }
  return getEventDisplayNameCore(ev)
}

function getEventCategoryBadge(
  award: PendingAward,
  allEvents: readonly GameEvent[],
  pastEvents: readonly PastEventHistoryItem[]
) {
  if (award.event_id?.startsWith('ranked_season_')) {
    return { icon: '🎖️', name: 'Temporada Ranked' }
  }
  const ev = (allEvents || []).find(e => e.id === award.event_id)
  const pastEv = (pastEvents || []).find(pe => pe.event_id === award.event_id)
  const cat = resolveAwardCategory(award, ev, pastEv?.winners)
  if (cat?.categoryTitle) {
    return { icon: cat.icon, name: cat.categoryTitle }
  }
  return null
}

function buildEventRewardItems(
  pendingAwards: readonly PendingAward[],
  allEvents: readonly GameEvent[],
  pastEvents: readonly PastEventHistoryItem[]
): UnifiedRewardItem[] {
  const items: UnifiedRewardItem[] = []
  for (const award of pendingAwards) {
    const claimable = isAwardClaimable(award, allEvents as GameEvent[])
    const catBadge = getEventCategoryBadge(award, allEvents, pastEvents)
    const defaultSubtitle = award.event_id?.startsWith('ranked_season_')
      ? 'Premios de Fin de Temporada Ranked'
      : 'Torneo / Evento Mundial'
    const awardPrize = parsePrize(award.prize)
    const pills = buildRewardPills(awardPrize, `event-${award.id}`)
    items.push({
      id: `event-${award.id}`,
      source: 'event',
      title: getEventAwardDisplayName(award.event_id || '', allEvents, award.awarded_at),
      subtitle: catBadge ? `Categoría: ${catBadge.name}` : defaultSubtitle,
      categoryBadge: catBadge ? { icon: catBadge.icon, name: catBadge.name } : { icon: '🏆', name: 'Torneo' },
      isLegacy: !claimable,
      isClaimable: claimable,
      prize: awardPrize,
      pills,
      rawData: award
    })
  }
  return items
}

function buildRankedMilestoneRewardItems(
  rewardsClaimed: readonly (string | number)[],
  maxElo: number
): UnifiedRewardItem[] {
  const items: UnifiedRewardItem[] = []
  const claimedMap: Record<string, true> = {}
  for (const r of rewardsClaimed || []) {
    claimedMap[String(r)] = true
  }
  for (const m of RANKED_REWARD_MILESTONES) {
    const isUnlocked = maxElo >= m.elo
    const isClaimed = Boolean(claimedMap[m.id.toString()])
    if (isUnlocked && !isClaimed) {
      const milestonePrize = (m.rewards as Record<string, unknown>) || {} // open-record: Generic key-value data dictionary container
      const pills = buildRewardPills(milestonePrize, `milestone-${m.id}`)
      items.push({
        id: `milestone-${m.id}`,
        source: 'ranked_milestone',
        title: `Hito de Temporada Ranked (${m.elo} ELO)`,
        subtitle: 'Arena Clasificatoria',
        categoryBadge: { icon: '⚔️', name: `${m.elo} ELO` },
        isClaimable: true,
        prize: milestonePrize,
        pills,
        rawData: m.id
      })
    }
  }
  return items
}

function buildClassMissionRewardItems(
  isMissionDone: boolean,
  activeMission: ActiveMission | null | undefined
): UnifiedRewardItem[] {
  if (!isMissionDone || !activeMission) return []
  const m = activeMission
  const missionDef = isMissionId(m.id) ? CLASS_MISSIONS_BY_ID[m.id] : null
  const missionPrize = (m.rewards as Record<string, unknown>) || (m.projectedReward ? { money: m.projectedReward } : {}) // open-record: Generic key-value data dictionary container
  const pills = buildRewardPills(missionPrize, `class-mission-${m.id}`)
  return [{
    id: `class-mission-${m.id}`,
    source: 'class_mission',
    title: `Botín: ${missionDef?.name || 'Misión de Clase'}`,
    subtitle: 'Operación Finalizada',
    categoryBadge: { icon: '⚡', name: 'Misión de Clase' },
    isClaimable: true,
    prize: missionPrize,
    pills,
    rawData: m.id
  }]
}


export function useUnifiedRewards() {
  const eventStore = useEventStore()
  const pvpStore = usePvPStore()
  const classStore = usePlayerClassStore()
  const gameStore = useGameStore()
  const breedingStore = useBreedingStore()
  const gtsStore = useGTSStore()
  const uiStore = useUIStore()

  const { pendingAwards, allEvents } = storeToRefs(eventStore)

  if (getCurrentInstance()) {
    onMounted(() => {
      if (gtsStore.salesHistory.length === 0) {
        void gtsStore.fetchUserData()
      }
    })
  }

  // 1. Consolidated Unified Rewards
  const unifiedRewards = computed<UnifiedRewardItem[]>(() => {
    const items: UnifiedRewardItem[] = []
    items.push(...buildEventRewardItems(pendingAwards.value, allEvents.value, eventStore.pastEvents))
    items.push(...buildRankedMilestoneRewardItems(pvpStore.rewardsClaimed, pvpStore.maxElo || 0))
    items.push(...buildClassMissionRewardItems(classStore.isMissionDone, classStore.activeMission))
    items.push(...buildGtsClaimRewardItems(gameStore.state.claimQueue || [], gtsStore, gameStore))
    return items
  })

  // 2. Counts
  const totalClaimableRewards = computed(() => {
    return unifiedRewards.value.filter(r => r.isClaimable).length
  })

  // 3. Actionable Daily Missions Check (player has matching pokémon in team/box)
  const canDeliverMission = (mission: DaycareMission): boolean => {
    if (mission.completed) return false
    const allPokes = (gameStore.allPokemonList || []) as Pokemon[]
    return allPokes.some(p => isPokemonEligibleForMission(p, mission))
  }

  const totalActionableMissions = computed(() => {
    const missions = breedingStore.dailyMissions || []
    return missions.filter(m => canDeliverMission(m)).length
  })

  // 4. Class Mission Ready to Deploy Check
  const isClassMissionReadyToDeploy = computed(() => {
    if (!classStore.playerClass) return false
    if (classStore.activeMission) return false
    const trainerLv = gameStore.state.trainerLevel || 1
    const isRocket = classStore.playerClass === 'rocket'
    let hasPoison = true
    if (isRocket) {
      hasPoison = (gameStore.allPokemonList || []).some(p => {
        if (p.onMission || p.inDaycare || p.onDefense || p.isIllegal) return false
        return p.type === 'poison' || p.type2 === 'poison'
      })
    }
    if (!hasPoison) return false

    return trainerLv >= CLASS_MISSIONS_BY_ID.mission_6h.reqLv
  })

  // 5. Total for HOME HUD Badge
  const totalHomeNotifications = computed(() => {
    return unifiedRewards.value.length + totalActionableMissions.value + (isClassMissionReadyToDeploy.value ? 1 : 0)
  })

  const isClaiming = ref(false)

  // 5. Actions
  async function claimReward(
    item: UnifiedRewardItem,
    options: { autoSave?: boolean; silent?: boolean } = {}
  ): Promise<boolean> {
    const autoSave = options.autoSave ?? true
    const silent = options.silent ?? false

    try {
      if (item.source === 'event') {
        const award = item.rawData as PendingAward
        const res = await eventStore.claimAward(award.id, { autoSave, silent })
        return res !== null
      }
      if (item.source === 'ranked_milestone') {
        const raw = item.rawData
        if (typeof raw === 'string' && isRankedRewardMilestoneId(raw)) {
          await pvpStore.claimReward(raw, { autoSave, silent })
          return true
        }
        return false
      }
      if (item.source === 'class_mission') {
        await classStore.collectMission({ autoSave, silent })
        return true
      }
      if (item.source === 'gts_claim') {
        const claimId = item.rawData as string | number
        const success = await gameStore.claimAsset(claimId)
        return Boolean(success)
      }
      return false
    } catch {
      if (!silent) {
        uiStore.notify('Error al reclamar la recompensa.', '❌')
      }
      return false
    }
  }

  async function claimAllRewards(): Promise<number> {
    if (isClaiming.value) return 0
    const claimableList = unifiedRewards.value.filter(r => r.isClaimable)
    if (claimableList.length === 0) return 0

    isClaiming.value = true
    let successCount = 0
    let failedCount = 0

    try {
      await gameStore.withBatchSave(async () => {
        for (const item of claimableList) {
          const ok = await claimReward(item, { autoSave: false, silent: true })
          if (ok) {
            successCount++
          } else {
            failedCount++
          }
        }
      }, false)

      if (successCount > 0) {
        await gameStore.save(false, true)
        uiStore.notify(`¡${successCount} recompensas reclamadas con éxito!`, '🎉')
      }
      if (failedCount > 0) {
        uiStore.notify(`Quedan ${failedCount} recompensas que no pudieron reclamarse (espacio insuficiente o requieren acción manual).`, '⚠️')
      }
      return successCount
    } finally {
      isClaiming.value = false
    }
  }

  function confirmDiscardReward(item: UnifiedRewardItem) {
    if (item.source !== 'event') return
    const award = item.rawData as PendingAward
    uiStore.openConfirm({
      title: '¿DESCARTAR RECOMPENSA?',
      message: `¿Estás seguro de que deseas descartar la recompensa de "${item.title}"? Esta acción es irreversible.`,
      confirmText: 'SÍ, DESCARTAR',
      cancelText: 'VOLVER',
      type: 'danger',
      onConfirm: async () => {
        await eventStore.discardAward(award.id)
      }
    })
  }

  return {
    unifiedRewards,
    totalClaimableRewards,
    totalPendingRewards: computed(() => unifiedRewards.value.length),
    totalActionableMissions,
    isClassMissionReadyToDeploy,
    totalHomeNotifications,
    isClaiming,
    claimReward,
    claimAllRewards,
    confirmDiscardReward
  }
}
