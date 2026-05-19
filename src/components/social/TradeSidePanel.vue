<script setup lang="ts">

import { computed } from 'vue'
import { SHOP_ITEMS } from '@/data/items'
import PokemonDisplayCard from '@/components/pokemon/PokemonDisplayCard.vue'
import InventoryItemCard from '@/components/modals/inventory/InventoryItemCard.vue'
import type { Pokemon } from '@/types/pokemon'

interface Props {
  title: string
  pokemon?: Pokemon | null
  inventory?: Record<string, number>
  selectedItems?: Record<string, number>
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
  maxMoney: 999999,
  isGift: false,
  isFriendSide: false
})

const emit = defineEmits<{
  (e: 'open-selector'): void
  (e: 'toggle-item', name: string): void
  (e: 'update-item-qty', name: string, qty: number): void
  (e: 'update:money', val: number): void
}>()

const handleMoneyInput = (e: Event) => {
  const val = parseInt((e.target as HTMLInputElement).value) || 0
  emit('update:money', val)
}

const mappedItems = computed(() => {
  return Object.entries(props.inventory || {}).map(([name, qty]) => {
    const dbItem = SHOP_ITEMS.find(i => i.name === name || i.id === name)
    return {
      id: dbItem?.id || name,
      name,
      qty,
      desc: dbItem?.desc || '',
      sprite: dbItem?.sprite || dbItem?.id || name,
      tier: (dbItem?.tier as 'common' | 'rare' | 'epic' | 'legend') || 'common'
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
        :key="item.name"
        class="item-card-wrapper"
      >
        <InventoryItemCard
          :item="item"
          :is-selected="!!selectedItems[item.name]"
          @click.stop="emit('toggle-item', item.name)"
        />
        <!-- Quantity control overlay when selected -->
        <div
          v-if="selectedItems[item.name]"
          class="qty-control-overlay"
          @click.stop
        >
          <button
            class="qty-btn dec"
            :disabled="(selectedItems[item.name] ?? 0) <= 1"
            @click="emit('update-item-qty', item.name, (selectedItems[item.name] ?? 0) - 1)"
          >
            -
          </button>
          <span class="qty-val">{{ selectedItems[item.name] ?? 0 }}</span>
          <button
            class="qty-btn inc"
            :disabled="(selectedItems[item.name] ?? 0) >= item.qty"
            @click="emit('update-item-qty', item.name, (selectedItems[item.name] ?? 0) + 1)"
          >
            +
          </button>
          <button
            class="qty-btn remove"
            @click="emit('toggle-item', item.name)"
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
@use "@/styles/core/_mixins" as *;

.trade-side {
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: Rgba(255, 255, 255, 0.01);
  border: 1px solid Rgba(255, 255, 255, 0.03);
  padding: 20px;
  border-radius: 24px;
  height: 100%;
  box-sizing: border-box;
  min-width: 0;

  .side-title {
    font-size: 10px;
    @include pixelated;
    color: var(--gray);
    letter-spacing: 1px;
    text-transform: uppercase;
  }
}

.selected-poke-display {
  width: 100%;
}

.poke-card-wrap {
  position: relative;
  width: 100%;
  cursor: pointer;

  &:hover {
    .change-hint-overlay {
      opacity: 1;
    }
  }

  .change-hint-overlay {
    position: absolute;
    inset: 0;
    background: Rgba(0, 0, 0, 0.7);
    backdrop-filter: Blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 10;
    pointer-events: none;

    span {
      @include pixelated;
      font-size: 9px;
      color: var(--yellow);
      letter-spacing: 1px;
    }
  }
}

.btn-open-selector {
  width: 100%;
  padding: 24px 16px;
  background: Rgba(255, 255, 255, 0.02);
  border: 2px dashed Rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  color: #888;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  .plus-icon {
    font-size: 24px;
    font-weight: 300;
    line-height: 1;
  }

  .btn-text {
    @include pixelated;
    font-size: 8px;
    letter-spacing: 1px;
  }

  &:hover {
    background: Rgba(168, 85, 247, 0.05);
    border-color: var(--purple);
    color: #fff;
  }
}

.item-selection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 12px;
  max-height: 240px;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  padding: 8px;
  background: Rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  border: 1px solid Rgba(255, 255, 255, 0.05);

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: Rgba(255, 255, 255, 0.15);
    border-radius: 3px;
  }
}

.empty-items-state {
  padding: 16px;
  text-align: center;
  background: Rgba(0, 0, 0, 0.1);
  border-radius: 16px;
  color: Rgba(255, 255, 255, 0.25);
  font-size: 9px;
  @include pixelated;
}

.money-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-top: auto;

  .money-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    @include pixelated;
    font-size: 8px;
    color: var(--gray);

    .max-text {
      color: Rgba(255, 255, 255, 0.4);
    }
  }

  .money-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;

    .currency-symbol {
      position: absolute;
      left: 16px;
      font-size: 16px;
      font-weight: bold;
      color: $coin-gold;
      pointer-events: none;
    }

    .money-input {
      width: 100%;
      background: Rgba(0, 0, 0, 0.4);
      border: 1px solid Rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 12px 12px 12px 36px;
      color: $coin-gold;
      font-weight: 900;
      font-size: 15px;
      outline: none;
      box-sizing: border-box;
      transition: all 0.2s ease;

      &:focus {
        border-color: Rgba(255, 215, 0, 0.4);
        background: Rgba(0, 0, 0, 0.5);
        box-shadow: 0 0 10px Rgba(255, 215, 0, 0.15);
      }

      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      &[type=number] {
        -moz-appearance: textfield;
      }
    }
  }
}

.gift-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: Rgba(107, 203, 119, 0.03);
  border: 2px dashed Rgba(107, 203, 119, 0.15);
  border-radius: 20px;
  padding: 30px;
  text-align: center;

  .gift-icon {
    font-size: 40px;
    display: block;
    margin-bottom: 12px;
  }

  .gift-title {
    font-weight: 900;
    font-size: 11px;
    @include pixelated;
    color: var(--green);
    display: block;
    margin-bottom: 8px;
    letter-spacing: 1px;
  }

  .gift-text {
    font-size: 11px;
    color: Rgba(255, 255, 255, 0.4);
    margin: 0;
  }
}
.item-card-wrapper {
  position: relative;
  width: 100%;
}

.qty-control-overlay {
  position: absolute;
  inset: 0;
  background: Rgba(0, 0, 0, 0.8);
  backdrop-filter: Blur(4px);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  z-index: 10;
  border: 1px solid Rgba(168, 85, 247, 0.4);
  padding: 4px;
  box-sizing: border-box;

  .qty-btn {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    border: 1px solid Rgba(255, 255, 255, 0.1);
    background: Rgba(255, 255, 255, 0.05);
    color: white;
    font-size: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    @include pixelated;

    &:hover:not(:disabled) {
      background: var(--purple);
      border-color: var(--purple);
      color: white;
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    &.remove {
      background: Rgba(239, 68, 68, 0.2);
      border-color: Rgba(239, 68, 68, 0.4);
      color: #ef4444;
      
      &:hover {
        background: #ef4444;
        color: white;
      }
    }
  }

  .qty-val {
    @include pixelated;
    font-size: 9px;
    font-weight: bold;
    color: var(--yellow);
    min-width: 16px;
    text-align: center;
  }
}
</style>
