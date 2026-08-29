<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { useEventStore } from '@/stores/events'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import EventCategorySlotCard from './EventCategorySlotCard.vue'
import type { CompetitionParticipant } from '@/types/system/stores'
import { 
  resolveEventSubCompetitions,
  resolveSubCompetitionDirection,
  getSubCompTitle,
  evaluatePokemonForSubCompetition, 
  getEligiblePokemonForSubCompetition, 
  isPokemonEnrolledInOtherSubCompetition,
  resolveWeeklyRotation,
  getEventCurrentWindow,
  type Event as GameEvent, 
  type EventConfig,
  type SubCompetitionConfig,
  type ResolvedSubCompetition,
  type WeeklyRotationEntry
} from '@/logic/events/eventEngine'
import { isPokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { getServerTime, getServerInstant, getGMT3Date } from '@/logic/utils/timeUtils'

interface Props {
  event: GameEvent
}

const props = defineProps<Props>()

const eventStore = useEventStore()
const gameStore = useGameStore()
const modalStore = useModalStore()
const uiStore = useUIStore()

const now = ref(getServerTime())
let timerTween: gsap.core.Tween | null = null
const badgeRef = ref<HTMLElement | null>(null)
let badgeCtx: gsap.Context | null = null

const updateTime = () => {
  now.value = getServerTime()
  timerTween = gsap.delayedCall(1, updateTime)
}

const formatTime = (isoTime: string) => {
  if (!isoTime) return 'Indefinido'
  try {
    const target = Temporal.Instant.from(isoTime)
    const current = Temporal.Instant.fromEpochMilliseconds(now.value)
    
    if (Temporal.Instant.compare(target, current) <= 0) return 'Terminando...'
    
    const duration = target.since(current, { largestUnit: 'minute' })
    const min = Math.max(0, Math.floor(duration.minutes))
    const sec = Math.max(0, Math.floor(Math.abs(duration.seconds) % 60))
    return `${min}m ${sec}s`
  } catch (_e) {
    return 'Error'
  }
}

const formattedRemainingTime = computed(() => {
  const currentInstant = Temporal.Instant.fromEpochMilliseconds(now.value)
  const window = getEventCurrentWindow(props.event, currentInstant)
  if (window) {
    if (Temporal.Instant.compare(window.end, currentInstant) <= 0) return 'Terminando...'
    const diffMs = window.end.epochMilliseconds - now.value
    const totalSecs = Math.max(0, Math.floor(diffMs / 1000))
    const hours = Math.floor(totalSecs / 3600)
    const mins = Math.floor((totalSecs % 3600) / 60)
    const secs = totalSecs % 60
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`
    }
    return `${mins}m ${secs}s`
  }
  if (props.event.end_at) {
    return formatTime(props.event.end_at)
  }
  if (props.event.manual) {
    return 'Manual (Activo)'
  }
  return 'Indefinido'
})

const parsedEventConfig = computed<EventConfig>(() => {
  if (typeof props.event.config === 'string') {
    try {
      return JSON.parse(props.event.config) as EventConfig
    } catch (_e) {
      return {}
    }
  } else if (props.event.config && typeof props.event.config === 'object') {
    return props.event.config as EventConfig
  }
  return {}
})

const cardDisplayName = computed(() => {
  if (props.event.id === 'hora_magikarp') return 'Hora de Pesca del Magikarp'
  return props.event.name || props.event.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) // text-ok
})

const currentWeeklyRotation = computed<WeeklyRotationEntry | null>(() => {
  return resolveWeeklyRotation(parsedEventConfig.value, getGMT3Date())
})

const cardSpeciesList = computed<PokemonSpeciesId[]>(() => {
  if (currentWeeklyRotation.value?.species && isPokemonSpeciesId(currentWeeklyRotation.value.species)) {
    return [currentWeeklyRotation.value.species]
  }
  if (parsedEventConfig.value.species && parsedEventConfig.value.species !== '*') {
    const list = parsedEventConfig.value.species.split(',').map(s => s.trim()).filter(isPokemonSpeciesId)
    if (list.length > 0) return list
  }
  return []
})

const cardBannerKey = computed(() => {
  if (currentWeeklyRotation.value?.banner) {
    return currentWeeklyRotation.value.banner
  }
  return parsedEventConfig.value.banner || ''
})

const resolvedSubComps = computed<ResolvedSubCompetition[]>(() => {
  return resolveEventSubCompetitions(props.event, getServerInstant())
})

const globalSubComps = computed(() => {
  return resolvedSubComps.value.filter(s => !s.targetSpecies)
})

const speciesScopedSubComps = computed(() => {
  return resolvedSubComps.value.filter(s => Boolean(s.targetSpecies))
})

const participatingSpeciesList = computed<PokemonSpeciesId[]>(() => {
  const set = new Set<PokemonSpeciesId>()
  for (const sub of speciesScopedSubComps.value) {
    if (sub.targetSpecies) {
      set.add(sub.targetSpecies)
    }
  }
  return Array.from(set)
})

const selectedSpeciesTab = ref<PokemonSpeciesId | null>(null)

watch(participatingSpeciesList, (newList) => {
  if (newList.length > 0) {
    if (!selectedSpeciesTab.value || !newList.includes(selectedSpeciesTab.value)) {
      selectedSpeciesTab.value = newList[0]!
    }
  } else {
    selectedSpeciesTab.value = null
  }
}, { immediate: true })

const activeSpeciesSubComps = computed(() => {
  if (!selectedSpeciesTab.value) return speciesScopedSubComps.value
  return speciesScopedSubComps.value.filter(s => s.targetSpecies === selectedSpeciesTab.value)
})

const hasSpeciesEnrollment = (sp: PokemonSpeciesId): boolean => {
  const subs = speciesScopedSubComps.value.filter(s => s.targetSpecies === sp)
  return subs.some(s => Boolean(getParticipantForCategory(s)))
}

const getEntryForCategory = (catId: string) => {
  return eventStore.userEntries[`${props.event.id}:${catId}`] || (catId === 'ivs' ? eventStore.userEntries[props.event.id] : undefined)
}

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
      name: data.name || String(data.species),
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

const openParticipationModal = (sub: ResolvedSubCompetition | SubCompetitionConfig) => {
  const targetSp = ('targetSpecies' in sub && sub.targetSpecies) ? sub.targetSpecies : null
  const allowedSpecies = targetSp
    ? [targetSp]
    : (cardSpeciesList.value.length > 0 ? cardSpeciesList.value : null)

  const team = (gameStore.state.team || []) as (Pokemon | null)[]
  const box = (gameStore.state.box || []) as (Pokemon | null)[]
  const allPokes = [...team, ...box].filter((p): p is Pokemon => p !== null) // o1-ok
  
  const eligible = getEligiblePokemonForSubCompetition(props.event, sub, allPokes, getServerInstant())
    .filter(p => !isPokemonEnrolledInOtherSubCompetition(eventStore.userEntries, props.event.id, sub.id, p.uid))

  if (eligible.length === 0) {
    const spNote = targetSp ? ` (${targetSp})` : '' // domain-ok
    uiStore.notify(`No tienes ningún Pokémon disponible para: ${getSubCompTitle(props.event.id, sub)}${spNote} (los ya inscritos en otra categoría no pueden repetir)`, '⚠️')
    return
  }

  const allowedIds = eligible.map(p => p.uid)
  const subtitle = `Elige un Pokémon para la categoría: ${getSubCompTitle(props.event.id, sub)}`

  modalStore.open('PokemonSelection', {
    title: 'SELECCIONAR POKÉMON',
    subtitle,
    maxSelect: 1,
    minSelect: 1,
    includeTeam: true,
    context: 'event',
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

const openEventDetail = () => {
  modalStore.open('EventDetail', {
    event: props.event
  })
}

const openSpeciesDetail = (speciesId: PokemonSpeciesId) => {
  modalStore.open('PokedexDetail', {
    speciesId,
    context: 'pokedex'
  })
}

const onCardHover = (event: MouseEvent, isEntering: boolean) => {
  const card = event.currentTarget as HTMLElement
  if (!card) return
  if (isEntering) {
    gsap.to(card, {
      borderColor: 'rgba(255, 215, 0, 0.5)',
      y: -2,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto'
    })
  } else {
    gsap.to(card, {
      borderColor: 'rgba(255, 255, 255, 0.1)',
      y: 0,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'borderColor,transform'
    })
  }
}

onMounted(() => {
  updateTime()
  
  if (badgeRef.value) {
    badgeCtx = gsap.context(() => {
      gsap.fromTo(badgeRef.value, 
        { boxShadow: "0 0 0 0 rgba(74, 222, 128, 0.4)" },
        { 
          boxShadow: "0 0 0 6px rgba(74, 222, 128, 0)",
          duration: 1.4,
          repeat: -1,
          ease: "sine.out"
        }
      )
    }, badgeRef.value)
  }
})

onUnmounted(() => {
  if (timerTween) {
    timerTween.kill()
  }
  if (badgeCtx) {
    badgeCtx.revert()
  }
})
</script>

<template>
  <div
    class="event-card"
    :class="{ 'has-banner': Boolean(cardBannerKey) }"
    @click.stop="openEventDetail"
    @mouseenter="onCardHover($event, true)"
    @mouseleave="onCardHover($event, false)"
  >
    <!-- Banner -->
    <div
      v-if="cardBannerKey"
      class="banner-box"
    >
      <img
        :src="getAssetUrl(ASSET_TYPES.BANNER, cardBannerKey)"
        :alt="cardDisplayName"
        @error="(e: Event) => ((e.target as HTMLImageElement).style.display='none')"
      >
    </div>
    
    <div class="card-body">
      <div class="body-header">
        <div class="event-id-icon">
          {{ event.icon }}
        </div>
        <div class="event-main-meta">
          <h2>{{ cardDisplayName }}</h2>

          <div class="tags-row">
            <span
              class="type-tag"
              :class="event.type"
            >{{ event.type === 'competition' ? 'COMPETICIÓN' : 'EVENTO' }}</span>
            <span
              v-if="parsedEventConfig.speciesShinyMult && parsedEventConfig.speciesShinyMult > 1"
              class="type-tag shiny"
            >✨ x{{ parsedEventConfig.speciesShinyMult }} SHINY</span>
            <span
              v-if="parsedEventConfig.speciesRateMult && parsedEventConfig.speciesRateMult > 1"
              class="type-tag spawn"
            >🎯 x{{ parsedEventConfig.speciesRateMult }} SPAWN</span>
            <span
              v-if="parsedEventConfig.fishingMult && parsedEventConfig.fishingMult > 1"
              class="type-tag fishing"
            >🎣 x{{ parsedEventConfig.fishingMult }} PESCA</span>
            <span
              v-if="parsedEventConfig.requireCaughtDuringEvent"
              class="catch-window-tag"
            >🕒 SOLO CAPTURAS DEL EVENTO</span>
          </div>

          <!-- Especies Participantes en la Tarjeta -->
          <div
            v-if="cardSpeciesList.length"
            class="card-species-row"
          >
            <span class="card-species-label">Participantes:</span>
            <div class="card-species-sprites">
              <img
                v-for="sp in cardSpeciesList"
                :key="sp"
                :src="getAssetUrl(ASSET_TYPES.POKEMON, sp)"
                :title="`Ver información de Pokédex de ${sp}`"
                :alt="sp"
                class="card-mini-sprite pixelated clickable"
                @click.stop="openSpeciesDetail(sp)"
              >
            </div>
          </div>
        </div>
      </div>

      <p class="description">
        {{ event.description }}
      </p>

      <!-- Competition Category Slots List -->
      <div 
        v-if="event.type === 'competition' && resolvedSubComps.length"
        class="competition-slots-list"
      >
        <!-- 1. Global Categories (e.g. IVs) -->
        <div
          v-if="globalSubComps.length"
          class="global-category-block"
        >
          <div class="global-category-header">
            <span class="global-category-label pixelated">🧬 GENÉTICA SUPREMA (COMPETENCIA GLOBAL)</span>
          </div>
          <EventCategorySlotCard
            v-for="sub in globalSubComps"
            :key="sub.id"
            :event="event"
            :sub="sub"
            :participant="getParticipantForCategory(sub)"
            empty-text="Sin Pokémon inscripto"
            :is-inner="false"
            @open-participation-modal="openParticipationModal"
          />
        </div>

        <!-- 2. Species-Scoped Dimensions (Unified Tabs & Enclosed Panel) -->
        <div
          v-if="speciesScopedSubComps.length"
          class="species-tabs-panel"
        >
          <!-- Panel Header & Attached Tabs -->
          <div class="species-tabs-panel-header">
            <div class="species-panel-intro">
              <span class="species-panel-title pixelated">⚖️ PESO Y ALTURA POR ESPECIE</span>
              <span
                v-if="participatingSpeciesList.length > 1"
                class="species-panel-hint pixelated"
              >
                Elige especie:
              </span>
            </div>

            <!-- Attached Tab Strip -->
            <div
              v-if="participatingSpeciesList.length > 1"
              class="species-tabs-strip"
            >
              <button
                v-for="sp in participatingSpeciesList"
                :key="sp"
                type="button"
                class="species-tab-btn"
                :class="{ active: selectedSpeciesTab === sp }"
                @click.stop="selectedSpeciesTab = sp"
              >
                <img
                  :src="getAssetUrl(ASSET_TYPES.POKEMON, sp)"
                  :alt="sp"
                  class="species-tab-icon pixelated"
                >
                <span class="species-tab-name pixelated">{{ sp }}</span>
                <span
                  v-if="hasSpeciesEnrollment(sp)"
                  class="species-tab-check"
                  title="Inscripción activa"
                >✓</span>
              </button>
            </div>
          </div>

          <!-- Panel Body: Directly connected slots for active tab -->
          <div class="species-tab-panel-body">
            <div class="species-slots-wrapper">
              <EventCategorySlotCard
                v-for="sub in activeSpeciesSubComps"
                :key="sub.id"
                :event="event"
                :sub="sub"
                :participant="getParticipantForCategory(sub)"
                :empty-text="`Sin ${sub.targetSpecies || 'Pokémon'} inscripto`"
                :is-inner="true"
                @open-participation-modal="openParticipationModal"
              />
            </div>
          </div>
        </div>
      </div>

      <footer class="card-footer">
        <div class="timer-box">
          <span class="label">FINALIZA EN:</span>
          <span class="value">{{ formattedRemainingTime }}</span>
        </div>
        
        <button
          v-if="event.type === 'competition'"
          class="retro-btn rules-btn pixelated"
          @click.stop="openEventDetail"
        >
          📋 REGLAS Y PREMIOS
        </button>
        <div 
          v-else 
          ref="badgeRef"
          class="active-badge"
        >
          ✨ ACTIVO
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped src="./EventCard.styles.scss" lang="scss"></style>
