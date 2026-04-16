<script setup>
import { computed } from 'vue'

const props = defineProps({
  slotId: { type: String, required: true },
  pokemon: { type: Object, default: null },
  item: { type: String, default: null }
})

const emit = defineEmits(['deposit', 'withdraw'])

const genderIcon = computed(() => {
  if (!props.pokemon?.gender) return ''
  return props.pokemon.gender === 'M' ? '♂' : '♀'
})

const getSprite = (id, shiny) => {
  return window.getSpriteUrl?.(id, shiny) || ''
}
</script>

<template>
  <div
    class="daycare-slot-legacy"
    :class="{ empty: !pokemon }"
    @click="!pokemon ? emit('deposit') : null"
  >
    <div class="slot-marker">
      RANURA {{ slotId.toUpperCase() }}
    </div>

    <!-- Empty State -->
    <div
      v-if="!pokemon"
      class="slot-empty"
    >
      <div class="plus-icon">
        +
      </div>
      <div class="hint">
        DEPOSITAR POKÉMON
      </div>
    </div>

    <!-- Occupied State -->
    <div
      v-else
      class="slot-filled"
    >
      <div class="poke-header">
        <div class="sprite-box">
          <img
            :src="getSprite(pokemon.id, pokemon.isShiny)"
            class="pixel-sprite"
          >
        </div>
        <div class="poke-info">
          <div class="name-line">
            <span class="name">{{ pokemon.name.toUpperCase() }}</span>
            <span class="lv">LVL.{{ pokemon.level }}</span>
          </div>
          <div class="stats-line">
            IVS: {{ pokemon.ivs.hp }}/{{ pokemon.ivs.atk }}/{{ pokemon.ivs.def }}/{{ pokemon.ivs.spa }}/{{ pokemon.ivs.spd }}/{{ pokemon.ivs.spe }}
            <span
              class="gender"
              :class="pokemon.gender"
            >{{ genderIcon }}</span>
          </div>
          <div class="nature-line">
            {{ pokemon.nature.toUpperCase() }}
          </div>
        </div>
      </div>

      <div class="vigor-status">
        <div class="label">
          VIGOR: {{ pokemon.vigor || 0 }}/10
        </div>
        <div class="vigor-bar-bg">
          <div
            class="vigor-fill"
            :style="{ width: ((pokemon.vigor || 0) * 10) + '%', background: (pokemon.vigor <= 2 ? '#ef4444' : '#22c55e') }"
          />
        </div>
      </div>

      <div class="item-status">
        <div
          v-if="pokemon.heldItem"
          class="item-badge active"
        >
          📦 {{ pokemon.heldItem.toUpperCase() }}
        </div>
        <div
          v-else
          class="item-badge none"
        >
          SIN OBJETO
        </div>
      </div>

      <button
        class="withdraw-btn-retro"
        @click.stop="emit('withdraw')"
      >
        RETIRAR
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.daycare-slot-legacy {
  background: #1c2128;
  border: 2px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 20px;
  min-height: 250px;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.2s;

  &.empty {
    border-style: dashed;
    cursor: pointer;
    justify-content: center;
    align-items: center;
    background: rgba(0,0,0,0.2);
    &:hover { border-color: #ffd700; .plus-icon { color: #ffd700; transform: #{'scale(1.1)'}; } }
  }

  &:not(.empty):hover { border-color: rgba(255,255,255,0.15); }
}

.slot-marker {
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  color: #64748b;
  margin-bottom: 20px;
}

.slot-empty {
  text-align: center;
  .plus-icon { font-size: 30px; color: #334155; margin-bottom: 10px; transition: all 0.2s; }
  .hint { font-family: 'Press Start 2P', monospace; font-size: 7px; color: #475569; }
}

.slot-filled {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.poke-header {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.sprite-box {
  width: 64px; height: 64px;
  background: rgba(0,0,0,0.3);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  .pixel-sprite { width: 56px; height: 56px; image-rendering: pixelated; }
}

.poke-info {
  flex: 1;
  .name-line {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;
    .name { font-size: 13px; font-weight: 900; color: #fff; }
    .lv { font-family: 'Press Start 2P', monospace; font-size: 8px; color: #ffd700; }
  }
  .stats-line {
    font-size: 10px; color: #94a3b8; font-family: monospace;
    .gender { margin-left: 8px; font-weight: bold; }
    .M { color: #38bdf8; }
    .F { color: #fb7185; }
  }
  .nature-line { font-size: 10px; color: #ffd700; margin-top: 4px; font-weight: bold; }
}

.vigor-status {
  margin-bottom: 15px;
  .label { font-size: 9px; font-weight: bold; color: #64748b; margin-bottom: 6px; }
  .vigor-bar-bg { height: 4px; background: rgba(0,0,0,0.4); border-radius: 2px; overflow: hidden; }
  .vigor-fill { height: 100%; transition: width 0.3s; }
}

.item-status {
  margin-bottom: 20px;
  .item-badge {
    padding: 8px 12px; border-radius: 10px; font-size: 10px;
    &.active { background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.2); color: #fff; }
    &.none { background: rgba(0,0,0,0.2); color: #475569; font-style: italic; border: 1px dashed rgba(255,255,255,0.05); }
  }
}

.withdraw-btn-retro {
  margin-top: auto;
  padding: 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  color: #94a3b8;
  font-family: 'Press Start 2P', monospace;
  font-size: 7px;
  cursor: pointer;
  
  &:hover { background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.2); }
}
</style>
