import { watch, onMounted, onUnmounted, nextTick, type Ref } from 'vue'
import { gsap } from 'gsap'

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
        let type: 'glow' | 'drift' | 'shake' | '' = ''
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
              duration: 1.5,
              yoyo: true,
              repeat: -1,
              ease: 'sine.inOut'
            }
          )
          tl.progress(seed)
        } else if (type === 'drift') {
          const tl = gsap.to(weatherEl, {
            x: 3,
            duration: 2.0,
            yoyo: true,
            repeat: -1,
            ease: 'power1.inOut'
          })
          tl.progress(seed)
        } else if (type === 'shake') {
          const tl = gsap.timeline({ repeat: -1 })
          tl.to(weatherEl, { rotation: 2, duration: 0.125, ease: 'power1.inOut' })
            .to(weatherEl, { rotation: -2, duration: 0.25, ease: 'power1.inOut' })
            .to(weatherEl, { rotation: 0, duration: 0.125, ease: 'power1.inOut' })
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
              rotation: 10,
              scale: 1.05,
              filter: 'brightness(1.3)',
              duration: 2.5,
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
            { scale: 1.15, duration: 0.3, ease: 'power1.inOut' }
          )
          .to(factionEl, { scale: 1.0, duration: 0.3, ease: 'power1.inOut' })
          .to(factionEl, { scale: 1.0, duration: 1.4 })
          tl.progress(seed)
        }
      }

      // 3. Fishing Pill
      const fishingEl = options.cardRef.value?.querySelector('.fishing-pill') as HTMLElement | null | undefined
      if (fishingEl) {
        const tl = gsap.timeline({ repeat: -1 })
        tl.to(fishingEl, { y: -8, rotation: 5, duration: 1.32, ease: 'sine.inOut' })
          .to(fishingEl, { y: 2, rotation: -3, duration: 1.32, ease: 'sine.inOut' })
          .to(fishingEl, { y: 0, rotation: 0, duration: 1.36, ease: 'sine.inOut' })
        tl.progress(seed)
      }

      // 3.1 Archaeology Pill
      const archaeologyEl = options.cardRef.value?.querySelector('.archaeology-pill') as HTMLElement | null | undefined
      if (archaeologyEl) {
        const pickEl = archaeologyEl.querySelector('.pill-icon')
        if (pickEl) {
          gsap.set(pickEl, { transformOrigin: '80% 80%', display: 'inline-block' })
          const swingTl = gsap.timeline({ repeat: -1 })
          swingTl.to(pickEl, { rotation: 25, duration: 0.8, ease: 'power1.out' })
                 .to(pickEl, { rotation: -15, duration: 0.15, ease: 'power2.in' })
                 .to(pickEl, { rotation: 0, duration: 0.35, ease: 'sine.out' })
          swingTl.progress(seed)
        }
      }

      // 4. Winner Crown
      const crownEl = options.cardRef.value?.querySelector('.dom-badge') as HTMLElement | null | undefined
      if (crownEl && !options.isLowPowerActive.value) {
        const shineEl = crownEl.querySelector('.crown-shine-aura') as HTMLElement | undefined
        if (shineEl) {
          gsap.to(shineEl, {
            rotation: 360,
            duration: 10,
            repeat: -1,
            ease: 'none'
          })

          const breatheTl = gsap.fromTo(shineEl,
            { scale: 0.8, opacity: 0.35 },
            {
              scale: 1.5,
              opacity: 0.8,
              duration: 1.8,
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
      const AURA_CYCLE = 2.0
      const wrappers = gsap.utils.toArray('.sprite-wrapper', options.spawnGridRef.value || undefined) as HTMLElement[]

      wrappers.forEach((el) => {
        if (!el || !el.classList) return
        const isRare = el.classList.contains('rare-spawn')
        const isAtmos = el.classList.contains('atmospheric-spawn')
        
        if (!isRare && !isAtmos) return

        const seedAttr = el.style.getPropertyValue('--spawn-seed')
        const seed = seedAttr ? parseFloat(seedAttr) : Math.random()
        const baseDelay = (seed % 1) * AURA_CYCLE

        if (!options.isLowPowerActive.value) {
          const scaleMax = isAtmos ? 1.08 : 1.05
          const tl = gsap.timeline({ repeat: -1, delay: baseDelay })
          tl.to(el, { scale: scaleMax, duration: 0.4, ease: 'power2.out' })
            .to(el, { scale: 1, duration: 0.8, ease: 'sine.inOut' })
        }

        const rareAura = el.parentElement?.querySelector('.rare-aura')
        const atmosAura = el.parentElement?.querySelector('.atmospheric-aura')

        if (rareAura || atmosAura) {
          const auraTl = gsap.timeline({
            repeat: -1,
            delay: baseDelay
          })

          const duration = AURA_CYCLE / 2

          if (options.isLowPowerActive.value) {
            if (rareAura) gsap.set(rareAura, { scale: 2.2, rotation: 0 })
            if (atmosAura) gsap.set(atmosAura, { scale: 2.2, rotation: 0 })

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
              gsap.set(rareAura, { scale: 0.1, opacity: 0 })
              gsap.set(atmosAura, { scale: 3.375, opacity: 0.9 })

              auraTl.call(() => {
                gsap.set(rareAura, { rotation: Math.random() * 360 })
              }, [], 0)

              auraTl.to(rareAura, {
                scale: 3.375,
                opacity: 1,
                duration: duration,
                ease: 'sine.inOut'
              }, 0)

              auraTl.to(atmosAura, {
                scale: 0.1,
                opacity: 0,
                duration: duration,
                ease: 'sine.inOut'
              }, 0)

              auraTl.call(() => {
                gsap.set(atmosAura, { rotation: Math.random() * 360 })
              }, [], duration)

              auraTl.to(rareAura, {
                scale: 0.1,
                opacity: 0,
                duration: duration,
                ease: 'sine.inOut'
              }, duration)

              auraTl.to(atmosAura, {
                scale: 3.375,
                opacity: 0.9,
                duration: duration,
                ease: 'sine.inOut'
              }, duration)
            } else {
              if (rareAura) {
                gsap.set(rareAura, { scale: 0.1, opacity: 0 })

                auraTl.call(() => {
                  gsap.set(rareAura, { rotation: Math.random() * 360 })
                }, [], 0)

                auraTl.to(rareAura, {
                  scale: 3.375,
                  opacity: 1,
                  duration: duration,
                  ease: 'sine.inOut'
                }, 0)

                auraTl.to(rareAura, {
                  scale: 0.1,
                  opacity: 0,
                  duration: duration,
                  ease: 'sine.inOut'
                }, duration)
              }
              if (atmosAura) {
                gsap.set(atmosAura, { scale: 0.1, opacity: 0 })

                auraTl.call(() => {
                  gsap.set(atmosAura, { rotation: Math.random() * 360 })
                }, [], 0)

                auraTl.to(atmosAura, {
                  scale: 3.375,
                  opacity: 0.9,
                  duration: duration,
                  ease: 'sine.inOut'
                }, 0)

                auraTl.to(atmosAura, {
                  scale: 0.1,
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
        gsap.delayedCall(0.1, initAuraAnimations)
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
        gsap.delayedCall(0.05, initAuraAnimations)
      }
    },
    { deep: false }
  )

  // Watch grid ref
  watch(options.spawnGridRef, (newRef) => {
    if (newRef && options.isVisible.value) {
      gsap.killTweensOf(initAuraAnimations)
      gsap.delayedCall(0.05, initAuraAnimations)
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
