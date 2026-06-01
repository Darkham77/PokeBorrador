import { defineStore } from 'pinia'
import { computed } from 'vue'
import { gsap } from 'gsap'
import { useGameStore } from './game.ts'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

export const useBuffsStore = defineStore('buffs', () => {
  const gameStore = useGameStore()
  
  let tickInterval: gsap.core.Tween | null = null

  function initTick() {
    if (tickInterval) tickInterval.kill()
    
    const tick = () => {
      // Pause timers if player is in an active battle
      if (gameStore.state.battle && !gameStore.state.battle.over) {
        tickInterval = gsap.delayedCall(1, tick)
        return
      }

      const s = gameStore.state
      let changed = false
      if (s.repelSecs > 0) { s.repelSecs--; changed = true }
      if (s.fishingRodSecs > 0) { s.fishingRodSecs--; changed = true }
      if (s.pickaxeSecs > 0) { s.pickaxeSecs--; changed = true }
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
        const hasShinyTick = s.shinyBoostSecs > 0 && s.shinyBoostSecs % 30 === 0
        const hasAmuletTick = s.amuletCoinSecs > 0 && s.amuletCoinSecs % 30 === 0
        const hasEggTick = s.luckyEggSecs > 0 && s.luckyEggSecs % 30 === 0
        const hasIncenseTick = s.incenseSecs > 0 && s.incenseSecs % 30 === 0
        const hasScannerTick = s.ivScannerSecs > 0 && s.ivScannerSecs % 30 === 0

        if (
          hasRepelTick || 
          hasFishingTick || 
          hasPickaxeTick || 
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
    else if (buffName === 'fishing-rod') s.fishingRodSecs = (s.fishingRodSecs || 0) + seconds
    else if (buffName === 'pickaxe') s.pickaxeSecs = (s.pickaxeSecs || 0) + seconds
    else if (buffName === 'shiny') s.shinyBoostSecs = (s.shinyBoostSecs || 0) + seconds
    else if (buffName === 'amulet') s.amuletCoinSecs = (s.amuletCoinSecs || 0) + seconds
    else if (buffName === 'lucky-egg') s.luckyEggSecs = (s.luckyEggSecs || 0) + seconds
    else if (buffName === 'safari') s.safariTicketSecs = (s.safariTicketSecs || 0) + seconds
    else if (buffName === 'cerulean') s.ceruleanTicketSecs = (s.ceruleanTicketSecs || 0) + seconds
    else if (buffName === 'articuno') s.articunoTicketSecs = (s.articunoTicketSecs || 0) + seconds
    else if (buffName === 'mewtwo') s.mewtwoTicketSecs = (s.mewtwoTicketSecs || 0) + seconds
    else if (buffName === 'iv-scanner') s.ivScannerSecs = (s.ivScannerSecs || 0) + seconds
    else if (buffName === 'incense') {
      s.incenseSecs = (s.incenseSecs || 0) + seconds
      if (extraData) s.incenseType = extraData
    }
    gameStore.save(false)
  }

  const activeBuffs = computed(() => {
    const s = gameStore.state
    const list = []
    if (s.repelSecs > 0) list.push({ id: 'repel', secs: s.repelSecs, name: 'Repelente', desc: 'Aleja Pokémon salvajes de nivel inferior al tuyo.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'repel') })
    if (s.fishingRodSecs > 0) list.push({ id: 'fishing-rod', secs: s.fishingRodSecs, name: '🎣 Caña de pescar', desc: 'Aumenta la probabilidad de pesca al 95%.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'fishing_rod') })
    if (s.pickaxeSecs > 0) list.push({ id: 'pickaxe', secs: s.pickaxeSecs, name: '⛏️ Pico de excavación', desc: 'Aumenta la probabilidad de arqueología al 95%.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'pickaxe') })
    if (s.shinyBoostSecs > 0) list.push({ id: 'shiny', secs: s.shinyBoostSecs, name: '✨ Ticket Shiny', desc: 'Aumenta la probabilidad de encontrar Pokémon shiny.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'eon-ticket') })
    if (s.amuletCoinSecs > 0) list.push({ id: 'amulet', secs: s.amuletCoinSecs, name: '💰 Moneda Amuleto', desc: 'Duplica el dinero ganado en combate.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'amulet-coin') })
    if (s.luckyEggSecs > 0) list.push({ id: 'lucky-egg', secs: s.luckyEggSecs, name: '🥚 Huevo Suerte Pequeño', desc: 'Aumenta la EXP ganada en un 50% durante 30 minutos.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'lucky-egg') })
    if (s.safariTicketSecs > 0) list.push({ id: 'safari', secs: s.safariTicketSecs, name: '🎫 Ticket Safari', desc: 'Permite entrar a la Zona Safari.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'eon-ticket') })
    if (s.ceruleanTicketSecs > 0) list.push({ id: 'cerulean', secs: s.ceruleanTicketSecs, name: '🌀 Ticket Cueva Celeste', desc: 'Permite entrar a la Cueva Celeste.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'eon-ticket') })
    if (s.articunoTicketSecs > 0) list.push({ id: 'articuno', secs: s.articunoTicketSecs, name: '❄️ Ticket Articuno', desc: 'Permite entrar a las Islas Espuma.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'eon-ticket') })
    if (s.mewtwoTicketSecs > 0) list.push({ id: 'mewtwo', secs: s.mewtwoTicketSecs, name: '🧬 Ticket Mewtwo', desc: 'Permite entrar a la Cueva Celeste (Mewtwo).', icon: getAssetUrl(ASSET_TYPES.ITEM, 'eon-ticket') })
    if (s.ivScannerSecs > 0) list.push({ id: 'iv-scanner', secs: s.ivScannerSecs, name: '🔍 Escáner de IVs', desc: 'Muestra los IVs totales de Pokémon salvajes.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'poke-radar') })
    
    if (s.incenseSecs > 0) {
      const types: Record<string, string> = { fire: 'Fuego', water: 'Agua', grass: 'Planta', normal: 'Normal', ghost: 'Fantasma', psychic: 'Psíquico' }
      const sprites: Record<string, string> = { fire: 'incense', water: 'sea-incense', grass: 'rose-incense', normal: 'luck-incense', ghost: 'pure-incense', psychic: 'odd-incense' }
      const tName = types[s.incenseType || ''] || 'Desconocido'
      const tSprite = sprites[s.incenseType || ''] || 'incense'
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
