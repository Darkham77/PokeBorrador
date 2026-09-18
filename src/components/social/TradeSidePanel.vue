<script setup lang="ts">
import { computed } from 'vue'
import type { ItemId } from '@/data/inventory/items'
import PokemonDisplayCard from '@/components/pokemon/PokemonDisplayCard.vue'
import InventoryItemCard from '@/components/modals/inventory/InventoryItemCard.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { Inventory } from '@/types/inventory/items'
import {
  isTradeGiftMode,
  resolveTradePokemonButtonText,
  resolveTradeCreditsLabel,
  formatTradeMaxMoney,
  mapInventoryItems,
  getItemQuantity
} from '@/components/social/tradeSidePanelHelper'

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

const isGiftMode = computed(() => isTradeGiftMode(props.isGift, props.isFriendSide))
const showTradeSections = computed(() => !isGiftMode.value)
const pokemonBtnText = computed(() => resolveTradePokemonButtonText(props.isFriendSide))
const creditsLabel = computed(() => resolveTradeCreditsLabel(props.isFriendSide))
const maxMoneyText = computed(() => formatTradeMaxMoney(props.maxMoney))

const mappedItems = computed(() => mapInventoryItems(props.inventory))

const handleMoneyInput = (e: Event) => {
  const val = parseInt((e.target as HTMLInputElement).value) || 0
  emit('update:money', val)
}

const getItemQty = (itemId: ItemId) => getItemQuantity(props.selectedItems, itemId)
const isItemDecDisabled = (itemId: ItemId) => getItemQty(itemId) <= 1
const isItemIncDisabled = (itemId: ItemId, maxQty: number) => getItemQty(itemId) >= maxQty
const handleDecrement = (itemId: ItemId) => emit('update-item-qty', itemId, getItemQty(itemId) - 1)
const handleIncrement = (itemId: ItemId) => emit('update-item-qty', itemId, getItemQty(itemId) + 1)
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
      v-if="showTradeSections"
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
          <span><span class="emoji">🔄</span> CAMBIAR POKÉMON</span>
        </div>
      </div>
      <button
        v-else
        class="btn-open-selector"
        @click.stop="emit('open-selector')"
      >
        <span class="plus-icon">+</span>
        <span class="btn-text">{{ pokemonBtnText }}</span>
      </button>
    </div>

    <!-- Items Grid -->
    <div
      v-if="showTradeSections && mappedItems.length > 0"
      class="item-selection-grid custom-scrollbar"
    >
      <div
        v-for="item in mappedItems"
        :key="item.id"
        class="item-card-wrapper"
      >
        <InventoryItemCard
          :item="item"
          :is-selected="Boolean(selectedItems[item.id])"
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
            :disabled="isItemDecDisabled(item.id)"
            @click="handleDecrement(item.id)"
          >
            -
          </button>
          <span class="qty-val">{{ getItemQty(item.id) }}</span>
          <button
            class="qty-btn inc"
            :disabled="isItemIncDisabled(item.id, item.qty)"
            @click="handleIncrement(item.id)"
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
      v-else-if="showTradeSections"
      class="empty-items-state"
    >
      Sin objetos en la mochila
    </div>

    <!-- Money Input Group -->
    <div
      v-if="showTradeSections"
      class="money-input-group"
    >
      <label class="money-label">
        <span class="label-text">{{ creditsLabel }}</span>
        <span class="max-text">{{ maxMoneyText }}</span>
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
      v-if="isGiftMode"
      class="gift-overlay"
    >
      <div class="gift-content">
        <span class="emoji gift-icon">🎁</span>
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
