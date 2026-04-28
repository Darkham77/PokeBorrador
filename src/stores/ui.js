import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useModalStore } from './modals'
import { useBattleStore } from './battle'
import { useLoadingStore } from '@/stores/loading'

export const useUIStore = defineStore('ui', () => {
  const libraryTab = ref('gimnasios')
  const activeTab = ref('map')
  const hatchedPokemon = ref(null)
  const _selectedBoxIndex = ref(-1)
  const isBoxMenuOpen = ref(false)
  const selectedBoxIndex = computed({
    get: () => _selectedBoxIndex.value,
    set: (val) => { _selectedBoxIndex.value = val }
  })
  const pokemonSelectionConfig = ref({})
  
  // Notifications
  const notifications = ref([])
  
  const isDebugPerformanceMode = ref(false)
  const isSimplifiedModalsMode = ref(false) // Forzado vía debug
  const isDebugGridMode = ref(false)
  const debugPokedexMode = ref(null) // 'none' | 'seen' | 'caught' | null (real)
  
  // Team Management Debug Flags
  const pvpAutoFillDisabled = ref(false)
  const warAutoFillDisabled = ref(false)

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

  // Item Target context (for using items from Box Menu, etc)
  const inventoryTarget = ref(null) // { context: 'team' | 'box', index: number }

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
  
  // Static flags for non-modal elements
  const isChatOpen = ref(false)
  const isHistoryOpen = ref(false)
  const openHudGroup = ref(null) // Tracks which HUD menu group is open (e.g., 'POKEMON', 'MARKET')

  // ── MODAL TRIGGERS ─────────────────────────────────────────────────────────
  
  function toggleProfile() { 
    const modalStore = useModalStore()
    if (modalStore.isOpen('Profile')) modalStore.close('Profile')
    else modalStore.open('Profile')
  }
  
  function toggleSettings() { 
    const modalStore = useModalStore()
    if (modalStore.isOpen('Settings')) modalStore.close('Settings')
    else modalStore.open('Settings')
  }

  function toggleHistory() { isHistoryOpen.value = !isHistoryOpen.value }
  
  function toggleSocial() { 
    const modalStore = useModalStore()
    if (modalStore.isOpen('SocialCenter')) modalStore.close('SocialCenter')
    else modalStore.open('SocialCenter')
  }

  function toggleLibrary(tabId = null) { 
    const modalStore = useModalStore()
    if (modalStore.isOpen('Library')) modalStore.close('Library')
    else modalStore.open('Library', { initialTab: tabId })
  }
  
  function open(name, props = {}) {
    useModalStore().open(name, props)
  }

  function close(name) {
    useModalStore().close(name)
  }

  function closeAll() {
    useModalStore().closeAll()
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

  function toggleInventory(context = null, index = null) {
    const modalStore = useModalStore()
    if (context !== null && index !== null) {
      inventoryTarget.value = { context, index }
    } else {
      inventoryTarget.value = null
    }

    if (modalStore.isOpen('Inventory')) modalStore.close('Inventory')
    else modalStore.open('Inventory')
  }

  function notify(msg, icon = '🔔') {
    const id = Date.now() + Math.random().toString(36).substr(2, 9)
    notifications.value.push({ id, msg, icon })
    setTimeout(() => {
      notifications.value = notifications.value.filter(n => n.id !== id)
    }, 4000)
  }

  const isAnyFullscreenModalOpen = computed(() => {
    const modalStore = useModalStore()
    const battleStore = useBattleStore()
    
    // Check if battle is active and we are in mobile/fullscreen mode (<= 950px)
    const isBattleFullscreen = battleStore.isBattleActive && window.innerWidth <= 950
    const isStackFullscreen = modalStore.stack.some(m => (m.props.type === 'fullscreen' || m.props.maxHeight === '100vh') && !m.closing)
    
    return isBattleFullscreen || isStackFullscreen
  })

  const isLoading = ref(false)
  function setLoading(val, msg = 'Procesando...', sub = 'Por favor espera') { 
    isLoading.value = val 
    const loadingStore = useLoadingStore()
    if (val) loadingStore.start('ui_generic', msg, sub, true)
    else loadingStore.finish('ui_generic')
  }

  function toggleTrade() { useModalStore().open('SocialCenter') }

  function openPokemonDetail(pokemon, index, context = 'team', extra = null) {
    selectedPokemon.value = pokemon
    useModalStore().open('PokemonDetail', { pokemon, index, context, extra })
  }

  function closePokemonDetail() { useModalStore().close('PokemonDetail') }

  function openMoveDetail(moveName) {
    selectedMove.value = moveName
    useModalStore().open('MoveDetail', { moveName })
  }

  function closeMoveDetail() { useModalStore().close('MoveDetail') }

  function startEvolution(pokemon, targetId, itemName) {
    evolutionData.value = { pokemon, targetId, itemName }
    useModalStore().open('Evolution')
    
    // Dynamic import to break circular dependency: ui -> evolution -> game -> ui
    import('@/stores/evolution').then(m => {
      const evolutionStore = m.useEvolutionStore()
      evolutionStore.startEvolution(pokemon, targetId, () => {
        useModalStore().close('Evolution')
      })
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
    const modalStore = useModalStore()
    if (modalStore.isOpen('MoveLearning') || learnQueue.value.length === 0) return
    currentMoveToLearn.value = learnQueue.value.shift()
    modalStore.open('MoveLearning')
  }

  function finishMoveLearning() {
    useModalStore().close('MoveLearning')
    currentMoveToLearn.value = null
    checkLearnQueue()
  }


  /**
   * List of modals that do NOT obscure the background (e.g., side panels).
   * These will NOT trigger "Simplified/Performance Mode" for the map.
   */
  const NON_OBSCURING_MODALS = ['Profile']

  /**
   * Returns true if there is any active modal that obscures the background.
   */
  const isAnyBlockingModalOpen = computed(() => {
    const modalStore = useModalStore()
    const battleStore = useBattleStore()
    const obscuringModals = modalStore.stack.filter(m => {
      if (NON_OBSCURING_MODALS.includes(m.name)) return false
      if (m.props?.overlay === 'none') return false
      return true
    })
    
    const isBattleObscuring = battleStore.isBattleActive

    if (obscuringModals.length === 0 && !isBattleObscuring) return false

    // Performance Mode triggers immediately when an obscuring modal is added.
    return obscuringModals.some(m => !m.closing)
  })
  
  const isAnyModalOpen = computed(() => {
    const modalStore = useModalStore()
    return modalStore.stack.length > 0 || isChatOpen.value || isHistoryOpen.value
  })

  // ── DYNAMIC FLAGS FOR BACKWARD COMPATIBILITY (WRITABLE) ───────────────────
  const createModalRef = (name) => computed({
    get: () => useModalStore().isOpen(name),
    set: (val) => {
      if (val) useModalStore().open(name)
      else useModalStore().close(name)
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
  const isTeamManagementOpen = createModalRef('TeamManagement')

  return {
    isAnyModalOpen,
    isAnyBlockingModalOpen,
    isAnyFullscreenModalOpen,
    isDebugPerformanceMode,
    isSimplifiedModalsMode,
    isDebugGridMode,
    debugPokedexMode,
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
    isBoxMenuOpen,
    selectedBoxIndex,
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
    toggleTrade,
    toggleSocial,
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
    closeModal: () => useModalStore().closeTop(),
    openPokemonDetail,
    closePokemonDetail,
    openMoveDetail,
    closeMoveDetail,
    
    toggleTeamManagement: () => {
      const modalStore = useModalStore()
      if (modalStore.isOpen('TeamManagement')) modalStore.close('TeamManagement')
      else modalStore.open('TeamManagement')
    },
    
    setDebugPokedex: (mode) => { debugPokedexMode.value = mode },
    
    pvpAutoFillDisabled,
    warAutoFillDisabled,

    isTeamManagementOpen,
    
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
    toggleInventory,
    inventoryTarget,
    isCosmeticsModalOpen,
    isPokedexOpen,
    isPvPBattleOpen: ref(false),
    isRankedMenuOpen: ref(false),
    currentPvPInvite: ref(null),

    // Confirmation
    openConfirm: (options) => useModalStore().open('Confirm', options),
    openPrompt: (options) => useModalStore().open('Prompt', options)
  }
})
