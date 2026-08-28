<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { gsap } from 'gsap'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { Event as GameEvent } from '@/logic/events/eventEngine'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useEventStore } from '@/stores/events'
import { calculatePokemonCenterCooldown } from '@/logic/economy/economyFormulas'


const SECONDS_TO_MS_CONVERSION_FACTOR = 1000

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
  (e: 'openEvent'): void
}>()

const gameStore = useGameStore()
const uiStore = useUIStore()
const eventStore = useEventStore()

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

onMounted(() => {
  tickCooldown()
})

onUnmounted(() => {
  if (cooldownTween) {
    cooldownTween.kill()
  }
  stopCarousel()
})

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

// ── Cyclic Event Banner Carousel ──────────────────────────────────────────────
const CAROUSEL_INTERVAL_S = 6

const activeEvents = computed(() => eventStore.activeEvents)
const carouselIndex = ref(0)
const eventImageSrc = ref('')
const eventAspect = ref(1.7916)
let carouselTween: gsap.core.Tween | null = null

/** Current event shown in the carousel */
const currentCarouselEvent = computed(() => {
  const evs = activeEvents.value
  if (!evs.length) return null
  return evs[carouselIndex.value % evs.length] ?? null
})

function loadEventImage(event: GameEvent | null): void {

  if (!event) {
    const fallbackUrl = getAssetUrl(ASSET_TYPES.BANNER, 'war_full')
    eventImageSrc.value = fallbackUrl
    return
  }
  const cfg = event.config ? (typeof event.config === 'string' ? JSON.parse(event.config) : event.config) as { banner?: string } : {}
  const bannerKey = cfg.banner ?? event.id
  const fullUrl = getAssetUrl(ASSET_TYPES.BANNER, `${bannerKey}`)
  const fallbackKey = event.id.replace(/torneo_|dia_|fiebre_|gran_|guerra_/, '')

  const img = new Image()
  img.onload = () => {
    eventImageSrc.value = fullUrl
    eventAspect.value = img.naturalWidth / img.naturalHeight
  }
  img.onerror = () => {
    const fallbackUrl = getAssetUrl(ASSET_TYPES.BANNER, `${fallbackKey}_full`)
    const imgFallback = new Image()
    imgFallback.onload = () => {
      eventImageSrc.value = fallbackUrl
      eventAspect.value = imgFallback.naturalWidth / imgFallback.naturalHeight
    }
    imgFallback.onerror = () => {
      eventImageSrc.value = getAssetUrl(ASSET_TYPES.BANNER, 'war_full')
    }
    imgFallback.src = fallbackUrl
  }
  img.src = fullUrl
}


function advanceCarousel(): void {
  const evs = activeEvents.value
  if (evs.length > 1) {
    carouselIndex.value = (carouselIndex.value + 1) % evs.length
  }
  loadEventImage(currentCarouselEvent.value)
  if (evs.length > 1) {
    carouselTween = gsap.delayedCall(CAROUSEL_INTERVAL_S, advanceCarousel)
  }
}

function stopCarousel(): void {
  if (carouselTween) {
    carouselTween.kill()
    carouselTween = null
  }
}

// Restart carousel whenever the events list changes
watch(activeEvents, (evs) => {
  stopCarousel()
  carouselIndex.value = 0
  loadEventImage(evs[0] ?? null)
  if (evs.length > 1) {
    carouselTween = gsap.delayedCall(CAROUSEL_INTERVAL_S, advanceCarousel)
  }
}, { immediate: true })

const eventTooltipTitle = computed(() => {
  const ev = currentCarouselEvent.value
  if (!ev) return 'Sin eventos activos'
  const total = activeEvents.value.length
  const idx = carouselIndex.value % Math.max(total, 1) + 1
  const suffix = total > 1 ? ` (${idx}/${total})` : ''
  return `📅 EVENTO: ${ev.name}${suffix}`
})

const eventTooltipDesc = computed(() => {
  const ev = currentCarouselEvent.value
  if (ev) return ev.description
  return 'No hay eventos especiales activos en este momento.'
})

function handleEventBannerClick(): void {
  if (currentCarouselEvent.value) emit('openEvent')
}

</script>

<template>
  <div class="pc-split-container">
    <!-- Carta Centro Pokémon (Izq: 50%) -->
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

    <!-- Grilla de Status Banners (Der: 50%) -->
    <div 
      class="pc-right" 
      :style="{ '--event-aspect': eventAspect }"
    >
      <div class="pc-banner-grid">
        <!-- 1. Evento (carousel cíclico de todos los eventos activos) -->
        <PVTooltip
          :title="eventTooltipTitle"
          :description="eventTooltipDesc"
          position="bottom"
          tag="div"
          class="event-tooltip-container"
        >
          <div
            class="event-banner"
            :class="{ active: !!currentCarouselEvent }"
            :style="{ 
              'backgroundImage': `url('${eventImageSrc}')` 
            }"
            @click.stop="handleEventBannerClick"
          />
          <!-- Carousel dots shown when there are multiple active events -->
          <div
            v-if="activeEvents.length > 1"
            class="carousel-dots"
          >
            <span
              v-for="(_, i) in activeEvents"
              :key="i"
              class="carousel-dot"
              :class="{ active: i === carouselIndex % activeEvents.length }"
            />
          </div>
        </PVTooltip>
      </div>
    </div>
  </div>
</template>


<!-- HMR Touch comment to force reload styles v11 -->
<style scoped lang="scss" src="@/styles/components/_map-status-summary.scss"></style>
