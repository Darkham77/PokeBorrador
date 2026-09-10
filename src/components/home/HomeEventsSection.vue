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
import { getUpcomingEventOccurrences, type Event as GameEvent, type UpcomingEventOccurrence } from '@/logic/events/eventEngine'
import { getServerInstant } from '@/logic/utils/timeUtils'
import { useHomeWidgetsCollapse } from '@/composables/home/useHomeWidgetsCollapse'
import { useWindowListener } from '@/composables/ui/useWindowListener'
import HomeWidgetMinimizeBtn from './HomeWidgetMinimizeBtn.vue'
import HomeWidgetRefreshBtn from './HomeWidgetRefreshBtn.vue'

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
const { isCollapsed, setCollapsed } = useHomeWidgetsCollapse()

const showSchedule = computed({
  get: () => !isCollapsed('events_schedule'),
  set: (val: boolean) => { setCollapsed('events_schedule', !val) }
})
const showHistory = computed({
  get: () => !isCollapsed('events_history'),
  set: (val: boolean) => { setCollapsed('events_history', !val) }
})
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

useWindowListener('resize', updateLayout)

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
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
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
        <HomeWidgetRefreshBtn
          id="home-events-refresh-btn"
          :loading="isLoading"
          @click="eventStore.fetchEvents()"
        />
        <HomeWidgetMinimizeBtn widget-id="events" />
      </div>
    </div>

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
        />

        <!-- Future Events (Only fills empty slot in single row, NEVER wrapped) -->
        <EventCard
          v-for="occ in upcomingOccurrencesToFill"
          :key="occ.event.id + '_' + occ.startInstant.epochMilliseconds"
          :event="occ.event"
          :occurrence="occ"
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

<style scoped src="./HomeEventsSection.styles.scss" lang="scss"></style>

