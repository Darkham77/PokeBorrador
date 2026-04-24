<script setup>
/**
 * BattleInventoryModal
 * Standardized modal for using items during battle.
 */
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle'
import { useInventoryStore } from '@/stores/inventory'
import { SHOP_ITEMS } from '@/data/items'
import BaseModal from '@/components/common/BaseModal.vue'

defineProps({
  show: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const gameStore = useGameStore()
const battleStore = useBattleStore()
const invStore = useInventoryStore()

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
      return ['pokeballs', 'pociones', 'cura_estado', 'held'].includes(itemData.cat)
    })
    .map(([name, qty]) => {
      const data = SHOP_ITEMS.find(i => i.name === name)
      return { name, qty, ...data }
    })
})

const close = () => {
  emit('close')
}

const handleUse = (item) => {
  if (item.cat === 'pokeballs') {
    battleStore.useItemInBattle(item.name)
    close()
  } else {
    invStore.activeItemToUse = item.name
    invStore.isItemTargetModalOpen = true
  }
}
</script>

<template>
  <BaseModal
    :show="show"
    title="MOCHILA DE COMBATE"
    title-color="var(--yellow)"
    header-background="#1a1c2e"
    max-width="440px"
    variant="retro"
    @close="close"
  >
    <div class="battle-inv-content">
      <p class="battle-inv-help">
        Objetos útiles durante la batalla
      </p>

      <div class="items-list custom-scrollbar-vicio">
        <div
          v-if="usableItems.length === 0"
          class="empty-msg"
        >
          No tienes objetos utilizables en este momento.
        </div>
        
        <div 
          v-for="item in usableItems" 
          :key="item.name"
          class="item-row-vicio"
          @click="handleUse(item)"
        >
          <div class="item-sprite-box">
            <img
              :src="item.sprite"
              :alt="item.name"
              @error="e => e.target.style.display = 'none'"
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

          <div class="use-hint">
            USAR
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        class="btn-vicio-secondary btn-vicio-full"
        @click="close"
      >
        CERRAR
      </button>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.battle-inv-content {
  padding: 8px 0;
}

.battle-inv-help {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  line-height: 1.5;
  margin-bottom: 24px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 450px;
  padding-right: 4px;
  @include smooth-scroll;
}

.empty-msg {
  text-align: center;
  color: rgba(255, 255, 255, 0.2);
  font-family: 'Press Start 2P', cursive;
  font-size: 8px;
  padding: 60px 20px;
  @include pixelated;
}

.item-row-vicio {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &:hover {
    background: rgba(255, 217, 61, 0.1);
    border-color: var(--yellow);
    transform: translateX(4px);
    
    .item-name { color: var(--yellow); }
    .use-hint { opacity: 1; }
  }
}

.item-sprite-box {
  width: 44px;
  height: 44px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  img {
    width: 36px;
    height: 36px;
    @include sprite-render;
  }
}

.item-info { flex: 1; }

.item-name {
  font-weight: 700;
  font-size: 14px;
  color: white;
  transition: color 0.2s;
}

.item-qty {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 2px;
  font-family: monospace;
}

.use-hint {
  font-family: 'Press Start 2P', cursive;
  font-size: 7px;
  color: var(--yellow);
  opacity: 0;
  transition: opacity 0.2s;
  @include pixelated;
}
</style>
