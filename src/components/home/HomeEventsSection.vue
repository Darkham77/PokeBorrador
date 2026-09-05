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
const SWIPE_THRESHOLD_PX = 40
const SWIPE_MAX_DRAG_PX = 120
const SLIDE_TRANSITION_DURATION_SEC = 0.28
const SLIDE_OFFSET_PX = 30
const DRAG_DAMPENING_BOUNDARY = 0.25
const DRAG_DAMPENING_NORMAL = 0.85
const SWIPE_LOCK_AXIS_THRESHOLD_PX = 8

const eventStore = useEventStore()
const modalStore = useModalStore()
const { allEvents, activeEvents, pastEvents, isLoading } = storeToRefs(eventStore)

const showSchedule = ref(false)
const showHistory = ref(false)
const sectionRef = ref<HTMLElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const eventsRowRef = ref<HTMLElement | null>(null)
const containerWidth = ref(1200)
let gsapCtx: gsap.Context | null = null
let resizeObserver: ResizeObserver | null = null

// Touch / Mouse Drag & Swipe State
const isDragging = ref(false)
const dragOffsetPx = ref(0)
const isPointerDown = ref(false)
const startPointerX = ref(0)
const startPointerY = ref(0)
const activePointerId = ref<number | null>(null)
const isHorizontalGesture = ref(false)

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

const animateSlideTransition = (direction: 'next' | 'prev') => {
  if (!eventsRowRef.value) return
  const offset = direction === 'next' ? SLIDE_OFFSET_PX : -SLIDE_OFFSET_PX
  
  gsap.fromTo(
    eventsRowRef.value,
    { x: offset, opacity: 0.6 },
    { x: 0, opacity: 1, duration: SLIDE_TRANSITION_DURATION_SEC, ease: 'power2.out', clearProps: 'transform,opacity' }
  )
}

const prevSlide = () => {
  if (carouselIndex.value <= 0) return
  carouselIndex.value = Math.max(0, carouselIndex.value - visibleSlots.value)
  animateSlideTransition('prev')
}

const nextSlide = () => {
  if (carouselIndex.value + visibleSlots.value >= activeEvents.value.length) return
  carouselIndex.value += visibleSlots.value
  animateSlideTransition('next')
}

const goToSlide = (pageIdx: number) => {
  const current = currentPage.value
  if (pageIdx === current) return
  const dir = pageIdx > current ? 'next' : 'prev'
  carouselIndex.value = pageIdx * visibleSlots.value
  animateSlideTransition(dir)
}

const onPointerDown = (e: PointerEvent) => {
  if (!needsCarousel.value) return
  if (e.button !== 0) return
  
  isPointerDown.value = true
  startPointerX.value = e.clientX
  startPointerY.value = e.clientY
  activePointerId.value = e.pointerId
  isHorizontalGesture.value = false
  dragOffsetPx.value = 0
}

const onPointerMove = (e: PointerEvent) => {
  if (!isPointerDown.value || activePointerId.value !== e.pointerId) return

  const deltaX = e.clientX - startPointerX.value
  const deltaY = e.clientY - startPointerY.value

  if (!isHorizontalGesture.value) {
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > SWIPE_LOCK_AXIS_THRESHOLD_PX) {
      isPointerDown.value = false
      return
    }
    if (Math.abs(deltaX) > SWIPE_LOCK_AXIS_THRESHOLD_PX) {
      isHorizontalGesture.value = true
      isDragging.value = true
    }
  }

  if (isHorizontalGesture.value) {
    const isAtStart = currentPage.value === 0 && deltaX > 0
    const isAtEnd = currentPage.value === totalPages.value - 1 && deltaX < 0
    const dampening = isAtStart || isAtEnd ? DRAG_DAMPENING_BOUNDARY : DRAG_DAMPENING_NORMAL
    
    const rawOffset = deltaX * dampening
    dragOffsetPx.value = Math.max(-SWIPE_MAX_DRAG_PX, Math.min(SWIPE_MAX_DRAG_PX, rawOffset))
  }
}

const handlePointerEnd = (e: PointerEvent) => {
  if (!isPointerDown.value || activePointerId.value !== e.pointerId) return

  const deltaX = e.clientX - startPointerX.value
  const wasDragging = isDragging.value

  isPointerDown.value = false
  activePointerId.value = null
  dragOffsetPx.value = 0

  if (wasDragging) {
    gsap.delayedCall(0.05, () => {
      isDragging.value = false
    })

    if (deltaX < -SWIPE_THRESHOLD_PX) {
      nextSlide()
    } else if (deltaX > SWIPE_THRESHOLD_PX) {
      prevSlide()
    }
  } else {
    isDragging.value = false
  }
}

const handleCardClickCapture = (e: MouseEvent) => {
  if (isDragging.value) {
    e.stopPropagation()
    e.preventDefault()
  }
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

const openEventDetail = (event: GameEvent, occurrence?: UpcomingEventOccurrence) => {
  if (isDragging.value) return
  modalStore.open('EventDetail', { event, occurrence })
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
    id="home-events-section"
    ref="sectionRef"
    class="home-events-section home-section-card"
  >
    <!-- HEADER BAR -->
    <div class="card-header-bar">
      <div class="title-wrap">
        <span class="emoji">🏆</span>
        <div class="title-text-group">
          <h2 class="card-title">
            EVENTOS MUNDIALES
          </h2>
          <span class="section-desc">Compite con entrenadores de todo el mundo</span>
        </div>
      </div>

      <div class="header-actions">
        <button
          id="home-events-refresh-btn"
          v-gsap-hover
          class="card-action-btn"
          :disabled="isLoading"
          @click.stop="eventStore.fetchEvents()"
        >
          <i
            class="fas fa-sync-alt"
            :class="{ 'fa-spin': isLoading }"
          />
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
      :class="{ 'is-swiping': isDragging }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="handlePointerEnd"
      @pointercancel="handlePointerEnd"
      @pointerleave="handlePointerEnd"
    >
      <div
        ref="eventsRowRef"
        class="events-single-row"
        :style="{
          '--visible-slots': visibleSlots,
          transform: isDragging ? `translateX(${dragOffsetPx}px)` : undefined
        }"
        @click.capture="handleCardClickCapture"
      >
        <div
          v-if="activeEvents.length === 0 && upcomingOccurrencesToFill.length === 0"
          class="no-events-card"
        >
          <span class="emoji no-events-icon">⚡</span>
          <p class="no-events-text">
            {{ isLoading ? 'Cargando eventos mundiales...' : 'No hay eventos especiales activos en este momento.' }}
          </p>
        </div>

        <!-- Active Events (Paged in single row) -->
        <EventCard
          v-for="event in pagedActiveEvents"
          :key="event.id"
          :event="event"
          id-prefix="home-"
        />

        <!-- Future Events (Only fills empty slot in single row, NEVER wrapped) -->
        <EventCard
          v-for="occ in upcomingOccurrencesToFill"
          :key="occ.event.id + '_' + occ.startInstant.epochMilliseconds"
          :event="occ.event"
          :occurrence="occ"
          id-prefix="home-"
        />
      </div>

      <!-- Carousel Pagination Controls & Dots (when multiple active pages) -->
      <div
        v-if="needsCarousel"
        class="carousel-pagination-bar"
      >
        <PVTooltip title="Página anterior">
          <button
            v-gsap-hover
            class="carousel-nav-btn"
            :disabled="currentPage === 0"
            aria-label="Página anterior"
            @click.stop="prevSlide"
          >
            <i class="fas fa-chevron-left" />
          </button>
        </PVTooltip>

        <div class="carousel-dots-group">
          <button
            v-for="page in totalPages"
            :key="page"
            v-gsap-hover="{ scale: 1.15, y: 0 }"
            class="carousel-dot"
            :class="{ active: currentPage === page - 1 }"
            :aria-label="`Ir a página ${page} de ${totalPages}`"
            @click.stop="goToSlide(page - 1)"
          >
            <span class="dot-indicator" />
          </button>
        </div>

        <span class="carousel-page-indicator">{{ currentPage + 1 }} / {{ totalPages }}</span>

        <PVTooltip title="Página siguiente">
          <button
            v-gsap-hover
            class="carousel-nav-btn"
            :disabled="currentPage === totalPages - 1"
            aria-label="Página siguiente"
            @click.stop="nextSlide"
          >
            <i class="fas fa-chevron-right" />
          </button>
        </PVTooltip>
      </div>
    </div>

    <!-- TOGGLES FOR SCHEDULE & PAST EVENTS -->
    <div class="events-extra-accordions">
      <!-- UPCOMING 7-DAY SCHEDULE -->
      <div class="accordion-panel">
        <button
          id="home-events-schedule-toggle-btn"
          v-gsap-hover="{ scale: 1.01, y: -1 }"
          class="accordion-toggle"
          @click="showSchedule = !showSchedule"
        >
          <span class="accordion-title-wrap"><span class="emoji">📅</span> <span>Calendario Semanal (Próximos 7 días)</span></span>
          <i
            class="fas toggle-arrow"
            :class="showSchedule ? 'fa-chevron-up' : 'fa-chevron-down'"
          />
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
          id="home-events-history-toggle-btn"
          v-gsap-hover="{ scale: 1.01, y: -1 }"
          class="accordion-toggle"
          @click="showHistory = !showHistory"
        >
          <span class="accordion-title-wrap"><span class="emoji">📜</span> <span>Archivo de Eventos Pasados ({{ pastEvents.length }})</span></span>
          <i
            class="fas toggle-arrow"
            :class="showHistory ? 'fa-chevron-up' : 'fa-chevron-down'"
          />
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
    min-width: 0;

    .card-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .title-text-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .card-title {
      @include pixelated;
      font-size: 13px;
      color: var(--yellow, #facc15);
      margin: 0;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .section-desc {
      font-size: 10px;
      color: var(--gray, #94a3b8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
}

.card-action-btn {
  @include widget-action-btn;
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
  touch-action: pan-y;
  user-select: none;
  -webkit-user-drag: none;
  cursor: grab;

  &.is-swiping {
    cursor: grabbing;
  }

  img {
    -webkit-user-drag: none;
    user-select: none;
  }
}

.events-single-row {
  display: grid;
  grid-template-columns: repeat(var(--visible-slots, 2), minmax(0, 1fr));
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
  will-change: transform;
}

.carousel-pagination-bar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 4px auto 0;
  padding: 4px 10px;
  background: Rgba(0, 0, 0, 0.45);
  border: 1px solid Rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  box-shadow: 0 2px 8px Rgba(0, 0, 0, 0.3);
  backdrop-filter: Blur(4px);

  .carousel-nav-btn {
    width: 22px;
    height: 22px;
    background: Rgba(255, 255, 255, 0.08);
    border: 1px solid Rgba(255, 255, 255, 0.15);
    border-radius: 50%;
    color: var(--white, #ffffff);
    font-size: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;

    &:hover:not(:disabled) {
      background: Rgba(250, 204, 21, 0.2);
      border-color: var(--yellow, #facc15);
      color: var(--yellow, #facc15);
    }

    &:disabled {
      opacity: 0.25;
      cursor: not-allowed;
    }
  }

  .carousel-dots-group {
    display: flex;
    align-items: center;
    gap: 6px;

    .carousel-dot {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3px 2px;
      background: transparent;
      border: none;
      cursor: pointer;

      .dot-indicator {
        display: block;
        width: 8px;
        height: 6px;
        border-radius: 3px;
        background: Rgba(255, 255, 255, 0.25);
        border: 1px solid Rgba(255, 255, 255, 0.15);
      }

      &.active .dot-indicator {
        width: 18px;
        background: var(--yellow, #facc15);
        border-color: Rgba(250, 204, 21, 0.8);
        box-shadow: 0 0 8px Rgba(250, 204, 21, 0.6);
      }
    }
  }

  .carousel-page-indicator {
    @include pixelated;
    font-size: 8px;
    color: #cbd5e1;
    white-space: nowrap;
    letter-spacing: 0.5px;
    padding: 0 4px;
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

  .accordion-title-wrap {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    line-height: 1.35;
    text-align: left;

    .emoji {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      flex-shrink: 0;
    }
  }

  &:hover {
    background: Rgba(255, 255, 255, 0.04);
  }

  .toggle-arrow {
    font-size: 9px;
    color: var(--gray, #94a3b8);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}

.accordion-body {
  padding: 12px;
  border-top: 1px solid Rgba(255, 255, 255, 0.06);
}
</style>
