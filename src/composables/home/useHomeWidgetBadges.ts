import { computed, ref, type ComputedRef } from 'vue'
import { type HomeWidgetId } from '@/composables/home/useHomeWidgetsCollapse'
import { useUnifiedRewards } from '@/composables/rewards/useUnifiedRewards'
import { useGameStore } from '@/stores/game'
import { useEventStore } from '@/stores/events'
import { useBuffsStore } from '@/stores/battle/buffs'
import { useGTSStore } from '@/stores/gts'
import { usePvPStore } from '@/stores/pvp'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import { useWarStore } from '@/stores/war'
import { useGymsStore } from '@/stores/gyms'

export type WidgetBadgeValue = number | string | undefined
export type WidgetBadgeProvider = () => WidgetBadgeValue

// Custom runtime badge providers registered by individual widgets if needed
const customBadgeProviders = ref<Map<HomeWidgetId, WidgetBadgeProvider>>(new Map())

export function registerWidgetBadge(widgetId: HomeWidgetId, provider: WidgetBadgeProvider): void {
  customBadgeProviders.value.set(widgetId, provider)
}

export function unregisterWidgetBadge(widgetId: HomeWidgetId): void {
  customBadgeProviders.value.delete(widgetId)
}

export function useHomeWidgetBadges() {
  const { totalActionableMissions, isClassMissionReadyToDeploy, unifiedRewards } = useUnifiedRewards()
  const gameStore = useGameStore()
  const eventStore = useEventStore()
  const buffsStore = useBuffsStore()
  const gtsStore = useGTSStore()
  const pvpStore = usePvPStore()
  const classStore = usePlayerClassStore()
  const warStore = useWarStore()
  const gymsStore = useGymsStore()

  // 1. Pending rewards count (all rewards requiring user action: claim or discard)
  const pendingRewardsBadge = computed<WidgetBadgeValue>(() => {
    return unifiedRewards.value.length > 0 ? unifiedRewards.value.length : undefined
  })

  // 2. Active buffs and auras count
  const buffsBadge = computed<WidgetBadgeValue>(() => {
    const count = buffsStore.activeBuffs.length
    return count > 0 ? count : undefined
  })

  // 3. Daycare & Walking (number of eggs ready to hatch)
  const readyEggsCount = computed<number>(() => {
    const eggs = gameStore.state.eggs || []
    return eggs.filter(egg => egg.ready === true || egg.steps <= 0).length
  })

  const breedingBadge = computed<WidgetBadgeValue>(() => {
    return readyEggsCount.value > 0 ? readyEggsCount.value : undefined
  })

  // 4. World events (number of currently active events)
  const eventsBadge = computed<WidgetBadgeValue>(() => {
    const count = eventStore.activeEvents.length
    return count > 0 ? count : undefined
  })

  // 5. Daily missions and deployments available to claim or deploy
  const missionsBadge = computed<WidgetBadgeValue>(() => {
    const count = totalActionableMissions.value + (isClassMissionReadyToDeploy.value ? 1 : 0)
    return count > 0 ? count : undefined
  })

  // 6. GTS Economy (unclaimed sales & purchases)
  const economyBadge = computed<WidgetBadgeValue>(() => {
    const total = gtsStore.unclaimedGtsCount
    return total > 0 ? total : undefined
  })

  // 7. Faction War
  const factionBadge = computed<WidgetBadgeValue>(() => {
    if (warStore.isDisputeActive) return '⚔️ Guerra'
    return undefined
  })

  // 8. Gyms Progress: Number of gyms available to combat (undefeated gyms)
  const gymsBadge = computed<WidgetBadgeValue>(() => {
    const defeated = gameStore.state.defeatedGyms || []
    const available = gymsStore.gyms.filter(g => !defeated.includes(g.id)).length
    return available > 0 ? available : undefined
  })

  // 9. Ranked Arena (Active ranked event/tournament count)
  const rankedBadge = computed<WidgetBadgeValue>(() => {
    const now = Temporal.Now.instant()
    const range = pvpStore.seasonRange || {}
    if (range.start && range.end) {
      const isActive = Temporal.Instant.compare(now, range.start) >= 0 && Temporal.Instant.compare(now, range.end) <= 0
      return isActive ? 1 : undefined
    }
    return 1
  })

  // 10. Passive Defense: Show whether active or inactive
  const defenseBadge = computed<WidgetBadgeValue>(() => {
    return pvpStore.passiveTeamActive ? 'ACTIVA' : 'INACTIVA'
  })

  // 11. Class Mastery
  const classBadge = computed<WidgetBadgeValue>(() => {
    if (classStore.playerClass) {
      return `Nv. ${classStore.classLevel}`
    }
    return undefined
  })

  // 12. Activity notifications
  const notificationsBadge = computed<WidgetBadgeValue>(() => {
    const list = gameStore.state.notificationHistory || []
    return list.length > 0 ? list.length : undefined
  })

  const defaultBadges: Record<HomeWidgetId, ComputedRef<WidgetBadgeValue>> = {
    pending_rewards: pendingRewardsBadge,
    buffs: buffsBadge,
    breeding: breedingBadge,
    events: eventsBadge,
    events_schedule: computed<WidgetBadgeValue>(() => undefined),
    events_history: computed<WidgetBadgeValue>(() => undefined),
    missions: missionsBadge,
    economy: economyBadge,
    faction: factionBadge,
    gyms: gymsBadge,
    ranked: rankedBadge,
    defense: defenseBadge,
    class: classBadge,
    notifications: notificationsBadge
  }

  function getWidgetBadge(widgetId: HomeWidgetId): WidgetBadgeValue {
    const custom = customBadgeProviders.value.get(widgetId)
    if (custom) {
      return custom()
    }
    return defaultBadges[widgetId]?.value
  }

  return {
    getWidgetBadge,
    registerWidgetBadge,
    unregisterWidgetBadge,
    pendingRewardsBadge,
    buffsBadge,
    breedingBadge,
    readyEggsCount,
    eventsBadge,
    missionsBadge,
    economyBadge,
    factionBadge,
    gymsBadge,
    rankedBadge,
    defenseBadge,
    classBadge,
    notificationsBadge
  }
}
