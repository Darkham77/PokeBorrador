import { cloneReactive } from '@/logic/utils/cloneUtils.ts'
import { awaitAnimation } from '@/logic/utils/gsapHelpers'
import gsap from 'gsap'
import { calculateCatchRate } from './battleEngine.ts'
import { gameBus } from '@/logic/events/gameBus'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { validatePokemon } from '@/logic/pokemon/pokemonFactory'
import type { EventStore, BattleStore } from '@/types/system/stores'
import type { LogFn } from '@/types/battle/battle'
import type { BattleContext } from '@/types/battle/battleContext'
import { getItemName, requireItemId, type ItemId } from '@/data/inventory/items'
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex'
import { initializePokemonVigor } from '@/logic/pokemon/pokemonUtils'
import { getServerInstant } from '@/logic/utils/timeUtils'

const CATCH_ENERGY_FALLBACK_DELAY_SEC = 1.0;
const CRITICAL_CAPTURE_FX_FALLBACK_DELAY_SEC = 0.8;
const CATCH_SHAKE_FALLBACK_DELAY_SEC = 1.0;
const CATCH_SUCCESS_PRE_TRANSITION_DELAY_SEC = 0.5;
const CATCH_CELEBRATION_FALLBACK_DELAY_SEC = 1.5;
const CATCH_RELEASE_FALLBACK_DELAY_SEC = 0.8;

export interface CatchSequenceOptions {
  eventStore: EventStore;
  addLog: LogFn;
  consumeItem: (itemId: ItemId) => void;
  fsm?: BattleStore['fsm'];
  ctx?: BattleContext;
  itemId?: ItemId;
}

const DITTO_TRANSFORM_ACCURACY = 1000;
const DITTO_TRANSFORM_PP = 10;

function resetCapturedVolatiles(capturedPoke: Pokemon): void {
  capturedPoke.volatileCounters = {}
  capturedPoke.lastMove = undefined
  capturedPoke.choiceMove = undefined
  capturedPoke.chargingMove = undefined
  capturedPoke.encoreMove = undefined
  capturedPoke.disabledMove = undefined
  capturedPoke.fainted = false
  capturedPoke.mustRecharge = false
  capturedPoke.furyCutterCount = 0
  capturedPoke.thrashTurns = 0
  capturedPoke.bound = 0
  capturedPoke.trapped = false
  capturedPoke.perishSongCount = 0
  capturedPoke.focusEnergy = false
}

function revertCapturedDitto(capturedPoke: Pokemon, originalAbility: string | undefined): void {
  capturedPoke.id = requirePokemonSpeciesId('ditto');
  if (!capturedPoke.nickname) {
    capturedPoke.name = 'Ditto';
  }
  capturedPoke.type = 'normal';
  capturedPoke.type2 = undefined;
  if (capturedPoke.ability !== 'limber' && capturedPoke.ability !== 'imposter') {
    capturedPoke.ability = (originalAbility === 'imposter' ? 'imposter' : 'limber');
  }
  capturedPoke.moves = [{
    id: 'transform',
    name: 'Transformación',
    type: 'normal',
    cat: 'status',
    power: 0,
    acc: DITTO_TRANSFORM_ACCURACY,
    pp: DITTO_TRANSFORM_PP,
    maxPP: DITTO_TRANSFORM_PP
  }];
}

function revertCapturedTransformation(capturedPoke: Pokemon, enemy: Pokemon): void {
  const originalId = capturedPoke._originalId || enemy._originalId;
  const originalAbility = capturedPoke._originalAbility || enemy._originalAbility;
  const isTransformRelated = capturedPoke.isTransformed || enemy.isTransformed || originalId || capturedPoke.id === 'ditto' || enemy.id === 'ditto';

  if (!isTransformRelated) {
    capturedPoke.isTransformed = false;
    return;
  }

  if (capturedPoke._originalMoves && capturedPoke._originalMoves.length > 0) {
    capturedPoke.moves = [...capturedPoke._originalMoves];
    capturedPoke._originalMoves = undefined;
  }
  if (originalId) {
    capturedPoke.id = originalId;
    capturedPoke._originalId = undefined;
  }
  if (originalAbility) {
    capturedPoke.ability = originalAbility;
    capturedPoke._originalAbility = undefined;
  }
  if (capturedPoke._originalName) {
    if (!capturedPoke.nickname) {
      capturedPoke.name = capturedPoke._originalName;
    }
    capturedPoke._originalName = undefined;
  }
  if (capturedPoke._originalType) {
    capturedPoke.type = capturedPoke._originalType;
    capturedPoke._originalType = undefined;
  }
  if (capturedPoke._originalType2 !== undefined) {
    capturedPoke.type2 = capturedPoke._originalType2;
    capturedPoke._originalType2 = undefined;
  }
  if (capturedPoke.id === 'ditto') {
    revertCapturedDitto(capturedPoke, originalAbility);
  }
  capturedPoke.isTransformed = false;
}

export function cleanCapturedPokemonForStorage(
  enemy: Pokemon,
  initialEnemy: Pokemon | null | undefined,
  ballId: ItemId
): Pokemon {
  const capturedPoke: Pokemon = initialEnemy
    ? (cloneReactive(initialEnemy) as Pokemon)
    : (cloneReactive(enemy) as Pokemon)

  if (initialEnemy) {
    const currentHpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1
    capturedPoke.hp = Math.max(1, Math.round(capturedPoke.maxHp * currentHpRatio))
    capturedPoke.status = enemy.status
  }

  resetCapturedVolatiles(capturedPoke)
  revertCapturedTransformation(capturedPoke, enemy)

  capturedPoke.caught = true
  capturedPoke.obtainedAt = capturedPoke.obtainedAt || getServerInstant().epochMilliseconds
  capturedPoke.obtainedMethod = capturedPoke.obtainedMethod || 'wild'

  capturedPoke.tags = (capturedPoke.tags || []).filter(t => !t.startsWith('ball:'))
  const normalizedBallId = requireItemId(ballId)
  capturedPoke.tags.push(`ball:${normalizedBallId}`)

  if (capturedPoke.id === 'castform' && capturedPoke.form && capturedPoke.form !== 'normal') {
    capturedPoke.form = 'normal';
    capturedPoke.type = 'normal';
    capturedPoke.type2 = undefined;
  }

  initializePokemonVigor(capturedPoke, capturedPoke.obtainedMethod)
  validatePokemon(capturedPoke)

  return capturedPoke
}

async function playCatchThrowAnimation(options: CatchSequenceOptions, ballId: ItemId, isCritical: boolean): Promise<void> {
  if (options.ctx?.animations?.handleCatchRequest) {
    await options.ctx.animations.handleCatchRequest({ side: 'enemy', ballId, isCritical })
  } else {
    gameBus.emit('PLAY_CATCH_ENERGY', { side: 'enemy', ballId, isCritical })
    await awaitAnimation(gsap.delayedCall(CATCH_ENERGY_FALLBACK_DELAY_SEC, () => {}))
  }

  if (isCritical) {
    if (options.ctx?.animations?.triggerCriticalCaptureFx) {
      await options.ctx.animations.triggerCriticalCaptureFx('enemy')
    } else {
      gameBus.emit('CRITICAL_CAPTURE_FX', { side: 'enemy' })
      await awaitAnimation(gsap.delayedCall(CRITICAL_CAPTURE_FX_FALLBACK_DELAY_SEC, () => {}))
    }
  }
}

async function playCatchShakes(options: CatchSequenceOptions, shakes: number): Promise<void> {
  for (let i = 0; i < shakes; i++) {
    if (options.fsm) {
      await options.fsm.transition('ACTIVE_BATTLE', 'CATCH_SHAKE')
    }
    if (options.ctx?.animations?.handleShakeRequest) {
      await options.ctx.animations.handleShakeRequest({ side: 'enemy', isCapture: true })
    } else {
      gameBus.emit('CATCH_SHAKE', { side: 'enemy' })
      await awaitAnimation(gsap.delayedCall(CATCH_SHAKE_FALLBACK_DELAY_SEC, () => {}))
    }
  }
}

async function processCatchSuccess(
  enemy: Pokemon,
  ballId: ItemId,
  options: CatchSequenceOptions
): Promise<{ action: string; pokemon?: Pokemon }> {
  if (options.ctx?.gs?.state) {
    if (!options.ctx.gs.state.stats) {
      options.ctx.gs.state.stats = {}
    }
    options.ctx.gs.state.stats.captureSuccesses = (Number(options.ctx.gs.state.stats.captureSuccesses) || 0) + 1
  }

  await awaitAnimation(gsap.delayedCall(CATCH_SUCCESS_PRE_TRANSITION_DELAY_SEC, () => {}))
  if (options.fsm) {
    await options.fsm.transition('ACTIVE_BATTLE', 'CATCH_SUCCESS')
  }
  if (options.ctx?.animations?.playCatchCelebration) {
    await options.ctx.animations.playCatchCelebration('enemy')
  } else {
    gameBus.emit('CATCH_SUCCESS', { side: 'enemy' })
    await awaitAnimation(gsap.delayedCall(CATCH_CELEBRATION_FALLBACK_DELAY_SEC, () => {}))
  }
  options.addLog(`¡Ya está! ¡${enemy.name} atrapado!`, 'log-catch', enemy)

  const initialEnemy = (enemy.uid && options.ctx?.activeBattle.value?._initialEnemies?.[enemy.uid]) || options.ctx?.activeBattle.value?._initialEnemy
  const capturedPoke = cleanCapturedPokemonForStorage(enemy, initialEnemy, ballId)

  if (options.fsm) {
    options.fsm.transition('ACTIVE_BATTLE', 'ADD_TO_STORAGE')
  }
  return { action: 'capture', pokemon: capturedPoke }
}

async function processCatchFailure(
  enemy: Pokemon,
  options: CatchSequenceOptions
): Promise<{ action: string }> {
  if (options.fsm) {
    await options.fsm.transition('ACTIVE_BATTLE', 'CATCH_BREAK')
  }
  options.ctx?.classStore?.onCaptureFail?.()
  gameBus.emit('CATCH_BREAK', { side: 'enemy' })
  options.addLog(`¡Oh, no! ¡El Pokémon se ha escapado!`, 'log-info', enemy)

  if (options.ctx?.animations?.handleReleaseRequest) {
    await options.ctx.animations.handleReleaseRequest({ side: 'enemy' })
  } else {
    gameBus.emit('PLAY_RELEASE_ENERGY', { side: 'enemy' })
    await awaitAnimation(gsap.delayedCall(CATCH_RELEASE_FALLBACK_DELAY_SEC, () => {}))
  }

  if (options.fsm) {
    await options.fsm.transition('ACTIVE_BATTLE', 'FADEOUT_BALL')
    if (options.ctx?.animations?.playBallFadeOut) {
      await options.ctx.animations.playBallFadeOut('enemy')
    }
  }

  return { action: 'enemy_turn' }
}

export async function executePokeballCatchSequence(
  ballId: ItemId,
  enemy: Pokemon,
  options: CatchSequenceOptions
): Promise<{ action: string; pokemon?: Pokemon }> {
  const { eventStore, addLog, consumeItem } = options
  const displayName = getItemName(ballId)

  if (options.fsm) {
    await options.fsm.transition('ACTIVE_BATTLE', 'CATCH_PROCESS')
  }
  addLog(`Usaste ${displayName}`, 'log-info', 'player')
  addLog(`¡Has lanzado una ${displayName}!`, 'log-catch', ballId, 'player')

  if (options.ctx?.gs?.state) {
    if (!options.ctx.gs.state.stats) {
      options.ctx.gs.state.stats = {}
    }
    options.ctx.gs.state.stats.captureAttempts = (Number(options.ctx.gs.state.stats.captureAttempts) || 0) + 1
  }

  consumeItem(ballId)

  const eventCatchMult = eventStore.globalMultipliers?.catch || 1
  const pokedexCount = options.ctx?.gs?.state?.pokedex?.length ?? 0
  const activeTeam = (options.ctx?.gs?.state?.team || []).filter(Boolean).map(p => ({ type1: p!.type, type2: p!.type2 }))
  const ivTotal = enemy.ivs ? (enemy.ivs.hp + enemy.ivs.atk + enemy.ivs.def + enemy.ivs.spa + enemy.ivs.spd + enemy.ivs.spe) : 0
  const playerClass = options.ctx?.classStore?.playerClass ?? options.ctx?.gs?.state?.playerClass

  const catchCtx = {
    ...(options.ctx || {}),
    pokedexCount,
    playerClass,
    activeTeam,
    ivTotal
  }
  const { caught, shakes, isCritical, bugSynergyBonus, trainerIvPenaltyApplied } = calculateCatchRate(enemy, ballId, eventCatchMult, catchCtx)

  if (bugSynergyBonus && bugSynergyBonus > 0) {
    const pct = Math.round(bugSynergyBonus * 100)
    addLog(`¡Sinergia Cazabichos activada! (+${pct}% de captura)`, 'log-buff', ballId, 'player')
  }

  if (trainerIvPenaltyApplied) {
    addLog('¡El Pokémon salvaje tiene IVs excepcionales (>120)! Penalización de Entrenador (-10%).', 'log-warning', ballId, 'player')
  }

  if (isCritical) {
    gameBus.emit('PLAY_SOUND', 'criticalThrow')
    addLog(`¡Tiro crítico! ¡La ${displayName} vibra con gran fuerza en el aire!`, 'log-catch', ballId, 'player')
  }

  await playCatchThrowAnimation(options, ballId, isCritical)
  await playCatchShakes(options, shakes)

  if (caught) {
    return processCatchSuccess(enemy, ballId, options)
  }

  return processCatchFailure(enemy, options)
}
