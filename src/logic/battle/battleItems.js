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
    addLog(`¡Has lanzado una ${itemName}!`, 'log-catch', itemName)
    
    // Trigger energy catch animation for the attempt
    gameBus.emit('PLAY_CATCH_ENERGY', { side: 'enemy' })
    
    const eventCatchMult = eventStore.globalMultipliers?.catch || 1
    const caught = calculateCatchRate(e, itemName, eventCatchMult)
    
    // Simular tiempo de captura
    await new Promise(r => setTimeout(r, 1500))

    if (caught) {
      audio.caught()
      addLog(`¡Ya está! ¡${e.name} atrapado!`, 'log-catch', e)
      consumeItem(itemName)
      
      // Captured!
      return { action: 'capture', pokemon: e }
    } else {
      addLog(`¡Oh, no! ¡El Pokémon se ha escapado!`, 'log-info')
      // Trigger energy release animation because it broke free
      gameBus.emit('PLAY_RELEASE_ENERGY', { side: 'enemy' })
    }
  } else {
    const result = useItemOnPokemon(itemName, p)
    if (result) {
      addLog(`Usaste ${itemName}. ¡${p.name} ${result}!`, 'log-catch', itemName)
      consumeItem(itemName)
      return { action: 'heal' }
    } else {
      addLog('No tuvo efecto.', 'log-info')
      return { action: 'fail' }
    }
  }

  return { action: 'enemy_turn' }
}
