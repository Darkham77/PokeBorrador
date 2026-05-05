<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'
import { useInventoryStore } from '@/stores/inventory'
import { SHOP_ITEMS } from '@/data/items'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { isValidTarget } from '@/logic/items/itemEffects'
import PVTooltip from '@/components/common/PVTooltip.vue'

const gameStore = useGameStore()
const battleStore = useBattleStore()
const uiStore = useUIStore()
const modalStore = useModalStore()
const inventoryStore = useInventoryStore()

const inventory = computed(() => gameStore.state.inventory || {})

const battleItems = computed(() => {
  const items = []
  Object.entries(inventory.value).forEach(([name, qty]) => {
    const itemData = SHOP_ITEMS.find(i => i.name === name)
    if (!itemData) return
    
    if (itemData.cat === 'pokeballs' || itemData.cat === 'pociones') {
      items.push({ ...itemData, qty })
    }
  })
  
  return items.sort((a, b) => {
    if (a.cat !== b.cat) return a.cat === 'pociones' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
})

const handleUseItem = (item) => {
  if (battleStore.isProcessing || battleStore.isIntroAnimating) return

  // Algoritmo idéntico a InventoryModal.vue
  const dbItem = SHOP_ITEMS.find(i => i.id === item.id || i.name === item.name)
  if (!dbItem) return

  // 1. Pokéballs: Uso directo
  if (dbItem.cat === 'pokeballs') {
    battleStore.useItemInBattle(dbItem.name)
    return
  }

  // 2. Objetos de Selección: Buscar objetivos válidos
  const validTargets = gameStore.state.team.filter(p => isValidTarget(dbItem.name, p))
  
  if (validTargets.length === 0) {
    uiStore.notify(`Este objeto no tiene objetivos válidos en tu equipo`, '🎒')
    return
  }

  // 3. Abrir modal de selección (mismo algoritmo que Mochila)
  modalStore.open('PokemonSelection', {
    title: `USAR ${dbItem.name?.toUpperCase()}`,
    isBattleSwitch: false, 
    includeTeam: true,
    allowDead: dbItem.name?.toLowerCase().includes('revivir'),
    allowedIds: validTargets.map(p => p.uid),
    activePokemonUid: battleStore.isBattleActive ? battleStore.player?.uid : null,
    onConfirm: (selected) => {
      if (selected && selected.length > 0) {
        const index = gameStore.state.team.findIndex(p => p.uid === selected[0].uid)
        if (index !== -1) {
          const res = inventoryStore.useItem(dbItem.name, 'team', index)
          if (res.success) {
            uiStore.notify(res.msg, '✨')
          } else {
            uiStore.notify(res.msg, '⚠️')
          }
        }
      }
    }
  })
}
</script>

<template>
  <div 
    class="battle-quick-bag premium-frame"
    :class="{ 'is-disabled': battleStore.isProcessing || battleStore.isIntroAnimating }"
  >
    <div class="quick-bag-grid">
      <div
        v-for="item in battleItems"
        :key="item.id"
        class="quick-item-card"
        @click.stop="handleUseItem(item)"
      >
        <PVTooltip
          :title="item.name"
          :description="item.desc"
          position="left"
        >
          <div class="card-inner">
            <div class="item-sprite-wrap">
              <img 
                :src="getAssetUrl(ASSET_TYPES.ITEM, item.sprite)" 
                class="item-sprite"
                :alt="item.name"
                @error="e => e.target.style.display = 'none'"
              >
            </div>
            <div class="item-qty-badge">
              x{{ item.qty }}
            </div>
          </div>
        </PVTooltip>
      </div>

      <div
        v-if="battleItems.length === 0"
        class="empty-bag-overlay"
      >
        <span class="empty-icon">🎒</span>
        <span class="empty-text">SIN OBJETOS</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.battle-quick-bag {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  height: 100% !important;
  min-height: 0; // Fix flex scroll collapse
  overflow-y: auto !important;
  @include gpu-layer;
  @include smooth-scroll;
  transition: opacity 0.3s ease;

  &.is-disabled {
    opacity: 0.5;
    pointer-events: none;
    filter: Grayscale(0.2);
  }
}

.quick-bag-grid {
  display: grid;
  // Tamaño fijo para evitar que las tarjetas se estiren demasiado en pantallas anchas
  grid-template-columns: repeat(auto-fill, 76px); 
  gap: 8px;
  width: 100%;
  padding: 12px;
  justify-content: center;
  align-content: start;
  min-height: 100%;
  position: relative;
}

.quick-item-card {
  position: relative;
  background: Rgba(30, 41, 59, 0.8) !important;
  border: 1px solid Rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important; // Menos redondeado, más premium
  padding: 0 !important;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  aspect-ratio: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: Linear-Gradient(135deg, Rgba(255, 255, 255, 0.05), transparent);
    pointer-events: none;
  }

  &:hover {
    background: Rgba(45, 55, 72, 0.9) !important;
    border-color: var(--yellow) !important;
    box-shadow: 
      0 0 15px Rgba(255, 214, 10, 0.2),
      inset 0 0 10px Rgba(255, 214, 10, 0.1) !important;
    transform: TranslateY(-2px) !important;
    z-index: calc(var(--z-base) + 2);
  }

  &:active {
    transform: Scale(0.95) !important;
  }
}

.card-inner {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.item-sprite-wrap {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  // Permitir que el sprite sea más grande que el contenedor
  position: relative;
  
  .item-sprite {
    position: absolute;
    min-width: 60px; // 1.5x del tamaño base para un oversize equilibrado
    min-height: 60px;
    image-rendering: pixelated;
    filter: 
      Drop-Shadow(0 4px 8px Rgba(0,0,0,0.5))
      Brightness(1.1); // Un poco de brillo extra para resaltar el detalle
    transition: transform 0.3s ease;
    pointer-events: none;
    
    // El clipping lo maneja el .quick-item-card { overflow: hidden }
  }
}

.quick-item-card:hover .item-sprite {
  transform: Scale(1.1); // Micro-animación al hover
}

.item-qty-badge {
  position: absolute;
  bottom: 2px; // Más abajo
  left: 50%;
  transform: TranslateX(-50%); // Centrado horizontalmente
  background: Rgba(0, 0, 0, 0.85);
  border: 1px solid var(--yellow);
  color: white;
  font-size: 8px; // Un poco más pequeño para no tapar tanto
  padding: 1px 6px;
  border-radius: 4px;
  @include pixelated;
  text-shadow: 1px 1px 0px black;
  z-index: var(--z-low);
  white-space: nowrap;
}

.empty-bag-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0.2;
  pointer-events: none;
  
  .empty-icon { font-size: 24px; margin-bottom: 4px; }
  .empty-text { font-size: 8px; @include pixelated; }
}
</style>
