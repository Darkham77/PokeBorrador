<script setup lang="ts">
import { ref, inject, computed, type ComputedRef } from 'vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { useUIStore } from '@/stores/ui'
import { useElementVisibility } from '@/composables/ui/useElementVisibility'

import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'
import FriendshipSealBadge from '@/components/pokemon/FriendshipSealBadge.vue'
import PokemonTypePills from '@/components/shared/PokemonTypePills.vue'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import { getPokemonVisualBadges } from '@/logic/constants/tags'
import { calculateTotalPower } from '@/logic/pokemon/pokemonUtils'
import { getFieldPassiveBadges } from '@/logic/pokemon/pokemonFieldAbilities'

import type { Pokemon } from '@/types/pokemon/pokemon'

interface Props {
  pokemon: Pokemon
  index?: number
  isPvp?: boolean
  maxObeyLv?: number
  // Permite configurar qué botones se muestran: 'item', 'details', 'box'
  actions?: string[]
  disableCardClick?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  index: -1,
  isPvp: false,
  maxObeyLv: 100,
  actions: () => ['item', 'details', 'box'],
  disableCardClick: false
})

const emit = defineEmits<{
  openDetail: [index: number]
  openItem: [index: number]
  unequipItem: [index: number]
  sendToBox: [index: number]
  select: [index: number]
  'toggle-tag': [tagId: string]
}>()

const cardRef = ref(null)
const { isVisible } = useElementVisibility(cardRef)
const uiStore = useUIStore()

// Hierarchy & Performance Injections
const isModalPerformance = inject<ComputedRef<boolean> | null>('isModalPerformanceMode', null)
const isModalTop = inject<ComputedRef<boolean> | null>('isModalTop', null)

/**
 * Determina si este componente está en el modal que el usuario tiene activo en primer plano.
 */
const isForeground = computed(() => {
  // 1. Prioridad: Flag explícito de jerarquía de modales
  if (isModalTop !== null) return isModalTop.value
  
  // 2. Fallback: Basado en performance (si no es simplificado, asumimos foreground)
  if (isModalPerformance !== null) {
    return isModalPerformance.value === false
  }
  
  return false
})

const isPerformanceActive = computed(() => {
  if (uiStore.isSimplifiedModalsMode) return true
  
  if (isModalPerformance !== null) {
    return isModalPerformance.value
  } else {
    return uiStore.isAnyBlockingModalOpen
  }
})

const HP_HIGH_THRESHOLD_RATIO = 0.5
const HP_MID_THRESHOLD_RATIO = 0.25

const hpPct = computed(() => props.pokemon.hp / props.pokemon.maxHp)

const getHpClass = (pct: number) => {
  if (pct > HP_HIGH_THRESHOLD_RATIO) return 'hp-high'
  if (pct > HP_MID_THRESHOLD_RATIO) return 'hp-mid'
  return 'hp-low'
}

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

const isPremiumTier = computed(() => tierInfo.value.tier === 'S' || tierInfo.value.tier === 'S+')

const cardClasses = computed(() => {
  const classes = ['pokemon-display-card'] // no-domain
  if (props.pokemon.onMission) classes.push('on-mission')
  if (props.pokemon.onEvent) classes.push('on-event')
  if (hasBadges.value) classes.push('with-badges')
  if (hasManyBadges.value) classes.push('many-badges')
  
  // En modo performance extremo (forzado), simplificamos todo
  if (uiStore.isSimplifiedModalsMode) {
    classes.push('is-performance-mode')
    return classes
  }

  // Si estamos en modo performance automático (modales de fondo), añadimos la clase pero NO retornamos todavía
  // Queremos mantener las clases de identidad (shiny, aura) para que el CSS las reconozca
  if (isPerformanceActive.value) {
    classes.push('is-performance-mode')
  }
  
  if (props.pokemon.aura) classes.push(`aura-${props.pokemon.aura}-mini`)
  if (props.pokemon.isShiny) classes.push('is-shiny')
  if (props.pokemon.isGuardian) classes.push('is-guardian')
  if (isPremiumTier.value) classes.push('is-premium-tier')
  
  return classes
})

function renderGenderSymbol(gender: string) {
  if (gender === 'm') return '♂'
  if (gender === 'f') return '♀'
  return ''
}

function getGenderClass(gender: string) {
  if (gender === 'm') return 'gender-male'
  if (gender === 'f') return 'gender-female'
  return 'gender-none'
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
    @click.stop="!disableCardClick && emit('openDetail', index)"
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

      <div class="top-right-column">
        <div
          class="card-tier-badge m-badge-tier"
          :style="{ '--tier-bg': tierInfo.bg, '--tier-color': tierInfo.color }"
        >
          {{ tierInfo.tier }}
        </div>
        <div class="card-status-indicators">
          <FriendshipSealBadge
            :friendship="pokemon.friendship"
            size="md"
          />
          <PVTooltip
            v-if="fieldPassive"
            :title="`HABILIDAD: ${fieldPassive.label.toUpperCase()}`"
            :description="fieldPassive.desc"
          >
            <div class="status-indicator field-passive">
              <span class="emoji">{{ fieldPassive.icon }}</span>
            </div>
          </PVTooltip>
          <PVTooltip
            v-if="pokemon.onMission"
            title="Misión"
            description="Este Pokémon está en una misión activa."
          >
            <div class="status-indicator mission">
              <span class="emoji">🧭</span>
            </div>
          </PVTooltip>
          <PVTooltip
            v-if="pokemon.onEvent"
            title="Evento"
            description="Este Pokémon está participando en un evento o concurso activo."
          >
            <div class="status-indicator event">
              <span class="emoji">🏆</span>
            </div>
          </PVTooltip>
          <PVTooltip
            v-if="pokemon.inDaycare"
            title="Guardería"
            description="Este Pokémon está en la guardería."
          >
            <div class="status-indicator daycare">
              <span class="emoji">🥚</span>
            </div>
          </PVTooltip>
          <PVTooltip
            v-if="pokemon.onDefense"
            title="Defensa"
            description="Este Pokémon está asignado a la defensa."
          >
            <div class="status-indicator defense">
              <span class="emoji">🛡️</span>
            </div>
          </PVTooltip>
        </div>
      </div>
    </div>

    <!-- Sprite Section -->
    <div class="sprite-section">
      <div
        v-if="pokemon.isIllegal"
        class="pokemon-illegal-danger-badge"
        :title="pokemon.illegalReasons?.join('\n') || 'Pokémon Ilegal'"
      >
        <span class="emoji danger-icon">⚠️</span>
        <span class="danger-label">ILEGAL</span>
      </div>
      <PVSpriteFX
        v-else
        :enabled="isVisible && (!isPerformanceActive || isForeground)"
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
            :class="{ 'is-species': !pokemon.nickname }"
          >{{ pokemon.nickname || pokemon.name }}</span>
          <span
            v-if="pokemon.nickname"
            class="pdc-species-subtitle"
          >{{ pokemon.name }}</span>
        </div>
        <div
          v-if="pokemon.gender"
          :class="['pdc-gender-badge', 'emoji', getGenderClass(pokemon.gender)]"
        >
          {{ renderGenderSymbol(pokemon.gender) }}
        </div>
      </div>

      <!-- Types Pills -->
      <PokemonTypePills 
        :pokemon="pokemon" 
        :size="pokemon.type2 ? 'ssm' : 'sm'"
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
      <div class="pdc-action-grid">
        <button
          v-if="actions.includes('item')"
          :id="`pokemon-use-item-${pokemon.uid}`"
          class="footer-btn item-btn"
          @click.stop="emit('openItem', index)"
        >
          <span class="emoji">🎒</span> USAR OBJETO
        </button>
        <button
          v-if="actions.includes('item')"
          class="footer-btn unequip-btn"
          :disabled="!pokemon.heldItem"
          @click.stop="emit('unequipItem', index)"
        >
          <span class="emoji">❌</span> QUITAR OBJETO
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
</style>
