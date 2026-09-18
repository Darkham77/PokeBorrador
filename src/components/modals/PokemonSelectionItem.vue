<script setup lang="ts">
import { computed } from 'vue'

import PVTooltip from '@/components/common/PVTooltip.vue'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import PVGenderBadge from '@/components/common/PVGenderBadge.vue'
import UnifiedBadgePill from '@/components/shared/UnifiedBadgePill.vue'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import { calculateTotalIVs } from '@/logic/pokemon/statsMath'
import { useUIStore } from '@/stores/ui'
import { useBreedingStore } from '@/stores/breeding'
import { checkCompatibility } from '@/logic/breeding/breedingEngine'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import type { Pokemon, PokemonSelectionSource } from '@/types/pokemon/pokemon'
import { toPokemonType, type PokemonType } from '@/data/battle/types'
import PokemonSelectionItemBattleHp from './selection/PokemonSelectionItemBattleHp.vue'
import PokemonSelectionItemDaycare from './selection/PokemonSelectionItemDaycare.vue'
import PokemonSelectionItemCompetition from './selection/PokemonSelectionItemCompetition.vue'
import PokemonSelectionItemPreview from './selection/PokemonSelectionItemPreview.vue'
import PokemonSelectionItemHeaderActions from './selection/PokemonSelectionItemHeaderActions.vue'

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
    <PokemonSelectionItemPreview
      :pokemon="item.pokemon"
      @open-detail="handleOpenDetail"
    />

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

        <PokemonSelectionItemHeaderActions
          :source="item._source"
          :friendship="item.pokemon.friendship"
          :tier="tierData.tier"
        />
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
      <PokemonSelectionItemBattleHp
        v-if="isBattleContext"
        :hp="item.pokemon.hp"
        :max-hp="item.pokemon.maxHp"
      />
      
      <!-- Daycare Info (Compatibility / Vigor) -->
      <PokemonSelectionItemDaycare
        v-if="isDaycareContext"
        :pokemon="item.pokemon"
        :list-compatibility="listCompatibility"
        :egg-species-name="eggSpeciesName"
      />

      <!-- Tournament / Sub-Competition Evaluation Sub-Element -->
      <PokemonSelectionItemCompetition
        v-if="competitionEval && subCompetition"
        :sub-competition="subCompetition"
        :display-value="competitionEval.displayValue"
      />
      
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
