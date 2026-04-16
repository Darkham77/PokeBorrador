<script setup>
import { computed } from 'vue'

const props = defineProps({
  slotId: { type: String, required: true },
  pokemon: { type: Object, default: null },
  item: { type: String, default: null },
  isDepositing: { type: Boolean, default: false }
})

const emit = defineEmits(['deposit', 'withdraw', 'setItem'])

const genderIcon = computed(() => {
  if (!props.pokemon?.gender) return ''
  return props.pokemon.gender === 'M' ? '♂' : '♀'
})
</script>

<template>
  <div
    class="daycare-slot"
    :class="{ empty: !pokemon }"
  >
    <div class="slot-header">
      RANURA {{ slotId.toUpperCase() }}
    </div>

    <!-- Empty State -->
    <div
      v-if="!pokemon"
      class="slot-empty-body"
    >
      <div class="empty-icon">
        🥚
      </div>
      <button
        class="deposit-btn"
        @click="emit('deposit')"
      >
        DEPOSITAR
      </button>
    </div>

    <!-- Occupied State -->
    <div
      v-else
      class="slot-filled-body"
    >
      <div class="pokemon-main">
        <div class="sprite-wrap">
          <img
            :src="`https://play.pokemonshowdown.com/sprites/ani/${pokemon.id}.gif`"
            class="pokemon-sprite"
          >
        </div>
        <div class="pokemon-meta">
          <div class="pokemon-name">
            {{ pokemon.name }} <span class="lv">Nv.{{ pokemon.level }}</span>
          </div>
          <div class="pokemon-stats">
            {{ pokemon.ivs.hp }}/{{ pokemon.ivs.atk }}/{{ pokemon.ivs.def }}/{{ pokemon.ivs.spa }}/{{ pokemon.ivs.spd }}/{{ pokemon.ivs.spe }}
            <span class="sep">•</span>
            {{ pokemon.nature }}
            <span
              class="gender"
              :class="pokemon.gender"
            >{{ genderIcon }}</span>
          </div>
        </div>
      </div>

      <div class="item-section">
        <div class="section-label">
          ÍTEM EQUIPADO
        </div>
        <div
          v-if="item"
          class="confirmed-item"
        >
          <span>📦</span> {{ item }}
        </div>
        <div
          v-else
          class="item-picker-placeholder"
          @click="emit('setItem')"
        >
          Seleccionar Ítem de Herencia...
        </div>
      </div>

      <button
        class="withdraw-btn"
        @click="emit('withdraw')"
      >
        RETIRAR
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.daycare-slot {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-height: 200px;
  transition: all 0.3s;

  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.05);
  }

  &.empty {
    border-style: dashed;
    justify-content: center;
  }
}

.slot-header {
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--gray);
  margin-bottom: 16px;
}

.slot-empty-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.empty-icon {
  font-size: 40px;
  opacity: 0.2;
}

.deposit-btn {
  background: var(--yellow);
  color: #000;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  cursor: pointer;
  font-weight: 900;
}

.slot-filled-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pokemon-main {
  display: flex;
  gap: 12px;
  align-items: center;
}

.sprite-wrap {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pokemon-sprite {
  max-width: 100%;
  max-height: 100%;
}

.pokemon-name {
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  .lv { font-size: 10px; color: var(--yellow); margin-left: 4px; }
}

.pokemon-stats {
  font-size: 10px;
  color: var(--gray);
  margin-top: 4px;
  .sep { margin: 0 4px; opacity: 0.3; }
  .gender { margin-left: 6px; font-weight: 900; }
  .M { color: var(--blue); }
  .F { color: var(--red); }
}

.item-section {
  background: rgba(0, 0, 0, 0.3);
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.section-label {
  font-size: 9px;
  color: var(--gray);
  margin-bottom: 6px;
  text-transform: uppercase;
  font-weight: 800;
}

.confirmed-item {
  font-size: 12px;
  color: var(--yellow);
  font-weight: 700;
}

.item-picker-placeholder {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-style: italic;
  &:hover { color: #fff; }
}

.withdraw-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: none;
  padding: 8px;
  border-radius: 8px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: var(--red); color: #000; font-weight: 800; }
}
</style>
