<script setup lang="ts">
import { computed } from 'vue'
import { useModalStore } from '@/stores/modals'
import BaseModal from '@/components/common/BaseModal.vue'
import EventDetailShowcase from './EventDetailShowcase.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { normalizeZonedDateTime, getGMT3Date } from '@/logic/utils/timeUtils'
import { logger } from '@/logic/utils/logger'
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
  occurrence?: UpcomingEventOccurrence | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const cfg = computed<ExtendedEventConfig>(() => {
  if (!props.event) return {}
  if (typeof props.event.config === 'object' && props.event.config !== null) {
    return props.event.config as ExtendedEventConfig
  }
  if (typeof props.event.config === 'string') {
    try {
      return JSON.parse(props.event.config) as ExtendedEventConfig
    } catch (err) {
      logger.warn('[EventDetailModal] Error parseando props.event.config:', err)
      return {}
    }
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
    } catch (err) {
      logger.warn('[EventDetailModal] Error parseando props.event.start_at:', err)
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
  props.occurrence ?? undefined
)



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
      <!-- Banner Header / Pokémon showcase / Fallback icon -->
      <EventDetailShowcase
        :banner-url="bannerUrl"
        :effective-title="effectiveTitle"
        :involved-species="involvedSpecies"
        :icon="event.icon"
        :is-shiny="Boolean(cfg.speciesShinyMult || cfg.shinyMult)"
        @select-species="openSpeciesDetail"
      />

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
