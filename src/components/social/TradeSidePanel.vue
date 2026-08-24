<script setup lang="ts">

import { computed } from 'vue'
import { getItemById, isItemId, type ItemId } from '@/data/inventory/items'
import PokemonDisplayCard from '@/components/pokemon/PokemonDisplayCard.vue'
import InventoryItemCard from '@/components/modals/inventory/InventoryItemCard.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { Inventory } from '@/types/inventory/items'

const _ITEM_TIERS = ['common', 'rare', 'epic', 'legend'] as const
type ItemTier = (typeof _ITEM_TIERS)[number]

function requireItemTier(value: string | undefined): ItemTier | undefined {
  if (value === undefined) return undefined
  if (value === 'common' || value === 'rare' || value === 'epic' || value === 'legend') return value
  throw new Error(`Invalid item tier: ${value}`)
}

const DEFAULT_MAX_MONEY = 999999

interface Props {
  title: string
  pokemon?: Pokemon | null
  inventory?: Inventory
  selectedItems?: Inventory
  money?: number
  maxMoney?: number
  isGift?: boolean
  isFriendSide?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pokemon: null,
  inventory: () => ({}),
  selectedItems: () => ({}),
  money: 0,
  maxMoney: DEFAULT_MAX_MONEY,
  isGift: false,
  isFriendSide: false
})

const emit = defineEmits<{
  (e: 'open-selector'): void
  (e: 'toggle-item', id: ItemId): void
  (e: 'update-item-qty', id: ItemId, qty: number): void
  (e: 'update:money', val: number): void
}>()

const handleMoneyInput = (e: Event) => {
  const val = parseInt((e.target as HTMLInputElement).value) || 0
  emit('update:money', val)
}

const mappedItems = computed(() => {
  return (Object.entries(props.inventory || {}) as [string, number | undefined][])
    .filter((entry): entry is [ItemId, number] => typeof entry[1] === 'number' && entry[1] > 0 && isItemId(entry[0]))
    .map(([id, qty]) => {
      const dbItem = getItemById(id)
      return {
        id: dbItem.id,
        name: dbItem.name,
        qty,
        desc: dbItem.desc ?? '',
        sprite: dbItem.sprite ?? dbItem.id,
        tier: requireItemTier(dbItem.tier)
      }
    })
})
</script>

<template>
  <div
    class="trade-side"
    :class="{ 'friend-side': isFriendSide }"
  >
    <div class="side-title">
      {{ title }}
    </div>
    
    <!-- Pokemon Display Card / Selector -->
    <div
      v-if="!isGift || !isFriendSide"
      class="selected-poke-display"
    >
      <div
        v-if="pokemon"
        class="poke-card-wrap"
        @click.stop="emit('open-selector')"
      >
        <PokemonDisplayCard
          :pokemon="pokemon"
          :disable-card-click="true"
          :actions="[]"
        />
        <div class="change-hint-overlay">
          <span>🔄 CAMBIAR POKÉMON</span>
        </div>
      </div>
      <button
        v-else
        class="btn-open-selector"
        @click.stop="emit('open-selector')"
      >
        <span class="plus-icon">+</span>
        <span class="btn-text">{{ isFriendSide ? 'PEDIR POKÉMON' : 'OFRECER POKÉMON' }}</span>
      </button>
    </div>

    <!-- Items Grid -->
    <div
      v-if="(!isGift || !isFriendSide) && mappedItems.length > 0"
      class="item-selection-grid custom-scrollbar"
    >
      <div
        v-for="item in mappedItems"
        :key="item.id"
        class="item-card-wrapper"
      >
        <InventoryItemCard
          :item="item"
          :is-selected="!!selectedItems[item.id]"
          @click.stop="emit('toggle-item', item.id)"
        />
        <!-- Quantity control overlay when selected -->
        <div
          v-if="selectedItems[item.id]"
          class="qty-control-overlay"
          @click.stop
        >
          <button
            class="qty-btn dec"
            :disabled="(selectedItems[item.id] ?? 0) <= 1"
            @click="emit('update-item-qty', item.id, (selectedItems[item.id] ?? 0) - 1)"
          >
            -
          </button>
          <span class="qty-val">{{ selectedItems[item.id] ?? 0 }}</span>
          <button
            class="qty-btn inc"
            :disabled="(selectedItems[item.id] ?? 0) >= item.qty"
            @click="emit('update-item-qty', item.id, (selectedItems[item.id] ?? 0) + 1)"
          >
            +
          </button>
          <button
            class="qty-btn remove"
            @click="emit('toggle-item', item.id)"
          >
            ×
          </button>
        </div>
      </div>
    </div>
    <div
      v-else-if="!isGift || !isFriendSide"
      class="empty-items-state"
    >
      Sin objetos en la mochila
    </div>

    <!-- Money Input Group -->
    <div
      v-if="!isGift || !isFriendSide"
      class="money-input-group"
    >
      <label class="money-label">
        <span class="label-text">{{ isFriendSide ? 'PEDIR CRÉDITOS' : 'OFRECER CRÉDITOS' }}</span>
        <span class="max-text">MÁX: ₱{{ maxMoney.toLocaleString() }}</span>
      </label>
      <div class="money-input-wrapper">
        <span class="currency-symbol">₱</span>
        <input
          :value="money"
          type="number"
          min="0"
          :max="maxMoney"
          class="money-input"
          @input="handleMoneyInput"
        >
      </div>
    </div>

    <!-- Gift Overlay -->
    <div
      v-if="isGift && isFriendSide"
      class="gift-overlay"
    >
      <div class="gift-content">
        <span class="gift-icon">🎁</span>
        <span class="gift-title">ESTÁS ENVIANDO UN REGALO</span>
        <p class="gift-text">
          No pedirás nada a cambio de tu oferta.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/trade-side-panel";
</style>
