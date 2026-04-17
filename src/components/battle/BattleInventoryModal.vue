<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useUIStore } from '@/stores/ui'
import { SHOP_ITEMS } from '@/data/items'

const gameStore = useGameStore()
const battleStore = useBattleStore()
const uiStore = useUIStore()
const invStore = useInventoryStore()

const isOpen = computed(() => uiStore.isBattleInventoryOpen)
const inventory = computed(() => gameStore.state.inventory || {})

const usableItems = computed(() => {
  return Object.entries(inventory.value)
    .filter(([name, qty]) => {
      if (qty <= 0) return false
      
      const itemData = SHOP_ITEMS.find(i => i.name === name)
      if (!itemData) return false

      // Filters from legacy 11_battle_ui.js
      if (name.startsWith('MT')) return false
      
      const nonCombat = [
        'Recordador de Movimientos', 'Caramelo Raro', 'Subida de PP', 
        'Píldora de cambio de habilidad', 'Parche de naturaleza', 'Caramelo de vigor',
        'Repelente', 'Superrepelente', 'Máximo Repelente',
        'Ticket Shiny', 'Moneda Amuleto', 'Huevo Suerte Pequeño',
        'Ticket Safari', 'Ticket Cueva Celeste', 'Ticket Articuno', 'Ticket Mewtwo',
        'Escáner de IVs', 'Fósil Hélix', 'Fósil Domo', 'Ámbar Viejo'
      ]
      if (nonCombat.includes(name)) return false

      // Only battle-relevant categories
      return ['pokeballs', 'pociones'].includes(itemData.cat)
    })
    .map(([name, qty]) => {
      const data = SHOP_ITEMS.find(i => i.name === name)
      return { name, qty, ...data }
    })
})

const close = () => {
  uiStore.isBattleInventoryOpen = false
}

const handleUse = (item) => {
  if (item.cat === 'pokeballs') {
    // Pokéballs act on the enemy automatically
    battleStore.useItemInBattle(item.name)
    close()
  } else {
    // Potions need a target
    invStore.activeItemToUse = item.name
    invStore.isItemTargetModalOpen = true
    // We don't close the inventory yet, the TargetModal will overlap correctly
  }
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="modal-overlay"
      @click.self="close"
    >
      <div class="inventory-modal-card">
        <div class="modal-header">
          <div class="icon-header">
            🎒
          </div>
          <h2>MOCHILA DE COMBATE</h2>
          <p>Objetos útiles durante la batalla</p>
        </div>

        <div class="items-list">
          <div
            v-if="usableItems.length === 0"
            class="empty-msg"
          >
            No tienes objetos utilizables en este momento.
          </div>
          
          <div 
            v-for="item in usableItems" 
            :key="item.name"
            class="item-row"
            @click="handleUse(item)"
          >
            <div class="item-sprite">
              <img
                :src="item.sprite"
                :alt="item.name"
              >
            </div>
            
            <div class="item-info">
              <div class="item-name">
                {{ item.name }}
              </div>
              <div class="item-qty">
                x{{ item.qty }}
              </div>
            </div>

            <button class="use-btn">
              USAR
            </button>
          </div>
        </div>

        <button
          class="cancel-btn"
          @click="close"
        >
          CERRAR
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.inventory-modal-card {
  background: var(--card);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  width: 100%;
  max-width: 420px;
  padding: 24px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.8);
  animation: slideUp 0.3s ease-out;
}

.modal-header {
  text-align: center;
  margin-bottom: 24px;
}

.icon-header { font-size: 32px; margin-bottom: 8px; }

h2 {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: var(--yellow);
  margin: 0 0 10px 0;
}

p { color: var(--gray); font-size: 11px; margin: 0; }

.items-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
  max-height: 450px;
  overflow-y: auto;
  padding-right: 4px;
}

.empty-msg {
  text-align: center;
  color: var(--gray);
  font-size: 12px;
  padding: 40px 0;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.item-row:hover {
  background: rgba(255, 217, 61, 0.1);
  border-color: rgba(255, 217, 61, 0.3);
  transform: scale(#{1.02});
}

.item-sprite img {
  width: 40px;
  height: 40px;
  image-rendering: auto;
}

.item-info { flex: 1; }
.item-name { font-weight: 700; font-size: 14px; color: white; }
.item-qty { font-size: 11px; color: var(--gray); margin-top: 2px; }

.use-btn {
  background: rgba(107, 203, 119, 0.15);
  color: var(--green);
  border: 1px solid rgba(107, 203, 119, 0.3);
  padding: 8px 14px;
  border-radius: 10px;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  cursor: pointer;
  transition: all 0.2s;
}

.item-row:hover .use-btn { background: var(--green); color: black; }

.cancel-btn {
  width: 100%;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-radius: 16px;
  color: var(--gray);
  font-family: 'Press Start 2P', monospace;
  font-size: 9px;
  cursor: pointer;
}

.cancel-btn:hover { background: rgba(255, 255, 255, 0.1); color: white; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
