import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventoryStore'

export function initUIBridge() {
  const uiStore = useUIStore()
  const gameStore = useGameStore()
  const invStore = useInventoryStore()

  // Modal & Detail Bindings
  window.showPokemonDetails = (p, index, location = 'team', extraData = null) => {
    uiStore.openPokemonDetail(p, index, location, extraData)
  }

  window.openPokemonDetail = (index) => {
    const p = gameStore.state.team[index]
    uiStore.openPokemonDetail(p, index, 'team')
  }

  window.closePokemonDetail = () => { uiStore.closePokemonDetail() }
  window.showMoveDetail = (moveName) => { uiStore.openMoveDetail(moveName) }
  window.closeMoveDetail = () => { uiStore.closeMoveDetail() }

  // Tab & HUD Bindings
  window.showTab = (tab, btn) => {
    uiStore.activeTab = tab
    const all = document.querySelectorAll('.hud-nav-btn, [data-tab]');
    all.forEach(b => b.classList.remove('active'))
    if (btn) btn.classList.add('active')
    else {
      const target = document.querySelector(`[data-tab="${tab}"]`);
      if (target) target.classList.add('active');
    }
  }

  // Profile & Sync Bridge
  window.updateVueProfile = (data) => uiStore.updateProfile(data)
  
  window.closeProfile = () => { uiStore.isProfileOpen = false }
  window.toggleProfile = () => uiStore.toggleProfile()
  window.toggleSettings = () => uiStore.toggleSettings()
  window.toggleLibrary = (tabId = null) => uiStore.toggleLibrary(tabId)
  window.openLibrarySection = (tabId) => uiStore.toggleLibrary(tabId)

  // Zoom System
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

  // Inventory Bridge (Phase 14 integration)
  window.returnHeldItem = (p) => invStore.returnHeldItem(p)
  
  window.toggleBoxReleaseMode = () => invStore.toggleBoxReleaseMode()
  window.toggleBoxReleaseSelect = (i) => invStore.toggleBoxReleaseSelect(i)
  window.confirmBoxRelease = () => {
    const names = invStore.boxReleaseSelected.map(i => gameStore.state.box[i]?.name || 'Unknown').join(', ')
    if (!names) return window.notify?.('No seleccionaste ningún Pokémon.', '❓')
    if (confirm(`¿Soltar a ${names} definitivamente?`)) {
      const released = invStore.doBoxRelease()
      window.notify?.(`¡${released.join(', ')} fueron soltados!`, '🌿')
    }
  }

  window.toggleBoxRocketMode = () => invStore.toggleBoxRocketMode()
  window.toggleBoxRocketSelect = (i) => invStore.toggleBoxRocketSelect(i)
  window.confirmBoxRocketSell = () => {
    const value = invStore.getRocketSellValue()
    const count = invStore.boxRocketSelected.length
    if (count === 0) return window.notify?.('No seleccionaste ningún Pokémon.', '❓')
    if (confirm(`¿Vender ${count} Pokémon por ₽${value.toLocaleString()}?`)) {
      const res = invStore.doBoxRocketSell()
      window.notify?.(`¡${res.count} Pokémon vendidos por ₽${res.value.toLocaleString()}! 🚀`, '🚀')
    }
  }

  window.switchBox = (i) => invStore.switchBox(i)
  window.buyNewBox = () => {
    const cost = invStore.getBoxBuyCost()
    if (confirm(`¿Comprar una nueva caja por ₽${cost.toLocaleString()}?`)) {
      const res = invStore.buyNewBox()
      if (res.success) window.notify?.(`¡Compraste la Caja ${res.boxNum}!`, '💰')
      else window.notify?.(res.msg, '❌')
    }
  }

  // Bag Bridge
  window.toggleBagSellMode = () => invStore.toggleBagSellMode()
  window.toggleBagSellSelect = (name, qty) => invStore.toggleBagSellSelect(name, qty)
  window.updateBagSellQty = (name, qty, max) => invStore.updateBagSellQty(name, qty, max)
  window.confirmBagSell = () => {
    const gain = invStore.confirmBagSell()
    if (gain) window.notify?.(`¡Vendiste objetos por ₽${gain.toLocaleString()}!`, '💰')
  }

  window.useBagItem = (name, context, index) => {
    const res = invStore.useItem(name, context, index)
    if (res && res.success) {
      window.notify?.(`¡${gameStore.state[context === 'team' ? 'team' : 'box'][index].name} ${res.msg}!`, '✨')
      return true
    } else if (res) {
      window.notify?.(res.msg, '❌')
    }
    return false
  }

  window.equipBagItem = (name, context, index) => {
    const ok = invStore.equipItem(name, context, index)
    if (ok) window.notify?.(`¡${gameStore.state[context === 'team' ? 'team' : 'box'][index].name} ahora lleva ${name}!`, '🎒')
    return ok
  }

  window.unequipBagItem = (context, index) => {
    const item = invStore.unequipItem(context, index)
    if (item) window.notify?.(`¡${gameStore.state[context === 'team' ? 'team' : 'box'][index].name} ya no lleva ${item}!`, '🎒')
    return item
  }

  window.openBagStoneMenu = (stoneName) => {
    if (typeof window._openBagStoneMenuLegacy === 'function') {
      window._openBagStoneMenuLegacy(stoneName)
    } else {
      console.warn('[UIBridge] Legacy openBagStoneMenu not found')
    }
  }

  window.openBagItemMenu = (itemName) => {
    if (typeof window._openBagItemMenuLegacy === 'function') {
      window._openBagItemMenuLegacy(itemName)
    } else {
      console.warn('[UIBridge] Legacy openBagItemMenu not found')
    }
  }

  console.log('[UIBridge] Modal, Zoom and Inventory bindings initialized.')
}
