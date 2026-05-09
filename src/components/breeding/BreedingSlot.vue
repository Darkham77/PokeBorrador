<script setup lang="ts">
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { Pokemon } from '@/types/pokemon'

interface BreedingSlotData {
  pokemon?: Pokemon | null
}

interface InventoryItem {
  id: string
  label: string
  qty: number
}

interface Props {
  slotIndex: number
  slotData?: BreedingSlotData
  availableItems?: InventoryItem[]
}

const props = withDefaults(defineProps<Props>(), {
  slotData: () => ({}),
  availableItems: () => []
})

const emit = defineEmits<{
  (e: 'deposit', index: number): void
  (e: 'withdraw', index: number): void
  (e: 'setItem', itemId: string): void
}>()

const pokemon = computed(() => props.slotData?.pokemon || null)

const getSpriteUrl = (id: string | number, isShiny: boolean) => {
  if (!id) return ''
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny })
}

const genderSymbol = (g: string | null | undefined) => {
  if (g === 'M') return '♂'
  if (g === 'F') return '♀'
  return ''
}
</script>

<template>
  <div
    class="breeding-slot"
    :class="{ 'is-empty': !pokemon }"
  >
    <div
      v-if="pokemon"
      class="pokemon-info"
    >
      <div class="sprite-container">
        <img
          :src="getSpriteUrl(pokemon.id, !!pokemon.isShiny)"
          :alt="pokemon.name"
          @error="(e: Event) => (e.target as HTMLImageElement).style.display = 'none'"
        >
      </div>
      
      <div class="main-meta">
        <div class="name-row">
          <span class="name">{{ pokemon.name }}</span>
          <span class="level">Nv.{{ pokemon.level }}</span>
        </div>
        
        <div class="detalles">
          <span
            class="gender"
            :class="pokemon.gender"
          >{{ genderSymbol(pokemon.gender) }}</span>
          <span class="nature">{{ pokemon.nature || 'Seria' }}</span>
          <span class="vigor">⚡{{ pokemon.vigor || 0 }}</span>
        </div>
        
        <div class="ivs-bar">
          <span class="label">IVs:</span>
          <span class="values">{{ pokemon.ivs.hp }}/{{ pokemon.ivs.atk }}/{{ pokemon.ivs.def }}/{{ pokemon.ivs.spa }}/{{ pokemon.ivs.spd }}/{{ pokemon.ivs.spe }}</span>
        </div>
      </div>

      <div class="item-section">
        <div
          v-if="pokemon.heldItem"
          class="confirmed-item"
        >
          <span class="item-icon">📦</span>
          <span class="item-name">{{ pokemon.heldItem }}</span>
        </div>
        <div
          v-else
          class="item-picker"
        >
          <select @change="(e: Event) => emit('setItem', (e.target as HTMLSelectElement).value)">
            <option value="">
              -- Sin Ítem --
            </option>
            <option
              v-for="item in availableItems"
              :key="item.id"
              :value="item.id"
            >
              {{ item.label }} (x{{ item.qty }})
            </option>
          </select>
        </div>
      </div>

      <button
        class="action-btn withdraw"
        @click.stop="emit('withdraw', slotIndex)"
      >
        RETIRAR
      </button>
    </div>

    <div
      v-else
      class="empty-state"
    >
      <div class="empty-icon">
        🧬
      </div>
      <span class="empty-text">— Vacía —</span>
      <button
        class="action-btn deposit"
        @click.stop="emit('deposit', slotIndex)"
      >
        DEPOSITAR
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/styles/core/_mixins" as *;
.breeding-slot {
  background: Rgba(15, 23, 42, 0.8);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &.is-empty {
    border-style: dashed;
    border-color: Rgba(255, 255, 255, 0.2);
    justify-content: center;
    align-items: center;
  }

  .pokemon-info {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
  }

  .sprite-container {
    height: 80px;
    display: flex;
    justify-content: center;
    align-items: center;
    img {
      height: 80px;
      image-rendering: pixelated;
      will-change: transform, filter, opacity;
  filter: Drop-Shadow(0 4px 8px Rgba(0,0,0,0.5));
    }
  }

  .main-meta {
    .name-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
      .name {
        @include pixelated;
        font-size: 10px;
        color: $white;
      }
      .level {
        font-size: 10px;
        color: var(--gray, #94a3b8);
      }
    }

    .detalles {
      display: flex;
      gap: 8px;
      font-size: 11px;
      margin-bottom: 8px;
      .gender {
        font-weight: 900;
        &.M { color: Rgba(52, 152, 219, 1); }
        &.F { color: Rgba(232, 67, 147, 1); }
      }
      .nature { color: var(--yellow, #fbbf24); }
      .vigor { color: Rgba(16, 185, 129, 1); }
    }

    .ivs-bar {
      font-size: 10px;
      background: Rgba(0,0,0,0.3);
      padding: 4px 8px;
      border-radius: 4px;
      .label { color: $muted; margin-right: 4px; }
      .values { color: $white; letter-spacing: 1px; }
    }
  }

  .item-section {
    margin-top: auto;
    .confirmed-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: $white;
      background: Rgba(139, 92, 246, 0.2);
      padding: 6px;
      border-radius: 8px;
      border: 1px solid Rgba(139, 92, 246, 0.3);
    }
    select {
      width: 100%;
      background: Rgba(15, 23, 42, 1);
      color: $white;
      border: 1px solid Rgba(51, 65, 85, 1);
      padding: 6px;
      border-radius: 8px;
      font-size: 11px;
    }
  }

  .action-btn {
    margin-top: 12px;
    width: 100%;
    padding: 10px;
    border: none;
    border-radius: 8px;
    @include pixelated;
    font-size: 9px;
    cursor: pointer;
    transition: transform 0.1s;

    &:active { transform: Scale(0.95); }

    &.withdraw {
      background: Rgba(239, 68, 68, 0.1);
      color: Rgba(248, 113, 113, 1);
      border: 1px solid Rgba(239, 68, 68, 0.2);
    }
    &.deposit {
      background: Rgba(139, 92, 246, 0.1);
      color: Rgba(167, 139, 250, 1);
      border: 1px solid Rgba(139, 92, 246, 0.2);
    }
  }

  .empty-state {
    text-align: center;
    .empty-icon {
      font-size: 40px;
      will-change: transform, filter, opacity;
  filter: Grayscale(100%);
  opacity: 0.2;
      margin-bottom: 12px;
    }
    .empty-text {
      display: block;
      font-size: 10px;
      color: $muted;
      margin-bottom: 16px;
    }
  }
}
</style>
