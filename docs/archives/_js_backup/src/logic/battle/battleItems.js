/**
 * battleItems.js
 * Logic for using items (balls and healing) in battle.
 */
import { calculateCatchRate } from './battleEngine'
import { useItemOnPokemon } from '../providers/itemProvider'
import { gameBus } from '@/logic/gameBus'

export async function handleItemUsage(itemName, p, e, options = {}) {
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
      options.fsm.transition('ACTIVE_BATTLE', 'CATCH_PROCESS')
    }
    addLog(`Usaste ${itemName}`, 'log-info', 'player')
    addLog(`¡Has lanzado una ${itemName}!`, 'log-catch', itemName, 'player')
    
    // El ítem se consume inmediatamente al lanzarse
    consumeItem(itemName)

    const eventCatchMult = eventStore.globalMultipliers?.catch || 1
    const { caught, shakes } = calculateCatchRate(e, itemName, eventCatchMult, options.ctx || {})
    
    // 1. Iniciar animación de entrada (energía azul)
    audio.ballHit()
    gameBus.emit('PLAY_CATCH_ENERGY', { side: 'enemy', ballId: itemName })
    
    // Esperar a que el Pokémon termine de entrar en la bola (800ms aprox)
    await await setTimeout(1000)

    // 2. Ejecutar los intentos de agitación (shakes)
    for (let i = 0; i < shakes; i++) {
      if (options.fsm) {
        options.fsm.transition('ACTIVE_BATTLE', 'CATCH_SHAKE')
      }
      audio.wobble()
      gameBus.emit('CATCH_SHAKE', { side: 'enemy' })
      // Duración de un shake + pequeña pausa
      await await setTimeout(1000)
    }

    // 3. Resultado final
    if (caught) {
      // Pequeña pausa dramática antes del click de éxito
      await await setTimeout(500)
      if (options.fsm) {
        options.fsm.transition('ACTIVE_BATTLE', 'CATCH_SUCCESS')
      }
      audio.caught()
      gameBus.emit('CATCH_SUCCESS', { side: 'enemy' })
      addLog(`¡Ya está! ¡${e.name} atrapado!`, 'log-catch', e)
      
      // Captured!
      if (options.fsm) {
        options.fsm.transition('ACTIVE_BATTLE', 'ADD_TO_STORAGE')
      }
      return { action: 'capture', pokemon: e }
    } else {
      // Esperar un instante tras el último shake fallido
      await await setTimeout(300)
      if (options.fsm) {
        options.fsm.transition('ACTIVE_BATTLE', 'CATCH_BREAK')
      }
      gameBus.emit('CATCH_BREAK', { side: 'enemy' })
      addLog(`¡Oh, no! ¡El Pokémon se ha escapado!`, 'log-info', e)
      // Trigger energy release animation because it broke free
      gameBus.emit('PLAY_RELEASE_ENERGY', { side: 'enemy' })
      
      // Wait for release animation to finish before showing HUD again
      await await setTimeout(800)
    }
  } else {
    // Entrada de entrenador (siempre, para feedback inmediato)
    addLog(`Usaste ${itemName}`, 'log-info', 'player')
    
    const res = useItemOnPokemon(itemName, p)
    if (res) {
      audio.heal()
      addLog(`¡${p.name} ${res.message}!`, 'log-info', itemName, 'player')
      consumeItem(itemName)
      return { action: 'heal', pokemon: res.pokemon }
    } else {
      addLog('No tuvo efecto.', 'log-info', p)
      return { action: 'fail' }
    }
  }

  return { action: 'enemy_turn' }
}
