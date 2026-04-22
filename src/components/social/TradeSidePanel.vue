<script setup>
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

defineProps({
  title: { type: String, required: true },
  pokemon: { type: Object, default: null },
  inventory: { type: Object, default: () => ({}) },
  selectedItems: { type: Object, default: () => ({}) },
  money: { type: Number, default: 0 },
  maxMoney: { type: Number, default: 999999 },
  isGift: { type: Boolean, default: false },
  isFriendSide: { type: Boolean, default: false }
})

defineEmits(['open-selector', 'toggle-item', 'update:money'])
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
        @click="$emit('open-selector')"
      >
        <img
          :src="getAssetUrl(ASSET_TYPES.POKEMON, pokemon.id, { isShiny: pokemon.isShiny })"
          class="preview-sprite"
          @error="e => e.target.style.display = 'none'"
        >
        <div class="preview-info">
          <div class="name">
            {{ pokemon.name }}
          </div>
          <div class="meta">
            Nv. {{ pokemon.level }}
          </div>
        </div>
        <div class="change-hint">
          CAMBIAR
        </div>
      </div>
      <button
        v-else
        class="btn-open-selector"
        @click="$emit('open-selector')"
      >
        + {{ isFriendSide ? 'PEDIR' : 'SELECCIONAR' }} POKÉMON
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
        @click="$emit('toggle-item', name)"
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
        @input="$emit('update:money', parseInt($event.target.value) || 0)"
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
.trade-side {
  display: flex;
  flex-direction: column;
  gap: 16px;

  .side-title {
    font-size: 10px;
    font-family: 'Press Start 2P', monospace;
    color: var(--gray);
    letter-spacing: 1px;
  }
}

.btn-open-selector {
  width: 100%;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  color: #888;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--purple);
    color: $white;
  }
}

.poke-preview {
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid var(--purple);
  padding: 12px;
  border-radius: 16px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;

  &:hover {
    background: rgba(168, 85, 247, 0.15);
    .change-hint { opacity: 1; }
  }

  .preview-sprite { width: 48px; height: 48px; image-rendering: pixelated; }
  .preview-info { flex: 1; .name { font-weight: 800; font-size: 14px; color: $white; } .meta { font-size: 11px; color: #888; } }
  .change-hint { position: absolute; right: 15px; font-size: 8px; font-family: 'Press Start 2P', monospace; color: var(--purple); opacity: 0.6; transition: opacity 0.2s; }
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
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  cursor: pointer;
  color: var(--gray);
  transition: all 0.2s;

  &:hover { background: rgba(255,255,255,0.08); }
  &.selected { background: var(--purple); color: $white; border-color: var(--purple); box-shadow: 0 0 10px rgba(168, 85, 247, 0.3); }
}

.money-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  label { font-size: 9px; font-family: 'Press Start 2P', monospace; color: var(--gray); }
  input {
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
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
  background: rgba(107, 203, 119, 0.05);
  border: 2px dashed rgba(107, 203, 119, 0.2);
  border-radius: 20px;
  padding: 30px;
  text-align: center;
  .gift-icon { font-size: 40px; display: block; margin-bottom: 12px; }
  .gift-title { font-weight: 900; font-size: 14px; color: var(--green); display: block; margin-bottom: 8px; }
  .gift-text { font-size: 11px; color: rgba(255, 255, 255, 0.5); margin: 0; }
}

</style>
