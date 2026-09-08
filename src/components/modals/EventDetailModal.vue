<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { useModalStore } from '@/stores/modals'
import BaseModal from '@/components/common/BaseModal.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { normalizeZonedDateTime, getGMT3Date } from '@/logic/utils/timeUtils'
import {
  resolveWeeklyRotation,
  getEventDisplayName,
  type Event as GameEvent,
  type WeeklyRotationEntry,
  type UpcomingEventOccurrence
} from '@/logic/events/eventEngine'
import {
  useEventDetailBonuses,
  type ExtendedEventConfig
} from '@/composables/events/useEventDetailBonuses'
import EventSubCompetitionsSection from './EventSubCompetitionsSection.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

interface Props {
  show?: boolean
  event: GameEvent
  occurrence?: UpcomingEventOccurrence
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  occurrence: undefined
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const cfg = computed<ExtendedEventConfig>(() => {
  if (typeof props.event.config === 'string') {
    try { return JSON.parse(props.event.config) as ExtendedEventConfig } catch (_e) { return {} }
  } else if (props.event.config && typeof props.event.config === 'object') {
    return props.event.config as ExtendedEventConfig
  }
  return {}
})

const targetZdt = computed<Temporal.ZonedDateTime>(() => {
  if (props.occurrence?.startInstant) {
    return normalizeZonedDateTime(props.occurrence.startInstant)
  }
  if (props.event.start_at) {
    try {
      return normalizeZonedDateTime(Temporal.Instant.from(props.event.start_at))
    } catch (_e) {
      // ignore parse error, fallback below
    }
  }
  return getGMT3Date()
})

const activeRotation = computed<WeeklyRotationEntry | null>(() => {
  return resolveWeeklyRotation(cfg.value, targetZdt.value)
})

const effectiveBanner = computed<string | null>(() => {
  return activeRotation.value?.banner || cfg.value.banner || null
})

const effectiveTitle = computed<string>(() => {
  return activeRotation.value?.title || getEventDisplayName(props.event, props.occurrence)
})

const effectiveSpeciesString = computed<string | null>(() => {
  return activeRotation.value?.species || cfg.value.species || null
})

const {
  prizes,
  subCompetitions,
  involvedSpecies,
  activeBonuses,
  scheduleText
} = useEventDetailBonuses(
  props.event,
  cfg,
  targetZdt,
  effectiveSpeciesString,
  props.occurrence
)

const currentSpeciesIndex = ref(0)
let cycleTween: gsap.core.Tween | null = null

const startSpeciesCycle = () => {
  if (cycleTween) {
    cycleTween.kill()
    cycleTween = null
  }
  if (involvedSpecies.value.length > 1) {
    cycleTween = gsap.delayedCall(2.5, () => {
      currentSpeciesIndex.value = (currentSpeciesIndex.value + 1) % involvedSpecies.value.length
      startSpeciesCycle()
    })
  }
}

watch(involvedSpecies, () => {
  currentSpeciesIndex.value = 0
  startSpeciesCycle()
}, { immediate: true })

onUnmounted(() => {
  if (cycleTween) {
    cycleTween.kill()
    cycleTween = null
  }
})

const currentSpecies = computed<PokemonSpeciesId | null>(() => {
  if (involvedSpecies.value.length === 0) return null
  return involvedSpecies.value[currentSpeciesIndex.value] || involvedSpecies.value[0] || null
})

const bannerUrl = computed<string | null>(() => {
  const bannerKey = effectiveBanner.value
  if (!bannerKey) return null
  return getAssetUrl(ASSET_TYPES.BANNER, bannerKey)
})

const modalStore = useModalStore()

const openSpeciesDetail = (speciesId: PokemonSpeciesId) => {
  modalStore.open('PokedexDetail', {
    speciesId,
    context: 'pokedex'
  })
}
</script>

<template>
  <BaseModal
    :show="show"
    max-width="680px"
    variant="retro"
    accent-color="var(--yellow)"
    close-button-variant="solid"
    hide-header
    @close="emit('close')"
  >
    <div class="event-detail-modal">
      <!-- Banner Header Image (100% visible, sin recortes ni gradientes que lo tapen) -->
      <div
        v-if="bannerUrl"
        class="event-banner-header"
      >
        <img
          :src="bannerUrl"
          :alt="effectiveTitle"
          class="event-banner-img allow-aliasing"
          @error="(e: Event) => ((e.target as HTMLImageElement).style.display='none')"
        >
      </div>

      <!-- Pokémon showcase (only when no banner image) -->
      <div
        v-else-if="involvedSpecies.length > 0"
        class="event-pokemon-showcase clickable"
        :title="currentSpecies ? `Ver datos de la Pokédex para ${currentSpecies}` : undefined"
        role="button"
        tabindex="0"
        @click="currentSpecies && openSpeciesDetail(currentSpecies)"
        @keydown.enter="currentSpecies && openSpeciesDetail(currentSpecies)"
      >
        <PVSpriteFX
          :is-shiny="Boolean(cfg.speciesShinyMult || cfg.shinyMult)"
          :sparkle-count="3"
        >
          <img
            v-if="currentSpecies"
            :key="currentSpecies"
            :src="getAssetUrl(ASSET_TYPES.POKEMON, currentSpecies, { isShiny: Boolean(cfg.speciesShinyMult || cfg.shinyMult) })"
            :alt="currentSpecies"
            class="pixelated event-pokemon-sprite"
          >
        </PVSpriteFX>
        <div
          v-if="involvedSpecies.length > 1"
          class="showcase-dots"
        >
          <span
            v-for="(sp, idx) in involvedSpecies"
            :key="sp"
            class="dot"
            :class="{ active: idx === currentSpeciesIndex }"
          />
        </div>
      </div>
      <div
        v-else-if="!bannerUrl && event.icon"
        class="emoji event-main-icon"
      >
        {{ event.icon }}
      </div>

      <!-- Título y Descripción -->
      <div class="event-header">
        <h3 class="event-title">
          ¡{{ effectiveTitle }}!
        </h3>
        <p class="event-desc">
          {{ event.description || '¡Aprovechá este evento especial mientras esté activo!' }}
        </p>
      </div>

      <!-- Participantes / Especies Permitidas con Sprites -->
      <div
        v-if="involvedSpecies.length > 0"
        class="event-section participants-section"
      >
        <div class="section-tag">
          POKÉMON PARTICIPANTES ({{ involvedSpecies.length }})
        </div>
        <div class="participants-list-pills">
          <PVTooltip
            v-for="sp in involvedSpecies"
            :key="sp"
            :title="`Ver información de Pokédex de ${sp.toUpperCase()}`"
            position="top"
          >
            <div
              class="participant-pill clickable"
              role="button"
              tabindex="0"
              @click.stop="openSpeciesDetail(sp)"
              @keydown.enter.stop="openSpeciesDetail(sp)"
            >
              <PVSpriteFX
                :is-shiny="Boolean(cfg.speciesShinyMult || cfg.shinyMult)"
                :sparkle-count="2"
              >
                <img
                  :src="getAssetUrl(ASSET_TYPES.POKEMON, sp, { isShiny: Boolean(cfg.speciesShinyMult || cfg.shinyMult) })"
                  :alt="sp"
                  class="pixelated participant-sprite"
                >
              </PVSpriteFX>
              <span class="participant-name">{{ sp }}</span>
            </div>
          </PVTooltip>
        </div>
      </div>



      <!-- Horario -->
      <div
        v-if="scheduleText"
        class="event-section"
      >
        <div class="section-tag">
          <span class="emoji">⏰</span> HORARIO
        </div>
        <div
          class="info-box schedule-box"
          :class="{ active: event.manual }"
        >
          {{ scheduleText }}
        </div>
      </div>


      <!-- Bonificaciones -->
      <div 
        v-if="activeBonuses.length" 
        class="event-section"
      >
        <div class="section-tag">
          BONIFICACIONES
        </div>
        <div class="bonus-grid">
          <div 
            v-for="bonus in activeBonuses" 
            :key="bonus.label" 
            class="bonus-item"
          >
            <div class="bonus-left">
              <span class="bonus-label">{{ bonus.label }}</span>
            </div>
            <span 
              class="bonus-value" 
              :style="{ color: bonus.color }"
            >{{ bonus.value }}</span>
          </div>
        </div>
      </div>

      <!-- Sub-Competencias y Premios -->
      <EventSubCompetitionsSection
        :event-id="props.event.id"
        :sub-competitions="subCompetitions"
        :prizes="prizes"
      />

      <!-- Información Adicional si no hay bonos ni sub-competencias dinámicas -->
      <div
        v-if="!activeBonuses.length && !subCompetitions.length && !prizes"
        class="event-section"
      >
        <div class="section-tag">
          <span class="emoji">ℹ️</span> DETALLES DEL EVENTO
        </div>
        <div class="info-box empty-details-box">
          <span class="metric-main"><span class="emoji">{{ event.type === 'competition' ? '🏆' : '✨' }}</span> {{ event.type === 'competition' ? 'Concurso y Competición' : 'Evento Especial de Mundo' }}</span>
          <p class="tiebreaker-note">
            {{ event.description || 'Consulta los resultados y podio directamente en la lista de eventos.' }}
          </p>
        </div>
      </div>

      <!-- Botón Entendido -->
      <button 
        class="legacy-confirm-btn"
        @click.stop="emit('close')"
      >
        ¡ENTENDIDO!
      </button>
    </div>
  </BaseModal>
</template>

<style scoped lang="scss">
@use "@/styles/components/EventDetailModal.styles.scss" as *;
</style>
