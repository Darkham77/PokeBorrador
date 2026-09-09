<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useEventStore } from '@/stores/events'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import type { CompetitionParticipant } from '@/types/system/stores'
import {
  resolveSubCompetitionDirection,
  getSubCompTitle,
  getSubCompDescription,
  getSubCompIcon,
  evaluatePokemonForSubCompetition,
  getEligiblePokemonForSubCompetition,
  isPokemonEnrolledInOtherSubCompetition,
  type Event as GameEvent,
  type SubCompetitionConfig,
  type ResolvedSubCompetition
} from '@/logic/events/eventEngine'
import { isPokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { getServerInstant } from '@/logic/utils/timeUtils'
import PVTooltip from '@/components/common/PVTooltip.vue'

interface Props {
  event: GameEvent
  idPrefix?: string
  resolvedSubComps: ResolvedSubCompetition[]
  cardSpeciesList: PokemonSpeciesId[]
}

const props = withDefaults(defineProps<Props>(), {
  idPrefix: ''
})

const eventStore = useEventStore()
const gameStore = useGameStore()
const modalStore = useModalStore()
const uiStore = useUIStore()

interface SpeciesTabItem {
  id: string
  species?: PokemonSpeciesId
  name: string
  icon?: string
  totalCount: number
  enrolledCount: number
  isComplete: boolean
}

const getEntryForCategory = (catId: string) => {
  return eventStore.userEntries[`${props.event.id}:${catId}`] || (catId === 'ivs' ? eventStore.userEntries[props.event.id] : undefined)
}

const enrolledCategoriesCount = computed(() => {
  if (props.event.type !== 'competition') return 0
  let count = 0
  for (const sub of props.resolvedSubComps) {
    if (getParticipantForCategory(sub)) {
      count++
    }
  }
  return count
})

const getParticipantForCategory = (sub: SubCompetitionConfig): CompetitionParticipant | null => {
  const entry = getEntryForCategory(sub.id)
  if (!entry) return null
  const uid = entry.pokemon_uid
  const found = gameStore.getPokemonByUid(uid)

  const dir = resolveSubCompetitionDirection(props.event.id, sub.id, sub.order)

  if (found) {
    const evalRes = evaluatePokemonForSubCompetition(found, sub, dir)
    return {
      uid: found.uid,
      id: found.id,
      name: found.name,
      nickname: found.nickname,
      level: found.level,
      isShiny: found.isShiny,
      ivs: found.ivs,
      height: found.height,
      weight: found.weight,
      displayValue: evalRes.displayValue,
      score: evalRes.score
    }
  }

  const data = entry.data
  if (data && data.species && isPokemonSpeciesId(data.species)) {
    return {
      uid,
      id: data.species,
      name: pokemonDataProvider.resolveSpeciesName(data.species),
      nickname: data.nickname,
      level: data.level || 1,
      isShiny: Boolean(data.is_shiny),
      ivs: data.ivs as Pokemon['ivs'],
      height: data.height,
      weight: data.weight,
      displayValue: data.displayValue,
      score: data.score
    }
  }
  return null
}

const formatMetricLabel = (sub: ResolvedSubCompetition | SubCompetitionConfig): string => {
  const dir = resolveSubCompetitionDirection(props.event.id, sub.id, sub.order)
  if (sub.metric === 'total_ivs') return 'Mayor IVs'
  if (sub.metric === 'stat_iv' && sub.targetStat) return `Mayor ${sub.targetStat.toUpperCase()}`
  if (sub.metric === 'weight') return dir === 'max' ? 'Mayor Peso' : 'Menor Peso'
  if (sub.metric === 'height') return dir === 'max' ? 'Mayor Altura' : 'Menor Altura'
  if (sub.metric === 'level') return dir === 'max' ? 'Mayor Nivel' : 'Menor Nivel'
  if (sub.metric === 'friendship') return dir === 'max' ? 'Mayor Amistad' : 'Menor Amistad'
  return sub.name
}

const openParticipationModal = (sub: ResolvedSubCompetition | SubCompetitionConfig) => {
  const targetSp = ('targetSpecies' in sub && sub.targetSpecies) ? sub.targetSpecies : null
  const allowedSpecies = targetSp
    ? [targetSp]
    : (props.cardSpeciesList.length > 0 ? props.cardSpeciesList : null)

  const allPokes = [...gameStore.allPokemonList] as Pokemon[]
  
  const eligible = getEligiblePokemonForSubCompetition(props.event, sub, allPokes, getServerInstant())
    .filter(p => !isPokemonEnrolledInOtherSubCompetition(eventStore.userEntries, props.event.id, sub.id, p.uid))

  if (eligible.length === 0) {
    const spNote = targetSp ? ` (${targetSp})` : ''
    uiStore.notify(`No tienes ningún Pokémon disponible para: ${getSubCompTitle(props.event.id, sub)}${spNote} (los ya inscritos en otra categoría no pueden repetir)`, '⚠️')
    return
  }

  const allowedIds = eligible.map(p => p.uid)
  const subtitle = `Elige un Pokémon para la categoría: ${getSubCompTitle(props.event.id, sub)}`
  const dir = resolveSubCompetitionDirection(props.event.id, sub.id, sub.order)
  const resolvedSub: ResolvedSubCompetition = {
    ...sub,
    order: dir,
    speciesScope: sub.speciesScope ?? 'global'
  }

  modalStore.open('PokemonSelection', {
    title: 'SELECCIONAR POKÉMON',
    subtitle,
    maxSelect: 1,
    minSelect: 1,
    includeTeam: true,
    context: 'event',
    subCompetition: resolvedSub,
    allowedSpecies,
    allowedIds,
    onConfirm: async (selectedObjects: Pokemon[]) => {
      const pokemon = selectedObjects[0]
      if (pokemon) {
        await eventStore.submitCompetitionEntry(props.event.id, sub.id, pokemon.uid)
      }
    }
  })
}

const handleSlotChipClick = (sub: ResolvedSubCompetition | SubCompetitionConfig) => {
  const participant = getParticipantForCategory(sub)
  if (participant) {
    modalStore.open('EventSlotAction', {
      event: props.event,
      sub,
      participant,
      onChange: () => {
        openParticipationModal(sub)
      },
      onWithdraw: () => {
        eventStore.removeCompetitionEntry(props.event.id, sub.id)
      }
    })
  } else {
    openParticipationModal(sub)
  }
}

const isAutoFilling = ref(false)

const handleAutoFill = async () => {
  if (isAutoFilling.value) return
  isAutoFilling.value = true
  try {
    const enrolled = await eventStore.autoFillBestEntries(props.event.id)
    if (enrolled > 0) {
      uiStore.notify(`¡${enrolled} categoría(s) rellenada(s) con tus mejores Pokémon!`, '🏆')
    } else {
      uiStore.notify('No hay mejoras disponibles para inscribir automáticamente.', 'ℹ️')
    }
  } catch (_err) {
    uiStore.notify('Error al auto-rellenar inscripciones.', '❌')
  } finally {
    isAutoFilling.value = false
  }
}

// Check if this event has multiple participating species
const isMultiSpecies = computed(() => {
  const speciesSet = new Set<PokemonSpeciesId>()
  for (const sub of props.resolvedSubComps) {
    if (sub.targetSpecies) {
      speciesSet.add(sub.targetSpecies)
    }
  }
  for (const sp of props.cardSpeciesList) {
    speciesSet.add(sp)
  }
  return speciesSet.size > 1
})

// Derived Species Tabs with Completion Check (only activated for multi-species events)
const speciesTabs = computed<SpeciesTabItem[]>(() => {
  if (!isMultiSpecies.value) {
    return []
  }

  const tabs: SpeciesTabItem[] = []

  // 1. Global categories
  const globalSubs = props.resolvedSubComps.filter(s => !s.targetSpecies || s.speciesScope === 'global')
  if (globalSubs.length > 0) {
    const enrolled = globalSubs.filter(s => Boolean(getParticipantForCategory(s))).length
    tabs.push({
      id: 'global',
      name: 'Global',
      icon: '🧬',
      totalCount: globalSubs.length,
      enrolledCount: enrolled,
      isComplete: enrolled === globalSubs.length && globalSubs.length > 0
    })
  }

  // 2. Species categories in stable order
  const speciesSeen = new Set<PokemonSpeciesId>()
  const speciesList: PokemonSpeciesId[] = []
  for (const sp of props.cardSpeciesList) {
    if (!speciesSeen.has(sp)) {
      speciesSeen.add(sp)
      speciesList.push(sp)
    }
  }
  for (const sub of props.resolvedSubComps) {
    if (sub.targetSpecies && !speciesSeen.has(sub.targetSpecies)) {
      speciesSeen.add(sub.targetSpecies)
      speciesList.push(sub.targetSpecies)
    }
  }

  for (const sp of speciesList) {
    const spSubs = props.resolvedSubComps.filter(s => s.targetSpecies === sp)
    if (spSubs.length > 0) {
      const enrolled = spSubs.filter(s => Boolean(getParticipantForCategory(s))).length
      tabs.push({
        id: sp,
        species: sp,
        name: pokemonDataProvider.resolveSpeciesName(sp),
        totalCount: spSubs.length,
        enrolledCount: enrolled,
        isComplete: enrolled === spSubs.length && spSubs.length > 0
      })
    }
  }

  return tabs
})

const activeTabId = ref<string>('global')

watch(
  speciesTabs,
  (tabs) => {
    if (tabs.length === 0) return
    const currentValid = tabs.some(t => t.id === activeTabId.value)
    if (!currentValid) {
      const firstIncomplete = tabs.find(t => !t.isComplete)
      const firstTab = tabs[0]
      activeTabId.value = firstIncomplete ? firstIncomplete.id : (firstTab ? firstTab.id : 'global')
    }
  },
  { immediate: true }
)

const activeSubComps = computed<ResolvedSubCompetition[]>(() => {
  if (speciesTabs.value.length <= 1) {
    return props.resolvedSubComps
  }
  if (activeTabId.value === 'global') {
    return props.resolvedSubComps.filter(s => !s.targetSpecies || s.speciesScope === 'global')
  }
  return props.resolvedSubComps.filter(s => s.targetSpecies === activeTabId.value)
})
</script>

<template>
  <div class="compact-competition-preview">
    <!-- Header with Anti-Collision Flex-Wrap -->
    <div class="comp-preview-header">
      <div class="header-title-group">
        <span class="comp-preview-title pixelated"><span class="emoji title-icon">🏆</span> CATEGORÍAS EN JUEGO</span>
        <span
          v-if="enrolledCategoriesCount > 0"
          class="comp-preview-badge pixelated enrolled"
        >
          <span class="emoji">✓</span> {{ enrolledCategoriesCount }}/{{ resolvedSubComps.length }}
        </span>
      </div>
      <button
        :id="(idPrefix || '') + 'event-auto-fill-btn-' + event.id"
        class="retro-btn auto-fill-btn pixelated"
        type="button"
        :disabled="isAutoFilling"
        @click.stop="handleAutoFill"
      >
        <span class="emoji">⚡</span> AUTO-RELLENAR
      </button>
    </div>

    <!-- Species Selection Micro-Tabs (Wrapped into multiple lines if many) -->
    <div
      v-if="speciesTabs.length > 1"
      class="species-tabs-container"
    >
      <button
        v-for="tab in speciesTabs"
        :id="(idPrefix || '') + 'event-species-tab-' + event.id + '-' + tab.id"
        :key="tab.id"
        type="button"
        class="species-tab-btn pixelated"
        :class="{
          active: activeTabId === tab.id,
          'is-complete': tab.isComplete,
          'has-enrolled': tab.enrolledCount > 0 && !tab.isComplete
        }"
        @click.stop="activeTabId = tab.id"
      >
        <img
          v-if="tab.species"
          :src="getAssetUrl(ASSET_TYPES.POKEMON, tab.species)"
          class="tab-poke-sprite"
          :alt="tab.name"
          draggable="false"
        >
        <span
          v-else
          class="tab-global-icon"
        ><span class="emoji">{{ tab.icon || '🧬' }}</span></span>

        <span class="tab-label">{{ tab.name }}</span>

        <!-- Green Check Pill if Completed -->
        <span
          v-if="tab.isComplete"
          class="tab-check-pill complete"
          title="Categorías completadas"
        >
          <span class="emoji">✓</span>
        </span>
        <span
          v-else-if="tab.enrolledCount > 0"
          class="tab-check-pill partial"
        >
          {{ tab.enrolledCount }}/{{ tab.totalCount }}
        </span>
      </button>
    </div>

    <!-- Active Filtered Categories Grid -->
    <div class="comp-categories-grid">
      <PVTooltip
        v-for="sub in activeSubComps"
        :key="sub.id"
        :title="getSubCompTitle(event.id, sub)"
        :description="getSubCompDescription(event.id, sub)"
        position="top"
      >
        <button
          :id="(idPrefix || '') + 'comp-slot-chip-' + event.id + '-' + sub.id"
          type="button"
          class="comp-slot-chip pixelated"
          :class="{ enrolled: Boolean(getParticipantForCategory(sub)) }"
          @click.stop="handleSlotChipClick(sub)"
        >
          <div class="chip-content">
            <!-- Metric Icon (🧬 Genética, ⚖️ Peso, 📏 Altura, etc.) -->
            <span class="chip-metric-icon">
              <span class="emoji">{{ sub.icon || getSubCompIcon(sub.metric) }}</span>
            </span>
            
            <!-- Clean Metric Name (IVs / Peso / Altura) -->
            <span class="chip-metric">{{ formatMetricLabel(sub) }}</span>
          </div>

          <!-- Simple Status Badge (+ or ✓) -->
          <span class="chip-status-pill">
            <span class="emoji">{{ getParticipantForCategory(sub) ? '✓' : '+' }}</span>
          </span>
        </button>
      </PVTooltip>
    </div>
  </div>
</template>

<style scoped src="./EventCardCategoryPreview.styles.scss" lang="scss"></style>
