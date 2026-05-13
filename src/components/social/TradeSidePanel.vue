<script setup lang="ts">
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

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
 
withDefaults(defineProps<Props>(), {
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
  (e: 'update:money', val: number): void
}>()

const handleImgError = (e: Event) => {
  (e.target as HTMLImageElement).style.display = 'none'
}

const handleMoneyInput = (e: Event) => {
  const val = parseInt((e.target as HTMLInputElement).value) || 0
  emit('update:money', val)
}
</script>

<template>
  <div
    class="trade-side"
    :class="{ 'friend-side': isFriendSide }"
  >
    <div class="side-title">
      {{ title }}
    </div>
    
    <div
      v-if="!isGift || !isFriendSide"
      class="selected-poke-display"
    >
      <div
        v-if="pokemon"
        class="poke-preview"
        @click.stop="$emit('open-selector')"
      >
        <img
          :src="getAssetUrl(ASSET_TYPES.POKEMON, pokemon.id, { isShiny: pokemon.isShiny })"
          class="preview-sprite"
          @error="handleImgError"
        >
        <div class="preview-info">
          <div class="name">
            {{ pokemon.name }}
          </div>
          <div class="meta">
            <span class="m-badge-level">Nv. {{ pokemon.level }}</span>
          </div>
        </div>
        <div class="change-hint">
          CAMBIAR
        </div>
      </div>
      <button
        v-else
        class="btn-open-selector"
        @click.stop="$emit('open-selector')"
      >
        + {{ isFriendSide ? 'PEDIR' : 'SELECCIONAR' }} ⚡ POKÉMON
      </button>
    </div>

    <div
      v-if="!isGift || !isFriendSide"
      class="item-selection-grid custom-scrollbar"
    >
      <div 
        v-for="(qty, name) in inventory" 
        :key="name"
        class="trade-item-pill"
        :class="{ selected: selectedItems[name] }"
        @click.stop="$emit('toggle-item', name)"
      >
        {{ name }} ({{ qty }})
      </div>
    </div>

    <div
      v-if="!isGift || !isFriendSide"
      class="money-input-group"
    >
      <label>{{ isFriendSide ? 'Pedir' : 'Ofrecer' }} Dinero (₽):</label>
      <input
        :value="money"
        type="number"
        min="0"
        :max="maxMoney"
        @input="handleMoneyInput"
      >
    </div>

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
  gap: 16px;

  .side-title {
    font-size: 10px;
    @include pixelated;
    color: var(--gray);
    letter-spacing: 1px;
  }
}

.btn-open-selector {
  width: 100%;
  padding: 16px;
  background: Rgba(255, 255, 255, 0.03);
  border: 2px dashed Rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  color: Rgba(136, 136, 136, 1);
  @include pixelated;
  font-size: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: Rgba(255, 255, 255, 0.06);
    border-color: var(--purple);
    color: $white;
  }
}

.poke-preview {
  display: flex;
  align-items: center;
  gap: 15px;
  background: Rgba(168, 85, 247, 0.1);
  border: 1px solid var(--purple);
  padding: 12px;
  border-radius: 16px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;

  &:hover {
    background: Rgba(168, 85, 247, 0.15);
    .change-hint { opacity: 1; }
  }

  .preview-sprite { width: 48px; height: 48px; @include pixelated; }
  .preview-info { flex: 1; .name { font-weight: 800; font-size: 14px; color: var(--white); } .meta { font-size: 11px; color: Rgba(136, 136, 136, 1); } }
  .change-hint { position: absolute; right: 15px; font-size: 8px; @include pixelated; color: var(--purple); opacity: 0.6; transition: opacity 0.2s; }
}

.item-selection-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 120px;
  overflow-y: auto;
  min-height: 0;
  padding: 4px;
}

.trade-item-pill {
  font-size: 9px;
  padding: 8px 12px;
  background: Rgba(255,255,255,0.04);
  border: 1px solid Rgba(255,255,255,0.06);
  border-radius: 10px;
  cursor: pointer;
  color: var(--gray);
  transition: all 0.2s;

  &:hover { background: Rgba(255,255,255,0.08); }
  &.selected { background: var(--purple); color: $white; border-color: var(--purple); box-shadow: 0 0 10px Rgba(168, 85, 247, 0.3); }
}

.money-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  label { font-size: 9px; @include pixelated; color: var(--gray); }
  input {
    background: Rgba(0,0,0,0.3);
    border: 1px solid Rgba(255,255,255,0.1);
    padding: 12px;
    border-radius: 12px;
    color: var(--yellow);
    font-weight: 900;
    font-size: 14px;
    outline: none;
    &:focus { border-color: var(--yellow); }
  }
}

.gift-overlay {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: Rgba(107, 203, 119, 0.05);
  border: 2px dashed Rgba(107, 203, 119, 0.2);
  border-radius: 20px;
  padding: 30px;
  text-align: center;
  .gift-icon { font-size: 40px; display: block; margin-bottom: 12px; }
  .gift-title { font-weight: 900; font-size: 14px; color: var(--green); display: block; margin-bottom: 8px; }
  .gift-text { font-size: 11px; color: Rgba(255, 255, 255, 0.5); margin: 0; }
}

</style>
