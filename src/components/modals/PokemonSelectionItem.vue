<script setup lang="ts">
import { computed } from 'vue'

import PVTooltip from '@/components/common/PVTooltip.vue'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import PVGenderBadge from '@/components/common/PVGenderBadge.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import { ASSET_TYPES, getAssetUrl } from '@/logic/services/assetService'
import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'
import FriendshipSealBadge from '@/components/pokemon/FriendshipSealBadge.vue'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import { calculateTotalIVs } from '@/logic/pokemon/statsMath'
import { useBattleVisuals } from '@/composables/battle/useBattleVisuals'
import { useUIStore } from '@/stores/ui'
import { useBreedingStore } from '@/stores/breeding'
import { COMPAT_TEXT } from '@/logic/breeding/breedingData'
import { checkCompatibility } from '@/logic/breeding/breedingEngine'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import type { Pokemon, PokemonSelectionSource } from '@/types/pokemon/pokemon'
import { toPokemonType, type PokemonType } from '@/data/battle/types'
import { getVigor, getMaxVigor } from '@/logic/pokemon/pokemonUtils'

const { getHpColor } = useBattleVisuals()
const uiStore = useUIStore()
const breedingStore = useBreedingStore()

import {
  evaluatePokemonForSubCompetition,
  type ResolvedSubCompetition,
  type SubCompetitionConfig
} from '@/logic/events/eventCompetitions'
import { evaluatePokemonForSeason } from '@/logic/pvp/seasonTeamFilter'

interface Props {
  item: {
    pokemon: Pokemon
    _source: PokemonSelectionSource
    index: number
  }
  isSelected?: boolean
  total: number
  isBattleContext?: boolean
  autoConfirm?: boolean
  isDaycareContext?: boolean
  daycareSlotIdx?: number
  subCompetition?: ResolvedSubCompetition | SubCompetitionConfig | null
  seasonRules?: Record<string, unknown> | null
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
  isBattleContext: false,
  autoConfirm: false,
  isDaycareContext: false,
  daycareSlotIdx: 0,
  subCompetition: null,
  seasonRules: null
})

const emit = defineEmits<{
  (e: 'select', item: { pokemon: Pokemon, _source: PokemonSelectionSource, index: number }): void
}>()

const tierData = computed(() => getPokemonTier(props.item.pokemon))
const ivTotal = computed(() => {
  return calculateTotalIVs(props.item.pokemon.ivs)
})
const isPremiumTier = computed(() => tierData.value.tier === 'S' || tierData.value.tier === 'S+')
const typesCount = computed(() => {
  return [props.item.pokemon.type, props.item.pokemon.type2].filter(Boolean).length
})
const pokemonTypes = computed<PokemonType[]>(() => {
  const p = props.item.pokemon
  const types: PokemonType[] = [toPokemonType(p.type)]
  if (p.type2) types.push(toPokemonType(p.type2))
  return types
})

const listCompatibility = computed(() => {
  if (!props.isDaycareContext) return null
  const otherSlotIdx = props.daycareSlotIdx === 1 ? 0 : 1
  const otherSlot = breedingStore.slots.find((s) => s.slotIndex === otherSlotIdx)
  const otherPoke = otherSlot?.pokemon
  if (!otherPoke) return null
  return checkCompatibility(props.item.pokemon, otherPoke)
})

const eggSpeciesName = computed(() => {
  if (!listCompatibility.value?.eggSpecies) return ''
  return pokemonDataProvider.resolveSpeciesName(listCompatibility.value.eggSpecies)
})

const competitionEval = computed(() => {
  if (!props.subCompetition) return null
  const resolvedOrder = props.subCompetition.order === 'min' ? 'min' : 'max'
  return evaluatePokemonForSubCompetition(props.item.pokemon, props.subCompetition, resolvedOrder)
})

const competitionMetricIcon = computed(() => {
  if (!props.subCompetition) return '🏆'
  const m = props.subCompetition.metric
  if (m === 'total_ivs' || m === 'stat_iv') return '🧬'
  if (m === 'weight') return '⚖️'
  if (m === 'height') return '📏'
  if (m === 'level') return '📈'
  if (m === 'friendship') return '💖'
  return '🏆'
})

const competitionLabel = computed(() => {
  if (!props.subCompetition) return 'Torneo'
  const dirLabel = props.subCompetition.order === 'min' ? 'Menor' : 'Mayor'
  const m = props.subCompetition.metric
  if (m === 'weight') return `${dirLabel} Peso`
  if (m === 'height') return `${dirLabel} Altura`
  if (m === 'total_ivs') return 'IVs Totales'
  if (m === 'stat_iv' && props.subCompetition.targetStat) return `IV ${props.subCompetition.targetStat.toUpperCase()}`
  if (m === 'level') return `${dirLabel} Nivel`
  if (m === 'friendship') return `${dirLabel} Amistad`
  return props.subCompetition.name || 'Torneo'
})

const seasonEvaluation = computed(() => {
  if (!props.seasonRules) return null
  return evaluatePokemonForSeason(props.item.pokemon, props.seasonRules)
})

function handleOpenDetail() {
  uiStore.openPokemonDetail(props.item.pokemon, props.item.index, props.item._source, { source: 'selection' })
}

function handleClick() {
  if (seasonEvaluation.value && !seasonEvaluation.value.eligible) {
    uiStore.notify(`Este Pokémon no cumple las reglas de la temporada: ${seasonEvaluation.value.reason || ''}`, '⚠️')
    return
  }
  emit('select', props.item)
}
</script>

<template>
  <div 
    :id="'pokemon-select-' + item.pokemon.uid"
    class="list-item"
    :data-pokemon-uid="item.pokemon.uid"
    :class="{ 
      'is-selected': isSelected, 
      'is-active-battle': isBattleContext && item.pokemon.hp > 0,
      'is-fainted': item.pokemon.hp <= 0,
      'is-premium-tier': isPremiumTier,
      'is-rule-violated': seasonEvaluation && !seasonEvaluation.eligible
    }"
    :style="{ 
      '--tier-color': tierData.color,
      '--tier-bg': tierData.bg
    }"
    @click.stop="handleClick"
  >
    <div class="poke-preview-container">
      <PVTooltip
        title="DETALLES"
        description="Ver información completa de este Pokémon."
        position="top"
        class="info-tooltip-wrapper"
      >
        <button
          :id="'pokemon-detail-btn-' + item.pokemon.uid"
          v-gsap-hover="{ scale: 1.05, y: 0 }"
          type="button"
          class="btn-info-detail-trigger"
          @click.stop="handleOpenDetail"
        >
          ?
        </button>
      </PVTooltip>

      <div class="poke-preview sprite-click-target">
        <div
          v-if="item.pokemon.isIllegal"
          class="sel-illegal-danger-badge"
          :title="item.pokemon.illegalReasons?.join('\n') || 'Pokémon Ilegal'"
        >
          <span class="emoji danger-icon">⚠️</span>
          <span class="danger-label">ILEGAL</span>
        </div>
        <PVSpriteFX
          v-else
          :is-shiny="item.pokemon.isShiny"
          :is-guardian="item.pokemon.isGuardian"
          :sparkle-count="5"
        >
          <img
            :src="getAssetUrl(ASSET_TYPES.POKEMON, item.pokemon.id, { isShiny: item.pokemon.isShiny })"
            alt=""
            class="pixelated"
            @error="e => { (e.target as HTMLImageElement).style.display = 'none' }"
          >
        </PVSpriteFX>
      </div>
    </div>

    <div class="poke-details">
      <div class="top-line">
        <div class="name-group">
          <div class="ps-name-stack">
            <span
              class="name"
              :class="{ 'is-species': !item.pokemon.nickname }"
            >{{ item.pokemon.nickname || item.pokemon.name?.replace(/[♂♀]/g, '').trim() || 'Desconocido' }}</span>
            <span
              v-if="item.pokemon.nickname"
              class="sel-species-subtitle"
            >{{ item.pokemon.name }}</span>
          </div>
          <PVGenderBadge
            v-if="item.pokemon.gender"
            :gender="item.pokemon.gender"
            size="mini"
          />

          <!-- Action badges relocated next to gender -->
          <UnifiedBadgePill 
            :pokemon="item.pokemon" 
            size="sm"
            :vertical="false"
            :inline="true"
            class="header-pill"
          />
        </div>

        <div class="actions-right">
          <PVTooltip
            :title="item._source === 'team' ? 'Equipo' : (item._source === 'box' ? 'Caja de PC' : 'Mercado')"
            :description="item._source === 'team' ? 'Este Pokémon está en tu equipo activo.' : (item._source === 'box' ? 'Este Pokémon está guardado en tu caja.' : 'Este Pokémon está en el mercado.')"
            position="top"
          >
            <span
              class="emoji source-symbol"
              :class="item._source"
            >
              {{ item._source === 'team' ? '⚔️' : (item._source === 'box' ? '📦' : '🛒') }}
            </span>
          </PVTooltip>
          <FriendshipSealBadge
            :friendship="item.pokemon.friendship"
            size="sm"
          />
          <span class="m-badge-tier">{{ tierData.tier }}</span>
        </div>
      </div>
      <div class="bottom-info">
        <div class="info-row stats-line">
          <div class="sel-types-row">
            <PokemonTypeTag
              v-for="t in pokemonTypes" 
              :key="t"
              :type="t"
              :size="typesCount > 1 ? 'ssm' : 'sm'"
            />
          </div>
          <span class="m-badge-level">Nv. {{ item.pokemon.level ?? 1 }}</span>
          <span
            v-if="item.pokemon.ivs"
            class="m-badge-iv"
          >IVs {{ ivTotal }}</span>
          <PVTooltip
            title="PODER TOTAL"
            description="Suma de estadísticas base, IVs genéticos y bonificación de EVs (4 EVs = 1 IV)."
            position="top"
          >
            <span class="m-badge-tot">TOT {{ total }}</span>
          </PVTooltip>
        </div>

        <!-- Season Rule Violation Cartel -->
        <div
          v-if="seasonEvaluation && !seasonEvaluation.eligible"
          class="sel-season-violation-badge text-outline"
          :title="seasonEvaluation.reason"
        >
          <span class="emoji">⚠️</span>
          <span class="violation-label">{{ seasonEvaluation.reason }}</span>
        </div>
      </div>

      <!-- Battle HP Status -->
      <div
        v-if="isBattleContext"
        class="battle-hp-status"
      >
        <span class="hp-label">HP</span>
        <div class="hp-bar-container">
          <div 
            class="hp-bar-fill" 
            :style="{ 
              width: (Math.max(0, Math.min(100, (item.pokemon.hp / item.pokemon.maxHp * 100)))) + '%',
              backgroundColor: getHpColor(item.pokemon.hp / item.pokemon.maxHp * 100)
            }"
          />
        </div>
        <span class="hp-text">{{ item.pokemon.hp }} / {{ item.pokemon.maxHp }}</span>
      </div>
      
      <!-- Daycare Info (Compatibility / Vigor) -->
      <div
        v-if="isDaycareContext"
        class="daycare-item-meta"
      >
        <div class="daycare-meta-top">
          <div class="compat-status">
            <template v-if="listCompatibility">
              <span :style="{ color: (COMPAT_TEXT as Record<number, { color: string, label: string }>)[listCompatibility.level]?.color || '#ff668f' }">
                AFINIDAD: {{ (COMPAT_TEXT as Record<number, { color: string, label: string }>)[listCompatibility.level]?.label || 'Desconocida' }}
              </span>
              <span
                v-if="listCompatibility.eggSpecies"
                class="egg-hint"
              >
                <span class="emoji">🥚</span> {{ eggSpeciesName }}
              </span>
            </template>
            <template v-else>
              <span class="waiting-status">Esperando pareja</span>
            </template>
          </div>
          
          <div
            v-if="getVigor(item.pokemon) !== undefined"
            class="vigor-status-mini"
          >
            <span class="label">VIGOR: </span>
            <span :class="['value', { low: getVigor(item.pokemon) <= 2 }]"><span class="emoji">⚡</span> {{ getVigor(item.pokemon) }}/{{ getMaxVigor(item.pokemon) }}</span>
          </div>
        </div>

        <!-- Individual IVs List -->
        <div
          v-if="item.pokemon.ivs"
          class="ivs-list-row pixelated"
        >
          <span>HP: {{ item.pokemon.ivs.hp }}</span>
          <span>ATK: {{ item.pokemon.ivs.atk }}</span>
          <span>DEF: {{ item.pokemon.ivs.def }}</span>
          <span>SPA: {{ item.pokemon.ivs.spa }}</span>
          <span>SPD: {{ item.pokemon.ivs.spd }}</span>
          <span>SPE: {{ item.pokemon.ivs.spe }}</span>
        </div>
      </div>

      <!-- Tournament / Sub-Competition Evaluation Sub-Element -->
      <div
        v-if="competitionEval"
        class="competition-item-meta"
      >
        <div class="competition-meta-row">
          <div class="competition-metric-info">
            <span class="emoji competition-icon">{{ competitionMetricIcon }}</span>
            <span class="competition-label">{{ competitionLabel }}:</span>
            <span class="competition-value highlight">{{ competitionEval.displayValue }}</span>
          </div>
        </div>
      </div>
      
      <slot name="extra" />
    </div>

    <div 
      v-if="!autoConfirm"
      class="selection-indicator"
    >
      <div class="check-circle">
        <svg
          v-if="isSelected"
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
  </div>
</template>

<style scoped src="./PokemonSelectionItem.styles.scss" lang="scss"></style>
