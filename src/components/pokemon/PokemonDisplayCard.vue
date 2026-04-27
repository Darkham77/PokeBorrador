<script setup>
import { computed } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import { useUIStore } from '@/stores/ui'
import { useElementVisibility } from '@/composables/useElementVisibility'
import { ref, inject } from 'vue'

import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'
import { getPokemonTier } from '@/logic/constants/tiers'
import { getPokemonVisualBadges } from '@/logic/constants/tags'
import { calculateTotalPower } from '@/logic/pokemonUtils'

const props = defineProps({
  pokemon: { type: Object, required: true },
  index: { type: Number, default: -1 },
  isPvp: { type: Boolean, default: false },
  maxObeyLv: { type: Number, default: 100 },
  // Permite configurar qué botones se muestran: 'item', 'details', 'box'
  actions: { type: Array, default: () => ['item', 'details', 'box'] }
})

const emit = defineEmits(['click', 'openDetail', 'openItem', 'sendToBox', 'select', 'toggle-tag'])

const cardRef = ref(null)
const { isVisible } = useElementVisibility(cardRef)
const uiStore = useUIStore()

// Hierarchy & Performance Injections
const isModalPerformance = inject('isModalPerformanceMode', null)
const isPerformanceActive = computed(() => {
  if (uiStore.isSimplifiedModalsMode) return true
  
  if (isModalPerformance !== null) {
    return isModalPerformance.value
  } else {
    return uiStore.isAnyBlockingModalOpen
  }
})

const hpPct = computed(() => props.pokemon.hp / props.pokemon.maxHp)

const getHpClass = (pct) => {
  if (pct > 0.5) return 'hp-high'
  if (pct > 0.25) return 'hp-mid'
  return 'hp-low'
}

const tierInfo = computed(() => getPokemonTier(props.pokemon))

const badgesCount = computed(() => getPokemonVisualBadges(props.pokemon).length)
const hasBadges = computed(() => badgesCount.value > 0)
const hasManyBadges = computed(() => badgesCount.value >= 6)

const disobeys = computed(() => props.pokemon.level > props.maxObeyLv)

const spriteUrl = computed(() => {
  return getAssetUrl(ASSET_TYPES.POKEMON, props.pokemon.id, { 
    isShiny: props.pokemon.isShiny 
  })
})

const totalPower = computed(() => calculateTotalPower(props.pokemon))

const cardClasses = computed(() => {
  const classes = ['pokemon-display-card']
  if (props.pokemon.onMission) classes.push('on-mission')
  if (hasBadges.value) classes.push('with-badges')
  if (hasManyBadges.value) classes.push('many-badges')
  if (isPerformanceActive.value) {
    classes.push('is-performance-mode')
    return classes
  }
  
  if (props.pokemon.aura) classes.push(`aura-${props.pokemon.aura}-mini`)
  if (props.pokemon.isShiny) classes.push('is-shiny')
  if (props.pokemon.isGuardian) classes.push('is-guardian')
  return classes
})

function renderGenderSymbol(gender) {
  if (gender === 'M') return '♂'
  if (gender === 'F') return '♀'
  return ''
}

function getGenderClass(gender) {
  if (gender === 'M') return 'gender-male'
  if (gender === 'F') return 'gender-female'
  return 'gender-none'
}
</script>

<template>
  <div
    ref="cardRef"
    :class="cardClasses"
    @click.stop="emit('openDetail', index)"
  >
    <!-- Top Row: Items/Tags + Tier -->
    <div class="top-row">
      <!-- Píldora de Insignias Centralizada -->
      <UnifiedBadgePill 
        v-if="!isPerformanceActive"
        :pokemon="pokemon" 
        size="lg"
        editable
        @toggle-tag="(tagId) => emit('toggle-tag', tagId)"
      />
      <div
        v-else
        class="badges-spacer"
      />

      <div
        class="card-tier-badge m-badge-tier"
        :style="{ '--tier-bg': tierInfo.bg, '--tier-color': tierInfo.color }"
      >
        {{ tierInfo.tier }}
      </div>
    </div>

    <!-- Sprite Section -->
    <div class="sprite-section">
      <PVSpriteFX
        :enabled="isVisible && !isPerformanceActive"
        :is-shiny="pokemon.isShiny"
        :is-guardian="pokemon.isGuardian"
        :sparkle-count="5"
      >
        <img
          :src="spriteUrl"
          :alt="pokemon.name"
          class="pokemon-sprite"
          @error="e => e.target.style.display = 'none'"
        >
      </PVSpriteFX>
    </div>


    <!-- Info Section -->
    <div class="pokemon-info">
      <div
        class="name-line"
        :class="{ 'has-nickname': pokemon.nickname }"
      >
        <div class="pdc-name-stack">
          <span class="pdc-pokemon-name">{{ pokemon.nickname || pokemon.name }}</span>
          <span
            v-if="pokemon.nickname"
            class="pdc-species-subtitle"
          >{{ pokemon.name }}</span>
        </div>
        <div
          v-if="pokemon.gender"
          :class="['gender-pill', getGenderClass(pokemon.gender)]"
        >
          {{ renderGenderSymbol(pokemon.gender) }}
        </div>
      </div>
      
      <div class="level-line">
        <span class="m-badge-level">Nv. {{ pokemon.level }}</span>
        <span class="tot-badge m-badge-tot">TOT {{ totalPower }}</span>
      </div>

      <!-- Status Labels (Floating) -->
      <div class="status-labels">
        <span
          v-if="disobeys"
          class="status-tag obedience"
        >NV ALTO</span>
        <span
          v-if="pokemon.onMission"
          class="status-tag mission"
        >EN MISIÓN</span>
      </div>
      
      <div class="hp-container">
        <div class="hp-bar-outer">
          <div
            :class="['hp-bar-inner', getHpClass(hpPct)]"
            :style="{ width: (hpPct * 100) + '%' }"
          />
        </div>
        <div class="hp-stats">
          {{ pokemon.hp }} / {{ pokemon.maxHp }} HP
        </div>
      </div>
    </div>

    <!-- ACTIONS -->
    <div class="card-footer">
      <div class="action-grid">
        <button
          v-if="actions.includes('item')"
          class="footer-btn item-btn"
          @click.stop="emit('openItem', index)"
        >
          <span class="emoji">🎒</span> OBJETO
        </button>
        <button
          v-if="actions.includes('details')"
          class="footer-btn data-btn"
          @click.stop="emit('openDetail', index)"
        >
          <span class="emoji">📊</span> DATOS
        </button>
        <button
          v-if="actions.includes('box') && !isPvp"
          class="footer-btn box-btn"
          @click.stop="emit('sendToBox', index)"
        >
          <span class="emoji">📦</span> CAJA
        </button>
        <button
          v-if="isPvp"
          class="footer-btn replace-btn"
          @click.stop="emit('select', index)"
        >
          <span class="emoji">🔄</span> REEMPLAZAR
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/pokemon-display-card" as *;

.tot-badge {
  margin-left: 8px;
}
</style>
