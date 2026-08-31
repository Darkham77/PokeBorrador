import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from '@/stores/game.ts'
import { useEventStore } from '@/stores/events.ts'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { ToolQualityTier } from '@/types/system/game'
import { isItemId, type ItemId } from '@/data/inventory/items'
import { getEventCurrentWindow, safeParse, resolveWeeklyRotation, type Event as GameEvent, type EventConfig } from '@/logic/events/eventEngine'
import { getServerTime, getServerInstant, getGMT3Date } from '@/logic/utils/timeUtils'

export interface ActiveBuffItem {
  id: string
  secs: number
  name: string
  desc: string
  icon: string
  isEmoji?: boolean
  tier?: ToolQualityTier
  isEvent?: boolean
  event?: GameEvent
}

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
    const s = gameStore.state
    const list: ActiveBuffItem[] = []
    const BUFF_DURATION_MIN = 20
    const LUCKY_EGG_EXP_BOOST_PCT = 50
    const BUFF_DURATION_30_MIN_MIN = 30
    const INFINITE_EVENT_SECS_FALLBACK = 86400

    // 1. Active global events with countdown clocks
    const nowMs = getServerTime()
    const nowInstant = getServerInstant()
    const zdt = getGMT3Date()

    for (const ev of eventStore.activeEvents) {
      const window = getEventCurrentWindow(ev, nowInstant)
      let secsLeft = 0
      if (window) {
        secsLeft = Math.max(0, Math.floor((window.end.epochMilliseconds - nowMs) / 1000))
      } else if (ev.end_at) {
        try {
          const endInstant = Temporal.Instant.from(ev.end_at)
          secsLeft = Math.max(0, Math.floor((endInstant.epochMilliseconds - nowMs) / 1000))
        } catch {
          secsLeft = 0
        }
      } else if (ev.manual) {
        secsLeft = INFINITE_EVENT_SECS_FALLBACK
      }

      const cfg = safeParse(ev.config) as EventConfig
      const rotation = cfg.rotationTheme === 'weekly_4' && cfg.weeklyRotations ? resolveWeeklyRotation(cfg, zdt) : null
      const eventTitle = rotation?.title || ev.name

      const bonusParts: string[] = [] // domain-ok
      const rawSpecies = rotation?.species || cfg.species
      if (rawSpecies && rawSpecies !== '*') {
        const speciesNames = rawSpecies
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
          .join(', ')
        if (speciesNames) {
          bonusParts.push(`Especies: ${speciesNames}`)
        }
      }
      if (cfg.speciesShinyMult && cfg.speciesShinyMult > 1) {
        bonusParts.push(`✨ x${cfg.speciesShinyMult} Shiny`)
      } else if (cfg.shinyMult && cfg.shinyMult > 1) {
        bonusParts.push(`✨ x${cfg.shinyMult} Shiny`)
      }
      if (cfg.speciesRateMult && cfg.speciesRateMult > 1) {
        bonusParts.push(`🎯 x${cfg.speciesRateMult} Aparición`)
      }
      if (cfg.fishingMult && cfg.fishingMult > 1) {
        bonusParts.push(`🎣 x${cfg.fishingMult} Pesca`)
      }
      if (cfg.expMult && cfg.expMult > 1) {
        bonusParts.push(`⚡ x${cfg.expMult} EXP`)
      }
      if (cfg.moneyMult && cfg.moneyMult > 1) {
        bonusParts.push(`💰 x${cfg.moneyMult} Dinero`)
      }
      if (cfg.bcMult && cfg.bcMult > 1) {
        bonusParts.push(`🪙 x${cfg.bcMult} Battle Coins`)
      }
      if (cfg.archaeologyMult && cfg.archaeologyMult > 1) {
        bonusParts.push(`⛏️ x${cfg.archaeologyMult} Arqueología`)
      }
      if (cfg.bugCatchingMult && cfg.bugCatchingMult > 1) {
        bonusParts.push(`🦗 x${cfg.bugCatchingMult} Caza Bichos`)
      }
      if (cfg.casinoLuckyMult && cfg.casinoLuckyMult > 1) {
        bonusParts.push(`🎰 x${cfg.casinoLuckyMult} Suerte Casino`)
      }
      if (cfg.hatchMult && cfg.hatchMult > 1) {
        bonusParts.push(`🥚 x${cfg.hatchMult} Velocidad Eclosión`)
      }
      if (ev.type === 'competition') {
        bonusParts.push('🏆 Competición Activa')
      }

      const eventDesc = bonusParts.length > 0
        ? bonusParts.join(' · ')
        : (ev.description || '¡Evento especial activo!')

      list.push({
        id: `event_${ev.id}`,
        secs: secsLeft,
        name: eventTitle,
        desc: eventDesc,
        icon: ev.icon || '🎁',
        isEmoji: true,
        isEvent: true,
        event: ev
      })
    }

    if (s.repelSecs > 0) list.push({ id: 'repel', secs: s.repelSecs, name: 'Repelente', desc: 'Aleja Pokémon salvajes de nivel inferior al tuyo.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'repel') }) // spanish-ok
    if (s.fishingRodSecs > 0) {
      const type = s.fishingRodType || 'standard'
      const names: Record<string, string> = { standard: 'Caña de pescar', good: 'Caña Buena', super: 'Supercaña' } // spanish-ok
      const budgets: Record<string, number> = { standard: 0, good: 500, super: 1000 }
      const rodItemIds: Record<string, ItemId> = { standard: 'fishingrod', good: 'fishingrodgood', super: 'fishingrodsuper' }
      const fName = names[type] || 'Caña de pescar' // spanish-ok
      const fBudget = budgets[type] || 0
      const descText = type === 'standard' 
        ? `Sube mucho la pesca por ${BUFF_DURATION_MIN} min. Ver % exacto en el mapa.`
        : `Sube la pesca y bonifica a los Pokémon raros (+${fBudget} pts).` + (type === 'super' ? ' Aumenta chance de Shiny x1.5.' : '')
      list.push({ 
        id: 'fishing-rod', 
        secs: s.fishingRodSecs, 
        name: `🎣 ${fName}`, 
        desc: descText, 
        icon: getAssetUrl(ASSET_TYPES.ITEM, rodItemIds[type] || 'fishingrod'),
        tier: type
      })
    }
    if (s.pickaxeSecs > 0) {
      const type = s.pickaxeType || 'standard'
      const names: Record<string, string> = { standard: 'Pico de excavación', good: 'Pico Bueno', super: 'Superpico' } // spanish-ok
      const budgets: Record<string, number> = { standard: 0, good: 500, super: 1000 }
      const pickaxeItemIds: Record<string, ItemId> = { standard: 'pickaxe', good: 'pickaxesilver', super: 'pickaxegold' }
      const pName = names[type] || 'Pico de excavación' // spanish-ok
      const pBudget = budgets[type] || 0
      const descText = type === 'standard'
        ? `Sube la arqueología por ${BUFF_DURATION_MIN} min. Ver % exacto en el mapa.`
        : `Sube la arqueología y bonifica minerales y gemas (+${pBudget} pts).`
      list.push({ 
        id: 'pickaxe', 
        secs: s.pickaxeSecs, 
        name: `⛏️ ${pName}`, 
        desc: descText, 
        icon: getAssetUrl(ASSET_TYPES.ITEM, pickaxeItemIds[type] || 'pickaxe'),
        tier: type
      })
    }
    if (s.brushSecs > 0) {
      const type = s.brushType || 'standard'
      const names: Record<string, string> = { standard: 'Pincel de excavación', good: 'Pincel Bueno', super: 'Superpincel' } // spanish-ok
      const budgets: Record<string, number> = { standard: 0, good: 500, super: 1000 }
      const brushItemIds: Record<string, ItemId> = { standard: 'brush', good: 'brushgood', super: 'brushsuper' }
      const bName = names[type] || 'Pincel de excavación' // spanish-ok
      const bBudget = budgets[type] || 0
      const descText = type === 'standard'
        ? `Sube la arqueología por ${BUFF_DURATION_MIN} min. Ver % exacto en el mapa.`
        : `Sube la arqueología y bonifica fósiles (+${bBudget} pts).`
      list.push({ 
        id: 'brush', 
        secs: s.brushSecs, 
        name: `🖌️ ${bName}`, 
        desc: descText, 
        icon: getAssetUrl(ASSET_TYPES.ITEM, brushItemIds[type] || 'brush'),
        tier: type
      })
    }
    if (s.shinyBoostSecs > 0) list.push({ id: 'shiny', secs: s.shinyBoostSecs, name: '✨ Ticket Shiny', desc: 'Aumenta la probabilidad de encontrar Pokémon shiny.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'ticketshiny') }) // spanish-ok
    if (s.amuletCoinSecs > 0) list.push({ id: 'amulet', secs: s.amuletCoinSecs, name: '💰 Moneda Amuleto', desc: 'Duplica el dinero ganado en combate.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'amuletcoin') }) // spanish-ok
    if (s.luckyEggSecs > 0) list.push({ id: 'lucky-egg', secs: s.luckyEggSecs, name: '🥚 Huevo Suerte Pequeño', desc: `Aumenta la EXP ganada en un ${LUCKY_EGG_EXP_BOOST_PCT}% durante ${BUFF_DURATION_30_MIN_MIN} minutos.`, icon: getAssetUrl(ASSET_TYPES.ITEM, 'luckyegg') }) // spanish-ok
    if (s.safariTicketSecs > 0) list.push({ id: 'safari', secs: s.safariTicketSecs, name: '🎫 Ticket Safari', desc: 'Permite entrar a la Zona Safari.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'ticketsafari') }) // spanish-ok
    if (s.ceruleanTicketSecs > 0) list.push({ id: 'cerulean', secs: s.ceruleanTicketSecs, name: '🌀 Ticket Cueva Celeste', desc: 'Permite entrar a la Cueva Celeste.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'ticketcerulean') }) // spanish-ok
    if (s.articunoTicketSecs > 0) list.push({ id: 'articuno', secs: s.articunoTicketSecs, name: '❄️ Ticket Articuno', desc: 'Permite entrar a las Islas Espuma.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'ticketarticuno') }) // spanish-ok
    if (s.mewtwoTicketSecs > 0) list.push({ id: 'mewtwo', secs: s.mewtwoTicketSecs, name: '🧬 Ticket Mewtwo', desc: 'Permite entrar a la Cueva Celeste (Mewtwo).', icon: getAssetUrl(ASSET_TYPES.ITEM, 'ticketmewtwo') }) // spanish-ok
    if (s.ivScannerSecs > 0) list.push({ id: 'iv-scanner', secs: s.ivScannerSecs, name: '🔍 Escáner de IVs', desc: 'Muestra los IVs totales de Pokémon salvajes.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'ivscanner') }) // spanish-ok
    
    if (s.incenseSecs > 0) {
      const types: Partial<Record<ItemId, string>> = {
        incensefire: 'Fuego',
        incensewater: 'Agua',
        incensegrass: 'Planta',
        incensenormal: 'Normal',
        incenseghost: 'Fantasma',
        incensepsychic: 'Psíquico', // spanish-ok
      }
      const sprites: Partial<Record<ItemId, string>> = {
        incensefire: 'luck_incense',
        incensewater: 'luck_incense',
        incensegrass: 'luck_incense',
        incensenormal: 'luck_incense',
        incenseghost: 'luck_incense',
        incensepsychic: 'luck_incense',
      }
      const tName = (s.incenseType && types[s.incenseType]) || 'Desconocido'
      const tSprite = (s.incenseType && sprites[s.incenseType]) || 'luck_incense'
      list.push({ 
        id: 'incense', 
        secs: s.incenseSecs, 
        name: `💨 Incienso ${tName}`, 
        desc: `Atrae Pokémon de tipo ${tName}.`, 
        icon: getAssetUrl(ASSET_TYPES.ITEM, tSprite)
      })
    }
    
    return list
  })

  return { initTick, addBuff, activeBuffs }
})

