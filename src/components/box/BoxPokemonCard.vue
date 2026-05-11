<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'
import { getPokemonTier } from '@/logic/pokemonUtils'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'
import { getPokemonVisualBadges } from '@/logic/constants/tags'
import { useUIStore } from '@/stores/ui'
import PokemonTypePills from '@/components/shared/PokemonTypePills.vue'

import type { Pokemon } from '@/types/pokemon'

const uiStore = useUIStore()

const props = withDefaults(defineProps<{
  pokemon: Pokemon
  index: number
  isSelected?: boolean
  selectionType?: string | null
  isPerformanceMode?: boolean
  hideStats?: boolean
  typePillSize?: 'ssm' | 'sm' | 'md' | 'lg'
}>(), {
  isSelected: false,
  selectionType: null,
  isPerformanceMode: false,
  hideStats: false,
  typePillSize: 'sm'
})

const isModalPerformance = inject<Ref<boolean> | null>('isModalPerformanceMode', null)
const isPerformanceActive = computed(() => {
  if (props.isPerformanceMode || uiStore.isSimplifiedModalsMode) return true
  
  if (isModalPerformance !== null) {
    return isModalPerformance.value
  } else {
    return uiStore.isAnyBlockingModalOpen
  }
})

const cardEmit = defineEmits<{
  (e: 'click', event: MouseEvent, index: number): void
}>()

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
  const hp = p.hp !== undefined ? p.hp : (p.maxHp || 100)
  const maxHp = p.maxHp || 100
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
        selected: props.isSelected, 
        [`mode-${props.selectionType}`]: !!props.selectionType,
        'with-badges': hasBadges, 
        'many-badges': hasManyBadges,
        'performance-mode': isPerformanceActive,
        'is-premium-tier': isPremiumTier,
        'is-on-mission': props.pokemon?.onMission
      }
    ]"
    @click.stop="cardEmit('click', $event, props.index)"
  >
    <div
      class="tier-badge m-badge-tier"
      :style="{ color: tierInfo.color, background: tierInfo.bg }"
    >
      {{ tierInfo.tier }}
    </div>

    <!-- Píldora de Insignias Centralizada -->
    <UnifiedBadgePill 
      :pokemon="props.pokemon" 
      size="sm"
    />

    <!-- Sprite Section -->
    <div class="box-sprite-wrapper">
      <div
        v-if="props.pokemon.onMission"
        class="status-indicator mission"
      >
        M
      </div>
      <div
        v-if="props.pokemon.inDaycare"
        class="status-indicator daycare"
      >
        G
      </div>
      <div
        v-if="props.pokemon.onDefense"
        class="status-indicator defense"
      >
        D
      </div>
      
      <PVSpriteFX
        :is-shiny="props.pokemon.isShiny"
        :is-guardian="props.pokemon.isGuardian"
        :sparkle-count="5"
        :enabled="!isPerformanceActive"
      >
        <img
          :src="spriteUrl"
          class="box-card-sprite"
          :class="[(props.pokemon.aura && !isPerformanceActive) ? `aura-${props.pokemon.aura}-mini` : '']"
          alt="pokemon"
          @error="e => { (e.target as HTMLImageElement).style.display = 'none' }"
        >
      </PVSpriteFX>
    </div>


    <!-- Info Footer -->
    <div class="card-info">
      <div class="box-pokemon-name-row">
        <span class="box-pokemon-name">{{ props.pokemon.nickname || props.pokemon.name }}</span>
      </div>
      <PokemonTypePills 
        :pokemon="props.pokemon" 
        :size="props.typePillSize"
        class="box-types"
      />
      <div class="stats-column">
        <div class="level-gender-row">
          <div class="m-badge-level">
            Nv. {{ props.pokemon.level }}
          </div>
          <div 
            v-if="props.pokemon.gender"
            :class="['m-badge-gender', 'mini', props.pokemon.gender === 'M' ? 'male' : 'female']"
          >
            {{ props.pokemon.gender === 'M' ? '♂' : '♀' }}
          </div>
        </div>
        <div
          v-if="!props.hideStats"
          class="m-badge-iv"
        >
          IV {{ totalIvs }}
        </div>
        <div
          v-if="!props.hideStats"
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
      v-if="props.selectionType"
      class="selection-check"
    >
      <div
        class="check-box"
        :class="{ checked: props.isSelected }"
      >
        <span v-if="props.isSelected">✓</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.box-pokemon-card {
  @include pokemon-card-standard(20px);
  transform: Translatez(0); // Hardware acceleration
  will-change: transform; // Layer promotion
  
  &.is-premium-tier {
    --tier-color: v-bind('tierInfo.color');
    @include pokemon-card-premium-tier;
  }

  &.is-on-mission {
    .box-card-sprite {
      will-change: transform, filter, opacity;
  filter: Grayscale(1);
      opacity: 0.6;
    }
    .card-info {
      will-change: transform, filter, opacity;
  filter: Grayscale(0.5);
      opacity: 0.8;
    }
  }

  // --- PERFORMANCE MODE OVERRIDES ---
  &.performance-mode {
    transition: background-color 0.2s ease, border-color 0.2s ease !important;
    will-change: auto; // Liberar memoria GPU si no es necesario
    
    &:hover {
      @include shell-hover-blue;
      transform: none !important;
      will-change: transform, filter, opacity;
      filter: Brightness(1.1);
      
      &::before { opacity: 0 !important; }
      
      :deep(.box-card-sprite) {
        transform: Scale(1.05) !important;
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
