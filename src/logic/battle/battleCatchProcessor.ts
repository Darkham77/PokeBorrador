import { toRaw } from 'vue'
import { awaitAnimation } from '@/logic/utils/gsapHelpers'
import gsap from 'gsap'
import { calculateCatchRate } from './battleEngine.ts'
import { gameBus } from '@/logic/events/gameBus'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { validatePokemon } from '@/logic/pokemon/pokemonFactory'
import type { EventStore, BattleStore } from '@/types/system/stores'
import type { LogFn } from '@/types/battle/battle'
import type { BattleContext } from '@/types/battle/battleContext'
import { getItemName, type ItemId } from '@/data/inventory/items'
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
  let capturedPoke: Pokemon
  if (initialEnemy) {
    try {
      capturedPoke = structuredClone(toRaw(initialEnemy)) as Pokemon
    } catch {
      capturedPoke = JSON.parse(JSON.stringify(initialEnemy)) as Pokemon
    }
    const currentHpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1
    capturedPoke.hp = Math.max(1, Math.round(capturedPoke.maxHp * currentHpRatio))
    capturedPoke.status = enemy.status
  } else {
    try {
      capturedPoke = structuredClone(toRaw(enemy)) as Pokemon
    } catch {
      capturedPoke = JSON.parse(JSON.stringify(enemy)) as Pokemon
    }
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
  capturedPoke.isTransformed = false
  capturedPoke.caught = true
  capturedPoke.obtainedAt = capturedPoke.obtainedAt || getServerInstant().epochMilliseconds
  capturedPoke.obtainedMethod = capturedPoke.obtainedMethod || 'wild'

  capturedPoke.tags = (capturedPoke.tags || []).filter(t => !t.startsWith('ball:'))
  const normalizedBallId = ballId.toLowerCase() // domain-ok
    .replace(/ /g, '')
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/bola/g, 'ball')
    .replace(/_/g, '')

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
  itemName: ItemId,
  enemy: Pokemon,
  options: CatchSequenceOptions
): Promise<{ action: string; pokemon?: Pokemon }> {
  const { eventStore, addLog, consumeItem } = options
  const displayName = getItemName(itemName)

  if (options.fsm) {
    await options.fsm.transition('ACTIVE_BATTLE', 'CATCH_PROCESS')
  }
  addLog(`Usaste ${displayName}`, 'log-info', 'player')
  addLog(`¡Has lanzado una ${displayName}!`, 'log-catch', itemName, 'player')

  if (options.ctx?.gs?.state) {
    if (!options.ctx.gs.state.stats) {
      options.ctx.gs.state.stats = {}
    }
    options.ctx.gs.state.stats.captureAttempts = (Number(options.ctx.gs.state.stats.captureAttempts) || 0) + 1
  }

  consumeItem(itemName)

  const eventCatchMult = eventStore.globalMultipliers?.catch || 1
  const { caught, shakes } = calculateCatchRate(enemy, itemName, eventCatchMult, options.ctx || {})

  if (options.ctx?.animations?.handleCatchRequest) {
    await options.ctx.animations.handleCatchRequest({ side: 'enemy', ballId: options.itemId || itemName })
  } else {
    gameBus.emit('PLAY_CATCH_ENERGY', { side: 'enemy', ballId: options.itemId || itemName })
    await awaitAnimation(gsap.delayedCall(1.0, () => {}))
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

    const initialEnemy = options.ctx?.activeBattle.value?._initialEnemy
    const capturedPoke = cleanCapturedPokemonForStorage(enemy, initialEnemy, options.itemId || itemName)

    if (options.fsm) {
      options.fsm.transition('ACTIVE_BATTLE', 'ADD_TO_STORAGE')
    }
    return { action: 'capture', pokemon: capturedPoke }
  }

  if (options.fsm) {
    await options.fsm.transition('ACTIVE_BATTLE', 'CATCH_BREAK')
  }
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
