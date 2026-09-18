import { watch } from 'vue'
import { logger } from '@/logic/utils/logger'
import { gsapSleep } from '@/logic/utils/gsapHelpers'
import { gameBus } from '@/logic/events/gameBus'
import { useAudioStore } from '@/stores/audio'
import type { BattleContext } from '@/types/battle/battleContext'
import { requirePokemonStatus, requireVolatileStatusKey, type Pokemon } from '@/types/pokemon/pokemon'
import type { BattleStages, BattleSide } from '@/types/battle/battle'
import type { MoveCategory } from '@/data/battle/moves'
import { requireBattleConditionKey, type BattleConditionKey } from '@/types/battle/battle'
import { requireWeatherId } from '@/logic/weather/weatherRegistry'
import { requireDayPhase } from '@/logic/utils/timeUtils.ts'
import { requireItemId } from '@/data/inventory/items'
import { canExecuteScriptedReplayAction } from './helpers/scriptedReplayReadiness.ts'
import { isBattleCompletionReady } from './helpers/battleCompletionReadiness.ts'
import { requiresAction } from './helpers/requestHelper.ts'
import { projectBattleReadySwitchSlots } from './helpers/battleReadySwitchSlots.ts'
import { BATTLE_UI_EVENTS, isBattleReadyForInputDetail, type BattleReadyForInputDetail } from '@/types/battle/battleEvents.ts'
import { CANONICAL_TERRAINS, type CanonicalTerrain } from '@/logic/constants/gameplay'

export { canExecuteScriptedReplayAction } from './helpers/scriptedReplayReadiness.ts'

const DEBUG_INDEFINITE_WEATHER_TURNS = 99;
const MAX_BATTLE_READY_TIMEOUT_MS = 5000;
const DEBUG_CATCH_AUDIO_DELAY_MS = 300;
const DEBUG_CATCH_RELEASE_DELAY_MS = 1500;
const DEBUG_CATCH_ENERGY_FALLBACK_MS = 800;
const DEBUG_CRITICAL_CAPTURE_FX_FALLBACK_MS = 800;
const DEBUG_SHAKE_INITIAL_DELAY_MS = 300;
const DEBUG_SHAKE_FALLBACK_MS = 600;
const DEBUG_CATCH_CELEBRATION_FALLBACK_MS = 1200;
const DEBUG_TURNS_FOUR = 4;
const DEBUG_TURNS_THREE = 3;
const DEBUG_SUBSTITUTE_HP = 25;
const DEBUG_STATUS_ACTIVE_FLAG = 1;
const DEBUG_STATUS_INACTIVE_FLAG = 0;

interface ScriptedReplayReadinessDetail extends BattleReadyForInputDetail {
  isReady: boolean
}

async function executeCatchThrowStep(
  anims: BattleContext['animations'],
  audio: ReturnType<typeof useAudioStore>,
  side: string,
  ballId: ReturnType<typeof requireItemId>,
  isCritical: boolean,
): Promise<void> {
  if (isCritical) {
    audio.play('criticalThrow');
  }
  audio.play('ballHit');

  if (anims?.handleCatchRequest) {
    await anims.handleCatchRequest({ side, ballId, isCritical });
  } else {
    gameBus.emit('PLAY_CATCH_ENERGY', { side, ballId, isCritical });
    await gsapSleep(DEBUG_CATCH_ENERGY_FALLBACK_MS);
  }

  if (isCritical) {
    if (anims?.triggerCriticalCaptureFx) {
      await anims.triggerCriticalCaptureFx(side);
    } else {
      gameBus.emit('CRITICAL_CAPTURE_FX', { side });
      await gsapSleep(DEBUG_CRITICAL_CAPTURE_FX_FALLBACK_MS);
    }
  }
}

async function executeCatchShakesStep(
  anims: BattleContext['animations'],
  audio: ReturnType<typeof useAudioStore>,
  side: string,
  shakes: number,
): Promise<void> {
  for (let i = 0; i < shakes; i++) {
    await gsapSleep(DEBUG_SHAKE_INITIAL_DELAY_MS);
    audio.play('wobble');
    if (anims?.handleShakeRequest) {
      await anims.handleShakeRequest({ side, isCapture: true });
    } else {
      gameBus.emit('CATCH_SHAKE', { side });
      await gsapSleep(DEBUG_SHAKE_FALLBACK_MS);
    }
  }
}

async function executeCatchCelebrationStep(
  anims: BattleContext['animations'],
  audio: ReturnType<typeof useAudioStore>,
  side: string,
): Promise<void> {
  await gsapSleep(DEBUG_CATCH_AUDIO_DELAY_MS);
  audio.play('caught');
  if (anims?.playCatchCelebration) {
    await anims.playCatchCelebration(side);
  } else {
    gameBus.emit('CATCH_SUCCESS', { side });
    await gsapSleep(DEBUG_CATCH_CELEBRATION_FALLBACK_MS);
  }

  await gsapSleep(DEBUG_CATCH_RELEASE_DELAY_MS);
  if (anims?.handleReleaseRequest) {
    await anims.handleReleaseRequest({ side });
  } else {
    gameBus.emit('PLAY_RELEASE_ENERGY', { side });
  }
}

const DEBUG_EVENT_MAP: Readonly<Record<string, string>> = {
  release: 'PLAY_RELEASE_ENERGY',
  catch: 'PLAY_CATCH_ENERGY',
  critical_capture_fx: 'CRITICAL_CAPTURE_FX',
  shake: 'CATCH_SHAKE',
  shake_damage: 'PLAY_DAMAGE',
  recoil_rebound: 'PLAY_RECOIL',
  blink: 'PLAY_BLINK',
  heal: 'PLAY_HEAL',
  success: 'CATCH_SUCCESS',
  faint: 'POKEMON_FAINT',
  emergence: 'START_BATTLE',
  reveal: 'START_BATTLE',
  encounter: 'ENCOUNTER_ANIM',
  bush_wiggle: 'WIGGLE_BUSH',
};

function handleAttackDebugAnim(ctx: BattleContext, side: string, options: Record<string, unknown>): void {
  if (options.cat === 'recoil') {
    gameBus.emit('PLAY_RECOIL', { side });
    return;
  }
  if (ctx.attackerSide && ctx.activeMove) {
    ctx.attackerSide.value = side as BattleSide;
    ctx.activeMove.value = {
      name: options.cat === 'selfKO' ? 'Autodestrucción' : 'Ataque Debug', // spanish-ok: UI Spanish text localization label
      cat: options.cat === 'selfKO' ? 'special' : ((options.cat as MoveCategory | undefined) || 'physical'),
      pp: 5,
      maxPP: 5,
    };
  }
  gameBus.emit('PLAY_ATTACK_ANIM', { side, cat: options.cat || 'physical' });
}

const SCREEN_OR_HAZARD_EFFECTS = [
  'reflect',
  'lightscreen',
  'safeguard',
  'mist',
  'spikes',
  'stealthrock',
  'toxicspikes',
] as const;
type ScreenOrHazardEffect = (typeof SCREEN_OR_HAZARD_EFFECTS)[number];

function toggleScreenOrHazardEffect(
  ctx: BattleContext,
  side: string,
  key: string,
  val: number,
): void {
  const stagesRef = side === 'player' ? ctx.playerStages : ctx.enemyStages;
  const active = ctx.activeBattle.value;
  const stageKey = key === 'lightscreen' ? 'lightScreen' : key;
  const current = (stagesRef.value as Record<string, number>)[stageKey] || 0; // open-record: Generic key-value data dictionary container
  const newVal = current > 0 ? 0 : val;
  stagesRef.value = {
    ...stagesRef.value,
    [stageKey]: newVal,
  };
  if (active) {
    if (side === 'player') {
      const sideConds: Partial<Record<BattleConditionKey, { turns: number }>> = { ...(active.playerSideConditions || {}) };
      if (newVal > 0) sideConds[key as BattleConditionKey] = { turns: newVal };
      else delete sideConds[key as BattleConditionKey];
      active.playerSideConditions = sideConds;
    } else {
      const sideConds: Partial<Record<BattleConditionKey, { turns: number }>> = { ...(active.enemySideConditions || {}) };
      if (newVal > 0) sideConds[key as BattleConditionKey] = { turns: newVal };
      else delete sideConds[key as BattleConditionKey];
      active.enemySideConditions = sideConds;
    }
    ctx.activeBattle.value = { ...active };
  }
}

function toggleTerrainOrFieldEffect(
  ctx: BattleContext,
  key: string,
  val: number,
): void {
  const active = ctx.activeBattle.value;
  if (!active) return;
  const updatedConditions: Record<string, { turns: number }> = { ...(active.fieldConditions || {}) }; // open-record: Generic key-value data dictionary container
  let newTerrain: string | null = active.terrain ?? null;
  const isTerrain = CANONICAL_TERRAINS.includes(key as CanonicalTerrain);

  if (updatedConditions[key]) {
    delete updatedConditions[key];
    if (isTerrain && newTerrain === key) {
      newTerrain = null;
    }
  } else {
    if (isTerrain) {
      CANONICAL_TERRAINS.forEach(t => {
        delete updatedConditions[t];
      });
      newTerrain = key;
    }
    updatedConditions[key] = { turns: val };
  }
  active.fieldConditions = updatedConditions;
  active.terrain = newTerrain;
  ctx.activeBattle.value = { ...active, fieldConditions: updatedConditions, terrain: newTerrain };
}

function checkCompletedOrInitialReadiness(
  ctx: BattleContext,
  win: Window,
): ScriptedReplayReadinessDetail | null {
  const active = ctx.activeBattle.value;
  if (isBattleCompletionReady({
    hasActiveBattle: active !== null,
    isOver: active?.over === true,
    fsmState: ctx.fsm.currentState.value,
    fsmSubState: ctx.fsm.currentSubState.value,
  })) {
    return { subState: '', p1ChoiceIdx: win.__VITE_DEBUG__?.p1ChoiceIdx ?? 0, p2ChoiceIdx: win.__VITE_DEBUG__?.p2ChoiceIdx ?? 0, over: true, playerSwitchSlots: [], isReady: true };
  }
  if (!active) {
    return { subState: ctx.fsm.currentSubState.value ?? '', p1ChoiceIdx: 0, p2ChoiceIdx: 0, over: false, playerSwitchSlots: [], isReady: false };
  }
  if (active.over) {
    return { subState: '', p1ChoiceIdx: win.__VITE_DEBUG__?.p1ChoiceIdx ?? 0, p2ChoiceIdx: win.__VITE_DEBUG__?.p2ChoiceIdx ?? 0, over: true, playerSwitchSlots: projectBattleReadySwitchSlots(active.playerRequest), isReady: true };
  }
  return null;
}

export function setupBattleDebug(ctx: BattleContext) {
  if (typeof window === 'undefined') return;

  const win = window;
  win.__VITE_DEBUG__ = win.__VITE_DEBUG__ || {};

  const getBattleStore = (): DebugStore | null => {
    return window.__VITE_DEBUG_STORE_RESOLVER__ ? window.__VITE_DEBUG_STORE_RESOLVER__() : null;
  };

  const runFullCatchDebug = async (side = 'enemy', isCritical = false) => {
    const audio = useAudioStore();
    const anims = ctx.animations;
    const ballId = requireItemId('pokeball');

    await executeCatchThrowStep(anims, audio, side, ballId, isCritical);
    const shakes = isCritical ? 1 : 3;
    await executeCatchShakesStep(anims, audio, side, shakes);
    await executeCatchCelebrationStep(anims, audio, side);
  };

  win.__VITE_DEBUG__.triggerAnim = (type: string, side = 'enemy', options: Record<string, unknown> = {}) => {
    if (type === 'full_catch_normal') {
      void runFullCatchDebug(side, false);
      return;
    }
    if (type === 'full_catch_critical') {
      void runFullCatchDebug(side, true);
      return;
    }
    if (type === 'attack') {
      handleAttackDebugAnim(ctx, side, options);
      return;
    }
    const event = DEBUG_EVENT_MAP[type] || type;
    gameBus.emit(event, { side, ...options });
  };

  win.__VITE_DEBUG__.playSound = (id: string) => {
    useAudioStore().play(id);
  };

  win.__VITE_DEBUG__.setStatus = async (side: string, status: string) => {
    const target = side === 'player' ? ctx.activeBattle.value?.player : ctx.activeBattle.value?.enemy;
    if (!target) return;

    const resolvedStatus = (status === 'null' || status === 'clear') ? '' : requirePokemonStatus(status);
    target.status = resolvedStatus;
    if (side === 'player') {
      const teamTarget = ctx.gs.state.team.find(pokemon => pokemon?.uid === target.uid);
      if (!teamTarget) {
        throw new Error(`[battleDebug] Active player ${target.uid} is missing from the game team`);
      }
      teamTarget.status = resolvedStatus;
    }
    const { applyDebugStatusInWorker } = await import('./showdownWorkerClient.ts');
    await applyDebugStatusInWorker(side === 'player' ? 'p1' : 'p2', target.uid, resolvedStatus);
  };

  type SecondaryDebugPredicate = (t: Pokemon & Record<string, unknown>, vc: Record<string, number>) => boolean;

  const SECONDARY_DEBUG_PREDICATES: Record<string, SecondaryDebugPredicate> = {
    confusion: (t, vc) => (Number(t.confused) || 0) > 0 || (vc.confusion || 0) > 0,
    taunt: (t, vc) => (Number(t.tauntTurns) || 0) > 0 || (vc.taunt || 0) > 0,
    substitute: (t, vc) => (Number(t.substitute) || 0) > 0 || (vc.substitute || 0) > 0,
    disable: (t, vc) => (Number(t.disabledTurns) || 0) > 0 || (vc.disable || 0) > 0,
    encore: (t, vc) => (Number(t.encoreTurns) || 0) > 0 || (vc.encore || 0) > 0,
    perishsong: (t, vc) => (Number(t.perishSongCount) || 0) > 0 || (vc.perishsong || 0) > 0,
    bound: (t, vc) => (Number(t.bound) || 0) > 0 || (vc.bound || 0) > 0,
    attract: (t, vc) => Boolean(t.attracted) || (vc.attract || 0) > 0,
    curse: (t, vc) => Boolean(t.cursed) || (vc.curse || 0) > 0,
    leechseed: (t, vc) => Boolean(t.seeded) || (vc.leechseed || 0) > 0,
    trapped: (t, vc) => Boolean(t.trapped) || (vc.trapped || 0) > 0,
    ingrain: (t, vc) => Boolean(t.ingrain) || (vc.ingrain || 0) > 0,
    protect: (t, vc) => Boolean(t.protect) || (vc.protect || 0) > 0,
    endure: (t, vc) => Boolean(t.endure) || (vc.endure || 0) > 0,
    focusenergy: (t, vc) => Boolean(t.focusEnergy) || (vc.focusenergy || 0) > 0,
    lockon: (t, vc) => Boolean(t.lockOn) || (vc.lockon || 0) > 0
  };

  type SecondaryDebugApplier = (t: Pokemon & Record<string, unknown>, vc: Record<string, number>, activating: boolean) => void;

  const SECONDARY_DEBUG_APPLIERS: Record<string, SecondaryDebugApplier> = {
    confusion: (t, vc, act) => {
      t.confused = act ? DEBUG_TURNS_FOUR : DEBUG_STATUS_INACTIVE_FLAG;
      vc.confusion = act ? DEBUG_TURNS_FOUR : DEBUG_STATUS_INACTIVE_FLAG;
    },
    taunt: (t, vc, act) => {
      t.tauntTurns = act ? DEBUG_TURNS_THREE : DEBUG_STATUS_INACTIVE_FLAG;
      vc.taunt = act ? DEBUG_TURNS_THREE : DEBUG_STATUS_INACTIVE_FLAG;
    },
    substitute: (t, vc, act) => {
      t.substitute = act ? DEBUG_SUBSTITUTE_HP : DEBUG_STATUS_INACTIVE_FLAG;
      vc.substitute = act ? DEBUG_SUBSTITUTE_HP : DEBUG_STATUS_INACTIVE_FLAG;
    },
    disable: (t, vc, act) => {
      t.disabledTurns = act ? DEBUG_TURNS_FOUR : DEBUG_STATUS_INACTIVE_FLAG;
      vc.disable = act ? DEBUG_TURNS_FOUR : DEBUG_STATUS_INACTIVE_FLAG;
    },
    encore: (t, vc, act) => {
      t.encoreTurns = act ? DEBUG_TURNS_THREE : DEBUG_STATUS_INACTIVE_FLAG;
      vc.encore = act ? DEBUG_TURNS_THREE : DEBUG_STATUS_INACTIVE_FLAG;
    },
    perishsong: (t, vc, act) => {
      t.perishSongCount = act ? DEBUG_TURNS_THREE : DEBUG_STATUS_INACTIVE_FLAG;
      vc.perishsong = act ? DEBUG_TURNS_THREE : DEBUG_STATUS_INACTIVE_FLAG;
    },
    bound: (t, vc, act) => {
      const val = act ? DEBUG_TURNS_FOUR : DEBUG_STATUS_INACTIVE_FLAG;
      t.bound = val;
      vc.bound = val;
      vc.partiallytrapped = val;
    },
    attract: (t, vc, act) => {
      t.attracted = act;
      vc.attract = act ? DEBUG_STATUS_ACTIVE_FLAG : DEBUG_STATUS_INACTIVE_FLAG;
    },
    curse: (t, vc, act) => {
      t.cursed = act;
      vc.curse = act ? DEBUG_STATUS_ACTIVE_FLAG : DEBUG_STATUS_INACTIVE_FLAG;
    },
    leechseed: (t, vc, act) => {
      t.seeded = act;
      vc.leechseed = act ? DEBUG_STATUS_ACTIVE_FLAG : DEBUG_STATUS_INACTIVE_FLAG;
    },
    trapped: (t, vc, act) => {
      t.trapped = act;
      vc.trapped = act ? DEBUG_STATUS_ACTIVE_FLAG : DEBUG_STATUS_INACTIVE_FLAG;
    },
    ingrain: (t, vc, act) => {
      t.ingrain = act;
      vc.ingrain = act ? DEBUG_STATUS_ACTIVE_FLAG : DEBUG_STATUS_INACTIVE_FLAG;
    },
    protect: (t, vc, act) => {
      t.protect = act;
      vc.protect = act ? DEBUG_STATUS_ACTIVE_FLAG : DEBUG_STATUS_INACTIVE_FLAG;
    },
    endure: (t, vc, act) => {
      t.endure = act;
      vc.endure = act ? DEBUG_STATUS_ACTIVE_FLAG : DEBUG_STATUS_INACTIVE_FLAG;
    },
    focusenergy: (t, vc, act) => {
      t.focusEnergy = act;
      vc.focusenergy = act ? DEBUG_STATUS_ACTIVE_FLAG : DEBUG_STATUS_INACTIVE_FLAG;
    },
    lockon: (t, vc, act) => {
      t.lockOn = act;
      vc.lockon = act ? DEBUG_STATUS_ACTIVE_FLAG : DEBUG_STATUS_INACTIVE_FLAG;
    }
  };

  win.__VITE_DEBUG__.setSecondaryStatus = (side: string, type: string) => {
    const target = (side === 'player' ? ctx.activeBattle.value?.player : ctx.activeBattle.value?.enemy) as (Pokemon & Record<string, unknown>) | undefined; // open-record: Generic key-value data dictionary container
    if (!target) return;

    if (!target.volatileCounters) target.volatileCounters = {};
    const vc = target.volatileCounters as Record<string, number>; // open-record: Generic key-value data dictionary container

    const predicate = SECONDARY_DEBUG_PREDICATES[type];
    const isCurrentlyActive = ((vc[type] || 0) > 0) || Boolean(target[type]) || (predicate ? predicate(target, vc) : false);

    const activating = !isCurrentlyActive;

    const applier = SECONDARY_DEBUG_APPLIERS[type];
    if (applier) {
      applier(target, vc, activating);
    } else {
      const key = requireVolatileStatusKey(type);
      vc[key] = activating ? DEBUG_TURNS_THREE : DEBUG_STATUS_INACTIVE_FLAG;
    }

    if (side === 'player') {
      const teamTarget = ctx.gs.state.team.find(pokemon => pokemon?.uid === target.uid);
      if (teamTarget) {
        Object.assign(teamTarget, {
          confused: target.confused,
          tauntTurns: target.tauntTurns,
          substitute: target.substitute,
          disabledTurns: target.disabledTurns,
          encoreTurns: target.encoreTurns,
          perishSongCount: target.perishSongCount,
          bound: target.bound,
          attracted: target.attracted,
          cursed: target.cursed,
          seeded: target.seeded,
          trapped: target.trapped,
          ingrain: target.ingrain,
          protect: target.protect,
          endure: target.endure,
          focusEnergy: target.focusEnergy,
          lockOn: target.lockOn,
          volatileCounters: { ...target.volatileCounters }
        });
      }
      if (ctx.activeBattle.value) {
        ctx.activeBattle.value.player = { ...target };
        ctx.activeBattle.value = { ...ctx.activeBattle.value };
      }
    } else {
      if (ctx.activeBattle.value) {
        ctx.activeBattle.value.enemy = { ...target };
        ctx.activeBattle.value = { ...ctx.activeBattle.value };
      }
    }
  };

  win.__VITE_DEBUG__.setStatStage = (side: string, stat: keyof BattleStages, val: number) => {
    if (side === 'player') ctx.playerStages.value[stat] = val;
    else ctx.enemyStages.value[stat] = val;
  };

  win.__VITE_DEBUG__.modifyStatStage = (side: string, stat: keyof BattleStages, delta: number) => {
    const stages = side === 'player' ? ctx.playerStages.value : ctx.enemyStages.value;
    stages[stat] = Math.max(-6, Math.min(6, (stages[stat] || 0) + delta));
  };

  win.__VITE_DEBUG__.setFieldEffect = (side: string, effect: string, val: number) => {
    const key = requireBattleConditionKey(effect);
    if (SCREEN_OR_HAZARD_EFFECTS.includes(key as ScreenOrHazardEffect)) {
      toggleScreenOrHazardEffect(ctx, side, key, val);
    } else {
      toggleTerrainOrFieldEffect(ctx, key, val);
    }
  };

  win.__VITE_DEBUG__.toggleSilhouette = () => {
    const bStore = getBattleStore();
    if (bStore) {
      Reflect.set(bStore, 'debugSilhouette', !Reflect.get(bStore, 'debugSilhouette'));
    }
  };

  win.__VITE_DEBUG__.forceFlee = async () => {
    logger.warn('DEBUG', 'Forzando huida del combate...');
    if (ctx.activeBattle.value) {
      ctx.activeBattle.value.playerFled = true;
    }
    const currState = ctx.fsm.currentState.value || ctx.BATTLE_STATES.ACTIVE_BATTLE;
    if (currState === ctx.BATTLE_STATES.ACTIVE_BATTLE) {
      ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.FLEE_ATTEMPT);
    } else {
      ctx.fsm.transition(currState, ctx.BATTLE_SUBSTATES.ESCAPE_PROCESS);
    }
    await ctx.endBattle(false, true);
  };

  const getScriptedReplayReadiness = (): ScriptedReplayReadinessDetail => {
    const earlyDetail = checkCompletedOrInitialReadiness(ctx, win);
    if (earlyDetail) return earlyDetail;

    const active = ctx.activeBattle.value!;
    const subStateVal = ctx.fsm.currentSubState.value ?? '';
    const hasPendingSwitch = Boolean(Reflect.get(active, 'switchingToPlayer')) || Boolean(Reflect.get(active, 'switchingToEnemy'));
    const isReady = canExecuteScriptedReplayAction({
      isActiveBattle: ctx.fsm.currentState.value === ctx.BATTLE_STATES.ACTIVE_BATTLE,
      subState: subStateVal,
      isProcessing: ctx.isProcessing.value,
      isIntroAnimating: ctx.isIntroAnimating.value,
      hasPendingSwitch,
      hasPendingPlayerAction: requiresAction(active.playerRequest),
    });

    if (!isReady && subStateVal === 'SWITCH_MENU' && win.__VITE_DEBUG__?.isScriptedReplayMode) {
      console.debug(`[E2E-CERTIFIED-REPLAY] SWITCH_MENU is not actionable. context=${JSON.stringify({
        isActiveBattle: ctx.fsm.currentState.value === ctx.BATTLE_STATES.ACTIVE_BATTLE,
        isProcessing: ctx.isProcessing.value,
        isIntroAnimating: ctx.isIntroAnimating.value,
        hasPendingSwitch,
        introDiagnostics: win.__VITE_DEBUG__?.certifiedReplayIntroDiagnostics,
      })}`);
    }

    return {
      subState: subStateVal,
      p1ChoiceIdx: win.__VITE_DEBUG__?.p1ChoiceIdx ?? 0,
      p2ChoiceIdx: win.__VITE_DEBUG__?.p2ChoiceIdx ?? 0,
      over: false,
      playerSwitchSlots: projectBattleReadySwitchSlots(active.playerRequest),
      isReady,
    };
  };

  win.__VITE_DEBUG__.getScriptedReplayReadiness = getScriptedReplayReadiness

  win.__VITE_DEBUG__.waitForBattleReady = (timeoutMs = MAX_BATTLE_READY_TIMEOUT_MS, options?: { skipImmediate?: boolean }) => {
    return new Promise((resolve, reject) => {
      const checkCurrentReady = () => {
        const detail = getScriptedReplayReadiness()
        if (detail.over || detail.isReady) {
          return detail
        }
        return null
      }

      // 1. Chequeo sincrónico inicial
      if (!options?.skipImmediate) {
        const immediateReady = checkCurrentReady()
        if (immediateReady) {
          resolve(immediateReady)
          return
        }
      }

      let unwatch: (() => void) | null = null
      let timer: NodeJS.Timeout | null = null

      const onActivity = () => {
        const res = checkCurrentReady()
        if (res) {
          onReady(res)
        } else {
          resetTimer()
        }
      }

      const cleanup = () => {
        if (unwatch) unwatch()
        if (timer) clearTimeout(timer)
        window.removeEventListener(BATTLE_UI_EVENTS.READY_FOR_INPUT, handler)
        window.removeEventListener('battle-log-added', onActivity)
      }

      const onReady = (detail: unknown) => {
        if (!isBattleReadyForInputDetail(detail)) {
          cleanup()
          reject(new Error(`[battleDebug] Invalid ${BATTLE_UI_EVENTS.READY_FOR_INPUT} detail payload`))
          return
        }
        cleanup()
        resolve(detail)
      }

      const handler = (e: Event) => {
        if (!(e instanceof CustomEvent)) {
          cleanup()
          reject(new Error(`[battleDebug] ${BATTLE_UI_EVENTS.READY_FOR_INPUT} must be a CustomEvent`))
          return
        }
        onReady(e.detail)
      }

      const resetTimer = () => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          const currentDetail = getScriptedReplayReadiness()
          if (currentDetail.isReady || currentDetail.over) {
            cleanup()
            resolve(currentDetail)
            return
          }
          if (ctx.isProcessing.value || ctx.isIntroAnimating.value) {
            resetTimer()
            return
          }
          cleanup()
          reject(new Error(`[battleDebug] Timeout (${timeoutMs}ms) waiting for battle-ready-for-input. Current state: ${JSON.stringify(currentDetail)}`))
        }, timeoutMs)
      }

      resetTimer()

      window.addEventListener(BATTLE_UI_EVENTS.READY_FOR_INPUT, handler, { once: true })
      window.addEventListener('battle-log-added', onActivity)

      unwatch = watch(
        [
          ctx.fsm.currentState,
          ctx.fsm.currentSubState,
          ctx.isProcessing,
          ctx.isIntroAnimating,
          () => ctx.battleLogs.value.length,
          () => ctx.player.value?.hp,
          () => ctx.enemy.value?.hp,
          ctx.activeMove,
          ctx.attackerSide,
        ],
        onActivity,
        { immediate: !options?.skipImmediate }
      )
    })
  }

  win.__VITE_DEBUG__.battle = {
    setPlayerStatus: (s: Pokemon['status']) => {
      const active = ctx.activeBattle.value
      if (active && active.player) {
        active.player.status = s
        logger.info('DEBUG', `Status de jugador cambiado a: ${s}`)
      }
    },
    setEnemyStatus: (s: Pokemon['status']) => {
      const active = ctx.activeBattle.value
      if (active && active.enemy) {
        active.enemy.status = s
        logger.info('DEBUG', `Status de enemigo cambiado a: ${s}`)
      }
    },
    setPlayerStage: (stat: keyof BattleStages, val: number) => { 
      ctx.playerStages.value[stat] = val 
      logger.info('DEBUG', `Stage de jugador ${stat} cambiado a: ${val}`)
    },
    setEnemyStage: (stat: keyof BattleStages, val: number) => { 
      ctx.enemyStages.value[stat] = val 
      logger.info('DEBUG', `Stage de enemigo ${stat} cambiado a: ${val}`)
    },
    setWeather: (w: string) => { 
      const active = ctx.activeBattle.value
      if (active) {
        const weatherId = requireWeatherId(w)
        const visual = weatherId === 'clear' || weatherId === 'null' ? 'clear' : weatherId
        active.weather = { type: weatherId, turns: DEBUG_INDEFINITE_WEATHER_TURNS, visual }
        logger.info('DEBUG', `Clima/Terreno cambiado a: ${weatherId}`)
      }
    },
    fullHeal: () => {
      const active = ctx.activeBattle.value
      if (active && active.player) {
        active.player.hp = active.player.maxHp
        active.player.status = '';
        (active.player as Pokemon & { confused?: number; seeded?: boolean }).confused = 0;
        (active.player as Pokemon & { confused?: number; seeded?: boolean }).seeded = false
        
        // Sincronizar el HP del equipo en el gameStore
        const team = ctx.gs.state.team
        if (team && team[active.playerTeamIndex]) {
          const tp = team[active.playerTeamIndex]
          if (tp) {
            tp.hp = active.player.maxHp
            tp.status = ''
          }
        }
        
        logger.info('DEBUG', '¡Curación completa aplicada reactivamente al jugador!')
      }
    },
    killEnemy: async () => {
      const active = ctx.activeBattle.value
      if (active && active.enemy) {
        active.enemy.hp = 0
        
        logger.warn('DEBUG', 'Enemigo fulminado (HP = 0), iniciando secuencia de debilitamiento/faint...')
        await ctx.handleFaint('enemy')
      }
    },
    freezeClock: (freeze = true) => {
      const mapStore = window.__VITE_DEBUG_MAP_STORE_RESOLVER__?.()
      mapStore?.setFreezeClock(freeze)
      logger.info('DEBUG', `Reloj congelado: ${freeze}`)
    },
    setFixedTime: (epochHour: number, cycle?: string, weather?: string) => {
      const mapStore = window.__VITE_DEBUG_MAP_STORE_RESOLVER__?.()
      if (mapStore) {
        mapStore.setFreezeClock(true)
        mapStore.currentEpochHour = epochHour
        if (cycle) mapStore.forcedCycle = requireDayPhase(cycle)
        if (weather) mapStore.globalWeather = requireWeatherId(weather)
      }
      logger.info('DEBUG', `Horario y clima fijados: epochHour=${epochHour}, cycle=${cycle}, weather=${weather}`)
    },
    animations: () => ctx.animations,
    store: () => {
      return window.__VITE_DEBUG_STORE_RESOLVER__?.()
    }
  }

  if (window.__VITE_DEBUG__) {
    window.__VITE_DEBUG__.setFreezeClock = (freeze = true) => {
      const mapStore = window.__VITE_DEBUG_MAP_STORE_RESOLVER__?.()
      mapStore?.setFreezeClock(freeze)
    }
  }
}
