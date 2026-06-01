/**
 * battleItems.ts
 * Logic for using items (balls and healing) in battle.
 * Zero-Timer Policy: All waiting is coordinated via GSAP (awaitAnimation / awaitTween).
 */
import { awaitAnimation } from '@/logic/utils/gsapHelpers'
import gsap from 'gsap'
import { calculateCatchRate } from './battleEngine.ts'
import { useItemOnPokemon } from '../providers/itemProvider.ts'
import { gameBus } from '@/logic/gameBus'
import type { Pokemon } from '@/types/pokemon'
import type { EventStore, AudioStore, BattleStore } from '@/types/stores'
import type { LogFn } from '@/types/battle'
import type { BattleContext } from '@/types/battleContext'

interface ItemUsageOptions {
  eventStore: EventStore;
  addLog: LogFn;
  audio: AudioStore;
  consumeItem: (itemName: string) => void;
  fsm?: BattleStore['fsm'];
  ctx?: BattleContext;
  itemId?: string;
}

export async function handleItemUsage(itemName: string, p: Pokemon, e: Pokemon, options: ItemUsageOptions) {
  const { 
    eventStore, 
    addLog, 
    audio, 
    consumeItem 
  } = options

  const nameLower = itemName.toLowerCase()
  const isBall = nameLower.includes('ball') || nameLower.includes('bola')

  if (isBall) {
    if (options.fsm) {
      await options.fsm.transition('ACTIVE_BATTLE', 'CATCH_PROCESS')
    }
    addLog(`Usaste ${itemName}`, 'log-info', 'player')
    addLog(`¡Has lanzado una ${itemName}!`, 'log-catch', itemName, 'player')
    
    // El ítem se consume inmediatamente al lanzarse
    consumeItem(itemName)

    const eventCatchMult = eventStore.globalMultipliers?.catch || 1
    const { caught, shakes } = calculateCatchRate(e, itemName, eventCatchMult, options.ctx || {})
    
    // 1. Animación de entrada (energía azul) — awaited via GSAP tween registration
    audio.ballHit()
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
        await options.ctx.animations.handleShakeRequest({ side: 'enemy' })
      } else {
        gameBus.emit('CATCH_SHAKE', { side: 'enemy' })
        // Fallback: duración de un shake via GSAP
        await awaitAnimation(gsap.delayedCall(1.0, () => { /* sync point */ }))
      }
    }

    if (caught) {
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
      
      // Guardar el tipo de bola en los tags para persistencia visual
      e.tags = e.tags || []
      const normalizedBallId = (options.itemId || itemName).toLowerCase()
        .replace(/ /g, '')
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u')
        .replace(/bola/g, 'ball')
        .replace(/_/g, '') // Eliminar guiones bajos de IDs técnicos si vienen de itemId
      
      if (!e.tags.some(t => t.startsWith('ball:'))) {
        e.tags.push(`ball:${normalizedBallId}`)
      }

      // Captured!
      if (options.fsm) {
        options.fsm.transition('ACTIVE_BATTLE', 'ADD_TO_STORAGE')
      }
      return { action: 'capture', pokemon: e }
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
    addLog(`Usaste ${itemName}`, 'log-info', 'player')
    
    const res = useItemOnPokemon(itemName, p) as { success: boolean, message: string, pokemon: Pokemon } | null
    if (res) {
      audio.heal()
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
      }

      return { action: 'heal', pokemon: res.pokemon }
    } else {
      addLog('No tuvo efecto.', 'log-info', p)
      return { action: 'fail' }
    }
  }

  return { action: 'enemy_turn' }
}
