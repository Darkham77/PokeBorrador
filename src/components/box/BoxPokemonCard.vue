<script setup>
import { computed } from 'vue'
import { getPokemonTier } from '@/logic/pokemonUtils'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVTooltip from '@/components/common/PVTooltip.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'

import { TAG_DEFINITIONS, POKEMON_BADGES } from '@/logic/constants/tags'

const props = defineProps({
  pokemon: { type: Object, required: true },
  index: { type: Number, required: true },
  isSelected: { type: Boolean, default: false },
  isRocketMode: { type: Boolean, default: false }
})

const emit = defineEmits(['click'])

const tierInfo = computed(() => getPokemonTier(props.pokemon))
const spriteUrl = computed(() => getAssetUrl(ASSET_TYPES.POKEMON, props.pokemon.id, { 
  isShiny: props.pokemon.isShiny 
}))

const statColor = computed(() => {
  const ratio = props.pokemon.hp / props.pokemon.maxHp
  if (ratio > 0.5) return 'var(--green)'
  if (ratio > 0.2) return 'var(--yellow)'
  return 'var(--red)'
})

const activeTags = computed(() => {
  if (!props.pokemon.tags) return []
  return props.pokemon.tags.map(id => ({
    id,
    ...(TAG_DEFINITIONS[id] || { icon: '?', color: '#ccc', label: 'TAG', desc: 'Etiqueta personalizada.' })
  }))
})

const hasHeldItem = computed(() => !!props.pokemon.heldItem)
</script>

<template>
  <div
    :class="['box-pokemon-card', { selected: isSelected }]"
    @click.stop="emit('click', index)"
  >
    <!-- Badge Tier -->
    <div
      class="box-tier-badge"
      :style="{ color: tierInfo.color, background: tierInfo.bg }"
    >
      {{ tierInfo.tier }}
    </div>

    <!-- Tags & Held Item -->
    <div
      v-if="activeTags.length > 0 || hasHeldItem || pokemon.isShiny"
      class="tags-container"
    >
      <PVTooltip
        v-if="hasHeldItem"
        :title="POKEMON_BADGES.heldItem.label"
        :description="`${POKEMON_BADGES.heldItem.desc} (${pokemon.heldItem})`"
        position="right"
      >
        <span class="item-icon">{{ POKEMON_BADGES.heldItem.icon }}</span>
      </PVTooltip>
      
      <PVTooltip
        v-if="pokemon.isShiny"
        :title="POKEMON_BADGES.shiny.label"
        :description="POKEMON_BADGES.shiny.desc"
        position="right"
      >
        <span class="shiny-icon">{{ POKEMON_BADGES.shiny.icon }}</span>
      </PVTooltip>

      <PVTooltip
        v-for="tag in activeTags"
        :key="tag.id"
        :title="tag.label"
        :description="tag.desc"
        position="right"
      >
        <span
          class="tag"
          :class="tag.id"
          :style="{ color: tag.color }"
        >{{ tag.icon }}</span>
      </PVTooltip>
    </div>

    <!-- Sprite -->
    <div class="sprite-container">
      <div
        v-if="pokemon.onMission"
        class="badge mission-badge"
      >
        MISIÓN
      </div>
      <div
        v-if="pokemon.inDaycare"
        class="badge daycare-badge"
      >
        GUARDERÍA
      </div>
      <div
        v-if="pokemon.onDefense"
        class="badge defense-badge"
      >
        DEFENSA
      </div>
      
      <PVSpriteFX
        :is-shiny="pokemon.isShiny"
        :is-guardian="pokemon.isGuardian"
        :sparkle-count="5"
      >
        <img
          :src="spriteUrl"
          class="pokemon-sprite"
          :class="[
            pokemon.aura ? `aura-${pokemon.aura}-mini` : ''
          ]"
          alt="pokemon"
          @error="e => e.target.style.display = 'none'"
        >
      </PVSpriteFX>
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

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.box-pokemon-card {
  padding: 8px;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  background: Rgba(255, 255, 255, 0.02);
}

.box-pokemon-card:hover {
  background: Rgba(255, 255, 255, 0.05);
  transform: translateY(-3px);
  border-color: Rgba(199, 125, 255, 0.3);
}

.box-pokemon-card.selected {
  border: 2px solid #ef4444 !important;
  background: Rgba(239, 68, 68, 0.1) !important;
  box-shadow: 0 0 15px Rgba(239, 68, 68, 0.2);
}

.box-tier-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 8px;
  padding: 2px 4px;
  border-radius: 4px;
  font-weight: bold;
  z-index: var(--z-base);
}

.tags-container {
  position: absolute;
  top: 4px;
  left: 4px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: Rgba(0, 0, 0, 0.6);
  padding: 6px 4px;
  border-radius: 8px;
  z-index: var(--z-base);
  -webkit-backdrop-filter: Blur(8px); backdrop-filter: Blur(8px);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 10px Rgba(0,0,0,0.3);
  @include gpu-layer;
}

.tag, .item-icon, .shiny-icon {
  font-size: 11px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: help;
}

.shiny-icon { color: Rgba(255, 217, 61, 1); }

.iv31 {
  font-weight: bold;
}

.sprite-container {
  width: 50px;
  height: 50px;
  margin: 0 auto 4px;
}

.sprite-container img {
  width: 100%;
  height: 100%;
  @include sprite-render;
  object-fit: contain;
  position: relative;
  z-index: var(--z-base);
}




.badge {
  position: absolute;
  left: 2px;
  font-size: 6px;
  font-weight: 900;
  padding: 2px 4px;
  border-radius: 4px;
  z-index: var(--z-base);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.mission-badge { top: 2px; background: Rgba(251, 191, 36, 1); color: black; }
.daycare-badge { top: 12px; background: Rgba(59, 130, 246, 1); color: white; }
.defense-badge { top: 22px; background: Rgba(34, 197, 94, 1); color: white; }

.pokemon-name {
  font-size: 10px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: white;
  @include pixelated;
}

.pokemon-level {
  font-size: 9px;
  color: var(--gray);
  @include pixelated;
}

.mini-hp-bar {
  height: 3px;
  background: Rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin-top: 4px;
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  transition: width 0.3s ease;
  @include will-animate(width);
}

.rocket-indicator {
  position: absolute;
  bottom: 4px;
  right: 4px;
}

.rocket-icon {
   color: Rgba(239, 68, 68, 1);
  font-size: 12px;
}

.empty-circle {
  width: 12px;
  height: 12px;
  border: 1px solid Rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}
</style>
