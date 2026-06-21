import type { DebugSystem } from '@/stores/debug'

import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useBreedingStore } from '@/stores/breeding'

import { getItemById, SHOP_ITEMS } from '@/data/inventory/items'

export function registerItemTools(debug: DebugSystem) {
  const game = useGameStore()
  const ui = useUIStore()
  const breedingStore = useBreedingStore()

  debug.register({
    id: 'item-add',
    label: 'AÑADIR ITEM',
    command: 'addItem',
    category: 'items',
    action: (id: string, qty = 10) => {
      const item = getItemById(id)
      const inventory = { ...game.state.inventory }
      inventory[item.id] = ((inventory[item.id] as number) || 0) + qty
      game.state.inventory = inventory
      ui.notify(`Debug: +${qty} ${item.name}`, '🎒')
      game.saveGame(false)
    },
    description: 'Añade una cantidad de un item a la mochila.'
  })

  debug.register({
    id: 'item-fill-all',
    label: 'LLENAR MOCHILA',
    command: 'fillInventory',
    category: 'items',
    action: (qty = 50) => {
      const inventory = { ...game.state.inventory }
      SHOP_ITEMS.forEach(item => {
        inventory[item.id] = qty
      })
      game.state.inventory = inventory
      ui.notify(`Debug: Mochila llena (${SHOP_ITEMS.length} tipos de objetos)`, '🎒')
      game.saveGame(false)
    },
    description: 'Añade una cantidad de TODOS los objetos de la base de datos.'
  })

  // MISSIONS
  debug.register({
    id: 'mission-regenerate',
    label: 'REGENERAR MISIONES',
    command: 'regenerateMissions',
    category: 'missions',
    action: () => {
      const today = Temporal.Now.instant().toString().split('T')[0]
      breedingStore.regenerateMissions(today as string)
      ui.notify('Misiones de Guardería regeneradas', '📜')
    },
    description: 'Fuerza la regeneración de las misiones diarias de la guardería.'
  })

  debug.register({
    id: 'mission-clear',
    label: 'LIMPIAR MISIONES',
    command: 'clearMissions',
    category: 'missions',
    action: () => {
      game.state.daycare_missions = []
      ui.notify('Misiones de Guardería eliminadas', '🗑️')
      game.saveGame(false)
    },
    description: 'Elimina todas las misiones actuales de la guardería.'
  })

  debug.register({
    id: 'setup-cloning-test',
    label: 'CONFIGURAR TEST CLONACIÓN',
    command: 'setupCloningTest',
    category: 'items',
    action: () => {
      game.state.money = 100000
      game.state.inventory['dome_fossil'] = 10
      game.state.inventory['helix_fossil'] = 10
      game.state.inventory['old_amber'] = 10
      ui.notify('Debug: $100K y 10x de cada fósil añadidos', '🧪')
      game.saveGame(false)
    },
    description: 'Añade $100K y 10 unidades de cada fósil para testear la clonación.'
  })
}
