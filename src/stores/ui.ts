import { defineStore } from 'pinia';
import { ref, computed, type WritableComputedRef } from 'vue';

import type { PokemonMoveId } from '@/data/battle/moves';
import type { ItemId } from '@/data/inventory/items';
import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';
import {
  SMALL_SCREEN_BREAKPOINT_PX,
  MOBILE_SCREEN_BREAKPOINT_PX,
  DEFAULT_WINDOW_WIDTH_PX
} from '@/logic/constants/gameplay.ts';
import { gameBus } from '@/logic/events/gameBus.ts';
import { MODAL_METADATA } from '@/logic/modals/metadata.ts';
import { safeStorage } from '@/logic/utils/storage';
import { useLoadingStore } from '@/stores/loading';
import { useModalStore } from '@/stores/modals.ts';
import { useNotificationStore } from '@/stores/notifications.ts';
import type { Pokemon, Move, PokemonStorageLocation } from '@/types/pokemon/pokemon';
import type { LowPowerModeSetting } from '@/types/system/game';

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
  const libraryTab = ref('gimnasios');
  const activeTab = ref('home');
  const notificationStore = useNotificationStore();

  // Notifications
  const notifications = computed(() => notificationStore.notifications);

  const isDebugFastMode = ref(false);
  function toggleDebugFastMode(): void {
    isDebugFastMode.value = !isDebugFastMode.value;
  }
  const isSimplifiedModalsMode = ref(false); // Forzado vía debug
  const isDebugGridMode = ref(false);
  const debugAnimationsEnabled = ref(true);
  const debugPokedexMode = ref<'none' | 'seen' | 'caught' | null>(null);

  // Screen width tracking for dynamic reactivity (resizing support)
  const windowWidth = ref(
    typeof globalThis.window !== 'undefined' ? globalThis.innerWidth : DEFAULT_WINDOW_WIDTH_PX
  );
  if (typeof globalThis.window !== 'undefined') {
    globalThis.addEventListener('resize', () => {
      windowWidth.value = globalThis.innerWidth;
    });
  }

  const isSmallScreen = computed(() => {
    return windowWidth.value / appZoom.value <= SMALL_SCREEN_BREAKPOINT_PX;
  });

  // Low Power Mode
  const lowPowerMode = ref<LowPowerModeSetting>(
    (safeStorage.getItem('low-power-mode') as LowPowerModeSetting) || 'auto'
  );
  const isLowPowerActive = computed(() => {
    if (lowPowerMode.value === 'enabled') return true;

    // Force low power mode during custom modals that obscure the background (e.g. HatchAnimation, Evolution)
    const modalStore = useModalStore();
    if (modalStore.stack.some((m) => MODAL_METADATA[m.name]?.obscuresBackground)) return true;

    if (isAnyBlockingModalOpen.value) return true; // Force low power mode when a modal is open to pause background renders
    if (lowPowerMode.value === 'disabled') return false;
    return windowWidth.value < MOBILE_SCREEN_BREAKPOINT_PX;
  });
  function setLowPowerMode(mode: LowPowerModeSetting): void {
    lowPowerMode.value = mode;
    safeStorage.setItem('low-power-mode', mode);
  }

  // Hide Map Pokemon Mode
  const hideMapPokemon = ref<boolean>(safeStorage.getItem('hide-map-pokemon') === 'true');
  function setHideMapPokemon(val: boolean): void {
    hideMapPokemon.value = val;
    safeStorage.setItem('hide-map-pokemon', val ? 'true' : 'false');
  }

  // Auto-battle Mode
  const autoBattle = ref<boolean>(safeStorage.getItem('auto-battle') === 'true');
  function setAutoBattle(val: boolean): void {
    autoBattle.value = val;
    safeStorage.setItem('auto-battle', val ? 'true' : 'false');
  }

  // Team Management Debug Flags
  const pvpAutoFillDisabled = ref(false);
  const warAutoFillDisabled = ref(false);

  const isFastMode = computed(() => isDebugFastMode.value || isAnyBlockingModalOpen.value);

  const isBattleSwitchForced = ref(false); // Para cuando un poke es debilitado
  const isBattleActive = ref(false);
  function setBattleActive(val: boolean): void {
    isBattleActive.value = val;
  }

  // Data for modals (still needed in the store if shared)
  const activePokemonForRelearner = ref<Pokemon | null>(null);
  const evolutionData = ref<EvolutionData | null>(null);
  const currentMoveToLearn = ref<LearnItem | null>(null);
  const learnQueue = ref<LearnItem[]>([]);
  const activePokemonForNature = ref<{ context: PokemonStorageLocation; index: number } | null>(
    null
  );
  const ppUpTarget = ref<{ context: PokemonStorageLocation; index: number } | null>(null);
  const activeItemForPPUp = ref<ItemId | null>(null);
  const activePokemonForAbility = ref<{ context: PokemonStorageLocation; index: number } | null>(
    null
  );

  // Detalle data
  const selectedPokemon = ref<Pokemon | null>(null);
  const selectedMove = ref<string | null>(null);

  // Item Target context (for using items from Box Menu, etc)
  const inventoryTarget = ref<{ context: PokemonStorageLocation; index: number } | null>(null);

  // Zoom initialization
  const getInitialZoom = (): number => {
    const saved = safeStorage.getItem('app-zoom');
    if (saved) {
      const val = parseFloat(saved);
      if (!isNaN(val) && val > 0) return val;
    }
    return 1.0; // 100% default
  };
  const appZoom = ref(getInitialZoom());

  // Static flags for non-modal elements
  const isChatOpen = ref(false);
  const isHistoryOpen = ref(false);
  const openHudGroup = ref<string | null>(null); // Tracks which HUD menu group is open (e.g., 'POKEMON', 'MARKET')

  // ── MODAL TRIGGERS ─────────────────────────────────────────────────────────

  function toggleProfile(): void {
    const s = useModalStore();
    if (s.isOpen('Profile')) s.close('Profile');
    else s.open('Profile');
  }
  function toggleSettings(): void {
    const s = useModalStore();
    if (s.isOpen('Settings')) s.close('Settings');
    else s.open('Settings');
  }
  function toggleLibrary(tabId = null): void {
    const s = useModalStore();
    if (s.isOpen('Library')) s.close('Library');
    else s.open('Library', { initialTab: tabId });
  }
  const open = (name: string, props: Record<string, unknown> = {}): void => {
    useModalStore().open(name, props);
  };
  const close = (name: string): void => {
    useModalStore().close(name);
  };
  function closeAll(): void {
    useModalStore().closeAll();
    isHistoryOpen.value = false;
    isChatOpen.value = false;
    openHudGroup.value = null;
    activeModalStack.value = [];
  }

  // ── MODAL STACKING SYSTEM (Z-INDEX) ────────────────────────────────────────
  const activeModalStack = ref<string[]>([]);
  function registerModal(modalId: string): void {
    if (!activeModalStack.value.includes(modalId)) activeModalStack.value.push(modalId);
  }
  const unregisterModal = (modalId: string): void => {
    activeModalStack.value = activeModalStack.value.filter((id) => id !== modalId);
  };
  const getModalDepth = (modalId: string): number => activeModalStack.value.indexOf(modalId);

  function toggleHudGroup(name: string | null): void {
    openHudGroup.value = openHudGroup.value === name ? null : name;
  }

  const hasDismissedSessionLock = ref(false);

  function toggleInventory(
    context: PokemonStorageLocation | null = null,
    index: number | null = null
  ): void {
    const modalStore = useModalStore();
    if (context !== null && index !== null) {
      inventoryTarget.value = { context, index };
    } else {
      inventoryTarget.value = null;
    }

    if (modalStore.isOpen('Inventory')) modalStore.close('Inventory');
    else modalStore.open('Inventory');
  }

  const notify = notificationStore.notify;

  const isAnyFullscreenModalOpen = computed(() => {
    const modalStore = useModalStore();

    // Check if battle is active and we are in mobile/fullscreen mode (<= 950px)
    const isBattleFullscreen = isBattleActive.value && isSmallScreen.value;
    const isStackFullscreen = modalStore.stack.some(
      (m) =>
        MODAL_METADATA[m.name]?.isFullscreen ||
        ((m.props.type === 'fullscreen' || m.props.maxHeight === '100dvh') && !m.closing)
    );

    return isBattleFullscreen || isStackFullscreen;
  });

  const isLoading = ref(false);
  function setLoading(
    val: boolean,
    msg: string = 'Procesando...',
    sub: string = 'Por favor espera',
    icon = '⏳'
  ): void {
    isLoading.value = val;
    const loadingStore = useLoadingStore();
    if (val) loadingStore.start('ui_generic', msg, sub, true, icon);
    else loadingStore.finish('ui_generic');
  }

  function openPokemonDetail(
    pokemon: Pokemon,
    index: number,
    context: string = 'team',
    extra: unknown = null
  ): void {
    selectedPokemon.value = pokemon;
    useModalStore().open('PokemonDetail', { pokemon, index, context, extra });
  }

  function openMoveDetail(moveId: PokemonMoveId): void {
    selectedMove.value = moveId;
    useModalStore().open('MoveDetail', { moveId });
  }

  const handleEvolutionFinished = (): void => {
    useModalStore().close('Evolution');
  };
  gameBus.on('EVOLUTION_FINISHED', handleEvolutionFinished);

  function startEvolution(pokemon: Pokemon, targetId: PokemonSpeciesId, itemName: string): void {
    const targetSpeciesId = requirePokemonSpeciesId(targetId);
    evolutionData.value = { pokemon, targetId: targetSpeciesId, itemName };
    useModalStore().open('Evolution');
    gameBus.emit('START_EVOLUTION_FLOW', { pokemon, targetSpeciesId, itemName });
  }

  function addToLearnQueue(items: LearnItem | LearnItem[]): void {
    if (Array.isArray(items)) {
      learnQueue.value.push(...items);
    } else {
      learnQueue.value.push(items);
    }
    checkLearnQueue();
  }

  function checkLearnQueue(): void {
    const modalStore = useModalStore();
    if (modalStore.isOpen('MoveLearning') || learnQueue.value.length === 0) return;
    currentMoveToLearn.value = learnQueue.value.shift() || null;
    modalStore.open('MoveLearning');
  }

  function finishMoveLearning(): void {
    useModalStore().close('MoveLearning');
    currentMoveToLearn.value = null;
    checkLearnQueue();
  }

  /**
   * Returns true if there is any active modal that obscures the background.
   * Fast mode activates IMMEDIATELY upon opening any obscuring modal
   * and deactivates only when closing begins.
   */
  const isAnyBlockingModalOpen = computed(() => {
    const modalStore = useModalStore();
    const obscuringModals = modalStore.stack.filter((m) => {
      if (m.name === 'Profile') return false;
      if (m.props?.overlay === 'none') return false;
      return true;
    });

    return obscuringModals.some((m) => !m.closing);
  });

  // ── DYNAMIC FLAGS FOR BACKWARD COMPATIBILITY (WRITABLE) ───────────────────
  const createModalRef = (name: string): WritableComputedRef<boolean> =>
    computed({
      get: () => useModalStore().isOpen(name),
      set: (val) => {
        if (val) useModalStore().open(name);
        else useModalStore().close(name);
      }
    });

  const isNaturePatchOpen = createModalRef('NaturePatch');
  const isPPUpOpen = createModalRef('PPUp');
  const isAbilityPillOpen = createModalRef('AbilityPill');

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
    isFastMode,
    isDebugFastMode,
    isDebugPerformanceMode: computed(() => isDebugFastMode.value),
    isPerformanceMode: computed(() => isFastMode.value),
    toggleDebugFastMode,
    isSimplifiedModalsMode,
    isDebugGridMode,
    debugAnimationsEnabled,
    debugPokedexMode,
    isHistoryOpen,
    isChatOpen,
    libraryTab,

    selectedPokemon,
    activeTab,
    appZoom,
    setZoom: (val: number) => {
      appZoom.value = val;
      safeStorage.setItem('app-zoom', val.toString());
      document.documentElement.style.setProperty('--app-zoom', val.toString());
    },
    notify,
    notifications,
    setLoading,
    toggleProfile,
    toggleSettings,
    toggleLibrary,
    toggleHudGroup,
    openHudGroup,
    closeAll,
    open,
    close,
    closeModal: () => useModalStore().closeTop(),
    openPokemonDetail,
    openMoveDetail,

    toggleTeamManagement: (initialTab?: unknown) => {
      const modalStore = useModalStore();
      if (modalStore.isOpen('TeamManagement')) {
        modalStore.close('TeamManagement');
      } else {
        const tab = typeof initialTab === 'string' ? initialTab : undefined;
        modalStore.open('TeamManagement', tab ? { initialTab: tab } : {});
      }
    },

    pvpAutoFillDisabled,
    warAutoFillDisabled,

    // Relearner
    activePokemonForRelearner,

    // Evolution
    evolutionData,
    startEvolution,

    // Move Learning
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
    isBattleSwitchForced,
    isBattleActive,
    setBattleActive,
    hasDismissedSessionLock,

    // Stacking
    registerModal,
    unregisterModal,
    getModalDepth,

    // Confirmation
    openConfirm: (options: Record<string, unknown>) => useModalStore().open('Confirm', options),
    openPrompt: (options: Record<string, unknown>) => useModalStore().open('Prompt', options)
  };
});
