/**
 * battleItems.ts
 * Logic for using items (balls and healing) in battle.
 * Zero-Timer Policy: All waiting is coordinated via GSAP (awaitAnimation / awaitTween).
 */
import { toRaw } from 'vue'
import { awaitAnimation } from '@/logic/utils/gsapHelpers'
import gsap from 'gsap'
import { calculateCatchRate } from './battleEngine.ts'
import { useItemOnPokemon } from '../providers/itemProvider.ts'
import { gameBus } from '@/logic/events/gameBus'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { validatePokemon } from '@/logic/pokemon/pokemonFactory'
import type { EventStore, AudioStore, BattleStore } from '@/types/system/stores'
import type { LogFn } from '@/types/battle/battle'
import type { BattleContext } from '@/types/battle/battleContext'
import { getItemName, type ItemId } from '@/data/inventory/items'
import { initializePokemonVigor } from '@/logic/pokemon/pokemonUtils'

interface ItemUsageOptions {
  eventStore: EventStore;
  addLog: LogFn;
  audio: AudioStore;
  consumeItem: (itemId: ItemId) => void;
  fsm?: BattleStore['fsm'];
  ctx?: BattleContext;
  itemId?: ItemId;
}

export async function handleItemUsage(itemName: ItemId, p: Pokemon, e: Pokemon, options: ItemUsageOptions) {
  const { 
    eventStore, 
    addLog, 
    consumeItem 
  } = options

  const displayName = getItemName(itemName)
  const isBall = itemName.includes('ball') || itemName.includes('bola')

  if (isBall) {
    if (options.fsm) {
      await options.fsm.transition('ACTIVE_BATTLE', 'CATCH_PROCESS')
    }
    addLog(`Usaste ${displayName}`, 'log-info', 'player')
    addLog(`¡Has lanzado una ${displayName}!`, 'log-catch', itemName, 'player')
    
    // Registrar intento de captura
    if (options.ctx?.gs?.state) {
      if (!options.ctx.gs.state.stats) {
        options.ctx.gs.state.stats = {}
      }
      options.ctx.gs.state.stats.captureAttempts = (Number(options.ctx.gs.state.stats.captureAttempts) || 0) + 1
    }

    // El ítem se consume inmediatamente al lanzarse
    consumeItem(itemName)

    const eventCatchMult = eventStore.globalMultipliers?.catch || 1
    const { caught, shakes } = calculateCatchRate(e, itemName, eventCatchMult, options.ctx || {})
    
    if (options.ctx?.animations?.handleCatchRequest) {
      await options.ctx.animations.handleCatchRequest({ side: 'enemy', ballId: options.itemId || itemName })
    } else {
      gameBus.emit('PLAY_CATCH_ENERGY', { side: 'enemy', ballId: options.itemId || itemName })
      // Fallback: esperar via GSAP delayedCall (sin setTimeout)
      await awaitAnimation(gsap.delayedCall(1.0, () => { /* sync point */ }))
    }

    // 2. Intentos de agitación — cada shake ya es determinístico (GSAP timeline en handleShakeRequest)
    for (let i = 0; i < shakes; i++) {
      if (options.fsm) {
        await options.fsm.transition('ACTIVE_BATTLE', 'CATCH_SHAKE')
      }
      if (options.ctx?.animations?.handleShakeRequest) {
        await options.ctx.animations.handleShakeRequest({ side: 'enemy', isCapture: true })
      } else {
        gameBus.emit('CATCH_SHAKE', { side: 'enemy' })
        // Fallback: duración de un shake via GSAP
        await awaitAnimation(gsap.delayedCall(1.0, () => { /* sync point */ }))
      }
    }

    if (caught) {
      // Registrar captura exitosa
      if (options.ctx?.gs?.state) {
        if (!options.ctx.gs.state.stats) {
          options.ctx.gs.state.stats = {}
        }
        options.ctx.gs.state.stats.captureSuccesses = (Number(options.ctx.gs.state.stats.captureSuccesses) || 0) + 1
      }

      // Pausa dramática antes del click de éxito — orquestada por GSAP, nunca setTimeout
      await awaitAnimation(gsap.delayedCall(0.5, () => { /* dramatic pause */ }))
      if (options.fsm) {
        await options.fsm.transition('ACTIVE_BATTLE', 'CATCH_SUCCESS')
      }
      if (options.ctx?.animations?.playCatchCelebration) {
        await options.ctx.animations.playCatchCelebration('enemy')
      } else {
        gameBus.emit('CATCH_SUCCESS', { side: 'enemy' })
        await awaitAnimation(gsap.delayedCall(1.5, () => {}))
      }
      addLog(`¡Ya está! ¡${e.name} atrapado!`, 'log-catch', e)
      
      let capturedPoke: Pokemon
      const initialEnemy = options.ctx?.activeBattle.value?._initialEnemy
      if (initialEnemy) {
        // Deep clone the original pristine enemy Pokémon (e.g. Ditto or Pidgey)
        try {
          capturedPoke = structuredClone(toRaw(initialEnemy)) as Pokemon
        } catch {
          capturedPoke = JSON.parse(JSON.stringify(initialEnemy)) as Pokemon
        }
        // Scale HP based on the captured Pokémon's damage ratio to preserve health state
        const currentHpRatio = e.maxHp > 0 ? e.hp / e.maxHp : 1
        capturedPoke.hp = Math.max(1, Math.round(capturedPoke.maxHp * currentHpRatio))
        capturedPoke.status = e.status
      } else {
        try {
          capturedPoke = structuredClone(toRaw(e)) as Pokemon
        } catch {
          capturedPoke = JSON.parse(JSON.stringify(e)) as Pokemon
        }
      }

      // Limpiar estados volátiles de combate antes de mandar a almacenamiento
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
      capturedPoke.obtainedAt = capturedPoke.obtainedAt || Temporal.Now.instant().epochMilliseconds
      capturedPoke.obtainedMethod = capturedPoke.obtainedMethod || 'wild'

      // Guardar el tipo de bola en los tags del pokemon capturado para persistencia visual
      capturedPoke.tags = capturedPoke.tags || []
      const normalizedBallId = (options.itemId || itemName).toLowerCase()
        .replace(/ /g, '')
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u')
        .replace(/bola/g, 'ball')
        .replace(/_/g, '') // Eliminar guiones bajos de IDs técnicos si vienen de itemId
      
      if (!capturedPoke.tags.some(t => t.startsWith('ball:'))) {
        capturedPoke.tags.push(`ball:${normalizedBallId}`)
      }

      // Castform: always revert to Normal form on capture (like Ditto)
      if (capturedPoke.id === 'castform' && capturedPoke.form && capturedPoke.form !== 'normal') {
        capturedPoke.form = 'normal';
        capturedPoke.type = 'normal';
        capturedPoke.type2 = undefined;
      }

      // Inicializar Vigor canónico si el Pokémon capturado no lo tiene asignado (ej. restaurado de combate previo)
      initializePokemonVigor(capturedPoke, capturedPoke.obtainedMethod)

      // Validar estrictamente que el Pokémon cumple al 100% las restricciones de dominio
      validatePokemon(capturedPoke)

      // Captured!
      if (options.fsm) {
        options.fsm.transition('ACTIVE_BATTLE', 'ADD_TO_STORAGE')
      }
      return { action: 'capture', pokemon: capturedPoke }
    } else {
      // El último shake ya terminó (handleShakeRequest es determinístico via GSAP).
      // Transición inmediata a CATCH_BREAK — sin sleep, sin timers.
      if (options.fsm) {
        await options.fsm.transition('ACTIVE_BATTLE', 'CATCH_BREAK')
      }
      gameBus.emit('CATCH_BREAK', { side: 'enemy' })
      addLog(`¡Oh, no! ¡El Pokémon se ha escapado!`, 'log-info', e)
      
      // Animación de liberación — awaited via GSAP tween (handleReleaseRequest)
      if (options.ctx?.animations?.handleReleaseRequest) {
        await options.ctx.animations.handleReleaseRequest({ side: 'enemy' })
      } else {
        gameBus.emit('PLAY_RELEASE_ENERGY', { side: 'enemy' })
        // Fallback: esperar via GSAP delayedCall
        await awaitAnimation(gsap.delayedCall(0.8, () => { /* release sync */ }))
      }
      
      if (options.fsm) {
        await options.fsm.transition('ACTIVE_BATTLE', 'FADEOUT_BALL')
        if (options.ctx?.animations?.playBallFadeOut) {
          await options.ctx.animations.playBallFadeOut('enemy')
        }
      }
    }
  } else {
    // Ítem de curación
    addLog(`Usaste ${displayName}`, 'log-info', 'player')
    
    const res = useItemOnPokemon(itemName, p) as { success: boolean, message: string, pokemon: Pokemon } | null
    if (res) {
      addLog(`¡${p.name} ${res.message}!`, 'log-info', itemName, 'player')
      consumeItem(itemName)
      
      const isActive = options.ctx?.activeBattle?.value?.player?.uid === p.uid
      if (isActive) {
        if (options.ctx?.animations?.handleHealRequest) {
          await options.ctx.animations.handleHealRequest({ side: 'player' })
        } else {
          gameBus.emit('PLAY_HEAL', { side: 'player' })
          // Fallback: esperar via GSAP delayedCall
          await awaitAnimation(gsap.delayedCall(0.6, () => { /* heal sync */ }))
        }
      } else {
        options.audio.play('heal')
      }

      return { action: 'heal', pokemon: res.pokemon }
    } else {
      addLog('No tuvo efecto.', 'log-info', p)
      return { action: 'fail' }
    }
  }

  return { action: 'enemy_turn' }
}
