
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { gsap } from 'gsap'
import { useModalStore } from './modals.ts'
import { useBattleStore } from './battle.ts'
import { useLoadingStore } from '@/stores/loading'
import { safeStorage } from '@/logic/utils/storage'
import type { Pokemon, Move } from '@/types/pokemon'

export interface UINotification {
  id: string | number;
  msg: string;
  icon: string;
}

export interface EvolutionData {
  pokemon: Pokemon;
  targetId: string;
  itemName: string;
}

export interface PokemonSelectionConfig {
  title?: string;
  subtitle?: string;
  multi?: boolean;
  maxSelect?: number;
  minSelect?: number;
  allowedIds?: string[] | null;
  excludeUids?: string[];
  callbackConfirm?: (selected: Pokemon[]) => void;
  [key: string]: unknown;
}

export interface LearnItem {
  pokemon: Pokemon;
  move: Move;
}

export const useUIStore = defineStore('ui', () => {
  const libraryTab = ref('gimnasios')
  const activeTab = ref('map')
  const hatchedPokemon = ref<Pokemon | null>(null)
  const _selectedBoxIndex = ref(-1)
  const isBoxMenuOpen = ref(false)
  const selectedBoxIndex = computed({
    get: () => _selectedBoxIndex.value,
    set: (val) => { _selectedBoxIndex.value = val }
  })
  const pokemonSelectionConfig = ref<PokemonSelectionConfig>({})
  
  // Notifications
  const notifications = ref<UINotification[]>([])
  
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

  // Low Power Mode
  const lowPowerMode = ref<'auto' | 'enabled' | 'disabled'>(
    (safeStorage.getItem('low-power-mode') as 'auto' | 'enabled' | 'disabled') || 'auto'
  )
  const isLowPowerActive = computed(() => {
    if (lowPowerMode.value === 'enabled') return true
    if (lowPowerMode.value === 'disabled') return false
    return windowWidth.value < 768
  })
  function setLowPowerMode(mode: 'auto' | 'enabled' | 'disabled') {
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
  const activePokemonForNature = ref<Pokemon | null>(null)
  const activePokemonForPPUp = ref<Pokemon | null>(null)
  const activePokemonForAbility = ref<Pokemon | null>(null)
  const activeFossil = ref<{ pokemon: Pokemon; itemName: string; sentTo: 'team' | 'box' } | null>(null)
  
  // Detalle data
  const selectedPokemon = ref<Pokemon | null>(null)
  const selectedMove = ref<string | null>(null)

  // Item Target context (for using items from Box Menu, etc)
  const inventoryTarget = ref<{ context: 'team' | 'box'; index: number } | null>(null) // { context: 'team' | 'box', index: number }

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

  function toggleInventory(context: 'team' | 'box' | null = null, index: number | null = null) {
    const modalStore = useModalStore()
    if (context !== null && index !== null) {
      inventoryTarget.value = { context, index }
    } else {
      inventoryTarget.value = null
    }

    if (modalStore.isOpen('Inventory')) modalStore.close('Inventory')
    else modalStore.open('Inventory')
  }

  function notify(msg: string, icon: string = '🔔') {
    const id = Temporal.Now.instant().epochMilliseconds + Math.random().toString(36).substr(2, 9)
    notifications.value.push({ id, msg, icon })
    gsap.delayedCall(4.0, () => {
      notifications.value = notifications.value.filter(n => n.id !== id)
    })
  }

  const isAnyFullscreenModalOpen = computed(() => {
    const modalStore = useModalStore()
    const battleStore = useBattleStore()
    
    // Check if battle is active and we are in mobile/fullscreen mode (<= 950px)
    const isBattleFullscreen = battleStore.isBattleActive && windowWidth.value <= 950
    const isStackFullscreen = modalStore.stack.some(m => (m.props.type === 'fullscreen' || m.props.maxHeight === '100dvh') && !m.closing)
    
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

    // Performance Mode triggers ONLY after opening animation finishes 
    // and drops IMMEDIATELY when closing starts to ensure smooth transitions.
    return obscuringModals.some(m => !m.opening && !m.closing)
  })
  
  const isAnyModalOpen = computed(() => {
    const modalStore = useModalStore()
    return modalStore.stack.length > 0 || isChatOpen.value || isHistoryOpen.value
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
  const isHatchModalOpen = createModalRef('HatchModal')
  const isCosmeticsModalOpen = createModalRef('Cosmetics')
  const isFactionChoiceOpen = createModalRef('FactionChoice')
  const isTeamManagementOpen = createModalRef('TeamManagement')

  return {
    isAnyModalOpen,
    isAnyBlockingModalOpen,
    windowWidth,
    lowPowerMode,
    isLowPowerActive,
    setLowPowerMode,
    hideMapPokemon,
    setHideMapPokemon,
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
    isTradeOpen,
    isSocialOpen,
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
    setZoom: (val: number) => {
      appZoom.value = val
      safeStorage.setItem('app-zoom', val.toString())
      document.documentElement.style.setProperty('--app-zoom', val.toString())
    },
    toggleTrade,
    toggleSocial,
    openClaims,
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
    
    setDebugPokedex: (mode: 'none' | 'seen' | 'caught' | null) => { debugPokedexMode.value = mode },
    
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
    isBattleSwitchForced,
    isWarPanelOpen,
    hasDismissedSessionLock,

    // Stacking
    activeModalStack,
    registerModal,
    unregisterModal,
    getModalDepth,

    // Confirmation
    openConfirm: (options: Record<string, unknown>) => useModalStore().open('Confirm', options),
    openPrompt: (options: Record<string, unknown>) => useModalStore().open('Prompt', options)
  }
})
