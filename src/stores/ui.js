import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const isProfileOpen = ref(false)
  const isSettingsOpen = ref(false)
  const isHistoryOpen = ref(false)
  const isLibraryOpen = ref(false)
  const libraryTab = ref('gimnasios')
  const activeTab = ref('map')
  const isTradeOpen = ref(false)
  const isEggScannerOpen = ref(false)
  const isHatchModalOpen = ref(false)
  const hatchedPokemon = ref(null)
  
  // Modales de Clase
  const isClassSelectionOpen = ref(false)
  const isClassMissionsOpen = ref(false)
  const isRepShopOpen = ref(false)

  // Modales de Combate (Full Vue)
  const isBattleInventoryOpen = ref(false)
  const isBattleSwitchOpen = ref(false)
  const isBattleSwitchForced = ref(false) // Para cuando un poke es debilitado
  const isPokemonCenterOpen = ref(false)



  
  // Modals de detalle
  const isPokemonDetailOpen = ref(false)
  const selectedPokemon = ref(null)
  const pokemonDetailContext = ref('team') // 'team', 'box', 'market'
  const pokemonDetailIndex = ref(-1)
  const pokemonDetailExtra = ref(null)

  const isMoveDetailOpen = ref(false)
  const selectedMove = ref(null)

  const profileData = ref({
    username: '—',
    email: '—',
    isAdmin: false,
    level: 1,
    badges: 0,
    money: 0,
    battleCoins: 0,
    stats: {
      wins: 0,
      trainersDefeated: 0
    },
    faction: null,
    nick_style: '',
    notificationHistory: [],
    lastSave: 'Sin datos'
  })

  const isSocialOpen = ref(false)

  function toggleProfile() { isProfileOpen.value = !isProfileOpen.value }
  function toggleSettings() { isSettingsOpen.value = !isSettingsOpen.value }
  function toggleHistory() { isHistoryOpen.value = !isHistoryOpen.value }
  function toggleSocial() { isSocialOpen.value = !isSocialOpen.value }
  
  function toggleLibrary(tabId = null) {
    if (tabId) libraryTab.value = tabId
    isLibraryOpen.value = !isLibraryOpen.value
  }

  function closeAll() {
    isProfileOpen.value = false
    isSettingsOpen.value = false
    isHistoryOpen.value = false
    isLibraryOpen.value = false
    isSocialOpen.value = false
  }

  function updateProfile(data) {
    profileData.value = { ...profileData.value, ...data }
  }

  function notify(msg, icon = '🔔') {
    if (typeof window.notify === 'function') {
      window.notify(msg, icon)
    } else {
      console.log(`[UIStore] Notification: ${icon} ${msg}`)
    }
  }

  function toggleTrade() { isTradeOpen.value = !isTradeOpen.value }


  function openPokemonDetail(pokemon, index, context = 'team', extra = null) {
    selectedPokemon.value = pokemon
    pokemonDetailIndex.value = index
    pokemonDetailContext.value = context
    pokemonDetailExtra.value = extra
    isPokemonDetailOpen.value = true
  }

  function closePokemonDetail() {
    isPokemonDetailOpen.value = false
    selectedPokemon.value = null
  }

  function openMoveDetail(moveName) {
    selectedMove.value = moveName
    isMoveDetailOpen.value = true
  }

  function closeMoveDetail() {
    isMoveDetailOpen.value = false
    selectedMove.value = null
  }

  return {
    isProfileOpen,
    isSettingsOpen,
    isHistoryOpen,
    isLibraryOpen,
    libraryTab,
    isTradeOpen,
    isSocialOpen,
    isEggScannerOpen,
    isHatchModalOpen,
    hatchedPokemon,
    isClassSelectionOpen,
    isClassMissionsOpen,
    isRepShopOpen,
    isPokemonDetailOpen,

    selectedPokemon,
    pokemonDetailContext,
    pokemonDetailIndex,
    pokemonDetailExtra,
    isMoveDetailOpen,
    selectedMove,
    activeTab,
    isPokemonCenterOpen,
    profileData,
    toggleTrade,
    toggleSocial,
    updateProfile,
    notify,
    toggleProfile,
    toggleSettings,
    toggleHistory,
    toggleLibrary,
    closeAll,
    openPokemonDetail,
    closePokemonDetail,
    openMoveDetail,
    closeMoveDetail
  }
})

