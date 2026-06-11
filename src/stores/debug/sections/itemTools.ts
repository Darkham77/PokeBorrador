
import { SHOP_ITEMS } from '@/data/items'

import type { DebugSystem, DebugContext } from '@/stores/debug'

export function registerItemTools(debug: DebugSystem, { game, ui, breedingStore }: DebugContext) {
  debug.register({
    id: 'item-add',
    label: 'AÑADIR ITEM',
    command: 'addItem',
    category: 'items',
    action: (name: string, qty = 10) => {
      const item = SHOP_ITEMS.find(i => i.name === name || i.id === name)
      const key = item ? item.id : name
      game.state.inventory[key] = ((game.state.inventory[key] as number) || 0) + qty
      ui.notify(`Debug: +${qty} ${item ? item.name : name}`, '🎒')
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
      SHOP_ITEMS.forEach(item => {
        game.state.inventory[item.id] = qty
      })
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
