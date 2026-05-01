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

  if (itemName.toLowerCase().includes('ball')) {
    addLog(`Usaste ${itemName}`, 'log-info', 'player')
    addLog(`¡Has lanzado una ${itemName}!`, 'log-catch', itemName, 'player')
    
    const eventCatchMult = eventStore.globalMultipliers?.catch || 1
    const { caught, shakes } = calculateCatchRate(e, itemName, eventCatchMult)
    
    // 1. Iniciar animación de entrada (energía azul)
    gameBus.emit('PLAY_CATCH_ENERGY', { side: 'enemy', ballId: itemName })
    
    // Esperar a que el Pokémon termine de entrar en la bola (800ms aprox)
    await new Promise(r => setTimeout(r, 1000))

    // 2. Ejecutar los intentos de agitación (shakes)
    for (let i = 0; i < shakes; i++) {
      gameBus.emit('CATCH_SHAKE', { side: 'enemy' })
      // Duración de un shake + pequeña pausa
      await new Promise(r => setTimeout(r, 1000))
    }

    // 3. Resultado final
    if (caught) {
      // Pequeña pausa dramática antes del click de éxito
      await new Promise(r => setTimeout(r, 500))
      audio.caught()
      gameBus.emit('CATCH_SUCCESS', { side: 'enemy' })
      addLog(`¡Ya está! ¡${e.name} atrapado!`, 'log-catch', e)
      consumeItem(itemName)
      
      // Captured!
      return { action: 'capture', pokemon: e }
    } else {
      // Esperar un instante tras el último shake fallido
      await new Promise(r => setTimeout(r, 300))
      gameBus.emit('CATCH_BREAK', { side: 'enemy' })
      addLog(`¡Oh, no! ¡El Pokémon se ha escapado!`, 'log-info', e)
      // Trigger energy release animation because it broke free
      gameBus.emit('PLAY_RELEASE_ENERGY', { side: 'enemy' })
    }
  } else {
    // Entrada de entrenador (siempre, para feedback inmediato)
    addLog(`Usaste ${itemName}`, 'log-info', 'player')
    
    const result = useItemOnPokemon(itemName, p)
    if (result) {
      addLog(`¡${p.name} ${result}!`, 'log-info', itemName, 'player')
      consumeItem(itemName)
      return { action: 'heal' }
    } else {
      addLog('No tuvo efecto.', 'log-info')
      return { action: 'fail' }
    }
  }

  return { action: 'enemy_turn' }
}
