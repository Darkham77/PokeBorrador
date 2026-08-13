
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useModalStore } from '@/stores/modals.ts'
import { useBattleStore } from '@/stores/battle/battle.ts'
import { useLoadingStore } from '@/stores/loading'
import { safeStorage } from '@/logic/utils/storage'
import { useNotificationStore } from '@/stores/notifications.ts'
import type { Pokemon, Move, PokemonStorageLocation, PokedexStatus } from '@/types/pokemon/pokemon'
import { MODAL_METADATA } from '@/logic/modals/registry'
import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { SMALL_SCREEN_BREAKPOINT_PX, MOBILE_SCREEN_BREAKPOINT_PX } from '@/logic/constants/gameplay.ts'
import type { LowPowerModeSetting } from '@/types/system/game'


interface EvolutionData {
  pokemon: Pokemon;
  targetId: PokemonSpeciesId;
  itemName: string;
}



export interface LearnItem {
  pokemon: Pokemon;
  move: Move;
  onComplete?: () => void;
  onCancel?: () => void;
}

export const useUIStore = defineStore('ui', () => {
  const libraryTab = ref('gimnasios')
  const activeTab = ref('map')
  const notificationStore = useNotificationStore()
  
  // Notifications
  const notifications = computed(() => notificationStore.notifications)
  
  const isDebugPerformanceMode = ref(false)
  const isSimplifiedModalsMode = ref(false) // Forzado vía debug
  const isDebugGridMode = ref(false)
  const debugAnimationsEnabled = ref(true)
  const debugPokedexMode = ref<'none' | 'seen' | 'caught' | null>(null)

  // Screen width tracking for dynamic reactivity (resizing support)
  const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      windowWidth.value = window.innerWidth
    })
  }

  const isSmallScreen = computed(() => {
    return (windowWidth.value / appZoom.value) <= SMALL_SCREEN_BREAKPOINT_PX
  })

  // Low Power Mode
  const lowPowerMode = ref<LowPowerModeSetting>(
    (safeStorage.getItem('low-power-mode') as LowPowerModeSetting) || 'auto'
  )
  const isLowPowerActive = computed(() => {
    if (lowPowerMode.value === 'enabled') return true
    
    // Force low power mode during custom modals that obscure the background (e.g. HatchAnimation, Evolution)
    const modalStore = useModalStore()
    if (modalStore.stack.some(m => MODAL_METADATA[m.name]?.obscuresBackground)) return true
    
    if (isAnyBlockingModalOpen.value) return true // Force low power mode when a modal is open to pause background renders
    if (lowPowerMode.value === 'disabled') return false
    return windowWidth.value < MOBILE_SCREEN_BREAKPOINT_PX
  })
  function setLowPowerMode(mode: LowPowerModeSetting) {
    lowPowerMode.value = mode
    safeStorage.setItem('low-power-mode', mode)
  }
  
  // Hide Map Pokemon Mode
  const hideMapPokemon = ref<boolean>(
    safeStorage.getItem('hide-map-pokemon') === 'true'
  )
  function setHideMapPokemon(val: boolean) {
    hideMapPokemon.value = val
    safeStorage.setItem('hide-map-pokemon', val ? 'true' : 'false')
  }
  
  // Auto-battle Mode
  const autoBattle = ref<boolean>(
    safeStorage.getItem('auto-battle') === 'true'
  )
  function setAutoBattle(val: boolean) {
    autoBattle.value = val
    safeStorage.setItem('auto-battle', val ? 'true' : 'false')
  }
  
  // Team Management Debug Flags
  const pvpAutoFillDisabled = ref(false)
  const warAutoFillDisabled = ref(false)

  const isPerformanceMode = computed(() => isDebugPerformanceMode.value || isAnyBlockingModalOpen.value)

  const isBattleSwitchForced = ref(false) // Para cuando un poke es debilitado
  const isWarPanelOpen = ref(false)
  
  // Data for modals (still needed in the store if shared)
  const activePokemonForRelearner = ref<Pokemon | null>(null)
  const evolutionData = ref<EvolutionData | null>(null)
  const currentMoveToLearn = ref<LearnItem | null>(null)
  const learnQueue = ref<LearnItem[]>([])
  const activePokemonForNature = ref<{ context: PokemonStorageLocation; index: number } | null>(null)
  const ppUpTarget = ref<{ context: PokemonStorageLocation; index: number } | null>(null)
  const activeItemForPPUp = ref<string | null>(null)
  const activePokemonForAbility = ref<{ context: PokemonStorageLocation; index: number } | null>(null)
  
  // Detalle data
  const selectedPokemon = ref<Pokemon | null>(null)
  const selectedMove = ref<string | null>(null)

  // Item Target context (for using items from Box Menu, etc)
  const inventoryTarget = ref<{ context: PokemonStorageLocation; index: number } | null>(null)

  // Zoom initialization
  const getInitialZoom = () => {
    const saved = safeStorage.getItem('app-zoom')
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
  const openHudGroup = ref<string | null>(null) // Tracks which HUD menu group is open (e.g., 'POKEMON', 'MARKET')

  // ── MODAL TRIGGERS ─────────────────────────────────────────────────────────
  
  function toggleProfile() {
    const s = useModalStore(); if (s.isOpen('Profile')) s.close('Profile'); else s.open('Profile')
  }
  function toggleSettings() {
    const s = useModalStore(); if (s.isOpen('Settings')) s.close('Settings'); else s.open('Settings')
  }
  const toggleHistory = () => { isHistoryOpen.value = !isHistoryOpen.value }
  function toggleSocial() {
    const s = useModalStore(); if (s.isOpen('SocialCenter')) s.close('SocialCenter'); else s.open('SocialCenter')
  }
  const openClaims = () => useModalStore().open('SocialCenter', { initialTab: 'claims' })
  function toggleLibrary(tabId = null) {
    const s = useModalStore(); if (s.isOpen('Library')) s.close('Library'); else s.open('Library', { initialTab: tabId })
  }
  const open = (name: string, props: Record<string, unknown> = {}) => useModalStore().open(name, props)
  const close = (name: string) => useModalStore().close(name)
  function closeAll() {
    useModalStore().closeAll()
    isHistoryOpen.value = false
    isChatOpen.value = false
    openHudGroup.value = null
    activeModalStack.value = []
  }

  // ── MODAL STACKING SYSTEM (Z-INDEX) ────────────────────────────────────────
  const activeModalStack = ref<string[]>([])
  function registerModal(modalId: string) {
    if (!activeModalStack.value.includes(modalId)) activeModalStack.value.push(modalId)
  }
  const unregisterModal = (modalId: string) => { activeModalStack.value = activeModalStack.value.filter(id => id !== modalId) }
  const getModalDepth = (modalId: string) => activeModalStack.value.indexOf(modalId)

  function toggleHudGroup(name: string | null) {
    openHudGroup.value = openHudGroup.value === name ? null : name
  }

  const hasDismissedSessionLock = ref(false)

  function toggleInventory(context: PokemonStorageLocation | null = null, index: number | null = null) {
    const modalStore = useModalStore()
    if (context !== null && index !== null) {
      inventoryTarget.value = { context, index }
    } else {
      inventoryTarget.value = null
    }

    if (modalStore.isOpen('Inventory')) modalStore.close('Inventory')
    else modalStore.open('Inventory')
  }

  const notify = notificationStore.notify

  const isAnyFullscreenModalOpen = computed(() => {
    const modalStore = useModalStore()
    const battleStore = useBattleStore()
    
    // Check if battle is active and we are in mobile/fullscreen mode (<= 950px)
    const isBattleFullscreen = battleStore.isBattleActive && isSmallScreen.value
    const isStackFullscreen = modalStore.stack.some(m => 
      MODAL_METADATA[m.name]?.isFullscreen || 
      ((m.props.type === 'fullscreen' || m.props.maxHeight === '100dvh') && !m.closing)
    )
    
    return isBattleFullscreen || isStackFullscreen
  })

  const isLoading = ref(false)
  function setLoading(val: boolean, msg: string = 'Procesando...', sub: string = 'Por favor espera', icon = '⏳') { 
    isLoading.value = val 
    const loadingStore = useLoadingStore()
    if (val) loadingStore.start('ui_generic', msg, sub, true, icon)
    else loadingStore.finish('ui_generic')
  }

  function toggleTrade() { useModalStore().open('SocialCenter') }

  function openPokemonDetail(pokemon: Pokemon, index: number, context: string = 'team', extra: unknown = null) {
    selectedPokemon.value = pokemon
    useModalStore().open('PokemonDetail', { pokemon, index, context, extra })
  }

  function closePokemonDetail() { useModalStore().close('PokemonDetail') }

  function openMoveDetail(moveName: string) {
    selectedMove.value = moveName
    useModalStore().open('MoveDetail', { moveName })
  }

  function closeMoveDetail() { useModalStore().close('MoveDetail') }

  function startEvolution(pokemon: Pokemon, targetId: string, itemName: string) {
    const targetSpeciesId = requirePokemonSpeciesId(targetId)
    evolutionData.value = { pokemon, targetId: targetSpeciesId, itemName }
    useModalStore().open('Evolution')
    
    // Dynamic import to break circular dependency: ui -> evolution -> game -> ui
    import('@/stores/evolution').then(m => {
      const evolutionStore = m.useEvolutionStore()
      evolutionStore.startEvolution(pokemon, targetSpeciesId, itemName, () => {
        useModalStore().close('Evolution')
      })
    })
  }

  function addToLearnQueue(items: LearnItem | LearnItem[]) {
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
    currentMoveToLearn.value = learnQueue.value.shift() || null
    modalStore.open('MoveLearning')
  }

  function finishMoveLearning() {
    useModalStore().close('MoveLearning')
    currentMoveToLearn.value = null
    checkLearnQueue()
  }


  /**
   * Returns true if there is any active modal that obscures the background.
   */
  const isAnyBlockingModalOpen = computed(() => {
    const modalStore = useModalStore()
    const battleStore = useBattleStore()
    const obscuringModals = modalStore.stack.filter(m => {
      if (m.name === 'Profile') return false
      if (m.props?.overlay === 'none') return false
      return true
    })
    
    const isBattleObscuring = battleStore.isBattleActive

    if (obscuringModals.length === 0 && !isBattleObscuring) return false

    // Performance Mode triggers ONLY after opening animation finishes 
    // and drops IMMEDIATELY when closing starts to ensure smooth transitions.
    return obscuringModals.some(m => !m.opening && !m.closing)
  })
  


  // ── DYNAMIC FLAGS FOR BACKWARD COMPATIBILITY (WRITABLE) ───────────────────
  const createModalRef = (name: string) => computed({
    get: () => useModalStore().isOpen(name),
    set: (val) => {
      if (val) useModalStore().open(name)
      else useModalStore().close(name)
    }
  })

  const isProfileOpen = createModalRef('Profile')
  const isSettingsOpen = createModalRef('Settings')
  const isLibraryOpen = createModalRef('Library')
  const isWarShopOpen = createModalRef('WarShop')
  const isEvolutionOpen = createModalRef('Evolution')
  const isMoveLearningOpen = createModalRef('MoveLearning')
  const isMoveRelearnerOpen = createModalRef('MoveRelearner')
  const isNaturePatchOpen = createModalRef('NaturePatch')
  const isPPUpOpen = createModalRef('PPUp')
  const isAbilityPillOpen = createModalRef('AbilityPill')
  const isCosmeticsModalOpen = createModalRef('Cosmetics')

  return {
    isAnyBlockingModalOpen,
    windowWidth,
    isSmallScreen,
    lowPowerMode,
    isLowPowerActive,
    setLowPowerMode,
    hideMapPokemon,
    setHideMapPokemon,
    autoBattle,
    setAutoBattle,
    isAnyFullscreenModalOpen,
    isPerformanceMode,
    isDebugPerformanceMode,
    isSimplifiedModalsMode,
    isDebugGridMode,
    debugAnimationsEnabled,
    debugPokedexMode,
    isProfileOpen,
    isSettingsOpen,
    isHistoryOpen,
    isLibraryOpen,
    isChatOpen,
    libraryTab,

    selectedPokemon,
    activeTab,
    isWarShopOpen,
    appZoom,
    setZoom: (val: number) => {
      appZoom.value = val
      safeStorage.setItem('app-zoom', val.toString())
      document.documentElement.style.setProperty('--app-zoom', val.toString())
    },
    // fallow-ignore-next-line unused-store-member
    toggleTrade,
    // fallow-ignore-next-line unused-store-member
    toggleSocial,
    // fallow-ignore-next-line unused-store-member
    openClaims,
    notify,
    notifications,
    // fallow-ignore-next-line unused-store-member
    isLoading,
    setLoading,
    toggleProfile,
    toggleSettings,
    // fallow-ignore-next-line unused-store-member
    toggleHistory,
    toggleLibrary,
    toggleHudGroup,
    openHudGroup,
    closeAll,
    open,
    close,
    closeModal: () => useModalStore().closeTop(),
    openPokemonDetail,
    // fallow-ignore-next-line unused-store-member
    closePokemonDetail,
    openMoveDetail,
    // fallow-ignore-next-line unused-store-member
    closeMoveDetail,
    
    toggleTeamManagement: () => {
      const modalStore = useModalStore()
      if (modalStore.isOpen('TeamManagement')) modalStore.close('TeamManagement')
      else modalStore.open('TeamManagement')
    },
    
    // fallow-ignore-next-line unused-store-member
    setDebugPokedex: (mode: PokedexStatus | null) => { debugPokedexMode.value = mode },
    
    pvpAutoFillDisabled,
    warAutoFillDisabled,
    
    // Relearner
    isMoveRelearnerOpen,
    activePokemonForRelearner,
    
    // Evolution
    isEvolutionOpen,
    // fallow-ignore-next-line unused-store-member
    evolutionData,
    startEvolution,
    
    // Move Learning
    // fallow-ignore-next-line unused-store-member
    isMoveLearningOpen,
    currentMoveToLearn,
    learnQueue,
    addToLearnQueue,
    finishMoveLearning,

    isNaturePatchOpen,
    activePokemonForNature,
    isPPUpOpen,
    activePokemonForPPUp: ppUpTarget,
    activeItemForPPUp,
    isAbilityPillOpen,
    activePokemonForAbility,

    toggleInventory,
    inventoryTarget,
    isCosmeticsModalOpen,
    // fallow-ignore-next-line unused-store-member
    isPvPBattleOpen: ref(false),
    // fallow-ignore-next-line unused-store-member
    isRankedMenuOpen: ref(false),
    // fallow-ignore-next-line unused-store-member
    currentPvPInvite: ref(null),
    isBattleSwitchForced,
    // fallow-ignore-next-line unused-store-member
    isWarPanelOpen,
    hasDismissedSessionLock,

    // Stacking
    // fallow-ignore-next-line unused-store-member
    activeModalStack,
    registerModal,
    unregisterModal,
    getModalDepth,

    // Confirmation
    openConfirm: (options: Record<string, unknown>) => useModalStore().open('Confirm', options),
    openPrompt: (options: Record<string, unknown>) => useModalStore().open('Prompt', options)
  }
})
