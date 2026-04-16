import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle'
import { useMapStore } from '@/stores/map'

// Bridges
import { initGameStateBridge } from './bridges/stateProxy'
import { initBaseBridge } from './bridges/baseBridge'
import { initBattleBridge } from './bridges/battleBridge'
import { initEconomyBridge } from './bridges/economyBridge'
import { initBreedingBridge } from './bridges/breedingBridge'
import { initUIBridge } from './bridges/uiBridge'
import { initEvolutionBridge } from './bridges/evolutionBridge'
import { initSocialBridge } from './bridges/socialBridge'
import { initClassBridge } from './bridges/classBridge'
import { initAudioBridge } from './bridges/audioBridge'

import { generateEncounter } from '@/logic/encounters';
import { showFishingIntro, startFishingMinigame } from '@/logic/encounterUI';

/**
 * Initializes all modular bridges to connect legacy logic with Vue stores.
 */
function initLegacyBindings() {
  const gameStore = useGameStore()
  const authStore = useAuthStore()
  const uiStore = useUIStore()
  const battleStore = useBattleStore()
  const mapStore = useMapStore()

  if (typeof window === 'undefined') return

  // 1. Core Stores accessibility
  window.gameStore = gameStore
  window.authStore = authStore
  window.uiStore = uiStore
  window.battleStore = battleStore
  window.mapStore = mapStore

  // 2. Fragmented Bridge Initialization
  initBaseBridge()
  initBattleBridge()
  initEconomyBridge()
  initBreedingBridge()
  initUIBridge()
  initEvolutionBridge()
  initSocialBridge()
  initClassBridge()
  initAudioBridge()

  // 3. Coordination & Global Sync Helpers
  window.triggerVueSync = () => {
    if (window.state) gameStore.syncFromLegacy(window.state)
    if (window.state?.battle) battleStore.syncFromLegacy(window.state.battle)
    if (window.state) mapStore.syncFromLegacy(window.state)
  }

  // UI Placeholder Syncs (Notifying Vue of State Changes)
  window.renderBox = () => window.triggerVueSync()
  window.renderBag = () => window.triggerVueSync()
  window.renderPokedex = () => window.triggerVueSync()
  window.renderMaps = () => {
    mapStore.syncFromLegacy(window.state)
    window.triggerVueSync()
  }

  // 4. Critical Logic Wrappers (Go Location)
  window.goLocation = async function(locId) {
    if (window.isGoingLocation) return;
    window.isGoingLocation = true;
    setTimeout(() => { window.isGoingLocation = false; }, 1000);

    const state = window.state;
    if (!state) return;

    const alive = state.team.filter(p => (p.hp || 0) > 0 && !p.onMission);
    if (alive.length === 0) {
      if (window.notify) window.notify('¡Todos tus Pokémon están debilitados! ❤️‍🩹', '❤️‍🩹');
      return;
    }

    if (typeof window.hatchEggs === 'function') window.hatchEggs();

    const result = await generateEncounter(locId, state, {
      activeEvents: window._activeEvents || [],
    });

    if (!result) return;

    if (result.type === 'trainer') {
      if (typeof window.generateTrainerBattle === 'function') window.generateTrainerBattle(locId);
    } else if (result.type === 'fishing') {
      showFishingIntro(result.pokemon, result.rarity, () => {
        startFishingMinigame(result.pokemon, result.rarity, 
          () => { if (window.startBattle) window.startBattle(result.pokemon, false, null, locId); },
          () => { if (window.notify) window.notify('¡El Pokémon se escapó! 🌊', '🌊'); }
        );
      });
    } else {
      if (window.startBattle) window.startBattle(result.pokemon, false, null, locId);
    }
  };

  window.initZoom()
  console.log('[StateBridge] Legacy modular bridges initialized successfully.')
}

export { initGameStateBridge, initLegacyBindings }
