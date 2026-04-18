import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useEvolutionStore } from './evolution'

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
  const isShopOpen = ref(false)
  const isInventoryOpen = ref(false)
  const isPokedexOpen = ref(false)
  const isBoxMenuOpen = ref(false)
  const selectedBoxIndex = ref(-1)
  
  // Notifications
  const notifications = ref([])
  
  // Modales de Clase
  const isClassSelectionOpen = ref(false)
  const isClassMissionsOpen = ref(false)
  const isRepShopOpen = ref(false)

  // Modales de Combate (Full Vue)
  const isBattleInventoryOpen = ref(false)
  const isBattleSwitchOpen = ref(false)
  const isBattleSwitchForced = ref(false) // Para cuando un poke es debilitado
  const isPokemonCenterOpen = ref(false)
  
  // Relearner & Evolution
  const isMoveRelearnerOpen = ref(false)
  const activePokemonForRelearner = ref(null)
  
  const isEvolutionOpen = ref(false)
  const evolutionData = ref(null) // { pokemon, targetId, itemName }

  const isMoveLearningOpen = ref(false)
  const currentMoveToLearn = ref(null) // { pokemon, move }
  const learnQueue = ref([])

  // Specialized Modals
  const isNaturePatchOpen = ref(false)
  const activePokemonForNature = ref(null)
  
  const isPPUpOpen = ref(false)
  const activePokemonForPPUp = ref(null)

  const isAbilityPillOpen = ref(false)
  const activePokemonForAbility = ref(null)
  
  // Confirmation Dialog
  const confirmDialog = ref({
    open: false,
    title: 'Confirmar',
    message: '',
    confirmText: 'SÍ',
    cancelText: 'NO',
    onConfirm: null,
    onCancel: null
  })

  // Prompt Dialog
  const promptDialog = ref({
    open: false,
    title: 'Ingresar valor',
    message: '',
    value: '',
    type: 'text',
    onConfirm: null
  })



  
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
    const id = Date.now() + Math.random().toString(36).substr(2, 9)
    notifications.value.push({ id, msg, icon })
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      notifications.value = notifications.value.filter(n => n.id !== id)
    }, 4000)
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

  function startEvolution(pokemon, targetId, itemName) {
    evolutionData.value = { pokemon, targetId, itemName }
    isEvolutionOpen.value = true
    
    // Trigger the evolution store
    const evolutionStore = useEvolutionStore()
    evolutionStore.startEvolution(pokemon, targetId, () => {
      closeEvolution()
    })
  }

  function closeEvolution() {
    isEvolutionOpen.value = false
    evolutionData.value = null
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
    if (isMoveLearningOpen.value || learnQueue.value.length === 0) return
    currentMoveToLearn.value = learnQueue.value.shift()
    isMoveLearningOpen.value = true
  }

  function finishMoveLearning() {
    isMoveLearningOpen.value = false
    currentMoveToLearn.value = null
    checkLearnQueue()
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
    isShopOpen,
    profileData,
    toggleTrade,
    toggleSocial,
    updateProfile,
    notify,
    notifications,
    toggleProfile,
    toggleSettings,
    toggleHistory,
    toggleLibrary,
    closeAll,
    closeModal: () => {
      isPokemonCenterOpen.value = false
      isInventoryOpen.value = false
      isPokedexOpen.value = false
      isShopOpen.value = false
      isTradeOpen.value = false
      isSocialOpen.value = false
      isLibraryOpen.value = false
      isHistoryOpen.value = false
      isSettingsOpen.value = false
      isProfileOpen.value = false
      isBoxMenuOpen.value = false
    },
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
    closeEvolution,
    
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

    isInventoryOpen,
    isPokedexOpen,
    isPvPBattleOpen: ref(false),
    isRankedMenuOpen: ref(false),
    currentPvPInvite: ref(null),

    // Confirmation
    confirmDialog,
    openConfirm: (options) => {
      confirmDialog.value = {
        open: true,
        title: options.title || 'Confirmar',
        message: options.message || '¿Estás seguro?',
        confirmText: options.confirmText || 'SÍ',
        cancelText: options.cancelText || 'NO',
        onConfirm: options.onConfirm || null,
        onCancel: options.onCancel || null
      }
    },
    closeConfirm: (success = false) => {
      if (success && confirmDialog.value.onConfirm) confirmDialog.value.onConfirm()
      if (!success && confirmDialog.value.onCancel) confirmDialog.value.onCancel()
      confirmDialog.value.open = false
    },
    openPrompt: (options) => {
      promptDialog.value = {
        open: true,
        title: options.title || 'Ingresar valor',
        message: options.message || '',
        value: options.initialValue || '',
        type: options.type || 'text',
        onConfirm: options.onConfirm || null
      }
    },
    closePrompt: (success = false) => {
      if (success && promptDialog.value.onConfirm) promptDialog.value.onConfirm(promptDialog.value.value)
      promptDialog.value.open = false
    }
  }
})

