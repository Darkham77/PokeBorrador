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

const MAP_WEATHER_GLOW_DURATION_SEC = 1.5
const MAP_WEATHER_DRIFT_DURATION_SEC = 2.0
const MAP_WEATHER_SHAKE_HALF_DUR_SEC = 0.125
const MAP_WEATHER_SHAKE_FULL_DUR_SEC = 0.25
const MAP_FACTION_UNION_DURATION_SEC = 2.5
const MAP_FACTION_PODER_PULSE_DUR_SEC = 0.3
const MAP_FACTION_PODER_PAUSE_DURATION_SEC = 1.4
const ARCHAEOLOGY_TOOL_TRANSFORM_ORIGIN = '80% 80%'

const WEATHER_PILL_FX: Record<string, PillFxType> = {
  clear: 'glow',
  sun: 'glow',
  heatwave: 'glow',
  cold: 'glow',
  coldwave: 'glow',
  sandstorm: 'glow',
  dust_storm: 'glow',
  intense_sun: 'glow',
  mist: 'drift',
  fog: 'drift',
  wind: 'drift',
  strong_winds: 'drift',
  rain: 'shake',
  heavy_rain: 'shake',
  storm: 'shake',
  thunderstorm: 'shake',
  hail: 'shake'
}

function resolveWeatherPillFx(weather: string): PillFxType {
  return WEATHER_PILL_FX[weather] || ''
}

export function animateWeatherTag(weatherEl: HTMLElement, weather: string, seed: number): void {
  const type = resolveWeatherPillFx(weather)

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

export function animateFactionPill(factionEl: HTMLElement, winner: string | undefined, seed: number): void {
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

export function animateFishingPill(fishingEl: HTMLElement, seed: number): void {
  const tl = gsap.timeline({ repeat: -1 })
  tl.to(fishingEl, { y: MAP_CARD_ANIMATIONS.FISHING_BOB_UP_Y, rotation: MAP_CARD_ANIMATIONS.FISHING_ROTATION_UP, duration: MAP_CARD_ANIMATIONS.FISHING_PHASE_DURATION_SEC, ease: 'sine.inOut' })
    .to(fishingEl, { y: MAP_CARD_ANIMATIONS.FISHING_BOB_DOWN_Y, rotation: MAP_CARD_ANIMATIONS.FISHING_ROTATION_DOWN, duration: MAP_CARD_ANIMATIONS.FISHING_PHASE_DURATION_SEC, ease: 'sine.inOut' })
    .to(fishingEl, { y: 0, rotation: 0, duration: MAP_CARD_ANIMATIONS.FISHING_RETURN_DURATION_SEC, ease: 'sine.inOut' })
  tl.progress(seed)
}

export function animateArchaeologyPill(archaeologyEl: HTMLElement, seed: number): void {
  const pickEl = archaeologyEl.querySelector('.pill-icon')
  if (!pickEl) return
  gsap.set(pickEl, { transformOrigin: ARCHAEOLOGY_TOOL_TRANSFORM_ORIGIN, display: 'inline-block' })
  const swingTl = gsap.timeline({ repeat: -1 })
  swingTl.to(pickEl, { rotation: MAP_CARD_ANIMATIONS.ARCHAEOLOGY_SWING_ANGLE_START, duration: MAP_CARD_ANIMATIONS.ARCHAEOLOGY_SWING_UP_DURATION_SEC, ease: 'power1.out' })
         .to(pickEl, { rotation: MAP_CARD_ANIMATIONS.ARCHAEOLOGY_SWING_ANGLE_END, duration: MAP_CARD_ANIMATIONS.ARCHAEOLOGY_SWING_DOWN_DURATION_SEC, ease: 'power2.in' })
         .to(pickEl, { rotation: 0, duration: MAP_CARD_ANIMATIONS.ARCHAEOLOGY_SWING_RESET_DURATION_SEC, ease: 'sine.out' })
  swingTl.progress(seed)
}

export function animateCrownAura(crownEl: HTMLElement, seed: number): void {
  const shineEl = crownEl.querySelector('.crown-shine-aura') as HTMLElement | undefined
  if (!shineEl) return

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

function animateLowPowerAuras(
  rareAura: Element | null,
  atmosAura: Element | null,
  duration: number,
  auraTl: gsap.core.Timeline
): void {
  if (rareAura) gsap.set(rareAura, { scale: MAP_CARD_ANIMATIONS.LOW_POWER_AURA_SCALE, rotation: 0 })
  if (atmosAura) gsap.set(atmosAura, { scale: MAP_CARD_ANIMATIONS.LOW_POWER_AURA_SCALE, rotation: 0 })

  if (rareAura && atmosAura) {
    gsap.set(rareAura, { opacity: 0 })
    gsap.set(atmosAura, { opacity: 0.9 })

    auraTl.to(rareAura, { opacity: 1, duration, ease: 'sine.inOut' }, 0)
    auraTl.to(atmosAura, { opacity: 0, duration, ease: 'sine.inOut' }, 0)
    auraTl.to(rareAura, { opacity: 0, duration, ease: 'sine.inOut' }, duration)
    auraTl.to(atmosAura, { opacity: 0.9, duration, ease: 'sine.inOut' }, duration)
    return
  }

  if (rareAura) {
    gsap.set(rareAura, { opacity: 0 })
    auraTl.to(rareAura, { opacity: 1, duration, ease: 'sine.inOut' }, 0)
    auraTl.to(rareAura, { opacity: 0, duration, ease: 'sine.inOut' }, duration)
  }
  if (atmosAura) {
    gsap.set(atmosAura, { opacity: 0 })
    auraTl.to(atmosAura, { opacity: 0.9, duration, ease: 'sine.inOut' }, 0)
    auraTl.to(atmosAura, { opacity: 0, duration, ease: 'sine.inOut' }, duration)
  }
}

function animateStandardAuras(
  rareAura: Element | null,
  atmosAura: Element | null,
  duration: number,
  auraTl: gsap.core.Timeline
): void {
  if (rareAura && atmosAura) {
    gsap.set(rareAura, { scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MIN, opacity: 0 })
    gsap.set(atmosAura, { scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MAX, opacity: 0.9 })

    auraTl.call(() => {
      gsap.set(rareAura, { rotation: Math.random() * MAP_CARD_ANIMATIONS.AURA_FULL_CIRCLE_DEG })
    }, [], 0)

    auraTl.to(rareAura, {
      scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MAX,
      opacity: 1,
      duration,
      ease: 'sine.inOut'
    }, 0)

    auraTl.to(atmosAura, {
      scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MIN,
      opacity: 0,
      duration,
      ease: 'sine.inOut'
    }, 0)

    auraTl.call(() => {
      gsap.set(atmosAura, { rotation: Math.random() * MAP_CARD_ANIMATIONS.AURA_FULL_CIRCLE_DEG })
    }, [], duration)

    auraTl.to(rareAura, {
      scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MIN,
      opacity: 0,
      duration,
      ease: 'sine.inOut'
    }, duration)

    auraTl.to(atmosAura, {
      scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MAX,
      opacity: 0.9,
      duration,
      ease: 'sine.inOut'
    }, duration)
    return
  }

  if (rareAura) {
    gsap.set(rareAura, { scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MIN, opacity: 0 })

    auraTl.call(() => {
      gsap.set(rareAura, { rotation: Math.random() * MAP_CARD_ANIMATIONS.AURA_FULL_CIRCLE_DEG })
    }, [], 0)

    auraTl.to(rareAura, {
      scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MAX,
      opacity: 1,
      duration,
      ease: 'sine.inOut'
    }, 0)

    auraTl.to(rareAura, {
      scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MIN,
      opacity: 0,
      duration,
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
      duration,
      ease: 'sine.inOut'
    }, 0)

    auraTl.to(atmosAura, {
      scale: MAP_CARD_ANIMATIONS.STANDARD_AURA_SCALE_MIN,
      opacity: 0,
      duration,
      ease: 'sine.inOut'
    }, duration)
  }
}

export function animateWrapperAura(el: HTMLElement, isLowPowerActive: boolean): void {
  if (!el || !el.classList) return
  const isRare = el.classList.contains('rare-spawn')
  const isAtmos = el.classList.contains('atmospheric-spawn')

  if (!isRare && !isAtmos) return

  const seedAttr = el.style.getPropertyValue('--spawn-seed')
  const seed = seedAttr ? parseFloat(seedAttr) : Math.random()
  const baseDelay = (seed % 1) * MAP_CARD_ANIMATIONS.AURA_CYCLE_PERIOD_SEC

  if (!isLowPowerActive) {
    const scaleMax = isAtmos ? MAP_CARD_ANIMATIONS.ATMOS_SPAWN_SCALE_MAX : MAP_CARD_ANIMATIONS.RARE_SPAWN_SCALE_MAX
    const tl = gsap.timeline({ repeat: -1, delay: baseDelay })
    tl.to(el, { scale: scaleMax, duration: MAP_CARD_ANIMATIONS.SPAWN_SCALE_UP_DURATION_SEC, ease: 'power2.out' })
      .to(el, { scale: 1, duration: MAP_CARD_ANIMATIONS.SPAWN_SCALE_DOWN_DURATION_SEC, ease: 'sine.inOut' })
  }

  const rareAura = el.parentElement?.querySelector('.rare-aura') ?? null
  const atmosAura = el.parentElement?.querySelector('.atmospheric-aura') ?? null

  if (!rareAura && !atmosAura) return

  const auraTl = gsap.timeline({ repeat: -1, delay: baseDelay })
  const duration = MAP_CARD_ANIMATIONS.AURA_CYCLE_PERIOD_SEC / 2

  if (isLowPowerActive) {
    animateLowPowerAuras(rareAura, atmosAura, duration, auraTl)
  } else {
    animateStandardAuras(rareAura, atmosAura, duration, auraTl)
  }
}
