import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'
import { useMapStore } from '@/stores/map'

/**
 * Initializes all legacy window bindings to bridge the old JS logic with Vue stores.
 */
function initLegacyBindings() {
  const gameStore = useGameStore()
  const authStore = useAuthStore()
  const uiStore = useUIStore()
  const battleStore = useBattleStore()
  const mapStore = useMapStore()

  if (typeof window === 'undefined') return

  // 1. Store Accessibility
  window.gameStore = gameStore
  window.authStore = authStore
  window.uiStore = uiStore

  // 2. Profile & Sync
  window.updateVueProfile = (data) => uiStore.updateProfile(data)
  
  window.triggerVueSync = () => {
    if (window.state && typeof gameStore.syncFromLegacy === 'function') {
      gameStore.syncFromLegacy(window.state)
    }
    if (window.state?.battle && typeof battleStore.syncFromLegacy === 'function') {
      battleStore.syncFromLegacy(window.state.battle)
    }
    if (typeof mapStore.syncFromLegacy === 'function') {
      mapStore.syncFromLegacy(window.state)
    }
  }

  window.doLogout = () => {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      authStore.logout()
    }
  }

  // 3. Modal Toggles
  window.closeProfile = () => { uiStore.isProfileOpen = false }
  window.toggleProfile = () => uiStore.toggleProfile()
  window.toggleSettings = () => uiStore.toggleSettings()
  window.toggleLibrary = () => uiStore.toggleLibrary()

  // 4. Component Render Placeholders (Notifying Vue of State Changes)
  window.renderBox = () => window.triggerVueSync()
  window.renderBag = () => window.triggerVueSync()
  window.renderPokedex = () => window.triggerVueSync()
  window.renderMaps = () => {
    mapStore.syncFromLegacy(window.state)
    window.triggerVueSync()
  }

  // 4.1 Battle Logging Bridge
  window.setLog = (msg, cls = 'log-info') => {
    battleStore.clearLogs()
    battleStore.addLog(msg, cls)
  }
  window.addLog = (msg, cls = '') => {
    battleStore.addLog(msg, cls)
  }

  // 5. Zoom System
  window.updateZoom = (val) => {
    const zoom = val / 100
    document.documentElement.style.setProperty('--app-zoom', zoom)
    const zoomValue = document.getElementById('zoom-value')
    if (zoomValue) zoomValue.innerText = `${val}%`
    const slider = document.getElementById('zoom-slider')
    if (slider) slider.value = val
    localStorage.setItem('app-zoom', val)
  }

  window.initZoom = () => {
    const saved = localStorage.getItem('app-zoom') || '100'
    window.updateZoom(saved)
  }

  // 6. Team Rocket Class Logic (Special Selection Mode)
  window.uiSelectionState = gameStore.state.uiSelection

  window.toggleTeamRocketMode = () => {
    if (window.state?.playerClass !== 'rocket') return
    const ui = gameStore.state.uiSelection
    ui.teamRocketMode = !ui.teamRocketMode
    ui.teamRocketSelected = []
    
    // Legacy DOM manipulation side-effects
    const grid = document.getElementById('team-grid')
    if (grid) {
      grid.dataset.rocketMode = ui.teamRocketMode
      if (ui.teamRocketMode && grid.dataset.releaseMode === 'true') {
        window.toggleReleaseMode?.()
      }
    }
    
    // Unified sync
    if (typeof window.renderTeam === 'function') window.renderTeam()
    window.triggerVueSync()
  }

  window.toggleTeamRocketSelect = (index) => {
    const ui = gameStore.state.uiSelection
    const idx = ui.teamRocketSelected.indexOf(index)
    if (idx > -1) {
      ui.teamRocketSelected.splice(idx, 1)
    } else {
      ui.teamRocketSelected.push(index)
    }
    if (typeof window.renderTeam === 'function') window.renderTeam()
    window.triggerVueSync()
  }

  window.confirmTeamRocketSell = () => {
    const ui = gameStore.state.uiSelection
    const indices = ui.teamRocketSelected
    if (indices.length === 0) {
      if (typeof window.notify === 'function') window.notify('No seleccionaste ningún Pokémon.', '❓')
      return
    }

    if (confirm(`¿Estás seguro de que quieres vender ${indices.length} Pokémon al Team Rocket? Recibirás $${indices.length * 1500}.`)) {
      let totalPrice = 0
      indices.sort((a, b) => b - a).forEach(i => {
        const p = window.state.team.splice(i, 1)[0]
        if (p && typeof window.returnHeldItem === 'function') window.returnHeldItem(p)
        totalPrice += 1500
      })

      window.state.money = (window.state.money || 0) + totalPrice
      window.state.classData = window.state.classData || {}
      window.state.classData.blackMarketSales = (window.state.classData.blackMarketSales || 0) + indices.length
      
      if (typeof window.addCriminality === 'function') window.addCriminality(indices.length * 15)
      if (typeof window.addClassXP === 'function') window.addClassXP(25 * indices.length)

      ui.teamRocketSelected = []
      ui.teamRocketMode = false
      if (typeof window.renderTeam === 'function') window.renderTeam()
      if (typeof window.updateHud === 'function') window.updateHud()
      window.triggerVueSync()
    }
  }

  // 7. Release Mode Logic
  window.toggleReleaseMode = () => {
    const ui = gameStore.state.uiSelection
    ui.teamReleaseMode = !ui.teamReleaseMode
    ui.teamReleaseSelected = []

    // Legacy DOM compatibility
    const grid = document.getElementById('team-grid')
    if (grid) {
      grid.dataset.releaseMode = ui.teamReleaseMode
      if (ui.teamReleaseMode && ui.teamRocketMode) {
        window.toggleTeamRocketMode?.()
      }
    }

    if (typeof window.renderTeam === 'function') window.renderTeam()
    window.triggerVueSync()
  }

  window.toggleReleaseSelect = (index) => {
    const ui = gameStore.state.uiSelection
    const idx = ui.teamReleaseSelected.indexOf(index)
    if (idx > -1) {
      ui.teamReleaseSelected.splice(idx, 1)
    } else {
      ui.teamReleaseSelected.push(index)
    }
    window.triggerVueSync()
    if (typeof window.renderTeam === 'function') window.renderTeam()
  }

  window.confirmRelease = () => {
    const ui = gameStore.state.uiSelection
    const indices = ui.teamReleaseSelected
    if (indices.length === 0) return

    if (window.state.team.length - indices.length < 1) {
      if (typeof window.notify === 'function') window.notify('No puedes soltar a todos tus Pokémon.', '⚠️')
      return
    }

    if (confirm(`¿Estás seguro de que quieres soltar ${indices.length} Pokémon? Esta acción es irreversible.`)) {
      indices.sort((a, b) => b - a).forEach(i => {
        const p = window.state.team.splice(i, 1)[0]
        if (p && typeof window.returnHeldItem === 'function') window.returnHeldItem(p)
      })

      ui.teamReleaseSelected = []
      ui.teamReleaseMode = false
      if (typeof window.renderTeam === 'function') window.renderTeam()
      if (typeof window.updateHud === 'function') window.updateHud()
      if (typeof window.scheduleSave === 'function') window.scheduleSave()
      window.triggerVueSync()
    }
  }

  // 8. Battle UI Bridge (FIX FOR DOM CRASHES)
  window.updateBattleUI = () => {
    console.log('[stateBridge] Overriding updateBattleUI (Syncing Vue only)');
    window.triggerVueSync()
  }

  window.setBattleSprite = (side, pokemonId, useBack) => {
    // Vue handles sprites reactively via BattleArena.vue and getSprite()
    // No-op to prevent legacy DOM crashes
  }

  window.updateBattleMoves = () => {
    // Vue handles moves reactively via BattleArena.vue and player.moves
    window.triggerVueSync()
  }

  window.renderMoveButtons = () => {
    // Vue handles move buttons reactively
    window.triggerVueSync()
  }

  window.showBattleEndUI = (callback, locId, isDraw) => {
    console.log('[stateBridge] Overriding showBattleEndUI');
    // Instead of manipulating #battle-log DOM, we use Pinia
    battleStore.setFinishing(callback);
    
    // Legacy cleanup that doesn't touch DOM
    if (typeof window.hatchEggs === 'function') window.hatchEggs();
    if (typeof window.scheduleSave === 'function') window.scheduleSave();
  }

  // Ensure tooltips are cleared when screen changes
  const originalHideTooltip = window.hideMoveTooltip;
  window.hideMoveTooltip = () => {
    if (typeof originalHideTooltip === 'function') originalHideTooltip();
    // Additional cleanup if needed
  };

  // 9. World Map Bridge (Prep)
  window.renderMaps = () => window.triggerVueSync();

  // Initialize
  window.initZoom()
  console.log('[StateBridge] Legacy window bindings initialized.')
}

/**
 * Ensures basic state structure is available to avoid legacy crashes.
 */
function initGameStateBridge() {
  if (typeof window === 'undefined') return

  if (typeof globalThis.state !== 'undefined' && !window.state) {
    window.state = globalThis.state
  } else {
    window.state = window.state || {}
  }

  if (!window.state.map) {
    window.state.map = 'route1'
  }
}

export { initGameStateBridge, initLegacyBindings }
