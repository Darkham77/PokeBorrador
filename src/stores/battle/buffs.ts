import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from '@/stores/game.ts'
import { useEventStore } from '@/stores/events.ts'
import { isItemId } from '@/data/inventory/items'
import type { ToolQualityTier } from '@/types/system/game'
import { getServerTime, getServerInstant, getGMT3Date } from '@/logic/utils/timeUtils'
import {
  buildActiveEventBuffs,
  buildActivePlayerItemBuffs,
  type ActiveBuffItem
} from './buffsHelper.ts'

export { type ActiveBuffItem }

export const useBuffsStore = defineStore('buffs', () => {
  const gameStore = useGameStore()
  const eventStore = useEventStore()
  
  const currentTick = ref(0)
  let tickInterval: gsap.core.Tween | null = null

  function initTick() {
    if (tickInterval) tickInterval.kill()
    
    const tick = () => {
      currentTick.value++
      // Pause timers if player is in an active battle
      if (gameStore.state.battle && !gameStore.state.battle.over) {
        tickInterval = gsap.delayedCall(1, tick)
        return
      }

      const s = gameStore.state
      let changed = false
      if (s.repelSecs > 0) { s.repelSecs--; changed = true }
      if (s.fishingRodSecs > 0) {
        s.fishingRodSecs--
        if (s.fishingRodSecs <= 0) s.fishingRodType = null
        changed = true
      }
      if (s.pickaxeSecs > 0) {
        s.pickaxeSecs--
        if (s.pickaxeSecs <= 0) s.pickaxeType = null
        changed = true
      }
      if (s.brushSecs > 0) {
        s.brushSecs--
        if (s.brushSecs <= 0) s.brushType = null
        changed = true
      }
      if (s.shinyBoostSecs > 0) { s.shinyBoostSecs--; changed = true }
      if (s.amuletCoinSecs > 0) { s.amuletCoinSecs--; changed = true }
      if (s.luckyEggSecs > 0) { s.luckyEggSecs--; changed = true }
      if (s.safariTicketSecs > 0) { s.safariTicketSecs--; changed = true }
      if (s.ceruleanTicketSecs > 0) { s.ceruleanTicketSecs--; changed = true }
      if (s.articunoTicketSecs > 0) { s.articunoTicketSecs--; changed = true }
      if (s.mewtwoTicketSecs > 0) { s.mewtwoTicketSecs--; changed = true }
      if (s.ivScannerSecs > 0) { s.ivScannerSecs--; changed = true }
      if (s.incenseSecs > 0) { s.incenseSecs--; changed = true }

      if (changed) {
        // Silent save every 30 seconds to persist active timers (ignoring 0 values)
        const hasRepelTick = s.repelSecs > 0 && s.repelSecs % 30 === 0
        const hasFishingTick = s.fishingRodSecs > 0 && s.fishingRodSecs % 30 === 0
        const hasPickaxeTick = s.pickaxeSecs > 0 && s.pickaxeSecs % 30 === 0
        const hasBrushTick = s.brushSecs > 0 && s.brushSecs % 30 === 0
        const hasShinyTick = s.shinyBoostSecs > 0 && s.shinyBoostSecs % 30 === 0
        const hasAmuletTick = s.amuletCoinSecs > 0 && s.amuletCoinSecs % 30 === 0
        const hasEggTick = s.luckyEggSecs > 0 && s.luckyEggSecs % 30 === 0
        const hasIncenseTick = s.incenseSecs > 0 && s.incenseSecs % 30 === 0
        const hasScannerTick = s.ivScannerSecs > 0 && s.ivScannerSecs % 30 === 0

        if (
          hasRepelTick || 
          hasFishingTick || 
          hasPickaxeTick || 
          hasBrushTick ||
          hasShinyTick || 
          hasAmuletTick || 
          hasEggTick || 
          hasIncenseTick || 
          hasScannerTick
        ) {
          gameStore.save(false)
        }
      }
      
      tickInterval = gsap.delayedCall(1, tick)
    }

    tickInterval = gsap.delayedCall(1, tick)
  }

  function addBuff(buffName: string, seconds: number, extraData: string | null = null) {
    const s = gameStore.state
    if (buffName === 'repel') s.repelSecs = (s.repelSecs || 0) + seconds
    else if (buffName === 'fishing-rod') {
      s.fishingRodSecs = seconds
      s.fishingRodType = (extraData as ToolQualityTier | null) || 'standard'
    }
    else if (buffName === 'pickaxe') {
      s.pickaxeSecs = seconds
      s.pickaxeType = (extraData as ToolQualityTier | null) || 'standard'
      s.brushSecs = 0
      s.brushType = null
    }
    else if (buffName === 'brush') {
      s.brushSecs = seconds
      s.brushType = (extraData as ToolQualityTier | null) || 'standard'
      s.pickaxeSecs = 0
      s.pickaxeType = null
    }
    else if (buffName === 'shiny') s.shinyBoostSecs = (s.shinyBoostSecs || 0) + seconds
    else if (buffName === 'amulet') s.amuletCoinSecs = (s.amuletCoinSecs || 0) + seconds
    else if (buffName === 'lucky-egg') s.luckyEggSecs = (s.luckyEggSecs || 0) + seconds
    else if (buffName === 'safari') s.safariTicketSecs = (s.safariTicketSecs || 0) + seconds
    else if (buffName === 'cerulean') s.ceruleanTicketSecs = (s.ceruleanTicketSecs || 0) + seconds
    else if (buffName === 'articuno') s.articunoTicketSecs = (s.articunoTicketSecs || 0) + seconds
    else if (buffName === 'mewtwo') s.mewtwoTicketSecs = (s.mewtwoTicketSecs || 0) + seconds
    else if (buffName === 'iv-scanner') s.ivScannerSecs = seconds
    else if (buffName === 'incense') {
      s.incenseSecs = (s.incenseSecs || 0) + seconds
      if (extraData) s.incenseType = isItemId(extraData) ? extraData : null
    }
    gameStore.save(false)
  }

  const activeBuffs = computed<ActiveBuffItem[]>(() => {
    void currentTick.value
    const nowMs = getServerTime()
    const nowInstant = getServerInstant()
    const zdt = getGMT3Date()

    const eventBuffs = buildActiveEventBuffs(eventStore.activeEvents, nowMs, nowInstant, zdt)
    const itemBuffs = buildActivePlayerItemBuffs(gameStore.state)

    return [...eventBuffs, ...itemBuffs]
  })

  return { initTick, addBuff, activeBuffs }
})

