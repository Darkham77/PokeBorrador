import { watch, onMounted, onUnmounted, nextTick, type Ref } from 'vue'
import { gsap } from 'gsap'
import {
  animateWeatherTag,
  animateFactionPill,
  animateFishingPill,
  animateArchaeologyPill,
  animateCrownAura,
  animateWrapperAura
} from './mapCardAnimationHelpers.ts'

const ANIMATION_DELAY_NORMAL_SEC = 0.1
const ANIMATION_DELAY_FAST_SEC = 0.05

export function useMapCardAnimations(options: {
  cardRef: Ref<HTMLElement | null>
  spawnGridRef: Ref<HTMLElement | null>
  isVisible: Ref<boolean>
  isFastMode?: Ref<boolean>
  isPerformanceMode?: Ref<boolean>
  isLowPowerActive: Ref<boolean>
  computedWeather: Ref<string>
  isPlayerWinner: Ref<boolean>
  cardSeed: Ref<number>
  dominanceWinner: Ref<string | undefined>
  hasFishing: Ref<object | null | undefined>
  hasArchaeology: Ref<object | null | undefined>
  spawnGridSlots: Ref<(string | null)[]>
}) {
  const isFastModeActive = options.isFastMode ?? options.isPerformanceMode ?? { value: false }
  let pillContext: gsap.Context | null = null
  let auraContext: gsap.Context | null = null

  const initPillAnimations = () => {
    if (pillContext) {
      pillContext.revert()
      pillContext = null
    }

    if (!options.isVisible.value || isFastModeActive.value || options.isLowPowerActive.value) {
      return
    }

    pillContext = gsap.context(() => {
      const seed = options.cardSeed.value

      const weatherEl = options.cardRef.value?.querySelector('.location-tag') as HTMLElement | null | undefined
      if (weatherEl) {
        animateWeatherTag(weatherEl, options.computedWeather.value, seed)
      }

      const factionEl = options.cardRef.value?.querySelector('.faction-status-pill') as HTMLElement | null | undefined
      if (factionEl) {
        animateFactionPill(factionEl, options.dominanceWinner.value, seed)
      }

      const fishingEl = options.cardRef.value?.querySelector('.fishing-pill') as HTMLElement | null | undefined
      if (fishingEl) {
        animateFishingPill(fishingEl, seed)
      }

      const archaeologyEl = options.cardRef.value?.querySelector('.archaeology-pill') as HTMLElement | null | undefined
      if (archaeologyEl) {
        animateArchaeologyPill(archaeologyEl, seed)
      }

      const crownEl = options.cardRef.value?.querySelector('.dom-badge') as HTMLElement | null | undefined
      if (crownEl && !options.isLowPowerActive.value) {
        animateCrownAura(crownEl, seed)
      }
    }, options.cardRef.value || undefined)
  }

  const initAuraAnimations = () => {
    if (auraContext) auraContext.revert()
    if (!options.spawnGridRef.value || !options.isVisible.value) return

    auraContext = gsap.context(() => {
      const wrappers = gsap.utils.toArray('.sprite-wrapper', options.spawnGridRef.value || undefined) as HTMLElement[]
      wrappers.forEach((el) => {
        animateWrapperAura(el, options.isLowPowerActive.value)
      })
    }, options.spawnGridRef.value)
  }

  // Watches for Pill Animations
  watch(
    [
      options.isVisible,
      isFastModeActive,
      options.isLowPowerActive,
      options.computedWeather,
      options.dominanceWinner,
      options.hasFishing,
      options.hasArchaeology,
      options.isPlayerWinner
    ],
    () => {
      nextTick(() => {
        initPillAnimations()
      })
    },
    { flush: 'post' }
  )

  // Watch Visibility for Aura Animations
  watch(
    options.isVisible,
    (visible) => {
      if (visible) {
        gsap.killTweensOf(initAuraAnimations)
        gsap.delayedCall(ANIMATION_DELAY_NORMAL_SEC, initAuraAnimations)
      } else {
        gsap.killTweensOf(initAuraAnimations)
        if (auraContext) {
          auraContext.revert()
          auraContext = null
        }
      }
    }
  )

  // Watch spawn grid slots
  watch(
    () => options.spawnGridSlots.value,
    (newVal, oldVal) => {
      if (oldVal && newVal.length === oldVal.length && newVal.every((val, i) => val === oldVal[i])) {
        return
      }
      if (options.isVisible.value) {
        gsap.killTweensOf(initAuraAnimations)
        gsap.delayedCall(ANIMATION_DELAY_FAST_SEC, initAuraAnimations)
      }
    },
    { deep: false }
  )

  // Watch grid ref
  watch(options.spawnGridRef, (newRef) => {
    if (newRef && options.isVisible.value) {
      gsap.killTweensOf(initAuraAnimations)
      gsap.delayedCall(ANIMATION_DELAY_FAST_SEC, initAuraAnimations)
    } else if (!newRef) {
      if (auraContext) {
        auraContext.revert()
        auraContext = null
      }
    }
  }, { flush: 'post' })

  onMounted(() => {
    nextTick(() => {
      initPillAnimations()
      initAuraAnimations()
    })
  })

  onUnmounted(() => {
    if (auraContext) auraContext.revert()
    if (pillContext) pillContext.revert()
  })

  return {
    initPillAnimations,
    initAuraAnimations
  }
}
