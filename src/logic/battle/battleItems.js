/**
 * battleItems.js
 * Logic for using items (balls and healing) in battle.
 */
import { calculateCatchRate } from './battleEngine'
import { useItemOnPokemon } from '../providers/itemProvider'

export async function handleItemUsage(itemName, p, e, options = {}) {
  const { 
    eventStore, 
    addLog, 
    audio, 
    consumeItem 
  } = options

  if (itemName.toLowerCase().includes('ball')) {
    addLog(`¡Has lanzado una ${itemName}!`, 'log-info')
    const eventCatchMult = eventStore.globalMultipliers?.catch || 1
    const caught = calculateCatchRate(e, itemName, eventCatchMult)
    
    await new Promise(r => setTimeout(r, 1500))

    if (caught) {
      audio.caught()
      addLog(`¡Ya está! ¡${e.name} atrapado!`, 'log-catch')
      consumeItem(itemName)
      
      // Captured!
      return { action: 'capture', pokemon: e }
    } else {
      addLog(`¡Oh, no! ¡El Pokémon se ha escapado!`, 'log-info')
    }
  } else {
    const result = useItemOnPokemon(itemName, p)
    if (result) {
      addLog(`Usaste ${itemName}. ¡${p.name} ${result}!`, 'log-player')
      consumeItem(itemName)
      return { action: 'heal' }
    } else {
      addLog('No tuvo efecto.', 'log-info')
      return { action: 'fail' }
    }
  }

  return { action: 'enemy_turn' }
}
