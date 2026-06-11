<script setup lang="ts">
import { computed, inject, ref, watch, onUnmounted, type Ref } from 'vue'
import { gsap } from 'gsap'
import { getPokemonTier } from '@/logic/pokemonUtils'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
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
const tierInfo = computed(() => props.pokemon ? getPokemonTier(props.pokemon) : { tier: '?', color: 'var(--gray)', rgb: '30, 41, 59', bg: 'rgba(255, 255, 255, 0.05)' })
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

const tierColorRgb = computed(() => tierInfo.value?.rgb || '30, 41, 59')

const computedTypePillSize = computed(() => {
  if (props.pokemon && props.pokemon.type && props.pokemon.type2) {
    return 'ssm'
  }
  return props.typePillSize
})

// --- ANIMACIONES DE GSAP ---
const animatedHpRatio = ref(hpRatio.value)
watch(hpRatio, (newVal) => {
  gsap.to(animatedHpRatio, {
    value: newVal,
    duration: 0.3,
    ease: 'power2.out'
  })
}, { immediate: true })

const selectedBorderRef = ref<HTMLElement | null>(null)
const checkBoxRef = ref<HTMLElement | null>(null)
let borderPulseTween: gsap.core.Tween | null = null
let checkBoxTween: gsap.core.Tween | null = null

const startBorderPulse = () => {
  if (borderPulseTween) borderPulseTween.kill()
  if (!selectedBorderRef.value) return
  borderPulseTween = gsap.fromTo(selectedBorderRef.value, 
    { opacity: 0.3 }, 
    { 
      opacity: 0.8, 
      duration: 1.0, 
      yoyo: true, 
      repeat: -1, 
      ease: 'sine.inOut' 
    }
  )
}

const stopBorderPulse = () => {
  if (borderPulseTween) {
    borderPulseTween.kill()
    borderPulseTween = null
  }
}

const animateCheckBox = (isSelected: boolean) => {
  if (checkBoxTween) checkBoxTween.kill()
  if (!checkBoxRef.value) return
  
  if (isSelected) {
    checkBoxTween = gsap.fromTo(checkBoxRef.value,
      { scale: 1, boxShadow: 'none' },
      { 
        scale: 1.1, 
        boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)', 
        duration: 0.2, 
        ease: 'back.out(1.7)' 
      }
    )
  } else {
    checkBoxTween = gsap.to(checkBoxRef.value, {
      scale: 1,
      boxShadow: 'none',
      duration: 0.2,
      ease: 'power2.out'
    })
  }
}

watch(() => props.isSelected, (newVal) => {
  if (newVal) {
    gsap.delayedCall(0, startBorderPulse)
    gsap.delayedCall(0, () => animateCheckBox(true))
  } else {
    stopBorderPulse()
    gsap.delayedCall(0, () => animateCheckBox(false))
  }
}, { immediate: true })

onUnmounted(() => {
  stopBorderPulse()
  if (checkBoxTween) checkBoxTween.kill()
})
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
        'is-on-mission': props.pokemon?.onMission,
        'is-busy': props.pokemon?.onMission || props.pokemon?.inDaycare || props.pokemon?.onDefense
      }
    ]"
    :style="{ 
      '--tier-color': tierInfo.color,
      '--tier-color-rgb': tierColorRgb
    }"
    @click.stop="cardEmit('click', $event, props.index)"
  >
    <div class="top-right-column">
      <div
        class="tier-badge m-badge-tier"
        :style="{ color: tierInfo.color, background: tierInfo.bg }"
      >
        {{ tierInfo.tier }}
      </div>

      <!-- Indicadores de Estado -->
      <div class="card-status-indicators">
        <PVTooltip
          v-if="props.pokemon.onMission"
          title="Misión"
          description="Este Pokémon está en una misión activa."
        >
          <div class="status-indicator mission">
            🧭
          </div>
        </PVTooltip>
        <PVTooltip
          v-if="props.pokemon.inDaycare"
          title="Guardería"
          description="Este Pokémon está en la guardería."
        >
          <div class="status-indicator daycare">
            🥚
          </div>
        </PVTooltip>
        <PVTooltip
          v-if="props.pokemon.onDefense"
          title="Defensa"
          description="Este Pokémon está asignado a la defensa."
        >
          <div class="status-indicator defense">
            🛡️
          </div>
        </PVTooltip>
      </div>
    </div>

    <!-- Píldora de Insignias Centralizada -->
    <UnifiedBadgePill 
      :pokemon="props.pokemon" 
      size="sm"
    />

    <!-- Sprite Section -->
    <div class="box-sprite-wrapper">
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
        <span
          class="box-pokemon-name"
          :class="{ 'is-species': !props.pokemon.nickname }"
        >{{ props.pokemon.nickname || props.pokemon.name }}</span>
      </div>
      <PokemonTypePills 
        :pokemon="props.pokemon" 
        :size="computedTypePillSize"
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
            width: (animatedHpRatio * 100) + '%', 
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
        ref="checkBoxRef"
        class="check-box"
        :class="{ checked: props.isSelected }"
      >
        <svg
          v-if="props.isSelected"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="checkmark-svg"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    </div>

    <!-- Borde de selección animado con GSAP -->
    <div
      v-if="props.isSelected"
      ref="selectedBorderRef"
      class="selected-border-pulse"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.box-pokemon-card {
  @include premium-card-hover(var(--tier-color, #1e293b), 1.02, -4px);
  @include pokemon-card-standard(20px);
  transform: Translatez(0); 
  border-color: var(--tier-color, Rgba(255, 255, 255, 0.15));
  
  &.is-premium-tier {
    @include pokemon-card-premium-tier;
  }

  &.is-on-mission, &.is-busy {
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

  &.is-busy {
    &.mode-release, &.mode-rocket, &.mode-select {
      opacity: 0.4;
      filter: Grayscale(1);
      cursor: not-allowed;
      pointer-events: none;
    }
  }

  // --- PERFORMANCE MODE OVERRIDES ---
  &.performance-mode {
    
    will-change: auto; 
    
    &:hover {
      filter: Brightness(1.1);
      &::before { opacity: 0 !important; }
      
      :deep(.box-card-sprite) {
        transform: Scale(1.05) !important;
      }
    }

    &.selected {
      background: Rgba(var(--tier-color-rgb), 0.2) !important;
      border-color: var(--tier-color) !important;
      box-shadow: none !important;
      
      &:hover {
        background: Rgba(var(--tier-color-rgb), 0.3) !important;
        box-shadow: none !important;
      }
    }
  }

  .selected-border-pulse {
    position: absolute;
    inset: 0;
    border: 2px solid var(--red);
    border-radius: inherit;
    pointer-events: none;
    z-index: var(--z-low);
  }
}
</style>
