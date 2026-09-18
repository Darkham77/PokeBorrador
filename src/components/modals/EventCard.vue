<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { useModalStore } from '@/stores/modals'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { 
  resolveEventSubCompetitions,
  resolveWeeklyRotation,
  getEventDisplayName,
  type Event as GameEvent, 
  type EventConfig,
  type ResolvedSubCompetition,
  type WeeklyRotationEntry
} from '@/logic/events/eventEngine'
import { type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { getServerTime, getServerInstant, getGMT3Date, normalizeZonedDateTime } from '@/logic/utils/timeUtils'
import type { UpcomingEventOccurrence } from '@/logic/events/eventEngine'
import {
  parseEventConfig,
  formatEventRemainingTime,
  extractCardSpeciesList,
  resolveEventBannerKey,
  resolveCardElementId,
  resolveEventCardClasses
} from '@/components/modals/eventCardHelper'
import PVTooltip from '@/components/common/PVTooltip.vue'
import EventCardCategoryPreview from '@/components/events/EventCardCategoryPreview.vue'
import EventCardMetaTags from '@/components/modals/EventCardMetaTags.vue'
import EventCardActionFooter from '@/components/modals/EventCardActionFooter.vue'

interface Props {
  event: GameEvent
  occurrence?: UpcomingEventOccurrence
  idPrefix?: string
}

const props = withDefaults(defineProps<Props>(), {
  occurrence: undefined,
  idPrefix: ''
})

const modalStore = useModalStore()

const isUpcoming = computed(() => Boolean(props.occurrence))
const occurrenceZdt = computed(() => {
  if (props.occurrence) {
    return normalizeZonedDateTime(props.occurrence.startInstant)
  }
  return getGMT3Date()
})

const now = ref(getServerTime())
let timerTween: gsap.core.Tween | null = null

const TIME_TICK_INTERVAL_SEC = 1
const updateTime = () => {
  now.value = getServerTime()
  timerTween = gsap.delayedCall(TIME_TICK_INTERVAL_SEC, updateTime)
}

const formattedRemainingTime = computed(() => {
  return formatEventRemainingTime(props.event, props.occurrence, now.value)
})

const cardTimerLabel = computed(() => {
  return props.occurrence ? 'INICIA EN:' : 'FINALIZA EN:'
})

const parsedEventConfig = computed<EventConfig>(() => {
  return parseEventConfig(props.event.config)
})

const currentWeeklyRotation = computed<WeeklyRotationEntry | null>(() => {
  return resolveWeeklyRotation(parsedEventConfig.value, occurrenceZdt.value)
})

const cardDisplayName = computed(() => {
  return getEventDisplayName(props.event, props.occurrence)
})

const cardSpeciesList = computed<PokemonSpeciesId[]>(() => {
  return extractCardSpeciesList(currentWeeklyRotation.value?.species, parsedEventConfig.value.species)
})

const cardBannerKey = computed(() => {
  return resolveEventBannerKey(props.event.id, currentWeeklyRotation.value?.banner, parsedEventConfig.value.banner)
})

const cardElementId = computed(() => {
  return resolveCardElementId(props.idPrefix, props.event.id, props.occurrence?.startInstant.epochMilliseconds)
})

const cardClasses = computed(() => {
  return resolveEventCardClasses(Boolean(cardBannerKey.value), isUpcoming.value)
})

const resolvedSubComps = computed<ResolvedSubCompetition[]>(() => {
  const targetInstant = props.occurrence?.startInstant ?? getServerInstant()
  return resolveEventSubCompetitions(props.event, targetInstant)
})

const isCompetition = computed(() => props.event.type === 'competition')
const rulesButtonId = computed(() => (props.idPrefix || '') + 'event-rules-btn-' + props.event.id)
const hasNonCompetitionDescription = computed(() => Boolean(props.event.type !== 'competition' && props.event.description))
const showCategoryPreview = computed(() => Boolean(!isUpcoming.value && props.event.type === 'competition' && resolvedSubComps.value.length))

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
        overwrite: 'auto'
      })
    }
  }
}

onMounted(() => {
  updateTime()
})

onUnmounted(() => {
  if (timerTween) {
    timerTween.kill()
  }
})
</script>

<template>
  <div
    :id="cardElementId"
    class="event-card"
    :class="cardClasses"
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
        class="event-banner-img allow-aliasing"
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

          <EventCardMetaTags
            :event-type="event.type"
            :occurrence="occurrence"
            :is-upcoming="isUpcoming"
            :parsed-config="parsedEventConfig"
          />

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

      <p
        v-if="hasNonCompetitionDescription"
        class="description"
      >
        {{ event.description }}
      </p>

      <!-- Compact Competition Category Preview (Active Competitions Only) -->
      <EventCardCategoryPreview
        v-if="showCategoryPreview"
        :event="event"
        :id-prefix="idPrefix"
        :resolved-sub-comps="resolvedSubComps"
        :card-species-list="cardSpeciesList"
      />

      <EventCardActionFooter
        :card-timer-label="cardTimerLabel"
        :formatted-remaining-time="formattedRemainingTime"
        :is-upcoming="isUpcoming"
        :is-competition="isCompetition"
        :rules-btn-element-id="rulesButtonId"
        @open-detail="openEventDetail"
      />
    </div>
  </div>
</template>

<style scoped src="./EventCard.styles.scss" lang="scss"></style>
