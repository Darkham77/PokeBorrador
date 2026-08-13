import { watch, onMounted, onUnmounted, nextTick, type Ref } from 'vue'
import { gsap } from 'gsap'
import type { PillFxType } from '@/types/system/game'
import {
  FULL_ROTATION_DEG,
  MAP_WEATHER_DRIFT_OFFSET_PX,
  MAP_WEATHER_SHAKE_ANGLE_DEG,
  MAP_FACTION_UNION_ANGLE_DEG,
  MAP_FACTION_UNION_MAX_SCALE,
  MAP_FACTION_PODER_MAX_SCALE,
  MAP_CARD_ANIMATIONS
} from '@/logic/constants/animations'

const ANIMATION_DELAY_NORMAL_SEC = 0.1
const ANIMATION_DELAY_FAST_SEC = 0.05
const MAP_WEATHER_GLOW_DURATION_SEC = 1.5
const MAP_WEATHER_DRIFT_DURATION_SEC = 2.0
const MAP_WEATHER_SHAKE_HALF_DUR_SEC = 0.125
const MAP_WEATHER_SHAKE_FULL_DUR_SEC = 0.25
const MAP_FACTION_UNION_DURATION_SEC = 2.5
const MAP_FACTION_PODER_PULSE_DUR_SEC = 0.3
const MAP_FACTION_PODER_PAUSE_DURATION_SEC = 1.4
const ARCHAEOLOGY_TOOL_TRANSFORM_ORIGIN = '80% 80%'

export function useMapCardAnimations(options: {
  cardRef: Ref<HTMLElement | null>
  spawnGridRef: Ref<HTMLElement | null>
  isVisible: Ref<boolean>
  isPerformanceMode: Ref<boolean>
  isLowPowerActive: Ref<boolean>
  computedWeather: Ref<string>
  isPlayerWinner: Ref<boolean>
  cardSeed: Ref<number>
  dominanceWinner: Ref<string | undefined>
  hasFishing: Ref<object | null | undefined>
  hasArchaeology: Ref<object | null | undefined>
  spawnGridSlots: Ref<(string | null)[]>
}) {
  let pillContext: gsap.Context | null = null
  let auraContext: gsap.Context | null = null

  const initPillAnimations = () => {
    if (pillContext) {
      pillContext.revert()
      pillContext = null
    }

    if (!options.isVisible.value || options.isPerformanceMode.value || options.isLowPowerActive.value) {
      return
    }

    pillContext = gsap.context(() => {
      const seed = options.cardSeed.value

      // 1. Weather Tag / Location Tag
      const weatherEl = options.cardRef.value?.querySelector('.location-tag') as HTMLElement | null | undefined
      if (weatherEl) {
        const weather = options.computedWeather.value
        let type: PillFxType = ''
        if (['clear', 'sun', 'heatwave', 'cold', 'coldwave', 'sandstorm', 'dust_storm', 'intense_sun'].includes(weather)) {
          type = 'glow'
        } else if (['mist', 'fog', 'wind', 'strong_winds'].includes(weather)) {
          type = 'drift'
        } else if (['rain', 'heavy_rain', 'storm', 'thunderstorm', 'hail'].includes(weather)) {
          type = 'shake'
        }

        if (type === 'glow') {
          const tl = gsap.fromTo(weatherEl,
            { filter: 'brightness(1.0)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)' },
            {
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), 0px 0px 8px rgba(255, 204, 0, 0.6)',
              filter: 'brightness(1.2)',
              duration: MAP_WEATHER_GLOW_DURATION_SEC,
              yoyo: true,
              repeat: -1,
              ease: 'sine.inOut'
            }
          )
          tl.progress(seed)
        } else if (type === 'drift') {
          const tl = gsap.to(weatherEl, {
            x: MAP_WEATHER_DRIFT_OFFSET_PX,
            duration: MAP_WEATHER_DRIFT_DURATION_SEC,
            yoyo: true,
            repeat: -1,
            ease: 'power1.inOut'
          })
          tl.progress(seed)
        } else if (type === 'shake') {
          const tl = gsap.timeline({ repeat: -1 })
          tl.to(weatherEl, { rotation: MAP_WEATHER_SHAKE_ANGLE_DEG, duration: MAP_WEATHER_SHAKE_HALF_DUR_SEC, ease: 'power1.inOut' })
            .to(weatherEl, { rotation: -MAP_WEATHER_SHAKE_ANGLE_DEG, duration: MAP_WEATHER_SHAKE_FULL_DUR_SEC, ease: 'power1.inOut' })
            .to(weatherEl, { rotation: 0, duration: MAP_WEATHER_SHAKE_HALF_DUR_SEC, ease: 'power1.inOut' })
          tl.progress(seed)
        }
      }

      // 2. Faction Pill
      const factionEl = options.cardRef.value?.querySelector('.faction-status-pill') as HTMLElement | null | undefined
      if (factionEl) {
        const winner = options.dominanceWinner.value
        if (winner === 'union') {
          const tl = gsap.fromTo(factionEl,
            { rotation: 0, scale: 1, filter: 'brightness(1.0)' },
            {
              rotation: MAP_FACTION_UNION_ANGLE_DEG,
              scale: MAP_FACTION_UNION_MAX_SCALE,
              filter: 'brightness(1.3)',
              duration: MAP_FACTION_UNION_DURATION_SEC,
              yoyo: true,
              repeat: -1,
              ease: 'sine.inOut'
            }
          )
          tl.progress(seed)
        } else if (winner === 'poder') {
          const tl = gsap.timeline({ repeat: -1 })
          tl.fromTo(factionEl,
            { scale: 1.0 },
            { scale: MAP_FACTION_PODER_MAX_SCALE, duration: MAP_FACTION_PODER_PULSE_DUR_SEC, ease: 'power1.inOut' }
          )
          .to(factionEl, { scale: 1.0, duration: MAP_FACTION_PODER_PULSE_DUR_SEC, ease: 'power1.inOut' })
          .to(factionEl, { scale: 1.0, duration: MAP_FACTION_PODER_PAUSE_DURATION_SEC })
          tl.progress(seed)
        }
      }

      // 3. Fishing Pill
      const fishingEl = options.cardRef.value?.querySelector('.fishing-pill') as HTMLElement | null | undefined
      if (fishingEl) {
        const tl = gsap.timeline({ repeat: -1 })
        tl.to(fishingEl, { y: MAP_CARD_ANIMATIONS.FISHING_BOB_UP_Y, rotation: MAP_CARD_ANIMATIONS.FISHING_ROTATION_UP, duration: MAP_CARD_ANIMATIONS.FISHING_PHASE_DURATION_SEC, ease: 'sine.inOut' })
          .to(fishingEl, { y: MAP_CARD_ANIMATIONS.FISHING_BOB_DOWN_Y, rotation: MAP_CARD_ANIMATIONS.FISHING_ROTATION_DOWN, duration: MAP_CARD_ANIMATIONS.FISHING_PHASE_DURATION_SEC, ease: 'sine.inOut' })
          .to(fishingEl, { y: 0, rotation: 0, duration: MAP_CARD_ANIMATIONS.FISHING_RETURN_DURATION_SEC, ease: 'sine.inOut' })
        tl.progress(seed)
      }

      // 3.1 Archaeology Pill
      const archaeologyEl = options.cardRef.value?.querySelector('.archaeology-pill') as HTMLElement | null | undefined
      if (archaeologyEl) {
        const pickEl = archaeologyEl.querySelector('.pill-icon')
        if (pickEl) {
          gsap.set(pickEl, { transformOrigin: ARCHAEOLOGY_TOOL_TRANSFORM_ORIGIN, display: 'inline-block' })
          const swingTl = gsap.timeline({ repeat: -1 })
          swingTl.to(pickEl, { rotation: MAP_CARD_ANIMATIONS.ARCHAEOLOGY_SWING_ANGLE_START, duration: MAP_CARD_ANIMATIONS.ARCHAEOLOGY_SWING_UP_DURATION_SEC, ease: 'power1.out' })
                 .to(pickEl, { rotation: MAP_CARD_ANIMATIONS.ARCHAEOLOGY_SWING_ANGLE_END, duration: MAP_CARD_ANIMATIONS.ARCHAEOLOGY_SWING_DOWN_DURATION_SEC, ease: 'power2.in' })
                 .to(pickEl, { rotation: 0, duration: MAP_CARD_ANIMATIONS.ARCHAEOLOGY_SWING_RESET_DURATION_SEC, ease: 'sine.out' })
          swingTl.progress(seed)
        }
      }

      // 4. Winner Crown
      const crownEl = options.cardRef.value?.querySelector('.dom-badge') as HTMLElement | null | undefined
      if (crownEl && !options.isLowPowerActive.value) {
        const shineEl = crownEl.querySelector('.crown-shine-aura') as HTMLElement | undefined
        if (shineEl) {
          gsap.to(shineEl, {
            rotation: FULL_ROTATION_DEG,
            duration: MAP_CARD_ANIMATIONS.CROWN_SHINE_ROTATION_DURATION_SEC,
            repeat: -1,
            ease: 'none'
          })

          const breatheTl = gsap.fromTo(shineEl,
            { scale: MAP_CARD_ANIMATIONS.CROWN_SHINE_SCALE_MIN, opacity: MAP_CARD_ANIMATIONS.CROWN_SHINE_OPACITY_MIN },
            {
              scale: MAP_CARD_ANIMATIONS.CROWN_SHINE_SCALE_MAX,
              opacity: MAP_CARD_ANIMATIONS.CROWN_SHINE_OPACITY_MAX,
              duration: MAP_CARD_ANIMATIONS.CROWN_SHINE_BREATHE_DURATION_SEC,
              yoyo: true,
              repeat: -1,
              ease: 'sine.inOut'
            }
          )
          breatheTl.progress(seed)
        }
      }
    }, options.cardRef.value || undefined)
  }

  const initAuraAnimations = () => {
    if (auraContext) auraContext.revert()
    if (!options.spawnGridRef.value || !options.isVisible.value) return

    auraContext = gsap.context(() => {
      const wrappers = gsap.utils.toArray('.sprite-wrapper', options.spawnGridRef.value || undefined) as HTMLElement[]

      wrappers.forEach((el) => {
        if (!el || !el.classList) return
        const isRare = el.classList.contains('rare-spawn')
        const isAtmos = el.classList.contains('atmospheric-spawn')
        
        if (!isRare && !isAtmos) return

        const seedAttr = el.style.getPropertyValue('--spawn-seed')
        const seed = seedAttr ? parseFloat(seedAttr) : Math.random()
        const baseDelay = (seed % 1) * MAP_CARD_ANIMATIONS.AURA_CYCLE_PERIOD_SEC

        if (!options.isLowPowerActive.value) {
          const scaleMax = isAtmos ? MAP_CARD_ANIMATIONS.ATMOS_SPAWN_SCALE_MAX : MAP_CARD_ANIMATIONS.RARE_SPAWN_SCALE_MAX
          const tl = gsap.timeline({ repeat: -1, delay: baseDelay })
          tl.to(el, { scale: scaleMax, duration: MAP_CARD_ANIMATIONS.SPAWN_SCALE_UP_DURATION_SEC, ease: 'power2.out' })
            .to(el, { scale: 1, duration: MAP_CARD_ANIMATIONS.SPAWN_SCALE_DOWN_DURATION_SEC, ease: 'sine.inOut' })
        }

        const rareAura = el.parentElement?.querySelector('.rare-aura')
        const atmosAura = el.parentElement?.querySelector('.atmospheric-aura')

        if (rareAura || atmosAura) {
          const auraTl = gsap.timeline({
            repeat: -1,
            delay: baseDelay
          })

          const duration = MAP_CARD_ANIMATIONS.AURA_CYCLE_PERIOD_SEC / 2

          if (options.isLowPowerActive.value) {
            if (rareAura) gsap.set(rareAura, { scale: MAP_CARD_ANIMATIONS.LOW_POWER_AURA_SCALE, rotation: 0 })
            if (atmosAura) gsap.set(atmosAura, { scale: MAP_CARD_ANIMATIONS.LOW_POWER_AURA_SCALE, rotation: 0 })

            if (rareAura && atmosAura) {
              gsap.set(rareAura, { opacity: 0 })
              gsap.set(atmosAura, { opacity: 0.9 })

              auraTl.to(rareAura, { opacity: 1, duration: duration, ease: 'sine.inOut' }, 0)
              auraTl.to(atmosAura, { opacity: 0, duration: duration, ease: 'sine.inOut' }, 0)
              auraTl.to(rareAura, { opacity: 0, duration: duration, ease: 'sine.inOut' }, duration)
              auraTl.to(atmosAura, { opacity: 0.9, duration: duration, ease: 'sine.inOut' }, duration)
            } else {
              if (rareAura) {
                gsap.set(rareAura, { opacity: 0 })
                auraTl.to(rareAura, { opacity: 1, duration: duration, ease: 'sine.inOut' }, 0)
                auraTl.to(rareAura, { opacity: 0, duration: duration, ease: 'sine.inOut' }, duration)
              }
              if (atmosAura) {
                gsap.set(atmosAura, { opacity: 0 })
                auraTl.to(atmosAura, { opacity: 0.9, duration: duration, ease: 'sine.inOut' }, 0)
                auraTl.to(atmosAura, { opacity: 0, duration: duration, ease: 'sine.inOut' }, duration)
              }
            }
          } else {
            if (rareAura && atmosAura) {
              gsap.set(rareAura, { scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MIN, opacity: 0 })
              gsap.set(atmosAura, { scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MAX, opacity: 0.9 })

              auraTl.call(() => {
                gsap.set(rareAura, { rotation: Math.random() * MAP_CARD_ANIMATIONS.AURA_FULL_CIRCLE_DEG })
              }, [], 0)

              auraTl.to(rareAura, {
                scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MAX,
                opacity: 1,
                duration: duration,
                ease: 'sine.inOut'
              }, 0)

              auraTl.to(atmosAura, {
                scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MIN,
                opacity: 0,
                duration: duration,
                ease: 'sine.inOut'
              }, 0)

              auraTl.call(() => {
                gsap.set(atmosAura, { rotation: Math.random() * MAP_CARD_ANIMATIONS.AURA_FULL_CIRCLE_DEG })
              }, [], duration)

              auraTl.to(rareAura, {
                scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MIN,
                opacity: 0,
                duration: duration,
                ease: 'sine.inOut'
              }, duration)

              auraTl.to(atmosAura, {
                scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MAX,
                opacity: 0.9,
                duration: duration,
                ease: 'sine.inOut'
              }, duration)
            } else {
              if (rareAura) {
                gsap.set(rareAura, { scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MIN, opacity: 0 })

                auraTl.call(() => {
                  gsap.set(rareAura, { rotation: Math.random() * MAP_CARD_ANIMATIONS.AURA_FULL_CIRCLE_DEG })
                }, [], 0)

                auraTl.to(rareAura, {
                  scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MAX,
                  opacity: 1,
                  duration: duration,
                  ease: 'sine.inOut'
                }, 0)

                auraTl.to(rareAura, {
                  scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MIN,
                  opacity: 0,
                  duration: duration,
                  ease: 'sine.inOut'
                }, duration)
              }
              if (atmosAura) {
                gsap.set(atmosAura, { scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MIN, opacity: 0 })

                auraTl.call(() => {
                  gsap.set(atmosAura, { rotation: Math.random() * MAP_CARD_ANIMATIONS.AURA_FULL_CIRCLE_DEG })
                }, [], 0)

                auraTl.to(atmosAura, {
                  scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MAX,
                  opacity: 0.9,
                  duration: duration,
                  ease: 'sine.inOut'
                }, 0)

                auraTl.to(atmosAura, {
                  scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MIN,
                  opacity: 0,
                  duration: duration,
                  ease: 'sine.inOut'
                }, duration)
              }
            }
          }
        }
      })
    }, options.spawnGridRef.value)
  }

  // Watches for Pill Animations
  watch(
    [
      options.isVisible,
      options.isPerformanceMode,
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
