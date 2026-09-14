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

export interface CatchSequenceOptions {
  eventStore: EventStore;
  addLog: LogFn;
  consumeItem: (itemId: ItemId) => void;
  fsm?: BattleStore['fsm'];
  ctx?: BattleContext;
  itemId?: ItemId;
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

  // Revert in-battle transformation before permanent storage and factory validation
  const originalId = capturedPoke._originalId || enemy._originalId;
  const originalAbility = capturedPoke._originalAbility || enemy._originalAbility;
  if (capturedPoke.isTransformed || enemy.isTransformed || originalId || capturedPoke.id === 'ditto' || enemy.id === 'ditto') {
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
        acc: 1000,
        pp: 10,
        maxPP: 10
      }];
    }
    capturedPoke.isTransformed = false;
  } else {
    capturedPoke.isTransformed = false;
  }

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

  if (options.ctx?.animations?.handleCatchRequest) {
    await options.ctx.animations.handleCatchRequest({ side: 'enemy', ballId, isCritical })
  } else {
    gameBus.emit('PLAY_CATCH_ENERGY', { side: 'enemy', ballId, isCritical })
    await awaitAnimation(gsap.delayedCall(1.0, () => {}))
  }

  if (isCritical) {
    if (options.ctx?.animations?.triggerCriticalCaptureFx) {
      await options.ctx.animations.triggerCriticalCaptureFx('enemy')
    } else {
      gameBus.emit('CRITICAL_CAPTURE_FX', { side: 'enemy' })
      await awaitAnimation(gsap.delayedCall(0.8, () => {}))
    }
  }

  for (let i = 0; i < shakes; i++) {
    if (options.fsm) {
      await options.fsm.transition('ACTIVE_BATTLE', 'CATCH_SHAKE')
    }
    if (options.ctx?.animations?.handleShakeRequest) {
      await options.ctx.animations.handleShakeRequest({ side: 'enemy', isCapture: true })
    } else {
      gameBus.emit('CATCH_SHAKE', { side: 'enemy' })
      await awaitAnimation(gsap.delayedCall(1.0, () => {}))
    }
  }

  if (caught) {
    if (options.ctx?.gs?.state) {
      if (!options.ctx.gs.state.stats) {
        options.ctx.gs.state.stats = {}
      }
      options.ctx.gs.state.stats.captureSuccesses = (Number(options.ctx.gs.state.stats.captureSuccesses) || 0) + 1
    }

    await awaitAnimation(gsap.delayedCall(0.5, () => {}))
    if (options.fsm) {
      await options.fsm.transition('ACTIVE_BATTLE', 'CATCH_SUCCESS')
    }
    if (options.ctx?.animations?.playCatchCelebration) {
      await options.ctx.animations.playCatchCelebration('enemy')
    } else {
      gameBus.emit('CATCH_SUCCESS', { side: 'enemy' })
      await awaitAnimation(gsap.delayedCall(1.5, () => {}))
    }
    addLog(`¡Ya está! ¡${enemy.name} atrapado!`, 'log-catch', enemy)

    const initialEnemy = (enemy.uid && options.ctx?.activeBattle.value?._initialEnemies?.[enemy.uid]) || options.ctx?.activeBattle.value?._initialEnemy
    const capturedPoke = cleanCapturedPokemonForStorage(enemy, initialEnemy, ballId)

    if (options.fsm) {
      options.fsm.transition('ACTIVE_BATTLE', 'ADD_TO_STORAGE')
    }
    return { action: 'capture', pokemon: capturedPoke }
  }

  if (options.fsm) {
    await options.fsm.transition('ACTIVE_BATTLE', 'CATCH_BREAK')
  }
  options.ctx?.classStore?.onCaptureFail?.()
  gameBus.emit('CATCH_BREAK', { side: 'enemy' })
  addLog(`¡Oh, no! ¡El Pokémon se ha escapado!`, 'log-info', enemy)

  if (options.ctx?.animations?.handleReleaseRequest) {
    await options.ctx.animations.handleReleaseRequest({ side: 'enemy' })
  } else {
    gameBus.emit('PLAY_RELEASE_ENERGY', { side: 'enemy' })
    await awaitAnimation(gsap.delayedCall(0.8, () => {}))
  }

  if (options.fsm) {
    await options.fsm.transition('ACTIVE_BATTLE', 'FADEOUT_BALL')
    if (options.ctx?.animations?.playBallFadeOut) {
      await options.ctx.animations.playBallFadeOut('enemy')
    }
  }

  return { action: 'enemy_turn' }
}
