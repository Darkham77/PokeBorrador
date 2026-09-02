<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { useEventStore } from '@/stores/events'
import { useGameStore } from '@/stores/game'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { CompetitionParticipant } from '@/types/system/stores'
import { 
  resolveEventSubCompetitions,
  resolveSubCompetitionDirection,
  getSubCompTitle,
  getSubCompDescription,
  evaluatePokemonForSubCompetition, 
  getEligiblePokemonForSubCompetition, 
  isPokemonEnrolledInOtherSubCompetition,
  resolveWeeklyRotation,
  getEventDisplayName,
  getEventCurrentWindow,
  type Event as GameEvent, 
  type EventConfig,
  type SubCompetitionConfig,
  type ResolvedSubCompetition,
  type WeeklyRotationEntry
} from '@/logic/events/eventEngine'
import { isPokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { getServerTime, getServerInstant, getGMT3Date, normalizeZonedDateTime } from '@/logic/utils/timeUtils'
import type { UpcomingEventOccurrence } from '@/logic/events/eventEngine'
import PVTooltip from '@/components/common/PVTooltip.vue'

interface Props {
  event: GameEvent
  occurrence?: UpcomingEventOccurrence
}

const props = defineProps<Props>()

const eventStore = useEventStore()
const gameStore = useGameStore()
const modalStore = useModalStore()
const uiStore = useUIStore()

const isUpcoming = computed(() => Boolean(props.occurrence))
const occurrenceZdt = computed(() => {
  if (props.occurrence) {
    return normalizeZonedDateTime(props.occurrence.startInstant)
  }
  return getGMT3Date()
})

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
  if (props.occurrence) {
    return props.occurrence.startsInLabel
  }
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

const cardTimerLabel = computed(() => {
  return props.occurrence ? 'INICIA EN:' : 'FINALIZA EN:'
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

const currentWeeklyRotation = computed<WeeklyRotationEntry | null>(() => {
  return resolveWeeklyRotation(parsedEventConfig.value, occurrenceZdt.value)
})

const cardDisplayName = computed(() => {
  return getEventDisplayName(props.event, props.occurrence)
})

const cardSpeciesList = computed<PokemonSpeciesId[]>(() => {
  const raw = currentWeeklyRotation.value?.species ?? parsedEventConfig.value.species
  if (raw && raw !== '*') {
    const list = raw.split(',').map(s => s.trim().toLowerCase()).filter(isPokemonSpeciesId)
    if (list.length > 0) return list
  }
  return []
})

const cardBannerKey = computed(() => {
  if (currentWeeklyRotation.value?.banner) {
    return currentWeeklyRotation.value.banner
  }
  if (parsedEventConfig.value.banner) {
    return parsedEventConfig.value.banner
  }
  // Fallbacks based on canonical event IDs
  const eventId = props.event.id
  if (eventId === 'dia_pesca') return 'dia_pesca_full'
  if (eventId === 'torneo_pesca') return 'pesca_exotica_full'
  if (eventId === 'dia_crianza') return 'huevos_full'
  if (eventId === 'dia_naturaleza') return 'safari_park_full'
  if (eventId === 'torneo_caza') return 'caza_bichos_full'
  if (eventId === 'fiebre_minera') return 'arqueologia_fosiles_full'
  if (eventId === 'doble_exp') return 'doble_exp_full'
  if (eventId === 'gran_concurso_sabado') return 'gran_concurso_sabado_full'
  if (eventId === 'dia_safari_suerte') return 'safari_suerte_full'
  if (eventId === 'comunidad_mensual') return 'growlithe_full'
  if (eventId === 'guerra_facciones_mensual') return 'war_full'
  if (eventId === 'fiebre_oro') return 'rival_full'
  return ''
})

const resolvedSubComps = computed<ResolvedSubCompetition[]>(() => {
  const targetInstant = props.occurrence?.startInstant ?? getServerInstant()
  return resolveEventSubCompetitions(props.event, targetInstant)
})

const getEntryForCategory = (catId: string) => {
  return eventStore.userEntries[`${props.event.id}:${catId}`] || (catId === 'ivs' ? eventStore.userEntries[props.event.id] : undefined)
}

const enrolledCategoriesCount = computed(() => {
  if (props.event.type !== 'competition') return 0
  let count = 0
  for (const sub of resolvedSubComps.value) {
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

const openEventDetail = () => {
  modalStore.open('EventDetail', {
    event: props.event,
    occurrence: props.occurrence
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
  const bannerImg = card.querySelector('.banner-box img') as HTMLElement | null

  if (isEntering) {
    gsap.to(card, {
      y: -4,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto'
    })
    if (bannerImg) {
      gsap.to(bannerImg, {
        scale: 1.04,
        duration: 0.35,
        ease: 'power2.out',
        overwrite: 'auto'
      })
    }
  } else {
    gsap.to(card, {
      y: 0,
      duration: 0.25,
      ease: 'power2.out',
      overwrite: 'auto',
      clearProps: 'transform'
    })
    if (bannerImg) {
      gsap.to(bannerImg, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
        clearProps: 'transform,scale'
      })
    }
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
    :class="{ 'has-banner': Boolean(cardBannerKey), 'is-upcoming-card': isUpcoming, 'is-active-card': !isUpcoming }"
    @click.stop="openEventDetail"
    @mouseenter="onCardHover($event, true)"
    @mouseleave="onCardHover($event, false)"
  >
    <!-- Banner -->
    <div
      v-if="cardBannerKey"
      class="banner-box"
      :class="{ 'is-upcoming-banner': isUpcoming }"
    >
      <img
        :src="getAssetUrl(ASSET_TYPES.BANNER, cardBannerKey)"
        :alt="cardDisplayName"
        draggable="false"
        @error="(e: Event) => ((e.target as HTMLImageElement).style.display='none')"
      >
    </div>
    
    <div class="card-body">
      <div class="body-header">
        <div class="event-id-icon">
          <span class="emoji">{{ event.icon }}</span>
        </div>
        <div class="event-main-meta">
          <h2>{{ cardDisplayName }}</h2>

          <div class="tags-row">
            <span
              class="type-tag"
              :class="event.type"
            >{{ event.type === 'competition' ? 'COMPETICIÓN' : 'EVENTO' }}</span>

            <span
              v-if="isUpcoming && occurrence?.dateLabel"
              class="catch-window-tag"
            >
              <span class="emoji">🗓️</span> {{ occurrence.dateLabel }} · {{ occurrence.timeLabel }}
            </span>
            <template v-else>
              <span
                v-if="parsedEventConfig.speciesShinyMult && parsedEventConfig.speciesShinyMult > 1"
                class="type-tag shiny"
              ><span class="emoji">✨</span> x{{ parsedEventConfig.speciesShinyMult }} SHINY</span>
              <span
                v-if="parsedEventConfig.speciesRateMult && parsedEventConfig.speciesRateMult > 1"
                class="type-tag spawn"
              ><span class="emoji">🎯</span> x{{ parsedEventConfig.speciesRateMult }} SPAWN</span>
              <span
                v-if="parsedEventConfig.fishingMult && parsedEventConfig.fishingMult > 1"
                class="type-tag fishing"
              ><span class="emoji">🎣</span> x{{ parsedEventConfig.fishingMult }} PESCA</span>
              <span
                v-if="parsedEventConfig.requireCaughtDuringEvent"
                class="catch-window-tag"
              ><span class="emoji">🕒</span> SOLO CAPTURAS DEL EVENTO</span>
            </template>
          </div>

          <!-- Especies Participantes en la Tarjeta -->
          <div
            v-if="cardSpeciesList.length"
            class="card-species-row"
          >
            <span class="card-species-label">Participantes:</span>
            <div class="card-species-sprites">
              <PVTooltip
                v-for="sp in cardSpeciesList"
                :key="sp"
                :title="`Ver información de Pokédex de ${sp.toUpperCase()}`"
                position="top"
              >
                <img
                  :src="getAssetUrl(ASSET_TYPES.POKEMON, sp)"
                  :alt="sp"
                  draggable="false"
                  class="card-mini-sprite pixelated clickable"
                  @click.stop="openSpeciesDetail(sp)"
                >
              </PVTooltip>
            </div>
          </div>
        </div>
      </div>

      <p class="description">
        {{ event.description }}
      </p>

      <!-- Compact Competition Category Preview (Active Competitions Only) -->
      <div 
        v-if="!isUpcoming && event.type === 'competition' && resolvedSubComps.length"
        class="compact-competition-preview"
      >
        <div class="comp-preview-header">
          <span class="comp-preview-title pixelated"><span class="emoji title-icon">🏆</span> CATEGORÍAS EN JUEGO</span>
          <span
            v-if="enrolledCategoriesCount > 0"
            class="comp-preview-badge pixelated enrolled"
          >
            <span class="emoji">✓</span> {{ enrolledCategoriesCount }} Inscripto{{ enrolledCategoriesCount === 1 ? '' : 's' }}
          </span>
        </div>

        <div class="comp-categories-grid">
          <PVTooltip
            v-for="sub in resolvedSubComps"
            :key="sub.id"
            :title="getSubCompTitle(event.id, sub)"
            :description="getSubCompDescription(event.id, sub)"
            position="top"
          >
            <button
              type="button"
              class="comp-slot-chip pixelated"
              :class="{ enrolled: Boolean(getParticipantForCategory(sub)) }"
              @click.stop="handleSlotChipClick(sub)"
            >
              <div class="chip-content">
                <!-- Pokémon Species Mini Sprite (or 🧬 icon for global IVs) -->
                <img
                  v-if="sub.targetSpecies"
                  :src="getAssetUrl(ASSET_TYPES.POKEMON, sub.targetSpecies)"
                  class="chip-poke-sprite"
                  :alt="sub.targetSpecies"
                  draggable="false"
                >
                <span
                  v-else
                  class="chip-global-icon"
                ><span class="emoji">🧬</span></span>
                
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

      <footer class="card-footer">
        <div class="timer-box">
          <span class="label">{{ cardTimerLabel }}</span>
          <span
            class="value"
            :class="{ 'upcoming-value': isUpcoming }"
          >{{ formattedRemainingTime }}</span>
        </div>
        
        <div
          v-if="isUpcoming"
          class="upcoming-badge"
        >
          <span class="emoji">⏳</span> PRÓXIMO
        </div>
        <button
          v-else-if="event.type === 'competition'"
          class="retro-btn rules-btn pixelated"
          @click.stop="openEventDetail"
        >
          <span class="emoji">📋</span> REGLAS Y PREMIOS
        </button>
        <div 
          v-else 
          ref="badgeRef"
          class="active-badge"
        >
          <span class="emoji">✨</span> ACTIVO
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped src="./EventCard.styles.scss" lang="scss"></style>
