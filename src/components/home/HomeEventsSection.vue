<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { gsap } from 'gsap'
import { useEventStore } from '@/stores/events'
import { useModalStore } from '@/stores/modals'
import EventCard from '@/components/modals/EventCard.vue'
import PastEventsList from '@/components/modals/PastEventsList.vue'
import WorldEventsUpcomingSchedule from '@/components/modals/WorldEventsUpcomingSchedule.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import EventPendingAwardsBanner from '@/components/events/EventPendingAwardsBanner.vue'
import { getUpcomingEventOccurrences, type Event as GameEvent, type UpcomingEventOccurrence } from '@/logic/events/eventEngine'
import { getServerInstant } from '@/logic/utils/timeUtils'

const CARD_MIN_WIDTH_PX = 250
const CARD_GAP_PX = 12

const eventStore = useEventStore()
const modalStore = useModalStore()
const { allEvents, activeEvents, pastEvents, isLoading } = storeToRefs(eventStore)

const showSchedule = ref(false)
const showHistory = ref(false)
const sectionRef = ref<HTMLElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const containerWidth = ref(1200)
let gsapCtx: gsap.Context | null = null
let resizeObserver: ResizeObserver | null = null

// Responsive measurement of container width
const updateLayout = () => {
  if (containerRef.value) {
    const w = containerRef.value.getBoundingClientRect().width
    if (w > 0) {
      containerWidth.value = w
    }
  }
}

onMounted(() => {
  updateLayout()
  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          containerWidth.value = entry.contentRect.width
        }
      }
    })
    resizeObserver.observe(containerRef.value)
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateLayout)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateLayout)
  }
})

// Dynamic calculation of exactly how many cards (slots) fit in ONE single line (scales dynamically to 2k, 4k, etc.)
const visibleSlots = computed(() => {
  const calculated = Math.floor((containerWidth.value + CARD_GAP_PX) / (CARD_MIN_WIDTH_PX + CARD_GAP_PX))
  return Math.max(1, calculated)
})

// Active events carousel
const carouselIndex = ref(0)
const needsCarousel = computed(() => activeEvents.value.length > visibleSlots.value)

watch([activeEvents, visibleSlots], () => {
  carouselIndex.value = 0
})

const totalPages = computed(() => {
  if (visibleSlots.value <= 0) return 1
  return Math.max(1, Math.ceil(activeEvents.value.length / visibleSlots.value))
})

const currentPage = computed(() => {
  if (visibleSlots.value <= 0) return 0
  return Math.floor(carouselIndex.value / visibleSlots.value)
})

const prevSlide = () => {
  carouselIndex.value = Math.max(0, carouselIndex.value - visibleSlots.value)
}

const nextSlide = () => {
  if (carouselIndex.value + visibleSlots.value < activeEvents.value.length) {
    carouselIndex.value += visibleSlots.value
  }
}

const goToSlide = (pageIdx: number) => {
  carouselIndex.value = pageIdx * visibleSlots.value
}

const pagedActiveEvents = computed(() => {
  if (!needsCarousel.value) return activeEvents.value
  return activeEvents.value.slice(carouselIndex.value, carouselIndex.value + visibleSlots.value)
})

// Upcoming occurrences (fetches up to 14 days ahead and fills all remaining empty slots on the single row, NEVER in carousel)
const upcomingOccurrences = computed(() => {
  const occs = getUpcomingEventOccurrences(allEvents.value || [], getServerInstant(), 14)
  return occs.sort((a, b) => Temporal.Instant.compare(a.startInstant, b.startInstant))
})

const upcomingOccurrencesToFill = computed<UpcomingEventOccurrence[]>(() => {
  // If active events fill or exceed the visible slots, or active carousel is running, do NOT show upcoming events
  if (activeEvents.value.length >= visibleSlots.value) {
    return []
  }
  const activeIds = new Set(activeEvents.value.map(e => e.id))
  const unactiveOccurrences = upcomingOccurrences.value.filter(occ => !activeIds.has(occ.event.id))
  const emptySlots = visibleSlots.value - activeEvents.value.length
  return unactiveOccurrences.slice(0, emptySlots)
})

const openEventDetail = (event: GameEvent) => {
  modalStore.open('EventDetail', { event })
}

onMounted(() => {
  eventStore.fetchEvents()
  eventStore.checkPendingAwards()
  eventStore.fetchPastEvents()

  gsapCtx = gsap.context(() => {
    if (sectionRef.value) {
      gsap.fromTo(
        sectionRef.value,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      )
    }
  }, sectionRef.value || undefined)
})

onUnmounted(() => {
  if (gsapCtx) {
    gsapCtx.revert()
  }
})
</script>

<template>
  <div
    ref="sectionRef"
    class="home-events-section home-section-card"
  >
    <!-- HEADER BAR -->
    <div class="card-header-bar">
      <div class="title-wrap">
        <span class="card-icon">🏆</span>
        <div class="title-text-group">
          <h2 class="card-title">
            EVENTOS MUNDIALES
          </h2>
          <span class="section-desc">Compite con entrenadores de todo el mundo</span>
        </div>
      </div>

      <div class="header-actions">
        <!-- Carousel Nav Controls for Active Events -->
        <div
          v-if="needsCarousel"
          class="carousel-nav-controls"
        >
          <PVTooltip title="Anterior">
            <button
              v-gsap-hover
              class="carousel-nav-btn"
              :disabled="carouselIndex === 0"
              aria-label="Anterior"
              @click.stop="prevSlide"
            >
              ◀
            </button>
          </PVTooltip>
          <span class="carousel-page-indicator">{{ currentPage + 1 }} / {{ totalPages }}</span>
          <PVTooltip title="Siguiente">
            <button
              v-gsap-hover
              class="carousel-nav-btn"
              :disabled="carouselIndex + visibleSlots >= activeEvents.length"
              aria-label="Siguiente"
              @click.stop="nextSlide"
            >
              ▶
            </button>
          </PVTooltip>
        </div>

        <button
          id="home-events-refresh-btn"
          v-gsap-hover
          class="card-action-btn"
          :disabled="isLoading"
          @click.stop="eventStore.fetchEvents()"
        >
          <span class="btn-icon">↻</span>
          REFRESCAR
        </button>
      </div>
    </div>

    <!-- PENDING REWARDS BANNER (Canonical Component) -->
    <EventPendingAwardsBanner />

    <!-- STRICT SINGLE-ROW EVENTS CONTAINER -->
    <div
      ref="containerRef"
      class="active-events-wrapper"
    >
      <div
        class="events-single-row"
        :style="{ '--visible-slots': visibleSlots }"
      >
        <div
          v-if="activeEvents.length === 0 && upcomingOccurrencesToFill.length === 0"
          class="no-events-card"
        >
          <span class="no-events-icon">⚡</span>
          <p class="no-events-text">
            {{ isLoading ? 'Cargando eventos mundiales...' : 'No hay eventos especiales activos en este momento.' }}
          </p>
        </div>

        <!-- Active Events (Paged in single row) -->
        <EventCard
          v-for="event in pagedActiveEvents"
          :key="event.id"
          :event="event"
        />

        <!-- Future Events (Only fills empty slot in single row, NEVER wrapped) -->
        <EventCard
          v-for="occ in upcomingOccurrencesToFill"
          :key="occ.event.id + '_' + occ.startInstant.epochMilliseconds"
          :event="occ.event"
          :occurrence="occ"
        />
      </div>

      <!-- Carousel Pagination Dots (when multiple active pages) -->
      <div
        v-if="needsCarousel"
        class="carousel-dots-row"
      >
        <button
          v-for="page in totalPages"
          :key="page"
          v-gsap-hover="{ scale: 1.3, y: 0 }"
          class="carousel-dot"
          :class="{ active: currentPage === page - 1 }"
          @click.stop="goToSlide(page - 1)"
        />
      </div>
    </div>

    <!-- TOGGLES FOR SCHEDULE & PAST EVENTS -->
    <div class="events-extra-accordions">
      <!-- UPCOMING 7-DAY SCHEDULE -->
      <div class="accordion-panel">
        <button
          v-gsap-hover="{ scale: 1.01, y: -1 }"
          class="accordion-toggle"
          @click="showSchedule = !showSchedule"
        >
          <span><span class="emoji-inline">📅</span> Calendario Semanal (Próximos 7 días)</span>
          <span class="toggle-arrow">{{ showSchedule ? '▲' : '▼' }}</span>
        </button>
        <div
          v-if="showSchedule"
          class="accordion-body"
        >
          <WorldEventsUpcomingSchedule
            :all-events="allEvents"
            @open-event-detail="openEventDetail"
          />
        </div>
      </div>

      <!-- PAST CONCLUDED EVENTS -->
      <div class="accordion-panel">
        <button
          v-gsap-hover="{ scale: 1.01, y: -1 }"
          class="accordion-toggle"
          @click="showHistory = !showHistory"
        >
          <span><span class="emoji-inline">📜</span> Archivo de Eventos Pasados ({{ pastEvents.length }})</span>
          <span class="toggle-arrow">{{ showHistory ? '▲' : '▼' }}</span>
        </button>
        <div
          v-if="showHistory"
          class="accordion-body"
        >
          <PastEventsList
            :past-events="pastEvents"
            :all-events="allEvents"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.home-events-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;

  .title-wrap {
    display: flex;
    align-items: center;
    gap: 10px;

    .card-icon {
      font-size: 20px;
    }

    .title-text-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .card-title {
      @include pixelated;
      font-size: 13px;
      color: var(--yellow, #facc15);
      margin: 0;
      letter-spacing: 0.5px;
    }

    .section-desc {
      font-size: 10px;
      color: var(--gray, #94a3b8);
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.carousel-nav-controls {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: Rgba(0, 0, 0, 0.4);
  padding: 0 4px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid Rgba(255, 255, 255, 0.12);
  box-sizing: border-box;

  .carousel-nav-btn {
    width: 20px;
    height: 20px;
    background: Rgba(255, 255, 255, 0.08);
    border: 1px solid Rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    color: var(--white, #ffffff);
    font-size: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    line-height: 1;

    &:hover:not(:disabled) {
      background: Rgba(250, 204, 21, 0.2);
      border-color: var(--yellow, #facc15);
      color: var(--yellow, #facc15);
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }

  .carousel-page-indicator {
    @include pixelated;
    font-size: 8px;
    color: #cbd5e1;
    white-space: nowrap;
    letter-spacing: 0.5px;
    padding: 0 4px;
    line-height: 1;
  }
}

.card-action-btn {
  @include pixelated;
  font-size: 8px;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  background: Rgba(255, 255, 255, 0.06);
  border: 1px solid Rgba(255, 255, 255, 0.14);
  color: var(--white, #ffffff);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  line-height: 1;
  white-space: nowrap;
  letter-spacing: 0.5px;
  box-sizing: border-box;

  .btn-icon {
    font-size: 11px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  &:hover:not(:disabled) {
    background: Rgba(250, 204, 21, 0.15);
    border-color: Rgba(250, 204, 21, 0.5);
    color: var(--yellow, #facc15);
    box-shadow: 0 0 8px Rgba(250, 204, 21, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.pending-awards-card {
  background: Rgba(234, 179, 8, 0.1);
  border: 1px solid Rgba(234, 179, 8, 0.3);
  border-radius: 8px;
  padding: 12px;

  .awards-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    h3 {
      @include pixelated;
      font-size: 10px;
      color: var(--yellow, #facc15);
      margin: 0;
    }
  }

  .awards-body {
    .awards-hint {
      font-size: 11px;
      color: var(--gray, #94a3b8);
      margin-bottom: 10px;
    }
  }

  .awards-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .award-item-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    background: Rgba(0, 0, 0, 0.3);
    border-radius: 6px;
    gap: 8px;
  }

  .award-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }

  .award-name-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .award-name {
    font-size: 11px;
    font-weight: bold;
    color: #ffffff;
  }

  .legacy-badge {
    @include pixelated;
    font-size: 7px;
    padding: 1px 4px;
    border-radius: 4px;
    background: Rgba(239, 68, 68, 0.2);
    color: #fca5a5;
  }

  .award-actions-wrap {
    display: flex;
    gap: 6px;
  }
}

.active-events-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.events-single-row {
  display: grid;
  grid-template-columns: repeat(var(--visible-slots, 2), minmax(0, 1fr));
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
}

.carousel-dots-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin-top: 4px;

  .carousel-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: Rgba(255, 255, 255, 0.2);
    border: none;
    cursor: pointer;
    padding: 0;

    &.active {
      background: var(--yellow, #facc15);
      transform: Scale(1.4);
      box-shadow: 0 0 6px Rgba(250, 204, 21, 0.6);
    }
  }
}

.no-events-card {
  grid-column: 1 / -1;
  text-align: center;
  padding: 24px;
  background: Rgba(18, 22, 34, 0.6);
  border: 1px dashed Rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--gray, #94a3b8);
  font-size: 11px;

  .no-events-icon {
    font-size: 24px;
    display: block;
    margin-bottom: 6px;
  }
}

.events-extra-accordions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.accordion-panel {
  background: Rgba(18, 22, 34, 0.6);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  overflow: visible;
}

.accordion-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: transparent;
  border: none;
  color: var(--white, #ffffff);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: Rgba(255, 255, 255, 0.04);
  }

  .toggle-arrow {
    font-size: 9px;
    color: var(--gray, #94a3b8);
  }
}

.accordion-body {
  padding: 12px;
  border-top: 1px solid Rgba(255, 255, 255, 0.06);
}
</style>
