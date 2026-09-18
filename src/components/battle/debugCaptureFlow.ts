/**
 * src/components/battle/debugCaptureFlow.ts
 *
 * Debug capture animation and state resolution pipeline.
 */

import { gsapSleep } from '@/logic/utils/gsapHelpers.ts';
import { getItemName, type ItemId } from '@/data/inventory/items.ts';
import { gameBus } from '@/logic/events/gameBus.ts';
import type { useBattleStore } from '@/stores/battle/battle.ts';
import type { useGameStore } from '@/stores/game.ts';
import type { useAudioStore } from '@/stores/audio.ts';

const DEBUG_CATCH_FALLBACK_SLEEP_MS = 1000;
const DEBUG_CATCH_SHAKE_COUNT = 3;
const DEBUG_CATCH_CELEBRATION_SLEEP_MS = 1500;
const DEBUG_CATCH_FADEOUT_SLEEP_MS = 2000;
const DEBUG_CRITICAL_CAPTURE_FX_SLEEP_MS = 800;

export interface DebugCaptureOptions {
  battleStore: ReturnType<typeof useBattleStore>;
  gameStore: ReturnType<typeof useGameStore>;
  audio: ReturnType<typeof useAudioStore>;
  isCritical?: boolean;
}

async function playThrowAndHit(
  audio: ReturnType<typeof useAudioStore>,
  anims: ReturnType<typeof useBattleStore>['animations'],
  ballId: ItemId,
  isCritical: boolean
): Promise<void> {
  if (isCritical) {
    audio.play('criticalThrow');
  }
  audio.play('ballHit');

  if (anims?.handleCatchRequest) {
    await anims.handleCatchRequest({ side: 'enemy', ballId, isCritical });
  } else {
    gameBus.emit('PLAY_CATCH_ENERGY', { side: 'enemy', ballId, isCritical });
    await gsapSleep(DEBUG_CATCH_FALLBACK_SLEEP_MS);
  }
}

async function playCriticalBannerFx(
  anims: ReturnType<typeof useBattleStore>['animations']
): Promise<void> {
  if (anims?.triggerCriticalCaptureFx) {
    await anims.triggerCriticalCaptureFx('enemy');
  } else {
    gameBus.emit('CRITICAL_CAPTURE_FX', { side: 'enemy' });
    await gsapSleep(DEBUG_CRITICAL_CAPTURE_FX_SLEEP_MS);
  }
}

async function playShakes(
  audio: ReturnType<typeof useAudioStore>,
  anims: ReturnType<typeof useBattleStore>['animations'],
  shakeCount: number
): Promise<void> {
  for (let i = 0; i < shakeCount; i++) {
    audio.play('wobble');
    if (anims?.handleShakeRequest) {
      await anims.handleShakeRequest({ side: 'enemy' });
    } else {
      gameBus.emit('CATCH_SHAKE', { side: 'enemy' });
      await gsapSleep(DEBUG_CATCH_FALLBACK_SLEEP_MS);
    }
  }
}

async function playCelebrationAndFade(
  anims: ReturnType<typeof useBattleStore>['animations']
): Promise<void> {
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
}

export async function executeDebugCaptureFlow(options: DebugCaptureOptions): Promise<void> {
  const { battleStore, gameStore, audio, isCritical = false } = options;
  if (!battleStore.state?.enemy || battleStore.isProcessing) return;

  battleStore.isProcessing = true;
  const enemy = battleStore.state.enemy;
  const ballId: ItemId = 'ultraball';
  const itemName = getItemName(ballId);

  const logMessage = isCritical
    ? `DEBUG: Lanzando ${itemName} (¡CAPTURA CRÍTICA FORZADA!)...`
    : `DEBUG: Lanzando ${itemName} (100% Efectividad)...`;
  battleStore.addLog(logMessage, 'log-catch', itemName);

  const anims = battleStore.animations;

  await playThrowAndHit(audio, anims, ballId, isCritical);

  if (isCritical) {
    await playCriticalBannerFx(anims);
  }

  const shakeCount = isCritical ? 1 : DEBUG_CATCH_SHAKE_COUNT;
  await playShakes(audio, anims, shakeCount);

  audio.play('caught');
  const successMessage = isCritical
    ? `¡Ya está! ¡${enemy.name} atrapado con captura crítica!`
    : `¡Ya está! ¡${enemy.name} atrapado!`;
  battleStore.addLog(successMessage, 'log-catch', enemy);

  battleStore.state.isCapture = true;
  gameStore.addPokemon(enemy, { notify: true });

  await playCelebrationAndFade(anims);

  await battleStore.endBattle(true, false);
  battleStore.isProcessing = false;
}
