<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle/battle'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'

import { requireItemId, SHOP_ITEMS, type ItemId } from '@/data/inventory/items'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { isValidTarget } from '@/logic/items/itemEffects'
import PVTooltip from '@/components/common/PVTooltip.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { ItemTier } from '@/types/inventory/items'

const gameStore = useGameStore()
const battleStore = useBattleStore()
const uiStore = useUIStore()
const modalStore = useModalStore()


interface BattleItem {
  id: ItemId
  name: string
  desc: string
  cat: string
  sprite: string
  qty: number
  tier?: 'common' | 'rare' | 'epic' | 'legend'
}

const inventory = computed(() => gameStore.state.inventory || {})

const battleItems = computed<BattleItem[]>(() => {
  const items: BattleItem[] = []
  Object.entries(inventory.value).forEach(([name, qty]) => {
    const count = qty as number
    if (count <= 0) return
    const itemData = SHOP_ITEMS.find(i => i.id === name || i.name === name)
    if (!itemData) return
    
    const isTrainer = battleStore.state?.isTrainer
    if (itemData.nonCombat) return
    if (itemData.cat === 'potions' || (itemData.cat === 'pokeballs' && !isTrainer)) {
      items.push({ 
        ...itemData, 
        id: requireItemId(itemData.id),
        qty: count,
        desc: itemData.desc ?? '',
        sprite: itemData.sprite ?? '',
        tier: (itemData.tier || 'common') as ItemTier
      })
    }
  })
  
  return items.sort((a, b) => {
    const isAPotion = a.cat === 'potions'
    const isBPotion = b.cat === 'potions'
    if (isAPotion !== isBPotion) return isAPotion ? -1 : 1
    return a.name.localeCompare(b.name)
  })
})

import { isPokemonLocked } from '@/logic/pokemon/pokemonUtils'

const canUseItems = computed(() => {
  const p = battleStore.state?.player
  if (!p) return false
  
  if (battleStore.isProcessing || battleStore.isIntroAnimating) return false
  if (battleStore.currentSubState !== 'WAIT_INPUT') return false
  
  if (isPokemonLocked(p)) {
    return false
  }
  
  return true
})

const handleUseItem = (item: BattleItem) => {
  if (battleStore.isProcessing || battleStore.isIntroAnimating) return
  if (!canUseItems.value) return

  const dbItem = SHOP_ITEMS.find(i => i.id === item.id)
  if (!dbItem) return

  // 1. Pokéballs: Uso directo
  if (dbItem.cat === 'pokeballs') {
    battleStore.useItemInBattle(dbItem.id)
    return
  }

  // 2. Objetos de Selección: Buscar objetivos válidos
  const validTargets = (gameStore.state.team || []).filter(p => isValidTarget(dbItem.id, p))
  
  if (validTargets.length === 0) {
    uiStore.notify(`Este objeto no tiene objetivos válidos en tu equipo`, '🎒')
    return
  }

  // 3. Abrir modal de selección
  modalStore.open('PokemonSelection', {
    title: `USAR ${dbItem.name?.toUpperCase()}`,
    isBattleSwitch: false, 
    includeTeam: true,
    autoConfirm: true,
    allowDead: dbItem.id.toLowerCase().includes('revive'),
    allowedIds: validTargets.map(p => p.uid),
    activePokemonUid: battleStore.isBattleActive ? battleStore.player?.uid : null,
    onConfirm: (selected: unknown) => {
      const selectedPokes = selected as Pokemon[]
      if (selectedPokes && selectedPokes.length > 0) {
        const index = (gameStore.state.team || []).findIndex(p => p.uid === selectedPokes[0]!.uid)
        if (index !== -1) {
          battleStore.useItemInBattle(dbItem.id, index)
        }
      }
    }
  })
}

const getTierColor = (t?: string) => {
  if (t === 'common') return '#94a3b8'
  if (t === 'rare') return 'var(--blue)'
  if (t === 'epic') return 'var(--purple)'
  if (t === 'legend') return 'var(--yellow)'
  return '#94a3b8'
}
</script>

<template>
  <div 
    class="battle-quick-bag premium-frame"
  >
    <div class="quick-bag-grid">
      <div
        v-for="item in battleItems"
        :id="`battle-item-${item.id}`"
        :key="item.id"
        :class="['quick-item-card', 'tier-' + (item.tier || 'common'), { 'is-disabled': !canUseItems }]"
        :data-item-id="item.id"
        :style="{ '--tier-color': getTierColor(item.tier) }"
        @click.stop="handleUseItem(item)"
      >
        <PVTooltip
          :title="item.name"
          :description="item.desc"
          position="left"
        >
          <div class="card-inner">
            <div class="item-bg-glow" />
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
  height: auto !important;
  min-height: 100%; // Fix flex scroll collapse
  overflow-y: auto !important;
  overflow-x: hidden !important;
  @include gpu-layer;
  @include smooth-scroll;

  &::-webkit-scrollbar:horizontal {
    display: none !important;
    height: 0 !important;
  }
}

.quick-bag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 76px); // Rellena con más columnas de 76px si el espacio lo permite
  gap: 8px;
  width: 100%;
  padding: 12px 10px 10px 10px;
  justify-content: center;
  align-content: start;
  min-height: 100%;
  position: relative;
}

.quick-item-card {
  position: relative;
  z-index: calc(var(--z-base) + 1);
  background: Rgba(30, 41, 59, 0.8);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 12px; 
  padding: 0;
  cursor: pointer;
  
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

  &.is-disabled {
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: none;
  }

  @include item-tier-card;
}

.card-inner {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  
  .item-bg-glow {
    position: absolute;
    width: 60%;
    height: 60%;
    background: Radial-Gradient(circle, Rgba(255, 255, 255, 0.1) 0%, Transparent 70%);
    will-change: transform, filter, opacity;
    filter: Blur(5px);
    z-index: var(--z-base);
  }
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
    
    pointer-events: none;
  }
}

// Sprite scale handled entirely by GSAP in hoverEnter.ts / hoverLeave.ts

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
