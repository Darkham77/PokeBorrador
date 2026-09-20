<script setup lang="ts">
import { ref, inject, computed, type ComputedRef } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import PVGenderBadge from '@/components/common/PVGenderBadge.vue'
import PokemonTypePills from '@/components/shared/PokemonTypePills.vue'
import PokemonDisplayTopRow from '@/components/pokemon/PokemonDisplayTopRow.vue'
import PokemonDisplayActionFooter from '@/components/pokemon/PokemonDisplayActionFooter.vue'
import { useUIStore } from '@/stores/ui'
import { useElementVisibility } from '@/composables/ui/useElementVisibility'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import { getPokemonVisualBadges, type PokemonTagId } from '@/logic/constants/tags'
import { calculateTotalPower } from '@/logic/pokemon/pokemonUtils'
import { getFieldPassiveBadges } from '@/logic/pokemon/pokemonFieldAbilities'
import {
  calculateHpData,
  resolveCardStatusIndicators,
  resolveVisibleCardActions,
  resolvePokemonCardClasses
} from '@/components/pokemon/pokemonDisplayCardHelper'

import type { Pokemon } from '@/types/pokemon/pokemon'

interface Props {
  pokemon: Pokemon
  index?: number
  isPvp?: boolean
  maxObeyLv?: number
  // Permite configurar qué botones se muestran: 'item', 'details', 'box'
  actions?: string[]
  disableCardClick?: boolean
  isRuleViolated?: boolean
  ruleViolationReason?: string
}

const props = withDefaults(defineProps<Props>(), {
  index: -1,
  isPvp: false,
  maxObeyLv: 100,
  actions: () => ['item', 'details', 'box'],
  disableCardClick: false,
  isRuleViolated: false,
  ruleViolationReason: ''
})

const emit = defineEmits<{
  openDetail: [index: number]
  openItem: [index: number]
  unequipItem: [index: number]
  sendToBox: [index: number]
  select: [index: number]
  'toggle-tag': [tagId: PokemonTagId]
}>()

const cardRef = ref(null)
const { isVisible } = useElementVisibility(cardRef)
const uiStore = useUIStore()

// Hierarchy & Performance Injections
const isModalFast = inject<ComputedRef<boolean> | null>('isModalFastMode', null) ?? inject<ComputedRef<boolean> | null>('isModalPerformanceMode', null)
const isModalTop = inject<ComputedRef<boolean> | null>('isModalTop', null)

/**
 * Determina si este componente está en el modal que el usuario tiene activo en primer plano.
 */
const isForeground = computed(() => {
  if (isModalTop !== null) return isModalTop.value
  if (isModalFast !== null) {
    return isModalFast.value === false
  }
  return false
})

const isPerformanceActive = computed(() => {
  if (uiStore.isSimplifiedModalsMode) return true
  if (isModalFast !== null) {
    return isModalFast.value
  }
  return uiStore.isFastMode
})

const hpData = computed(() => calculateHpData(props.pokemon.hp, props.pokemon.maxHp))

const tierInfo = computed(() => getPokemonTier(props.pokemon))
const tierColorRgb = computed(() => tierInfo.value?.rgb || '30, 41, 59')

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
const fieldPassive = computed(() => getFieldPassiveBadges(props.pokemon))
const statusIndicators = computed(() => resolveCardStatusIndicators(props.pokemon, fieldPassive.value))
const visibleActions = computed(() => resolveVisibleCardActions(props.actions, props.isPvp))

const isPremiumTier = computed(() => tierInfo.value.tier === 'S' || tierInfo.value.tier === 'S+')

const cardClasses = computed(() => {
  return resolvePokemonCardClasses(props.pokemon, {
    hasBadges: hasBadges.value,
    hasManyBadges: hasManyBadges.value,
    isSimplifiedModals: uiStore.isSimplifiedModalsMode,
    isPerformanceActive: isPerformanceActive.value,
    isPremiumTier: isPremiumTier.value,
    isRuleViolated: props.isRuleViolated
  })
})

const violationReason = computed(() => props.ruleViolationReason || 'No cumple las reglas')
const isIllegalPokemon = computed(() => Boolean(props.pokemon.isIllegal))
const illegalTitle = computed(() => props.pokemon.illegalReasons?.join('\n') || 'Pokémon Ilegal')
const isFxEnabled = computed(() => Boolean(isVisible.value && (!isPerformanceActive.value || isForeground.value)))
const isSpeciesName = computed(() => !props.pokemon.nickname)
const displayName = computed(() => props.pokemon.nickname || props.pokemon.name)
const typePillsSize = computed(() => (props.pokemon.type2 ? 'ssm' : 'sm'))

function handleCardClick() {
  if (!props.disableCardClick) {
    emit('openDetail', props.index)
  }
}
</script>

<template>
  <div
    ref="cardRef"
    :data-pokemon-uid="pokemon.uid"
    :class="[cardClasses, { 'disable-click': disableCardClick }]"
    :style="{ 
      '--tier-color': tierInfo.color,
      '--tier-color-rgb': tierColorRgb
    }"
    @click.stop="handleCardClick"
  >
    <!-- Rule Violation Cartel -->
    <div
      v-if="props.isRuleViolated"
      class="rule-violation-cartel text-outline"
    >
      <span class="emoji">⚠️</span>
      <span class="violation-reason-text">{{ violationReason }}</span>
    </div>

    <!-- Top Row: Items/Tags + Tier -->
    <PokemonDisplayTopRow
      :pokemon="pokemon"
      :is-performance-active="isPerformanceActive"
      :tier-info="tierInfo"
      :status-indicators="statusIndicators"
      @toggle-tag="(tagId) => emit('toggle-tag', tagId)"
    />

    <!-- Sprite Section -->
    <div class="sprite-section">
      <div
        v-if="isIllegalPokemon"
        class="pokemon-illegal-danger-badge"
        :title="illegalTitle"
      >
        <span class="emoji danger-icon">⚠️</span>
        <span class="danger-label">ILEGAL</span>
      </div>
      <PVSpriteFX
        v-else
        :enabled="isFxEnabled"
        :is-shiny="pokemon.isShiny"
        :is-guardian="pokemon.isGuardian"
        :sparkle-count="5"
      >
        <img
          :src="spriteUrl"
          :alt="pokemon.name"
          class="pokemon-sprite"
          @error="e => { (e.target as HTMLImageElement).style.display = 'none' }"
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
          <span
            class="pdc-pokemon-name"
            :class="{ 'is-species': isSpeciesName }"
          >{{ displayName }}</span>
          <span
            v-if="pokemon.nickname"
            class="pdc-species-subtitle"
          >{{ pokemon.name }}</span>
        </div>
        <PVGenderBadge
          v-if="pokemon.gender"
          :gender="pokemon.gender"
          size="md"
        />
      </div>

      <!-- Types Pills -->
      <PokemonTypePills 
        :pokemon="pokemon" 
        :size="typePillsSize"
        class="pdc-types"
      />
      
      <div class="level-line">
        <span class="m-badge-level">Nv. {{ pokemon.level }}</span>
        <PVTooltip
          title="PODER TOTAL"
          description="Suma de estadísticas base, IVs genéticos y bonificación de EVs (4 EVs = 1 IV)."
          position="top"
        >
          <span class="m-badge-tot">TOT {{ totalPower }}</span>
        </PVTooltip>
      </div>

      <!-- Status Labels (Floating) -->
      <div class="status-labels">
        <span
          v-if="disobeys"
          class="status-tag obedience"
        >NV ALTO</span>
      </div>
      
      <div class="hp-container">
        <div class="hp-bar-outer">
          <div
            :class="['hp-bar-inner', hpData.hpClass]"
            :style="{ width: hpData.pctWidth }"
          />
        </div>
        <div class="hp-stats">
          {{ hpData.text }}
        </div>
      </div>
    </div>

    <!-- ACTIONS -->
    <PokemonDisplayActionFooter
      :pokemon-uid="pokemon.uid"
      :index="index"
      :visible-actions="visibleActions"
      :has-held-item="Boolean(pokemon.heldItem)"
      @open-item="(idx) => emit('openItem', idx)"
      @unequip-item="(idx) => emit('unequipItem', idx)"
      @open-detail="(idx) => emit('openDetail', idx)"
      @send-to-box="(idx) => emit('sendToBox', idx)"
      @select="(idx) => emit('select', idx)"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/components/pokemon-display-card" as *;

.tot-badge {
  margin-left: 8px;
}

.pokemon-illegal-danger-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: Rgba(239, 68, 68, 0.2);
  border: 2px dashed #ef4444;
  border-radius: 8px;

  .danger-icon {
    font-size: 1.8rem;
    line-height: 1;
  }

  .danger-label {
    font-size: 0.65rem;
    font-weight: 900;
    color: #ff6b6b;
    letter-spacing: 0.5px;
    margin-top: 2px;
  }
}

.pokemon-display-card.is-rule-violated {
  border-color: Rgba(239, 68, 68, 0.85) !important;
  box-shadow: 0 0 12px Rgba(239, 68, 68, 0.4) !important;

  .sprite-section,
  .pokemon-info,
  .top-row {
    filter: Grayscale(0.85);
    opacity: 0.75;
  }
}

.rule-violation-cartel {
  position: absolute;
  top: 36px;
  left: 6px;
  right: 6px;
  z-index: var(--z-modal-step);
  background: Rgba(185, 28, 28, 0.95);
  border: 1px solid Rgba(254, 202, 202, 0.8);
  border-radius: 6px;
  padding: 3px 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 4px 12px Rgba(0, 0, 0, 0.6);
  pointer-events: none;

  .emoji {
    font-size: 11px;
    flex-shrink: 0;
  }

  .violation-reason-text {
    font-size: 8px;
    line-height: 1.45;
    padding-bottom: 2px;
    color: #ffffff;
    letter-spacing: 0.2px;
    white-space: normal;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
