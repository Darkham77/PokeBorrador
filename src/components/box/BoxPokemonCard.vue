<script setup>
import { computed } from 'vue'
import { getPokemonTier } from '@/logic/pokemonUtils'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'

import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'
import { getPokemonVisualBadges } from '@/logic/constants/tags'

import { inject } from 'vue'
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()

const props = defineProps({
  pokemon: { type: Object, required: true },
  index: { type: Number, required: true },
  isSelected: { type: Boolean, default: false },
  isRocketMode: { type: Boolean, default: false },
  isPerformanceMode: { type: Boolean, default: false }
})

const isModalPerformance = inject('isModalPerformanceMode', null)
const isPerformanceActive = computed(() => {
  if (props.isPerformanceMode || uiStore.isSimplifiedModalsMode) return true
  
  if (isModalPerformance !== null) {
    return isModalPerformance.value
  } else {
    return uiStore.isAnyBlockingModalOpen
  }
})

const emit = defineEmits(['click'])

const hasBadges = computed(() => getPokemonVisualBadges(props.pokemon).length > 0)
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

import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

const totalIvs = computed(() => {
  const ivs = props.pokemon.ivs || {}
  return (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + 
         (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)
})

const bst = computed(() => {
  const baseData = pokemonDataProvider.getPokemonData(props.pokemon.id)
  if (!baseData) return 0
  return (baseData.hp || 0) + (baseData.atk || 0) + (baseData.def || 0) + 
         (baseData.spa || 0) + (baseData.spd || 0) + (baseData.spe || 0)
})
</script>

<template>
  <div
    :class="['box-pokemon-card', { selected: isSelected, 'with-badges': hasBadges, 'performance-mode': isPerformanceActive }]"
    @click.stop="emit('click', index)"
  >
    <!-- Badge Tier -->
    <div
      class="tier-badge"
      :style="{ color: tierInfo.color, background: tierInfo.bg }"
    >
      {{ tierInfo.tier }}
    </div>

    <!-- Píldora de Insignias Centralizada -->
    <UnifiedBadgePill 
      :pokemon="pokemon" 
      size="sm"
    />

    <!-- Sprite Section -->
    <div class="box-sprite-wrapper">
      <div
        v-if="pokemon.onMission"
        class="status-indicator mission"
      >
        M
      </div>
      <div
        v-if="pokemon.inDaycare"
        class="status-indicator daycare"
      >
        G
      </div>
      <div
        v-if="pokemon.onDefense"
        class="status-indicator defense"
      >
        D
      </div>
      
      <PVSpriteFX
        :is-shiny="pokemon.isShiny"
        :is-guardian="pokemon.isGuardian"
        :sparkle-count="5"
        :enabled="!isPerformanceActive"
      >
        <img
          :src="spriteUrl"
          class="box-card-sprite"
          :class="[(pokemon.aura && !isPerformanceActive) ? `aura-${pokemon.aura}-mini` : '']"
          alt="pokemon"
          @error="e => e.target.style.display = 'none'"
        >
      </PVSpriteFX>
    </div>

    <!-- Info Footer -->
    <div class="card-info">
      <div class="box-pokemon-name">
        {{ props.pokemon.nickname || props.pokemon.name }}
      </div>
      <div class="stats-column">
        <div class="level">
          NV. {{ props.pokemon.level }}
        </div>
        <div class="mini-stat ivs">
          IV {{ totalIvs }}
        </div>
        <div class="mini-stat bst">
          TOT {{ bst + totalIvs }}
        </div>
      </div>
      
      <!-- HP Mini Bar -->
      <div class="hp-bar-mini">
        <div
          class="hp-fill"
          :style="{ width: (props.pokemon.hp / props.pokemon.maxHp * 100) + '%', background: statColor }"
        />
      </div>
    </div>

    <!-- Selection Indicator -->
    <div
      v-if="isRocketMode"
      class="selection-overlay"
    >
      <div class="selection-circle">
        <span v-if="isSelected">🚀</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/views/box";
@use "@/styles/core/tools" as *;

.status-indicator {
  position: absolute;
  right: -2px;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  @include pixelated;
  z-index: var(--z-low);
  box-shadow: 0 2px 4px Rgba(0,0,0,0.3);
  border: 1px solid Rgba(255,255,255,0.2);

  &.mission { top: 0; background: var(--yellow); color: $black; }
  &.daycare { top: 18px; background: var(--blue); color: $white; }
  &.defense { top: 36px; background: var(--green); color: $white; }
}

.selection-overlay {
  position: absolute;
  inset: 0;
  background: Rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: calc(var(--z-low) + 1);

  .selection-circle {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid Rgba(255, 255, 255, 0.3);
    background: Rgba(0, 0, 0, 0.4);
    @include flex-center;
    font-size: 12px;
  }
}

.selected .selection-circle {
  border-color: var(--red);
  background: var(--red);
  box-shadow: 0 0 10px Rgba(239, 68, 68, 0.5);
}
</style>
