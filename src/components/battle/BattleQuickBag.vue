<script setup lang="ts">
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
import type { Pokemon } from '@/types/pokemon'

const gameStore = useGameStore()
const battleStore = useBattleStore()
const uiStore = useUIStore()
const modalStore = useModalStore()
const inventoryStore = useInventoryStore()

interface BattleItem {
  id: string
  name: string
  desc: string
  cat: string
  sprite: string
  qty: number
}

const inventory = computed(() => gameStore.state.inventory || {})

const battleItems = computed<BattleItem[]>(() => {
  const items: BattleItem[] = []
  Object.entries(inventory.value).forEach(([name, qty]) => {
    const count = qty as number
    if (count <= 0) return
    const itemData = SHOP_ITEMS.find(i => i.name === name)
    if (!itemData) return
    
    const isTrainer = battleStore.state?.isTrainer
    if (itemData.cat === 'pociones' || (itemData.cat === 'pokeballs' && !isTrainer)) {
      items.push({ ...itemData, qty: count })
    }
  })
  
  return items.sort((a, b) => {
    if (a.cat !== b.cat) return a.cat === 'pociones' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
})

const handleUseItem = (item: BattleItem) => {
  if (battleStore.isProcessing || battleStore.isIntroAnimating) return

  const dbItem = SHOP_ITEMS.find(i => i.id === item.id || i.name === item.name)
  if (!dbItem) return

  // 1. Pokéballs: Uso directo
  if (dbItem.cat === 'pokeballs') {
    battleStore.useItemInBattle(dbItem.name, null, dbItem.id)
    return
  }

  // 2. Objetos de Selección: Buscar objetivos válidos
  const validTargets = (gameStore.state.team || []).filter(p => isValidTarget(dbItem.name, p))
  
  if (validTargets.length === 0) {
    uiStore.notify(`Este objeto no tiene objetivos válidos en tu equipo`, '🎒')
    return
  }

  // 3. Abrir modal de selección
  modalStore.open('PokemonSelection', {
    title: `USAR ${dbItem.name?.toUpperCase()}`,
    isBattleSwitch: false, 
    includeTeam: true,
    allowDead: dbItem.name?.toLowerCase().includes('revivir'),
    allowedIds: validTargets.map(p => p.uid),
    activePokemonUid: battleStore.isBattleActive ? battleStore.player?.uid : null,
    onConfirm: (selected: unknown) => {
      const selectedPokes = selected as Pokemon[]
      if (selectedPokes && selectedPokes.length > 0) {
        const index = (gameStore.state.team || []).findIndex(p => p.uid === selectedPokes[0]!.uid)
        if (index !== -1) {
          const res = inventoryStore.useItem(dbItem.name, 'team', index)
          if (res.success) {
            uiStore.notify(res.message, '✨')
          } else {
            uiStore.notify(res.message, '⚠️')
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
                @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
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
  @include smooth-scroll;
}

.quick-bag-grid {
  display: grid;
  // Tamaño fijo para evitar que las tarjetas se estiren demasiado en pantallas anchas
  grid-template-columns: repeat(auto-fill, 76px); 
  gap: 8px;
  width: 100%;
  padding: 4px;
  justify-content: center;
  align-content: start;
  min-height: 100%;
  position: relative;
}

.quick-item-card {
  @include premium-card-hover(var(--yellow), 1.02, -4px);
  position: relative;
  background: Rgba(30, 41, 59, 0.8) !important;
  border: 1px solid Rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important; 
  padding: 0 !important;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  aspect-ratio: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: visible !important; // Permitir que el badge respire por debajo

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, Rgba(255, 255, 255, 0.05), transparent);
    pointer-events: none;
    border-radius: inherit; // Mantener la forma
  }

  &:hover {
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
  transform: Translatey(-8px); // Subir un poco más el sprite
  position: relative;
  
  .item-sprite {
    position: absolute;
    min-width: 60px; 
    min-height: 60px;
    @include sprite-render;
    will-change: transform, filter, opacity;
    filter: 
      Drop-Shadow(0 4px 8px Rgba(0,0,0,0.5))
      Brightness(1.1); 
    transition: transform 0.3s ease;
    pointer-events: none;
  }
}

.quick-item-card:hover .item-sprite {
  transform: Scale(1.1); 
}

.item-qty-badge {
  position: absolute;
  bottom: -6px; // Aire por debajo del contenedor
  left: 50%;
  transform: Translatex(-50%); 
  background: Rgba(0, 0, 0, 0.85);
  border: 1px solid var(--yellow);
  color: white;
  font-size: 8px; 
  padding: 1px 6px;
  border-radius: 4px;
  @include pixelated;
  text-shadow: 1px 1px 0px black;
  z-index: var(--z-low);
  white-space: nowrap;
  width: max-content;
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
