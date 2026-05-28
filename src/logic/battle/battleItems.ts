import { sleep } from '@/logic/timeUtils'

/**
 * battleItems.js
 * Logic for using items (balls and healing) in battle.
 */
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
    
    // 1. Iniciar animación de entrada (energía azul)
    audio.ballHit()
    gameBus.emit('PLAY_CATCH_ENERGY', { side: 'enemy', ballId: options.itemId || itemName })
    
    // Esperar a que el Pokémon termine de entrar en la bola (800ms aprox)
    await sleep(1000)

    // 2. Ejecutar los intentos de agitación (shakes)
    for (let i = 0; i < shakes; i++) {
      if (options.fsm) {
        await options.fsm.transition('ACTIVE_BATTLE', 'CATCH_SHAKE')
      }
      gameBus.emit('CATCH_SHAKE', { side: 'enemy' })
      // Duración de un shake + pequeña pausa
      await sleep(1000)
    }

    if (caught) {
      // Pequeña pausa dramática antes del click de éxito
      await sleep(500)
      if (options.fsm) {
        await options.fsm.transition('ACTIVE_BATTLE', 'CATCH_SUCCESS')
      }
      gameBus.emit('CATCH_SUCCESS', { side: 'enemy' })
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
      // Esperar un instante tras el último shake fallido
      await sleep(300)
      if (options.fsm) {
        await options.fsm.transition('ACTIVE_BATTLE', 'CATCH_BREAK')
      }
      gameBus.emit('CATCH_BREAK', { side: 'enemy' })
      addLog(`¡Oh, no! ¡El Pokémon se ha escapado!`, 'log-info', e)
      
      if (options.ctx?.animations?.handleReleaseRequest) {
        await options.ctx.animations.handleReleaseRequest({ side: 'enemy' })
      } else {
        // Trigger energy release animation because it broke free
        gameBus.emit('PLAY_RELEASE_ENERGY', { side: 'enemy' })
        // Wait for release animation to finish before showing HUD again
        await sleep(800)
      }
      
      if (options.fsm) {
        await options.fsm.transition('ACTIVE_BATTLE', 'FADEOUT_BALL')
        if (options.ctx?.animations?.playBallFadeOut) {
          await options.ctx.animations.playBallFadeOut('enemy')
        }
      }
    }
  } else {
    // Entrada de entrenador (siempre, para feedback inmediato)
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
          await sleep(600)
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
