/**
 * src/components/battle/useDebugBattleActions.ts
 *
 * Composable providing debug combat operations, catch overrides,
 * and live sprite swap controls for DebugActionPanel.
 */

import { ref, computed, watch } from 'vue';
import { gsapSleep } from '@/logic/utils/gsapHelpers';
import { useBattleStore } from '@/stores/battle/battle';
import { useGameStore } from '@/stores/game';
import { useAudioStore } from '@/stores/audio';
import { getItemName } from '@/data/inventory/items';
import {
  PDEX_ORDER,
  GEN2_PDEX_ORDER,
  isPokemonSpeciesId,
  type PokemonSpeciesId
} from '@/data/pokemon/pokedex';
import { gameBus } from '@/logic/events/gameBus';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { hasAnimatedSpriteId } from '@/data/pokemon/animatedSpriteDatabase';
import { requireFeetPoints } from '@/data/pokemon/pokemonFeetDatabase';
import { deconstructPokemonId, constructPokemonId } from './debugActionPanelHelpers.ts';

const ALL_PDEX: readonly PokemonSpeciesId[] = [...PDEX_ORDER, ...GEN2_PDEX_ORDER];
const DEBUG_CATCH_FALLBACK_SLEEP_MS = 1000;
const DEBUG_CATCH_SHAKE_COUNT = 3;
const DEBUG_CATCH_CELEBRATION_SLEEP_MS = 1500;
const DEBUG_CATCH_FADEOUT_SLEEP_MS = 2000;
const DEBUG_CRITICAL_CAPTURE_FX_SLEEP_MS = 800;
const PARSE_INT_DECIMAL_RADIX = 10;

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

  const debugCapture = async () => {
    if (!battleStore.state?.enemy || battleStore.isProcessing) return;

    battleStore.isProcessing = true;
    const e = battleStore.state.enemy;
    const ballId = 'ultraball';
    const itemName = getItemName(ballId);

    battleStore.addLog(`DEBUG: Lanzando ${itemName} (100% Efectividad)...`, 'log-catch', itemName);

    const anims = battleStore.animations;

    // 1. Ball hit
    audio.play('ballHit');
    if (anims?.handleCatchRequest) {
      await anims.handleCatchRequest({ side: 'enemy', ballId });
    } else {
      gameBus.emit('PLAY_CATCH_ENERGY', { side: 'enemy', ballId });
      await gsapSleep(DEBUG_CATCH_FALLBACK_SLEEP_MS);
    }

    // 2. Shakes
    for (let i = 0; i < DEBUG_CATCH_SHAKE_COUNT; i++) {
      audio.play('wobble');
      if (anims?.handleShakeRequest) {
        await anims.handleShakeRequest({ side: 'enemy' });
      } else {
        gameBus.emit('CATCH_SHAKE', { side: 'enemy' });
        await gsapSleep(DEBUG_CATCH_FALLBACK_SLEEP_MS);
      }
    }

    // 3. Success
    audio.play('caught');
    battleStore.addLog(`¡Ya está! ¡${e.name} atrapado!`, 'log-catch', e);

    battleStore.state.isCapture = true;
    gameStore.addPokemon(e, { notify: true });

    // Fase de Festejo (Phase 3 de la captura)
    if (anims?.playCatchCelebration) {
      await anims.playCatchCelebration('enemy');
    } else {
      await gsapSleep(DEBUG_CATCH_CELEBRATION_SLEEP_MS);
    }

    // Fase de Desvanecimiento (Phase 4 de la captura)
    if (anims?.playBallFadeOut) {
      await anims.playBallFadeOut('enemy');
    } else {
      await gsapSleep(DEBUG_CATCH_FADEOUT_SLEEP_MS);
    }

    await battleStore.endBattle(true, false);
    battleStore.isProcessing = false;
  };

  const debugCriticalCapture = async () => {
    if (!battleStore.state?.enemy || battleStore.isProcessing) return;

    battleStore.isProcessing = true;
    const e = battleStore.state.enemy;
    const ballId = 'ultraball';
    const itemName = getItemName(ballId);

    battleStore.addLog(`DEBUG: Lanzando ${itemName} (¡CAPTURA CRÍTICA FORZADA!)...`, 'log-catch', itemName);

    const anims = battleStore.animations;

    // 1. Critical whistle and ball hit
    audio.play('criticalThrow');
    audio.play('ballHit');
    if (anims?.handleCatchRequest) {
      await anims.handleCatchRequest({ side: 'enemy', ballId, isCritical: true });
    } else {
      gameBus.emit('PLAY_CATCH_ENERGY', { side: 'enemy', ballId, isCritical: true });
      await gsapSleep(DEBUG_CATCH_FALLBACK_SLEEP_MS);
    }

    // 2. Critical Capture Banner FX & Sparks
    if (anims?.triggerCriticalCaptureFx) {
      await anims.triggerCriticalCaptureFx('enemy');
    } else {
      gameBus.emit('CRITICAL_CAPTURE_FX', { side: 'enemy' });
      await gsapSleep(DEBUG_CRITICAL_CAPTURE_FX_SLEEP_MS);
    }

    // 3. Exactly 1 Shake (Critical Capture resolution)
    audio.play('wobble');
    if (anims?.handleShakeRequest) {
      await anims.handleShakeRequest({ side: 'enemy' });
    } else {
      gameBus.emit('CATCH_SHAKE', { side: 'enemy' });
      await gsapSleep(DEBUG_CATCH_FALLBACK_SLEEP_MS);
    }

    // 4. Success celebration
    audio.play('caught');
    battleStore.addLog(`¡Ya está! ¡${e.name} atrapado con captura crítica!`, 'log-catch', e);

    battleStore.state.isCapture = true;
    gameStore.addPokemon(e, { notify: true });

    if (anims?.playCatchCelebration) {
      await anims.playCatchCelebration('enemy');
    } else {
      await gsapSleep(DEBUG_CATCH_CELEBRATION_SLEEP_MS);
    }

    if (anims?.playBallFadeOut) {
      await anims.playBallFadeOut('enemy');
    } else {
      await gsapSleep(DEBUG_CATCH_FADEOUT_SLEEP_MS);
    }

    await battleStore.endBattle(true, false);
    battleStore.isProcessing = false;
  };

  const toggleBinoculars = () => {
    battleStore.debugBinoculars = !battleStore.debugBinoculars;
  };

  const toggleSearchMode = async () => {
    const { BATTLE_STATES } = await import('@/logic/battle/battleStateMachine');
    if (battleStore.isSearching) {
      battleStore.fsm.transition(BATTLE_STATES.INITIALIZING);
    } else {
      battleStore.fsm.transition(BATTLE_STATES.SEARCH_PHASE);
    }
  };

  const updateVisualSwap = (side = 'enemy') => {
    const baseIdVal = side === 'player' ? playerBaseId.value : enemyBaseId.value;
    const rawVariantVal = side === 'player' ? playerVariant.value : enemyVariant.value;
    const genderVal = side === 'player' ? playerGender.value : enemyGender.value;

    let targetBase = String(baseIdVal ?? '').trim().toLowerCase();
    if (!/^\d+$/.test(targetBase)) {
      const idx = isPokemonSpeciesId(targetBase) ? ALL_PDEX.indexOf(targetBase) : -1;
      if (idx !== -1) {
        targetBase = String(idx + 1);
      }
    }

    const cleanVar = String(rawVariantVal ?? '').trim().toLowerCase();
    const variantVal = (cleanVar === '0' || cleanVar === '') ? '' : cleanVar;

    const targetId = constructPokemonId(targetBase, variantVal, genderVal);

    const isFemale = genderVal.toLowerCase() === 'f';
    const isBack = side === 'player';
    const candIdle = `${targetBase}i${variantVal ? '_' + variantVal : ''}`;
    const candSimple = `${targetBase}${variantVal ? '_' + variantVal : ''}`;

    let animatedKey = '';
    if (isBack) {
      if (isFemale && hasAnimatedSpriteId(`${candIdle}_f_back`)) {
        animatedKey = `${candIdle}_f_back`;
      } else if (hasAnimatedSpriteId(`${candIdle}_back`)) {
        animatedKey = `${candIdle}_back`;
      } else if (isFemale && hasAnimatedSpriteId(`${candSimple}_f_back`)) {
        animatedKey = `${candSimple}_f_back`;
      } else if (hasAnimatedSpriteId(`${candSimple}_back`)) {
        animatedKey = `${candSimple}_back`;
      }
    } else {
      if (isFemale && hasAnimatedSpriteId(`${candIdle}_f`)) {
        animatedKey = `${candIdle}_f`;
      } else if (hasAnimatedSpriteId(candIdle)) {
        animatedKey = candIdle;
      } else if (isFemale && hasAnimatedSpriteId(`${candSimple}_f`)) {
        animatedKey = `${candSimple}_f`;
      } else if (hasAnimatedSpriteId(candSimple)) {
        animatedKey = candSimple;
      }
    }

    if (!animatedKey) {
      const targetUrl = getAssetUrl(ASSET_TYPES.POKEMON, targetId, {
        isShiny: side === 'player' ? Boolean(battleStore.state?.player?.isShiny) : Boolean(battleStore.state?.enemy?.isShiny),
        isBack,
        isAnimated: false
      });

      let dbKey = targetUrl;
      const baseUrl = import.meta.env.BASE_URL || '/';
      if (baseUrl !== '/' && targetUrl.startsWith(baseUrl)) {
        dbKey = targetUrl.slice(baseUrl.length - 1);
      }
      try {
        dbKey = decodeURIComponent(dbKey);
      } catch (e) {
        throw new Error(`[DebugActionPanel] Error al decodificar dbKey '${dbKey}': ${String(e)}`, { cause: e });
      }

      requireFeetPoints(dbKey);
    }

    if (side === 'player' && battleStore.state?.player) {
      battleStore.state.player.id = targetId;
      battleStore.state.player = { ...battleStore.state.player };
    } else if (battleStore.state?.enemy) {
      battleStore.state.enemy.id = targetId;
      battleStore.state.enemy = { ...battleStore.state.enemy };
    }
  };

  const incrementSwap = (side = 'enemy') => {
    const baseIdRef = side === 'player' ? playerBaseId : enemyBaseId;
    const current = String(baseIdRef.value ?? '').trim();

    let num = parseInt(current, PARSE_INT_DECIMAL_RADIX);
    if (isNaN(num)) {
      const speciesId = current.toLowerCase();
      const idx = isPokemonSpeciesId(speciesId) ? ALL_PDEX.indexOf(speciesId) : -1;
      num = idx !== -1 ? idx + 1 : 1;
    }

    baseIdRef.value = String(num + 1);
    updateVisualSwap(side);
  };

  const decrementSwap = (side = 'enemy') => {
    const baseIdRef = side === 'player' ? playerBaseId : enemyBaseId;
    const current = String(baseIdRef.value ?? '').trim();

    let num = parseInt(current, PARSE_INT_DECIMAL_RADIX);
    if (isNaN(num)) {
      const speciesId = current.toLowerCase();
      const idx = isPokemonSpeciesId(speciesId) ? ALL_PDEX.indexOf(speciesId) : -1;
      num = idx !== -1 ? idx + 1 : 1;
    }

    baseIdRef.value = String(Math.max(1, num - 1));
    updateVisualSwap(side);
  };

  const toggleStatus = (side: string, type: string) => {
    if (side === 'player') {
      const p = battleStore.state?.player;
      if (!p) return;
      if (type === 'shiny') p.isShiny = !p.isShiny;
      if (type === 'guardian') p.isGuardian = !p.isGuardian;
      if (battleStore.state) {
        battleStore.state.player = { ...p };
      }
    } else {
      const poke = battleStore.state?.enemy;
      if (!poke) return;
      if (type === 'shiny') poke.isShiny = !poke.isShiny;
      if (type === 'guardian') poke.isGuardian = !poke.isGuardian;

      if (battleStore.state) {
        battleStore.state.enemy = { ...poke };
      }
    }
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
