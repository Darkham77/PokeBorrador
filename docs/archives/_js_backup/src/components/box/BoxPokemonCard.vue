<script setup>
import { computed } from 'vue'
import { getPokemonTier } from '@/logic/pokemonUtils'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'

import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'
import { getPokemonVisualBadges } from '@/logic/constants/tags'

import { inject } from 'vue'
import { useUIStore } from '@/stores/ui'
import PokemonTypePills from '@/components/shared/PokemonTypePills.vue'

const uiStore = useUIStore()

const props = defineProps({
  pokemon: { type: Object, required: true },
  index: { type: Number, required: true },
  isSelected: { type: Boolean, default: false },
  selectionType: { type: String, default: null }, // 'rocket' | 'release' | null
  isPerformanceMode: { type: Boolean, default: false },
  hideStats: { type: Boolean, default: false }
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

const visualBadges = computed(() => props.pokemon ? getPokemonVisualBadges(props.pokemon) : [])
const numBadges = computed(() => visualBadges.value.length)
const hasBadges = computed(() => numBadges.value > 0)
const hasManyBadges = computed(() => numBadges.value > 3)
const tierInfo = computed(() => props.pokemon ? getPokemonTier(props.pokemon) : { tier: '?', color: 'var(--gray)', bg: 'Rgba(255,255,255,0.05)' })
const spriteUrl = computed(() => props.pokemon ? getAssetUrl(ASSET_TYPES.POKEMON, props.pokemon.id, { 
  isShiny: props.pokemon.isShiny 
}) : '')

const hpRatio = computed(() => {
  const p = props.pokemon
  if (!p) return 0
  const hp = p.hp !== undefined ? p.hp : (p.stats?.hp || p.maxHp || 100)
  const maxHp = p.maxHp || p.stats?.hp || 100
  if (maxHp === 0) return 0
  return Math.max(0, Math.min(1, hp / maxHp))
})

const statColor = computed(() => {
  const ratio = hpRatio.value
  if (ratio > 0.5) return 'var(--green)'
  if (ratio > 0.2) return 'var(--yellow)'
  return 'var(--red)'
})

import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'

const totalIvs = computed(() => {
  if (props.hideStats || !props.pokemon) return 0
  const ivs = props.pokemon.ivs || {}
  return (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + 
         (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)
})

const bst = computed(() => {
  if (props.hideStats || !props.pokemon) return 0
  const baseData = pokemonDataProvider.getPokemonData(props.pokemon.id)
  if (!baseData) return 0
  return (baseData.hp || 0) + (baseData.atk || 0) + (baseData.def || 0) + 
         (baseData.spa || 0) + (baseData.spd || 0) + (baseData.spe || 0)
})

const isPremiumTier = computed(() => props.pokemon && (tierInfo.value.tier === 'S' || tierInfo.value.tier === 'S+'))
</script>

<template>
  <div
    :class="[
      'box-pokemon-card', 
      { 
        selected: isSelected, 
        [`mode-${selectionType}`]: !!selectionType,
        'with-badges': hasBadges, 
        'many-badges': hasManyBadges,
        'performance-mode': isPerformanceActive,
        'is-premium-tier': isPremiumTier,
        'is-on-mission': pokemon?.onMission
      }
    ]"
    @click.stop="emit('click', $event, index)"
  >
    <div
      class="tier-badge m-badge-tier"
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
      <div class="box-pokemon-name-row">
        <span class="box-pokemon-name">{{ props.pokemon.nickname || props.pokemon.name }}</span>
      </div>
      <PokemonTypePills 
        :pokemon="pokemon" 
        size="sm"
        class="box-types"
      />
      <div class="stats-column">
        <div class="level-gender-row">
          <div class="m-badge-level">
            Nv. {{ props.pokemon.level }}
          </div>
          <div 
            v-if="pokemon.gender"
            :class="['m-badge-gender', 'mini', pokemon.gender === 'M' ? 'male' : 'female']"
          >
            {{ pokemon.gender === 'M' ? '♂' : '♀' }}
          </div>
        </div>
        <div
          v-if="!hideStats"
          class="m-badge-iv"
        >
          IV {{ totalIvs }}
        </div>
        <div
          v-if="!hideStats"
          class="m-badge-tot"
        >
          TOT {{ bst + totalIvs }}
        </div>
      </div>
      
      <!-- HP Mini Bar -->
      <div class="hp-bar-mini">
        <div
          class="hp-fill"
          :style="{ 
            width: (hpRatio * 100) + '%', 
            background: statColor 
          }"
        />
      </div>
    </div>

    <!-- Selection Indicator (Inventory Style) -->
    <div
      v-if="selectionType"
      class="selection-check"
    >
      <div
        class="check-box"
        :class="{ checked: isSelected }"
      >
        <span v-if="isSelected">✓</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.box-pokemon-card {
  @include pokemon-card-standard(20px);
  transform: translateZ(0); // Hardware acceleration
  will-change: transform; // Layer promotion
  
  &.is-premium-tier {
    --tier-color: v-bind('tierInfo.color');
    @include pokemon-card-premium-tier;
  }

  &.is-on-mission {
    .box-card-sprite {
      filter: Grayscale(1);
      opacity: 0.6;
    }
    .card-info {
      filter: Grayscale(0.5);
      opacity: 0.8;
    }
  }

  // --- PERFORMANCE MODE OVERRIDES ---
  &.performance-mode {
    transition: background-color 0.2s ease, border-color 0.2s ease !important;
    will-change: auto; // Liberar memoria GPU si no es necesario
    
    &:hover {
      transform: none !important;
      filter: none !important;
      background: Rgba(255, 255, 255, 0.1) !important;
      border-color: Rgba(255, 255, 255, 0.4) !important;
      box-shadow: inset 0 0 10px Rgba(255, 255, 255, 0.1) !important;
      
      &::before { opacity: 0 !important; }
      
      :deep(.box-card-sprite) {
        transform: none !important;
        filter: none !important;
      }
    }

    &.selected {
      background: Rgba(59, 130, 246, 0.2) !important;
      border-color: #3b82f6 !important;
      box-shadow: none !important;
      
      &:hover {
        background: Rgba(59, 130, 246, 0.3) !important;
        box-shadow: none !important;
      }
    }
  }
}
</style>
