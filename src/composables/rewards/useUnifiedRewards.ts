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
import { parsePrize, buildRewardPills } from './rewardsPillExtractor.ts'
import type { PendingAward } from '@/types/system/stores'
import type { DaycareMission } from '@/types/breeding/breeding'
import type { UnifiedRewardItem } from '@/types/rewards/rewards'
import type { MarketListing } from '@/logic/economy/market'
import type { Pokemon } from '@/types/pokemon/pokemon'

const gtsListingsCache = ref<Map<string, MarketListing>>(new Map())

async function fetchMissingGtsListing(sourceId: string, gameStore: ReturnType<typeof useGameStore>) {
  if (!gameStore.db || gtsListingsCache.value.has(sourceId)) return
  try {
    const numId = Number(sourceId)
    const { data } = await gameStore.db
      .from('market_listings')
      .select('*')
      .eq('id', isNaN(numId) ? sourceId : numId)
      .maybeSingle()
    if (data) {
      const nextMap = new Map(gtsListingsCache.value)
      nextMap.set(sourceId, data as MarketListing)
      gtsListingsCache.value = nextMap
    }
  } catch {
    // ignore
  }
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


  const getEventAwardDisplayName = (eventId: string, awardedAt?: string): string => {
    if (eventId.startsWith('ranked_season_')) {
      const seasonName = eventId.replace('ranked_season_', '').replace(/_/g, ' ')
      return `Premios de Temporada: ${seasonName.toUpperCase()}`
    }
    const ev = (allEvents.value || []).find(e => e.id === eventId)
    if (!ev) return 'Evento desconocido'
    if (awardedAt) {
      try {
        const awardedZdt = Temporal.Instant.from(awardedAt).toZonedDateTimeISO(GAME_TIMEZONE)
        return getEventDisplayNameCore(ev, awardedZdt)
      } catch {
        // ignore
      }
    }
    return getEventDisplayNameCore(ev)
  }

  const getEventCategoryBadge = (award: PendingAward) => {
    if (award.event_id?.startsWith('ranked_season_')) {
      return { icon: '🎖️', name: 'Temporada Ranked' }
    }
    const ev = (allEvents.value || []).find(e => e.id === award.event_id)
    const pastEv = (eventStore.pastEvents || []).find(pe => pe.event_id === award.event_id)
    const cat = resolveAwardCategory(award, ev, pastEv?.winners)
    if (cat?.categoryTitle) {
      return { icon: cat.icon, name: cat.categoryTitle }
    }
    return null
  }


  // 1. Consolidated Unified Rewards
  const unifiedRewards = computed<UnifiedRewardItem[]>(() => {
    const items: UnifiedRewardItem[] = []

    // Source A: Event & Tournament Awards
    for (const award of pendingAwards.value) {
      const claimable = isAwardClaimable(award, allEvents.value)
      const catBadge = getEventCategoryBadge(award)
      const defaultSubtitle = award.event_id?.startsWith('ranked_season_')
        ? 'Premios de Fin de Temporada Ranked'
        : 'Torneo / Evento Mundial'
      const awardPrize = parsePrize(award.prize)
      const pills = buildRewardPills(awardPrize, `event-${award.id}`)
      items.push({
        id: `event-${award.id}`,
        source: 'event',
        title: getEventAwardDisplayName(award.event_id || '', award.awarded_at),
        subtitle: catBadge ? `Categoría: ${catBadge.name}` : defaultSubtitle,
        categoryBadge: catBadge ? { icon: catBadge.icon, name: catBadge.name } : { icon: '🏆', name: 'Torneo' },
        isLegacy: !claimable,
        isClaimable: claimable,
        prize: awardPrize,
        pills,
        rawData: award
      })
    }

    // Source B: Ranked Arena Season Milestones
    const claimedSet = new Set((pvpStore.rewardsClaimed || []).map(String))
    for (const m of RANKED_REWARD_MILESTONES) {
      const isUnlocked = (pvpStore.maxElo || 0) >= m.elo
      const isClaimed = claimedSet.has(m.id.toString())
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

    // Source C: Class Deployment Mission Completed Loot
    if (classStore.isMissionDone && classStore.activeMission) {
      const m = classStore.activeMission
      const missionDef = isMissionId(m.id) ? CLASS_MISSIONS_BY_ID[m.id] : null
      const missionPrize = (m.rewards as Record<string, unknown>) || (m.projectedReward ? { money: m.projectedReward } : {}) // open-record: Generic key-value data dictionary container
      const pills = buildRewardPills(missionPrize, `class-mission-${m.id}`)
      items.push({
        id: `class-mission-${m.id}`,
        source: 'class_mission',
        title: `Botín: ${missionDef?.name || 'Misión de Clase'}`,
        subtitle: 'Operación Finalizada',
        categoryBadge: { icon: '⚡', name: 'Misión de Clase' },
        isClaimable: true,
        prize: missionPrize,
        pills,
        rawData: m.id
      })
    }

    // Source D: GTS / Trade Claim Queue
    const claimQueue = (gameStore.state.claimQueue || [])
    for (const claim of claimQueue) {
      if (!claim.asset_data) continue
      let prizeObj: Record<string, unknown> = {} // open-record: Generic key-value data dictionary container
      let assetTitle = 'Recompensa'
      let assetSubtitle = 'Reclamo pendiente'
      let categoryBadge: { icon: string; name: string } | undefined
      const asset = claim.asset_data
      const rawClaim = claim as { asset_type?: string }
      const assetType = asset.type || (typeof rawClaim.asset_type === 'string' ? rawClaim.asset_type : undefined)
      const rawAmount = (asset as { amount?: number }).amount

      if (assetType === 'money' || typeof rawAmount === 'number') {
        const amount = typeof asset.data === 'number'
          ? asset.data
          : (typeof rawAmount === 'number' ? Number(rawAmount) : 0)
        prizeObj = { money: amount }

        // Look up sold item or pokemon in gtsStore or claim metadata or gtsListingsCache
        const matchingSale = (gtsStore.salesHistory || []).find(s => String(s.id) === String(claim.source_id))
          || (gtsStore.myListings || []).find(s => String(s.id) === String(claim.source_id))
          || (claim.source_id ? gtsListingsCache.value.get(String(claim.source_id)) : undefined)

        if (!matchingSale && !asset.sold_item && !asset.sold_pokemon && claim.source_id && gameStore.db) {
          void fetchMissingGtsListing(String(claim.source_id), gameStore)
        }

        const soldItem = asset.sold_item
          || (matchingSale?.listing_type === 'item' ? (matchingSale.data as { name?: string; qty?: number }) : undefined)
        const soldPokemon = asset.sold_pokemon
          || (matchingSale?.listing_type === 'pokemon' ? (matchingSale.data as { name?: string; level?: number; isShiny?: boolean }) : undefined)

        if (soldItem && soldItem.name) {
          prizeObj.sold_item = soldItem
          const isGts = claim.source_type === 'gts'
          assetTitle = isGts ? 'Venta de Ítems por GTS' : 'Venta de Ítems por Intercambio'
          assetSubtitle = isGts ? 'Transacción en el Mercado Global' : 'Intercambio directo entre entrenadores'
          categoryBadge = { icon: '📦', name: 'Objeto' }
        } else if (soldPokemon && soldPokemon.name) {
          prizeObj.sold_pokemon = soldPokemon
          const isGts = claim.source_type === 'gts'
          assetTitle = isGts ? 'Venta de Pokémon por GTS' : 'Venta de Pokémon por Intercambio'
          assetSubtitle = isGts ? 'Transacción en el Mercado Global' : 'Intercambio directo entre entrenadores'
          categoryBadge = { icon: '🐣', name: 'Pokémon' }
        } else if (claim.source_type === 'gts') {
          assetTitle = 'Venta por GTS'
          assetSubtitle = 'Transacción en el Mercado Global'
          categoryBadge = { icon: '💰', name: 'Ganancia' }
        } else {
          assetTitle = 'Cobro de Intercambio'
          assetSubtitle = 'Intercambio directo entre entrenadores'
          categoryBadge = { icon: '🤝', name: 'Intercambio' }
        }
      } else if (assetType === 'item') {
        const itemData = asset.data as { name?: string; qty?: number } | undefined
        const itemId = itemData?.name
        const qty = (itemData?.qty && itemData.qty > 0) ? itemData.qty : 1
        if (itemId) {
          prizeObj = { [itemId]: qty }
        } else {
          prizeObj = {}
        }
        if (claim.source_type === 'gts_cancel') {
          assetTitle = 'Devolución de Oferta GTS'
          assetSubtitle = 'Publicación retirada del Mercado Global'
          categoryBadge = { icon: '📦', name: 'Objeto' }
        } else if (claim.source_type === 'gts') {
          assetTitle = 'Compra de Ítems por GTS'
          assetSubtitle = 'Transacción en el Mercado Global'
          categoryBadge = { icon: '📦', name: 'Objeto' }
        } else {
          assetTitle = 'Recepción por Intercambio'
          assetSubtitle = 'Intercambio directo entre entrenadores'
          categoryBadge = { icon: '🤝', name: 'Intercambio' }
        }
      } else if (assetType === 'pokemon') {
        const pokeData = asset.data as { id?: number; name?: string; level?: number; isShiny?: boolean } | undefined
        const pokeName = pokeData?.name ? pokeData.name : 'Pokémon'
        prizeObj = { pokemon: pokeName }
        if (claim.source_type === 'gts_cancel') {
          assetTitle = 'Devolución de Pokémon GTS'
          assetSubtitle = 'Publicación retirada del Mercado Global'
          categoryBadge = { icon: '🐣', name: 'Pokémon' }
        } else if (claim.source_type === 'gts') {
          assetTitle = 'Compra de Pokémon por GTS'
          assetSubtitle = 'Transacción en el Mercado Global'
          categoryBadge = { icon: '🐣', name: 'Pokémon' }
        } else {
          assetTitle = 'Recepción por Intercambio'
          assetSubtitle = 'Intercambio directo entre entrenadores'
          categoryBadge = { icon: '🤝', name: 'Intercambio' }
        }
      }

      const pills = buildRewardPills(prizeObj, `gts-${claim.id}`)
      items.push({
        id: `gts-${claim.id}`,
        source: 'gts_claim',
        title: assetTitle,
        subtitle: assetSubtitle,
        categoryBadge,
        isClaimable: true,
        prize: prizeObj,
        pills,
        rawData: claim.id
      })
    }

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
    const targetId = mission.targetId
    return allPokes.some(p => {
      if (p.onMission || p.inDaycare || p.onDefense || p.isIllegal) return false
      if (p.id !== targetId) return false
      const req = mission.requirement || { type: 'level', minLevel: 0 }
      if (req.type === 'level') return p.level >= (req.minLevel || 0)
      if (req.type === 'iv_total') {
        const total = (p.ivs?.hp || 0) + (p.ivs?.atk || 0) + (p.ivs?.def || 0) + (p.ivs?.spa || 0) + (p.ivs?.spd || 0) + (p.ivs?.spe || 0)
        return total >= (req.minIvTotal || 0)
      }
      if (req.type === 'nature') return p.nature === req.nature
      if (req.type === 'iv_31') return p.ivs?.[req.stat31 as keyof Pokemon['ivs']] === 31
      return true
    })
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
