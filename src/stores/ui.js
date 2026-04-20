import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useEvolutionStore } from './evolution'
import { useModalStore } from './modals'

export const useUIStore = defineStore('ui', () => {
  // Use lazy store access to avoid circular dependency issues during boot
  const getModalStore = () => useModalStore()
  
  const libraryTab = ref('gimnasios')
  const activeTab = ref('map')
  const hatchedPokemon = ref(null)
  const _selectedBoxIndex = ref(-1)
  const pokemonSelectionConfig = ref({})
  
  // Notifications
  const notifications = ref([])
  
  const _isBattleSwitchForced = ref(false) // Para cuando un poke es debilitado
  
  // Data for modals (still needed in the store if shared)
  const activePokemonForRelearner = ref(null)
  const evolutionData = ref(null) // { pokemon, targetId, itemName }
  const currentMoveToLearn = ref(null) // { pokemon, move }
  const learnQueue = ref([])
  const activePokemonForNature = ref(null)
  const activePokemonForPPUp = ref(null)
  const activePokemonForAbility = ref(null)
  const activeFossil = ref(null) // { pokemonId, itemName }
  
  // Detalle data
  const selectedPokemon = ref(null)
  const selectedMove = ref(null)

  // Zoom
  // Zoom initialization
  const getInitialZoom = () => {
    const saved = localStorage.getItem('app-zoom')
    if (saved) {
      const val = parseFloat(saved)
      if (!isNaN(val) && val > 0) return val
    }
    return 1.0 // 100% default
  }
  const appZoom = ref(getInitialZoom())
  
  const profileData = ref({
    username: '—',
    email: '—',
    isAdmin: false,
    level: 1,
    badges: 0,
    money: 0,
    battleCoins: 0,
    stats: { wins: 0, trainersDefeated: 0 },
    faction: null,
    nick_style: '',
    notificationHistory: [],
    lastSave: 'Sin datos'
  })

  // Static flags for non-modal elements
  const isChatOpen = ref(false)
  const isHistoryOpen = ref(false)
  const openHudGroup = ref(null) // Tracks which HUD menu group is open (e.g., 'POKEMON', 'MARKET')

  // ── MODAL TRIGGERS ─────────────────────────────────────────────────────────
  
  function toggleProfile() { 
    const modalStore = getModalStore()
    if (modalStore.isOpen('Profile')) modalStore.close('Profile')
    else modalStore.open('Profile')
  }
  
  function toggleSettings() { 
    const modalStore = getModalStore()
    if (modalStore.isOpen('Settings')) modalStore.close('Settings')
    else modalStore.open('Settings')
  }

  function toggleHistory() { isHistoryOpen.value = !isHistoryOpen.value }
  
  function toggleSocial() { 
    const modalStore = getModalStore()
    if (modalStore.isOpen('SocialCenter')) modalStore.close('SocialCenter')
    else modalStore.open('SocialCenter')
  }

  function toggleLibrary(tabId = null) { 
    const modalStore = getModalStore()
    if (modalStore.isOpen('Library')) modalStore.close('Library')
    else modalStore.open('Library', { initialTab: tabId })
  }
  
  function open(name, props = {}) {
    getModalStore().open(name, props)
  }

  function close(name) {
    getModalStore().close(name)
  }

  function closeAll() {
    getModalStore().closeAll()
    isHistoryOpen.value = false
    isChatOpen.value = false
    openHudGroup.value = null
  }

  function toggleHudGroup(name) {
    if (openHudGroup.value === name) {
      openHudGroup.value = null
    } else {
      openHudGroup.value = name
    }
  }

  function updateProfile(data) {
    profileData.value = { ...profileData.value, ...data }
  }

  function notify(msg, icon = '🔔') {
    const id = Date.now() + Math.random().toString(36).substr(2, 9)
    notifications.value.push({ id, msg, icon })
    setTimeout(() => {
      notifications.value = notifications.value.filter(n => n.id !== id)
    }, 4000)
  }

  const isLoading = ref(false)
  function setLoading(val) { isLoading.value = val }

  function toggleTrade() { getModalStore().open('SocialCenter') }

  function openPokemonDetail(pokemon, index, context = 'team', extra = null) {
    selectedPokemon.value = pokemon
    getModalStore().open('PokemonDetail', { pokemon, index, context, extra })
  }

  function closePokemonDetail() { getModalStore().close('PokemonDetail') }

  function openMoveDetail(moveName) {
    selectedMove.value = moveName
    getModalStore().open('MoveDetail', { moveName })
  }

  function closeMoveDetail() { getModalStore().close('MoveDetail') }

  function startEvolution(pokemon, targetId, itemName) {
    evolutionData.value = { pokemon, targetId, itemName }
    getModalStore().open('Evolution')
    const evolutionStore = useEvolutionStore()
    evolutionStore.startEvolution(pokemon, targetId, () => {
      getModalStore().close('Evolution')
    })
  }

  function addToLearnQueue(items) {
    if (Array.isArray(items)) {
      learnQueue.value.push(...items)
    } else {
      learnQueue.value.push(items)
    }
    checkLearnQueue()
  }

  function checkLearnQueue() {
    const modalStore = getModalStore()
    if (modalStore.isOpen('MoveLearning') || learnQueue.value.length === 0) return
    currentMoveToLearn.value = learnQueue.value.shift()
    modalStore.open('MoveLearning')
  }

  function finishMoveLearning() {
    getModalStore().close('MoveLearning')
    currentMoveToLearn.value = null
    checkLearnQueue()
  }


  const isAnyBlockingModalOpen = computed(() => {
    // Some modals like 'Profile' are non-blocking side panels
    const nonBlockingModals = ['Profile']
    return getModalStore().stack.some(m => !nonBlockingModals.includes(m.name))
  })
  
  const isAnyModalOpen = computed(() => isAnyBlockingModalOpen.value || isChatOpen.value || getModalStore().isOpen('Profile'))

  // ── DYNAMIC FLAGS FOR BACKWARD COMPATIBILITY (WRITABLE) ───────────────────
  const createModalRef = (name) => computed({
    get: () => getModalStore().isOpen(name),
    set: (val) => {
      if (val) getModalStore().open(name)
      else getModalStore().close(name)
    }
  })

  const isProfileOpen = createModalRef('Profile')
  const isSettingsOpen = createModalRef('Settings')
  const isLibraryOpen = createModalRef('Library')
  const isTradeOpen = createModalRef('SocialCenter')
  const isSocialOpen = createModalRef('SocialCenter')
  const isShopOpen = createModalRef('Shop')
  const isInventoryOpen = createModalRef('Inventory')
  const isPokedexOpen = createModalRef('Pokedex')
  const isPokemonCenterOpen = createModalRef('HealOverlay')
  const isWarShopOpen = createModalRef('WarShop')
  const isPassiveTeamEditorOpen = createModalRef('PassiveTeamEditor')
  const isPokemonSelectionOpen = createModalRef('PokemonSelection')
  const isClassSelectionOpen = createModalRef('ClassSelection')
  const isClassMissionsOpen = createModalRef('ClassMissions')
  const isRepShopOpen = createModalRef('Shop')
  const isPokemonDetailOpen = createModalRef('PokemonDetail')
  const isMoveDetailOpen = createModalRef('MoveDetail')
  const isEvolutionOpen = createModalRef('Evolution')
  const isMoveLearningOpen = createModalRef('MoveLearning')
  const isMoveRelearnerOpen = createModalRef('MoveRelearner')
  const isNaturePatchOpen = createModalRef('NaturePatch')
  const isPPUpOpen = createModalRef('PPUp')
  const isAbilityPillOpen = createModalRef('AbilityPill')
  const isFossilRevivalOpen = createModalRef('FossilRevival')
  const isEggScannerOpen = createModalRef('EggScanner')
  const isHatchModalOpen = createModalRef('HatchModal')
  const isCosmeticsModalOpen = createModalRef('Cosmetics')
  const isFactionChoiceOpen = createModalRef('FactionChoice')

  return {
    isAnyModalOpen,
    isAnyBlockingModalOpen,
    isProfileOpen,
    isSettingsOpen,
    isHistoryOpen,
    isLibraryOpen,
    isChatOpen,
    libraryTab,
    isTradeOpen,
    isSocialOpen,
    isEggScannerOpen,
    isHatchModalOpen,
    hatchedPokemon,
    isClassSelectionOpen,
    isFactionChoiceOpen,
    isClassMissionsOpen,
    isRepShopOpen,
    isPokemonDetailOpen,

    selectedPokemon,
    selectedMove,
    activeTab,
    isPokemonCenterOpen,
    isShopOpen,
    isWarShopOpen,
    isPassiveTeamEditorOpen,
    isPokemonSelectionOpen,
    pokemonSelectionConfig,
    appZoom,
    setZoom: (val) => {
      appZoom.value = val
      localStorage.setItem('app-zoom', val)
      document.documentElement.style.setProperty('--app-zoom', val)
    },
    profileData,
    toggleTrade,
    toggleSocial,
    updateProfile,
    notify,
    notifications,
    isLoading,
    setLoading,
    toggleProfile,
    toggleSettings,
    toggleHistory,
    toggleLibrary,
    toggleHudGroup,
    openHudGroup,
    closeAll,
    open,
    close,
    closeModal: () => getModalStore().closeTop(),
    openPokemonDetail,
    closePokemonDetail,
    openMoveDetail,
    closeMoveDetail,
    
    // Relearner
    isMoveRelearnerOpen,
    activePokemonForRelearner,
    
    // Evolution
    isEvolutionOpen,
    evolutionData,
    startEvolution,
    
    // Move Learning
    isMoveLearningOpen,
    currentMoveToLearn,
    learnQueue,
    addToLearnQueue,
    finishMoveLearning,

    isNaturePatchOpen,
    activePokemonForNature,
    isPPUpOpen,
    activePokemonForPPUp,
    isAbilityPillOpen,
    activePokemonForAbility,
    isFossilRevivalOpen,
    activeFossil,

    isInventoryOpen,
    isCosmeticsModalOpen,
    isPokedexOpen,
    isPvPBattleOpen: ref(false),
    isRankedMenuOpen: ref(false),
    currentPvPInvite: ref(null),

    // Confirmation
    openConfirm: (options) => getModalStore().open('Confirm', options),
    openPrompt: (options) => getModalStore().open('Prompt', options)
  }
})
