<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { Event as GameEvent, EventConfig, WeeklyRotationEntry } from '@/logic/events/eventEngine'
import { resolveWeeklyRotation } from '@/logic/events/eventEngine'
import { getGMT3Date } from '@/logic/utils/timeUtils'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useEventStore } from '@/stores/events'
import { calculatePokemonCenterCooldown } from '@/logic/economy/economyFormulas'

const SECONDS_TO_MS_CONVERSION_FACTOR = 1000
const CAROUSEL_INTERVAL_S = 6
const CAROUSEL_SLIDE_DURATION_S = 0.55
const CAROUSEL_EASE = 'power2.out'
const DEFAULT_EVENT_ASPECT_RATIO = 1.7916
const MIN_BANNER_WIDTH_PX = 360
const STANDARD_BANNER_WIDTH_PX = 448
const MIN_POKECENTER_WIDTH_PX = 360
const BANNER_GAP_PX = 16
const STACKED_BREAKPOINT_PX = 1024

interface Props {
  rivalEventActive?: boolean
  rivalEventText?: string
  rivalEventIcon?: string
  isReady?: boolean
}

withDefaults(defineProps<Props>(), {
  rivalEventActive: true,
  rivalEventText: 'Doble chance de encuentro con El Rival durante todo el día',
  rivalEventIcon: '⚡',
  isReady: false
})

const emit = defineEmits<{
  (e: 'openCenter'): void
  (e: 'openEvent', event: GameEvent): void
}>()

const gameStore = useGameStore()
const uiStore = useUIStore()
const eventStore = useEventStore()

// ── Cooldown Logic ────────────────────────────────────────────────────────────
const cooldownSecondsLeft = ref(0)
let cooldownTween: gsap.core.Tween | null = null

const handleCooldownClick = () => {
  uiStore.notify(`El Centro Pokémon está cerrado por mantenimiento. Reabre en ${cooldownFormatted.value}.`, '🏥')
}

const updateCooldown = () => {
  const lastHeal = gameStore.state.lastPokemonCenterHeal || 0
  const cooldownSecs = calculatePokemonCenterCooldown(gameStore.state.trainerLevel || 1)
  if (cooldownSecs > 0 && lastHeal > 0) {
    const elapsedMs = Temporal.Now.instant().epochMilliseconds - lastHeal
    const remainingMs = (cooldownSecs * SECONDS_TO_MS_CONVERSION_FACTOR) - elapsedMs
    if (remainingMs > 0) {
      cooldownSecondsLeft.value = Math.ceil(remainingMs / SECONDS_TO_MS_CONVERSION_FACTOR)
      return
    }
  }
  cooldownSecondsLeft.value = 0
}

const tickCooldown = () => {
  updateCooldown()
  cooldownTween = gsap.delayedCall(1, tickCooldown)
}

const cooldownFormatted = computed(() => {
  const totalSecs = cooldownSecondsLeft.value
  if (totalSecs <= 0) return ''
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

const bannerUrl = computed(() => {
  const assetName = cooldownSecondsLeft.value > 0 ? 'pokecenter_closed_banner' : 'pokecenter_banner'
  return getAssetUrl(ASSET_TYPES.BANNER, assetName)
})

const bannerStyle = computed(() => ({
  backgroundImage: `url('${bannerUrl.value}')`
}))

// ── Responsive Layout & Event Slots ───────────────────────────────────────────
const containerRef = ref<HTMLElement | null>(null)
const containerWidth = ref(1200)
let resizeObserver: ResizeObserver | null = null

const isStacked = computed(() => containerWidth.value < STACKED_BREAKPOINT_PX)
const activeEvents = computed(() => eventStore.activeEvents)

const visibleSlots = computed(() => {
  if (activeEvents.value.length === 0) return 0
  if (isStacked.value) {
    return Math.max(1, Math.floor((containerWidth.value + BANNER_GAP_PX) / (MIN_BANNER_WIDTH_PX + BANNER_GAP_PX)))
  }
  const availableWidth = Math.max(0, containerWidth.value - MIN_POKECENTER_WIDTH_PX - BANNER_GAP_PX)
  return Math.max(1, Math.floor((availableWidth + BANNER_GAP_PX) / (STANDARD_BANNER_WIDTH_PX + BANNER_GAP_PX)))
})

const needsCarousel = computed(() => activeEvents.value.length > visibleSlots.value)

// ── Event Banner Image & Meta Resolvers ────────────────────────────────────────
interface ExtendedConfig extends EventConfig {
  banner?: string
  weeklyRotations?: Record<string, WeeklyRotationEntry>
}

function getEventBannerUrl(event: GameEvent | null): string {
  if (!event) return getAssetUrl(ASSET_TYPES.BANNER, 'war_full')
  const cfg = (typeof event.config === 'string'
    ? (() => { try { return JSON.parse(event.config) as ExtendedConfig } catch { return {} } })()
    : (event.config || {})) as ExtendedConfig
  const rotation = resolveWeeklyRotation(cfg, getGMT3Date())
  const bannerKey = rotation?.banner || cfg.banner || event.id
  return getAssetUrl(ASSET_TYPES.BANNER, String(bannerKey))
}

function getEventTooltipTitle(event: GameEvent | null, idx?: number, total?: number): string {
  if (!event) return 'Sin eventos activos'
  const suffix = total && total > 1 && idx !== undefined ? ` (${idx + 1}/${total})` : ''
  return `📅 EVENTO: ${event.name}${suffix}`
}

function getEventTooltipDesc(event: GameEvent | null): string {
  return event?.description || 'No hay eventos especiales activos en este momento.'
}

// ── Cyclic Multi-Slot Carousel with GSAP Slide Track ────────────────────────
const carouselIndex = ref(0)
const trackRef = ref<HTMLElement | null>(null)
let carouselTween: gsap.core.Tween | null = null
let gsapCtx: gsap.Context | null = null

const carouselSlides = computed(() => {
  if (activeEvents.value.length === 0) return []
  if (activeEvents.value.length <= visibleSlots.value) return activeEvents.value
  return [...activeEvents.value, ...activeEvents.value.slice(0, visibleSlots.value)]
})

function animateToSlide(targetIndex: number): void {
  if (!trackRef.value || activeEvents.value.length <= visibleSlots.value) return
  const total = activeEvents.value.length
  const viewportWidth = trackRef.value.parentElement?.clientWidth || trackRef.value.clientWidth || STANDARD_BANNER_WIDTH_PX
  const slots = Math.max(1, visibleSlots.value)
  const slotWidth = (viewportWidth - (slots - 1) * BANNER_GAP_PX) / slots
  const shiftPx = (slotWidth + BANNER_GAP_PX) * targetIndex
  const normalizedIndex = targetIndex % total

  gsap.to(trackRef.value, {
    x: -shiftPx,
    duration: CAROUSEL_SLIDE_DURATION_S,
    ease: CAROUSEL_EASE,
    overwrite: 'auto',
    onComplete: () => {
      if (targetIndex >= total && trackRef.value) {
        carouselIndex.value = normalizedIndex
        const resetPx = (slotWidth + BANNER_GAP_PX) * normalizedIndex
        gsap.set(trackRef.value, { x: -resetPx })
      }
    }
  })
}

function advanceCarousel(): void {
  const evs = activeEvents.value
  if (evs.length > visibleSlots.value) {
    carouselIndex.value = carouselIndex.value + 1
    animateToSlide(carouselIndex.value)
  }
  if (evs.length > visibleSlots.value) {
    carouselTween = gsap.delayedCall(CAROUSEL_INTERVAL_S, advanceCarousel)
  }
}

function goToSlide(index: number): void {
  const total = activeEvents.value.length
  if (total <= 1) return
  stopCarousel()
  const normalized = index % total
  carouselIndex.value = normalized
  animateToSlide(normalized)
  if (total > visibleSlots.value) {
    carouselTween = gsap.delayedCall(CAROUSEL_INTERVAL_S, advanceCarousel)
  }
}

function stopCarousel(): void {
  if (carouselTween) {
    carouselTween.kill()
    carouselTween = null
  }
}

watch([needsCarousel, visibleSlots], ([needed, slots]) => {
  stopCarousel()
  carouselIndex.value = 0
  if (trackRef.value) {
    gsap.set(trackRef.value, { x: 0 })
  }
  if (needed && activeEvents.value.length > slots) {
    carouselTween = gsap.delayedCall(CAROUSEL_INTERVAL_S, advanceCarousel)
  }
}, { immediate: true })

watch(activeEvents, (evs) => {
  stopCarousel()
  carouselIndex.value = 0
  if (trackRef.value) {
    gsap.set(trackRef.value, { x: 0 })
  }
  if (needsCarousel.value && evs.length > visibleSlots.value) {
    carouselTween = gsap.delayedCall(CAROUSEL_INTERVAL_S, advanceCarousel)
  }
})

function handleEventClick(event: GameEvent): void {
  emit('openEvent', event)
}

onMounted(() => {
  tickCooldown()

  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth || 1200
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          containerWidth.value = entry.contentRect.width
        }
      }
    })
    resizeObserver.observe(containerRef.value)
  }

  gsapCtx = gsap.context(() => {}, containerRef.value || undefined)
})

onUnmounted(() => {
  if (cooldownTween) {
    cooldownTween.kill()
  }
  stopCarousel()
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (gsapCtx) {
    gsapCtx.revert()
  }
})

defineExpose({
  containerWidth,
  visibleSlots,
  needsCarousel,
  carouselIndex,
  goToSlide
})
</script>

<template>
  <div
    ref="containerRef"
    class="pc-split-container"
    :class="{ 'is-stacked': isStacked }"
  >
    <!-- Carta Centro Pokémon -->
    <div class="pc-left">
      <!-- On Cooldown state (Disabled) -->
      <div
        v-if="cooldownSecondsLeft > 0"
        class="pokecenter-banner on-cooldown"
        @click.stop="handleCooldownClick"
      >
        <div 
          class="banner-bg" 
          :style="bannerStyle"
        />
        <div class="banner-overlay">
          <div class="banner-title">
            ⚡ CENTRO POKÉMON
          </div>
          <div class="banner-desc">
            Saná a tu equipo y restaurá todos sus PP al instante.
          </div>
        </div>
        <PVTooltip 
          title="Centro Pokémon en mantenimiento" 
          description="Debes esperar a que termine el tiempo de enfriamiento para volver a curar gratis."
          position="bottom"
          class="banner-tag-tooltip"
        >
          <span class="banner-tag cooldown">
            <span class="cooldown-emoji">⏱️</span> {{ cooldownFormatted }}
          </span>
        </PVTooltip>
      </div>

      <!-- Active state (Enabled) -->
      <div
        v-else
        class="pokecenter-banner"
        @click.stop="emit('openCenter')"
      >
        <div 
          class="banner-bg" 
          :style="bannerStyle"
        />
        <div class="banner-overlay">
          <div class="banner-title">
            ⚡ CENTRO POKÉMON
          </div>
          <div class="banner-desc">
            Saná a tu equipo y restaurá todos sus PP al instante.
          </div>
        </div>
        <span class="banner-tag">⚡ CURACIÓN</span>
      </div>
    </div>

    <!-- Zona de Eventos (Der en Desktop, Arriba en Stacked) -->
    <div 
      v-if="activeEvents.length > 0"
      class="pc-right" 
      :style="{ '--event-aspect': DEFAULT_EVENT_ASPECT_RATIO, '--visible-slots': visibleSlots }"
    >
      <!-- Modo Carrusel: cuando los eventos no caben todos a la vez -->
      <div
        v-if="needsCarousel"
        class="event-carousel-viewport"
        :style="{ '--event-aspect': DEFAULT_EVENT_ASPECT_RATIO, '--visible-slots': visibleSlots }"
      >
        <div class="event-banner-slider">
          <div
            ref="trackRef"
            class="carousel-track"
          >
            <PVTooltip
              v-for="(ev, i) in carouselSlides"
              :key="`${ev.id || i}-${i}`"
              :title="getEventTooltipTitle(ev, i % activeEvents.length, activeEvents.length)"
              :description="getEventTooltipDesc(ev)"
              position="bottom"
              tag="div"
              class="carousel-slide-wrapper"
            >
              <div
                class="carousel-slide event-banner"
                :style="{ backgroundImage: `url('${getEventBannerUrl(ev)}')` }"
                @click.stop="handleEventClick(ev)"
              />
            </PVTooltip>
          </div>

          <!-- Dots -->
          <div
            v-if="activeEvents.length > 1"
            class="carousel-dots"
          >
            <button
              v-for="(_, i) in activeEvents"
              :key="i"
              type="button"
              class="carousel-dot"
              :class="{ active: i === (carouselIndex % activeEvents.length) }"
              :aria-label="`Ir al evento ${i + 1}`"
              @click.stop="goToSlide(i)"
            />
          </div>
        </div>
      </div>

      <!-- Modo Multi-Banner en Paralelo: cuando caben todos los eventos -->
      <div
        v-else
        class="event-banners-grid"
      >
        <PVTooltip
          v-for="(ev, i) in activeEvents"
          :key="ev.id || i"
          :title="getEventTooltipTitle(ev)"
          :description="getEventTooltipDesc(ev)"
          position="bottom"
          tag="div"
          class="event-tooltip-container"
        >
          <div
            class="event-banner single-event-banner"
            :style="{ backgroundImage: `url('${getEventBannerUrl(ev)}')` }"
            @click.stop="handleEventClick(ev)"
          />
        </PVTooltip>
      </div>
    </div>
  </div>
</template>

<!-- HMR Touch comment to force reload styles v14 -->
<style scoped lang="scss" src="@/styles/components/_map-status-summary.scss"></style>

