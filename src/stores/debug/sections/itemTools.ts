import type { DebugSystem } from '@/stores/debug'

import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useBreedingStore } from '@/stores/breeding'

import { getItemById, requireItemId, SHOP_ITEMS } from '@/data/inventory/items'
import type { Inventory } from '@/types/inventory/items';

const DEBUG_DEFAULT_ITEM_QTY = 10
const DEBUG_FILL_INVENTORY_QTY = 50
const DEBUG_CLONING_TEST_MONEY = 100_000
const DEBUG_CLONING_TEST_FOSSIL_QTY = 10

export function registerItemTools(debug: DebugSystem) {
  const game = useGameStore()
  const ui = useUIStore()
  const breedingStore = useBreedingStore()

  debug.register({
    id: 'item-add',
    label: 'AÑADIR ITEM',
    command: 'addItem',
    category: 'items',
    action: (id: string, qty = DEBUG_DEFAULT_ITEM_QTY) => {
      const resolvedId = requireItemId(id)
      const item = getItemById(resolvedId)
      const itemName = item.name
      const inventory: Inventory = { ...game.state.inventory }
      inventory[resolvedId] = ((inventory[resolvedId]) || 0) + qty
      game.state.inventory = inventory
      ui.notify(`Debug: +${qty} ${itemName}`, '🎒')
      game.saveGame(false)
    },
    description: 'Añade una cantidad de un item a la mochila.'
  })

  debug.register({
    id: 'item-fill-all',
    label: 'LLENAR MOCHILA',
    command: 'fillInventory',
    category: 'items',
    action: (qty = DEBUG_FILL_INVENTORY_QTY) => {
      const inventory: Inventory = { ...game.state.inventory }
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
      game.state.money = DEBUG_CLONING_TEST_MONEY
      game.state.inventory['domefossil'] = DEBUG_CLONING_TEST_FOSSIL_QTY
      game.state.inventory['helixfossil'] = DEBUG_CLONING_TEST_FOSSIL_QTY
      game.state.inventory['oldamber'] = DEBUG_CLONING_TEST_FOSSIL_QTY
      ui.notify(`Debug: $${DEBUG_CLONING_TEST_MONEY.toLocaleString()} y ${DEBUG_CLONING_TEST_FOSSIL_QTY}x de cada fósil añadidos`, '🧪')
      game.saveGame(false)
    },
    description: `Añade $100K y ${DEBUG_CLONING_TEST_FOSSIL_QTY} unidades de cada fósil para testear la clonación.`
  })
}
