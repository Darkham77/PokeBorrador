import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useGameStore } from './game'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

export const useBuffsStore = defineStore('buffs', () => {
  const gameStore = useGameStore()
  
  let tickInterval = null

  function initTick() {
    if (tickInterval) clearInterval(tickInterval)
    tickInterval = setInterval(() => {
      // Pause timers if player is in an active battle
      if (gameStore.state.battle && !gameStore.state.battle.over) return;

      let changed = false
      if (gameStore.state.repelSecs > 0) { gameStore.state.repelSecs--; changed = true }
      if (gameStore.state.shinyBoostSecs > 0) { gameStore.state.shinyBoostSecs--; changed = true }
      if (gameStore.state.amuletCoinSecs > 0) { gameStore.state.amuletCoinSecs--; changed = true }
      if (gameStore.state.luckyEggSecs > 0) { gameStore.state.luckyEggSecs--; changed = true }
      if (gameStore.state.safariTicketSecs > 0) { gameStore.state.safariTicketSecs--; changed = true }
      if (gameStore.state.ceruleanTicketSecs > 0) { gameStore.state.ceruleanTicketSecs--; changed = true }
      if (gameStore.state.articunoTicketSecs > 0) { gameStore.state.articunoTicketSecs--; changed = true }
      if (gameStore.state.mewtwoTicketSecs > 0) { gameStore.state.mewtwoTicketSecs--; changed = true }
      if (gameStore.state.ivScannerSecs > 0) { gameStore.state.ivScannerSecs--; changed = true }
      if (gameStore.state.incenseSecs > 0) { gameStore.state.incenseSecs--; changed = true }

      if (changed) {
        // Silent save every 30 seconds to persist timers
        if (gameStore.state.repelSecs % 30 === 0) {
          gameStore.save(false)
        }
      }
    }, 1000)
  }

  function addBuff(buffName, seconds, extraData = null) {
    if (buffName === 'repel') gameStore.state.repelSecs = (gameStore.state.repelSecs || 0) + seconds
    else if (buffName === 'shiny') gameStore.state.shinyBoostSecs = (gameStore.state.shinyBoostSecs || 0) + seconds
    else if (buffName === 'amulet') gameStore.state.amuletCoinSecs = (gameStore.state.amuletCoinSecs || 0) + seconds
    else if (buffName === 'lucky-egg') gameStore.state.luckyEggSecs = (gameStore.state.luckyEggSecs || 0) + seconds
    else if (buffName === 'safari') gameStore.state.safariTicketSecs = (gameStore.state.safariTicketSecs || 0) + seconds
    else if (buffName === 'cerulean') gameStore.state.ceruleanTicketSecs = (gameStore.state.ceruleanTicketSecs || 0) + seconds
    else if (buffName === 'articuno') gameStore.state.articunoTicketSecs = (gameStore.state.articunoTicketSecs || 0) + seconds
    else if (buffName === 'mewtwo') gameStore.state.mewtwoTicketSecs = (gameStore.state.mewtwoTicketSecs || 0) + seconds
    else if (buffName === 'iv-scanner') gameStore.state.ivScannerSecs = (gameStore.state.ivScannerSecs || 0) + seconds
    else if (buffName === 'incense') {
      gameStore.state.incenseSecs = (gameStore.state.incenseSecs || 0) + seconds
      if (extraData) gameStore.state.incenseType = extraData
    }
    gameStore.save(false)
  }

  const activeBuffs = computed(() => {
    const s = gameStore.state
    const list = []
    if (s.repelSecs > 0) list.push({ id: 'repel', secs: s.repelSecs, name: 'Repelente', desc: 'Aleja Pokémon salvajes de nivel inferior al tuyo.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'repel') })
    if (s.shinyBoostSecs > 0) list.push({ id: 'shiny', secs: s.shinyBoostSecs, name: '✨ Ticket Shiny', desc: 'Aumenta la probabilidad de encontrar Pokémon shiny.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'eon-ticket') })
    if (s.amuletCoinSecs > 0) list.push({ id: 'amulet', secs: s.amuletCoinSecs, name: '💰 Moneda Amuleto', desc: 'Duplica el dinero ganado en combate.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'amulet-coin') })
    if (s.luckyEggSecs > 0) list.push({ id: 'lucky-egg', secs: s.luckyEggSecs, name: '🥚 Huevo Suerte Pequeño', desc: 'Aumenta la EXP ganada en un 50% durante 30 minutos.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'lucky-egg') })
    if (s.safariTicketSecs > 0) list.push({ id: 'safari', secs: s.safariTicketSecs, name: '🎫 Ticket Safari', desc: 'Permite entrar a la Zona Safari.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'eon-ticket') })
    if (s.ceruleanTicketSecs > 0) list.push({ id: 'cerulean', secs: s.ceruleanTicketSecs, name: '🌀 Ticket Cueva Celeste', desc: 'Permite entrar a la Cueva Celeste.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'eon-ticket') })
    if (s.articunoTicketSecs > 0) list.push({ id: 'articuno', secs: s.articunoTicketSecs, name: '❄️ Ticket Articuno', desc: 'Permite entrar a las Islas Espuma.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'eon-ticket') })
    if (s.mewtwoTicketSecs > 0) list.push({ id: 'mewtwo', secs: s.mewtwoTicketSecs, name: '🧬 Ticket Mewtwo', desc: 'Permite entrar a la Cueva Celeste (Mewtwo).', icon: getAssetUrl(ASSET_TYPES.ITEM, 'eon-ticket') })
    if (s.ivScannerSecs > 0) list.push({ id: 'iv-scanner', secs: s.ivScannerSecs, name: '🔍 Escáner de IVs', desc: 'Muestra los IVs totales de Pokémon salvajes.', icon: getAssetUrl(ASSET_TYPES.ITEM, 'poke-radar') })
    
    if (s.incenseSecs > 0) {
      const types = { fire: 'Fuego', water: 'Agua', grass: 'Planta', normal: 'Normal', ghost: 'Fantasma', psychic: 'Psíquico' }
      const sprites = { fire: 'incense', water: 'sea-incense', grass: 'rose-incense', normal: 'luck-incense', ghost: 'pure-incense', psychic: 'odd-incense' }
      const tName = types[s.incenseType] || 'Desconocido'
      const tSprite = sprites[s.incenseType] || 'incense'
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
