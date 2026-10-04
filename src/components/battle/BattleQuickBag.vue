<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBattleStore } from '@/stores/battle/battle'
import { useUIStore } from '@/stores/ui'
import { useModalStore } from '@/stores/modals'

import { requireItemId, getItemById, type ItemId } from '@/data/inventory/items'
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
  tier?: ItemTier
}

const inventory = computed(() => gameStore.state.inventory || {})

const battleItems = computed<BattleItem[]>(() => {
  const items: BattleItem[] = []
  Object.entries(inventory.value).forEach(([name, qty]) => {
    const count = qty as number
    if (count <= 0) return
    const itemData = getItemById(name)
    if (!itemData) return
    
    if (itemData.nonCombat) return
    if (itemData.cat === 'potions' || (itemData.cat === 'pokeballs' && (battleStore.uiConfig ? battleStore.uiConfig.allowCatch : true))) {
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
  
  return items.toSorted((a, b) => {
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

  const dbItem = getItemById(item.id)
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
        <span class="emoji empty-icon">🎒</span>
        <span class="empty-text">SIN OBJETOS</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.battle-quick-bag {
  @include gpu-layer;
  @include smooth-scroll;

  height: auto !important;
  min-height: 100%; // Fix flex scroll collapse
  padding: 0 !important;
  border: none !important;
  background: transparent !important;
  overflow: hidden auto !important;

  &::-webkit-scrollbar:horizontal {
    display: none !important;
    height: 0 !important;
  }
}

.quick-bag-grid {
  position: relative;
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, 76px); // Rellena con más columnas de 76px si el espacio lo permite
  width: 100%;
  min-height: 100%;
  padding: 12px 10px 10px;
  place-content: start center;
}

.quick-item-card {
  @include item-tier-card;

  position: relative;
  z-index: calc(var(--z-base) + 1);
  display: flex;
  justify-content: center;
  align-items: center; 
  padding: 0;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: 12px;
  background: Rgb(30 41 59 / 80%);
  cursor: pointer;
  aspect-ratio: 1;
  overflow: visible !important; // Permitir que el badge respire por debajo

  &::after {
    position: absolute;
    border-radius: inherit; // Mantener la forma
    background: Linear-Gradient(135deg, Rgb(255 255 255 / 5%), transparent);
    content: '';
    inset: 0;
    pointer-events: none;
  }

  &.is-disabled {
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: none;
  }
}

.card-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  
  .item-bg-glow {
    position: absolute;
    z-index: var(--z-base);
    width: 60%;
    height: 60%;
    background: Radial-Gradient(circle, Rgb(255 255 255 / 10%) 0%, transparent 70%);
    will-change: transform, filter, opacity;
    filter: Blur(5px);
  }
}

.item-sprite-wrap {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  transform: Translatey(-8px); // Subir un poco más el sprite
  
  .item-sprite {
    @include sprite-render;

    position: absolute;
    min-width: 60px; 
    min-height: 60px;
    will-change: transform, filter, opacity;
    filter: 
      Drop-Shadow(0 4px 8px Rgb(0 0 0 / 50%))
      Brightness(1.1); 
    pointer-events: none;
  }
}

// Sprite scale handled entirely by GSAP in hoverEnter.ts / hoverLeave.ts

.item-qty-badge {
  @include pixelated;

  position: absolute;
  bottom: -6px; // Aire por debajo del contenedor
  left: 50%;
  z-index: var(--z-low);
  width: max-content; 
  padding: 1px 6px;
  border: 1px solid var(--yellow);
  border-radius: 4px; 
  background: Rgb(0 0 0 / 85%);
  color: white;
  font-size: 8px;
  transform: Translatex(-50%);
  text-shadow: 1px 1px 0 black;
  white-space: nowrap;
}

.empty-bag-overlay {
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  opacity: 0.2;
  inset: 0;
  pointer-events: none;
  
  .empty-icon { font-size: 24px; margin-bottom: 4px; }
  .empty-text { @include pixelated; font-size: 8px; }
}
</style>
