<script setup lang="ts">
/**
 * src/components/shared/RewardPillsGroup.vue
 * 
 * Reusable Retro-Modern reward pills list with item sprites,
 * interactive descriptions, and GSAP micro-animations.
 */

import { computed } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getItemById, getItemName } from '@/data/inventory/items'
import PVTooltip from '@/components/common/PVTooltip.vue'

interface RawPrizeData {
  type?: 'money' | 'bc' | 'item' | 'pokemon' | 'mixed'
  amount?: number
  qty?: number
  money?: number
  battleCoins?: number
  item?: string
  items?: Record<string, number>
  species?: string
  shiny?: boolean
  level?: number
}

interface Props {
  prize?: RawPrizeData | Record<string, unknown> | null
  rewards?: Record<string, number> | null
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  prize: null,
  rewards: null,
  size: 'sm'
})

interface NormalizedReward {
  id: string
  type: 'money' | 'bc' | 'item' | 'pokemon'
  title: string
  label: string
  qtyText?: string
  spriteUrl?: string
  icon?: string
  description: string
  colorClass: string
}

function getItemDesc(itemIdOrName: string): string {
  const item = getItemById(itemIdOrName)
  return item?.desc || 'Objeto especial de recompensa.'
}

function getItemSpriteUrl(itemIdOrName: string): string {
  const item = getItemById(itemIdOrName)
  const slug = item?.sprite || item?.id || itemIdOrName
  return getAssetUrl(ASSET_TYPES.ITEM, slug)
}

const normalizedList = computed<NormalizedReward[]>(() => {
  const list: NormalizedReward[] = []

  // 1. If rewards map is provided (e.g. from Arena: { goldbottlecap: 1, ... })
  if (props.rewards && typeof props.rewards === 'object') {
    for (const [key, qty] of Object.entries(props.rewards)) {
      if (typeof qty === 'number' && qty > 0) {
        const name = getItemName(key)
        list.push({
          id: `item-${key}`,
          type: 'item',
          title: name.toUpperCase(), // domain-ok
          label: name,
          qtyText: `x${qty}`,
          spriteUrl: getItemSpriteUrl(key),
          description: getItemDesc(key),
          colorClass: 'item'
        })
      }
    }
    return list
  }

  const p = props.prize as RawPrizeData | null
  if (!p) return list

  // 2. Money (₽)
  let money = 0
  if (typeof p.money === 'number') {
    money = p.money
  } else if (p.type === 'money' && typeof p.amount === 'number') {
    money = p.amount
  }
  if (money > 0) {
    list.push({
      id: 'reward-money',
      type: 'money',
      title: 'POKÉDÓLARES',
      label: `₽${money.toLocaleString()}`,
      icon: '₽',
      description: 'Moneda principal del juego para adquirir objetos, consumibles y mejoras.',
      colorClass: 'money'
    })
  }

  // 3. Battle Coins (BC)
  let bc = 0
  if (typeof p.battleCoins === 'number') {
    bc = p.battleCoins
  } else if (p.type === 'bc' && typeof p.amount === 'number') {
    bc = p.amount
  }
  if (bc > 0) {
    list.push({
      id: 'reward-bc',
      type: 'bc',
      title: 'BATTLE COINS',
      label: `${bc.toLocaleString()} BC`,
      icon: '🪙',
      description: 'Monedas de honor obtenidas en combates competitivos, torneos y eventos.',
      colorClass: 'bc'
    })
  }

  // 4. Single item
  if (p.item) {
    const itId = String(p.item)
    const qty = typeof p.qty === 'number' ? p.qty : (typeof p.amount === 'number' ? p.amount : 1)
    const name = getItemName(itId)
    list.push({
      id: `reward-item-${itId}`,
      type: 'item',
      title: name.toUpperCase(), // domain-ok
      label: name,
      qtyText: `x${qty}`,
      spriteUrl: getItemSpriteUrl(itId),
      description: getItemDesc(itId),
      colorClass: 'item'
    })
  }

  // 5. Multiple items map: { [itemId]: qty }
  if (p.items && typeof p.items === 'object') {
    for (const [itId, itQty] of Object.entries(p.items)) {
      if (typeof itQty === 'number' && itQty > 0) {
        const name = getItemName(itId)
        list.push({
          id: `reward-item-map-${itId}`,
          type: 'item',
          title: name.toUpperCase(), // domain-ok
          label: name,
          qtyText: `x${itQty}`,
          spriteUrl: getItemSpriteUrl(itId),
          description: getItemDesc(itId),
          colorClass: 'item'
        })
      }
    }
  }

  // 6. Pokémon reward
  if (p.type === 'pokemon' || p.species) {
    const sp = String(p.species || '')
    const shiny = Boolean(p.shiny)
    const lv = p.level ? `Nv. ${p.level}` : ''
    list.push({
      id: `reward-poke-${sp}`,
      type: 'pokemon',
      title: `${sp.toUpperCase()}${shiny ? ' ✨ SHINY' : ''}`, // domain-ok
      label: `${sp.toUpperCase()}`, // domain-ok
      qtyText: lv || (shiny ? '✨' : undefined),
      spriteUrl: getAssetUrl(ASSET_TYPES.POKEMON, sp, { isShiny: shiny }),
      description: `Ejemplar Pokémon especial ${shiny ? 'Variocolor (Shiny)' : ''} listo para sumarse a tu equipo.`,
      colorClass: 'pokemon'
    })
  }

  return list
})

// GSAP Micro-interactions
function handlePillEnter(e: MouseEvent) {
  gsap.to(e.currentTarget, {
    y: -2,
    scale: 1.03,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(250, 204, 21, 0.4)',
    boxShadow: '0 4px 12px rgba(250, 204, 21, 0.15)',
    duration: 0.2,
    ease: 'power2.out'
  })
}

function handlePillLeave(e: MouseEvent) {
  gsap.to(e.currentTarget, {
    y: 0,
    scale: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    boxShadow: 'none',
    duration: 0.2,
    ease: 'power2.out'
  })
}
</script>

<template>
  <div 
    v-if="normalizedList.length" 
    class="reward-pills-group"
    :class="[`size-${size}`]"
  >
    <PVTooltip
      v-for="item in normalizedList"
      :key="item.id"
      :title="item.title"
      :description="item.description"
      position="top"
    >
      <div
        class="reward-pill"
        :class="[item.colorClass]"
        @mouseenter="handlePillEnter"
        @mouseleave="handlePillLeave"
      >
        <!-- Item or Pokemon Sprite -->
        <img
          v-if="item.spriteUrl"
          :src="item.spriteUrl"
          class="reward-sprite pixel-art"
          :alt="item.label"
          @error="(e: Event) => ((e.target as HTMLImageElement).style.display = 'none')"
        >

        <!-- Money or Custom Icon -->
        <span 
          v-else-if="item.icon" 
          class="reward-icon"
        >
          {{ item.icon }}
        </span>

        <!-- Label -->
        <span class="reward-label">{{ item.label }}</span>

        <!-- Quantity / Badge -->
        <span 
          v-if="item.qtyText" 
          class="reward-qty"
        >
          {{ item.qtyText }}
        </span>
      </div>
    </PVTooltip>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/mixins" as *;

.reward-pills-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.reward-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 9px;
  font-weight: 600;
  color: Rgba(241, 245, 249, 0.9);
  cursor: help;
  user-select: none;
  box-sizing: border-box;

  .reward-sprite {
    width: 18px;
    height: 18px;
    object-fit: contain;
    @include pixelated;
    filter: Drop-Shadow(0 1px 2px Rgba(0, 0, 0, 0.4));
  }

  .reward-icon {
    font-size: 11px;
    line-height: 1;
    font-weight: 700;
  }

  .reward-label {
    white-space: nowrap;
  }

  .reward-qty {
    @include pixelated;
    font-size: 7px;
    color: var(--yellow);
    padding: 1px 4px;
    border-radius: 3px;
    background: Rgba(250, 204, 21, 0.12);
    border: 1px solid Rgba(250, 204, 21, 0.25);
    margin-left: 2px;
  }

  // Color Variants
  &.money {
    color: #4ade80;
    border-color: Rgba(74, 222, 128, 0.2);
    background: Rgba(74, 222, 128, 0.04);

    .reward-icon {
      color: #4ade80;
      font-size: 10px;
    }
  }

  &.bc {
    color: #38bdf8;
    border-color: Rgba(56, 189, 248, 0.2);
    background: Rgba(56, 189, 248, 0.04);

    .reward-icon {
      font-size: 10px;
    }
  }

  &.pokemon {
    color: #f472b6;
    border-color: Rgba(244, 114, 182, 0.2);
    background: Rgba(244, 114, 182, 0.04);
  }

  &.item {
    border-color: Rgba(255, 255, 255, 0.1);
  }
}

// Sizes
.reward-pills-group.size-md {
  gap: 8px;

  .reward-pill {
    padding: 4px 10px;
    font-size: 10px;

    .reward-sprite {
      width: 22px;
      height: 22px;
    }

    .reward-qty {
      font-size: 8px;
    }
  }
}
</style>
