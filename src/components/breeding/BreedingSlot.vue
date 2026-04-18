<script setup>
import { computed } from 'vue'

const props = defineProps({
  slotIndex: { type: Number, required: true },
  slotData: { type: Object, default: () => ({}) },
  availableItems: { type: Array, default: () => [] }
})

const emit = defineEmits(['deposit', 'withdraw', 'setItem'])

const pokemon = computed(() => props.slotData?.pokemon || null)

const getSpriteUrl = (id, shiny) => {
  if (!id) return ''
  // Asumiendo estructura de proyecto:
  const sub = id.toString(); // PokeAPI no siempre necesita padding de 3, pero los IDs son numéricos.
  if (shiny) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${sub}.webp`;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${sub}.webp`;
}

const genderSymbol = (g) => {
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
          :src="getSpriteUrl(pokemon.id, pokemon.isShiny)"
          :alt="pokemon.name"
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
          <select @change="(e) => emit('setItem', e.target.value)">
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
        @click="emit('withdraw', slotIndex)"
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
        @click="emit('deposit', slotIndex)"
      >
        DEPOSITAR
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.breeding-slot {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
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
    border-color: rgba(255, 255, 255, 0.2);
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
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
    }
  }

  .main-meta {
    .name-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
      .name {
        font-family: 'Press Start 2P', monospace;
        font-size: 10px;
        color: #fff;
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
        &.M { color: #3498db; }
        &.F { color: #e84393; }
      }
      .nature { color: var(--yellow, #fbbf24); }
      .vigor { color: #10b981; }
    }

    .ivs-bar {
      font-size: 10px;
      background: rgba(0,0,0,0.3);
      padding: 4px 8px;
      border-radius: 4px;
      .label { color: #64748b; margin-right: 4px; }
      .values { color: #fff; letter-spacing: 1px; }
    }
  }

  .item-section {
    margin-top: auto;
    .confirmed-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #fff;
      background: rgba(139, 92, 246, 0.2);
      padding: 6px;
      border-radius: 8px;
      border: 1px solid rgba(139, 92, 246, 0.3);
    }
    select {
      width: 100%;
      background: #0f172a;
      color: #fff;
      border: 1px solid #334155;
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
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
    cursor: pointer;
    transition: transform 0.1s;

    &:active { transform: Scale(0.95); }

    &.withdraw {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    &.deposit {
      background: rgba(139, 92, 246, 0.1);
      color: #a78bfa;
      border: 1px solid rgba(139, 92, 246, 0.2);
    }
  }

  .empty-state {
    text-align: center;
    .empty-icon {
      font-size: 40px;
      filter: grayScale(100%) Opacity(0.2);
      margin-bottom: 12px;
    }
    .empty-text {
      display: block;
      font-size: 10px;
      color: #64748b;
      margin-bottom: 16px;
    }
  }
}
</style>
