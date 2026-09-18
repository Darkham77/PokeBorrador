/**
 * src/components/battle/useDebugBattleActions.ts
 *
 * Composable providing debug combat operations, catch overrides,
 * and live sprite swap controls for DebugActionPanel.
 */

import { ref, computed, watch } from 'vue';
import { useBattleStore } from '@/stores/battle/battle.ts';
import { useGameStore } from '@/stores/game.ts';
import { useAudioStore } from '@/stores/audio.ts';
import {
  ALL_PDEX,
  deconstructPokemonId,
  resolveBaseNumber,
  executeVisualSwap,
  applyToggledCombatant
} from './debugActionPanelHelpers.ts';
import { executeDebugCaptureFlow } from './debugCaptureFlow.ts';

export function useDebugBattleActions() {
  const battleStore = useBattleStore();
  const gameStore = useGameStore();
  const audio = useAudioStore();

  const playerBaseId = ref('1');
  const playerVariant = ref('');
  const playerGender = ref('');

  const enemyBaseId = ref('1');
  const enemyVariant = ref('');
  const enemyGender = ref('');

  watch(() => battleStore.state?.player?.id, (newId) => {
    if (newId) {
      const { baseId, variant, gender } = deconstructPokemonId(newId);
      playerBaseId.value = baseId;
      playerVariant.value = variant;
      playerGender.value = gender;
    }
  }, { immediate: true });

  const activeEnemyId = computed(() => {
    const poke = battleStore.state?.enemy;
    return poke?.id || null;
  });

  watch(activeEnemyId, (newId) => {
    if (newId) {
      const { baseId, variant, gender } = deconstructPokemonId(newId);
      enemyBaseId.value = baseId;
      enemyVariant.value = variant;
      enemyGender.value = gender;
    }
  }, { immediate: true });

  const debugCapture = () => {
    if (!battleStore.state?.enemy) return;
    return executeDebugCaptureFlow({ battleStore, gameStore, audio, isCritical: false });
  };

  const debugCriticalCapture = () => {
    if (!battleStore.state?.enemy) return;
    return executeDebugCaptureFlow({ battleStore, gameStore, audio, isCritical: true });
  };

  const toggleBinoculars = () => {
    battleStore.debugBinoculars = !battleStore.debugBinoculars;
  };

  const toggleSearchMode = async () => {
    const { BATTLE_STATES } = await import('@/logic/battle/battleStateMachine.ts');
    const nextState = battleStore.isSearching ? BATTLE_STATES.INITIALIZING : BATTLE_STATES.SEARCH_PHASE;
    battleStore.fsm.transition(nextState);
  };

  const getSideSwapRef = (isPlayer: boolean) => {
    if (isPlayer) {
      return { baseId: playerBaseId.value, variant: playerVariant.value, gender: playerGender.value };
    }
    return { baseId: enemyBaseId.value, variant: enemyVariant.value, gender: enemyGender.value };
  };

  const updateVisualSwap = (side = 'enemy') => {
    const isPlayer = side === 'player';
    const { baseId, variant, gender } = getSideSwapRef(isPlayer);
    executeVisualSwap({
      battleStore,
      isPlayer,
      baseId,
      rawVariant: variant,
      gender,
      baseUrl: import.meta.env.BASE_URL || '/'
    });
  };

  const incrementSwap = (side = 'enemy') => {
    const baseIdRef = side === 'player' ? playerBaseId : enemyBaseId;
    const num = resolveBaseNumber(String(baseIdRef.value ?? '').trim(), ALL_PDEX);
    baseIdRef.value = String(num + 1);
    updateVisualSwap(side);
  };

  const decrementSwap = (side = 'enemy') => {
    const baseIdRef = side === 'player' ? playerBaseId : enemyBaseId;
    const num = resolveBaseNumber(String(baseIdRef.value ?? '').trim(), ALL_PDEX);
    baseIdRef.value = String(Math.max(1, num - 1));
    updateVisualSwap(side);
  };

  const toggleStatus = (side: string, type: string) => {
    applyToggledCombatant(battleStore, side === 'player', type);
  };

  return {
    battleStore,
    playerBaseId,
    playerVariant,
    playerGender,
    enemyBaseId,
    enemyVariant,
    enemyGender,
    debugCapture,
    debugCriticalCapture,
    toggleBinoculars,
    toggleSearchMode,
    updateVisualSwap,
    incrementSwap,
    decrementSwap,
    toggleStatus
  };
}
