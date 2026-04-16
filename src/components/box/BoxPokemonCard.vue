<script setup>
import { computed } from 'vue'
import { getPokemonTier, getSpriteUrl } from '@/logic/pokemonUtils'

const props = defineProps({
  pokemon: { type: Object, required: true },
  index: { type: Number, required: true },
  isSelected: { type: Boolean, default: false },
  isRocketMode: { type: Boolean, default: false }
})

const emit = defineEmits(['click'])

const tierInfo = computed(() => getPokemonTier(props.pokemon))
const spriteUrl = computed(() => getSpriteUrl(props.pokemon.id, props.pokemon.isShiny))

const statColor = computed(() => {
  const ratio = props.pokemon.hp / props.pokemon.maxHp
  if (ratio > 0.5) return 'var(--green)'
  if (ratio > 0.2) return 'var(--yellow)'
  return 'var(--red)'
})
</script>

<template>
  <div
    :class="['box-pokemon-card', { selected: isSelected }]"
    @click="emit('click', index)"
  >
    <!-- Badge Tier -->
    <div
      class="tier-badge"
      :style="{ color: tierInfo.color, background: tierInfo.bg }"
    >
      {{ tierInfo.tier }}
    </div>

    <!-- Sprite -->
    <div class="sprite-container">
      <img
        :src="spriteUrl"
        :class="{ 'shiny-anim': props.pokemon.isShiny }"
        alt="pokemon"
      >
    </div>
    
    <!-- Info -->
    <div class="pokemon-name">
      {{ props.pokemon.name || props.pokemon.id }}
    </div>
    
    <div class="pokemon-level">
      Nv. {{ props.pokemon.level }}
    </div>
    
    <!-- Barra HP mini -->
    <div class="mini-hp-bar">
      <div
        class="hp-fill"
        :style="{ width: (props.pokemon.hp / props.pokemon.maxHp * 100) + '%', background: statColor }"
      />
    </div>

    <!-- Indicador Rocket Selection -->
    <div
      v-if="isRocketMode"
      class="rocket-indicator"
    >
      <span
        v-if="isSelected"
        class="rocket-icon"
      >🚀</span>
      <div
        v-else
        class="empty-circle"
      />
    </div>
  </div>
</template>

<style scoped>
.box-pokemon-card {
  padding: 8px;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.02);
}

.box-pokemon-card:hover {
  background: rgba(255, 255, 255, 0.05);
  transform: translateY(-3px);
  border-color: rgba(199, 125, 255, 0.3);
}

.box-pokemon-card.selected {
  border: 2px solid #ef4444 !important;
  background: rgba(239, 68, 68, 0.1) !important;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.2);
}

.tier-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 8px;
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: bold;
  z-index: 2;
}

.sprite-container {
  width: 50px;
  height: 50px;
  margin: 0 auto 4px;
}

.sprite-container img {
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  object-fit: contain;
}

.pokemon-name {
  font-size: 10px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #fff;
}

.pokemon-level {
  font-size: 9px;
  color: var(--gray);
}

.mini-hp-bar {
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin-top: 4px;
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.rocket-indicator {
  position: absolute;
  bottom: 4px;
  right: 4px;
}

.rocket-icon {
  color: #ef4444;
  font-size: 12px;
}

.empty-circle {
  width: 12px;
  height: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}
</style>
