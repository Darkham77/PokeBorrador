import type { Ref } from 'vue'
import type { WeatherId } from '@/logic/weather/weatherRegistry'
import {
  computeSnowLayer1Config,
  computeSnowLayer2Config,
  computeHailLayer1Config,
  computeHailLayer2Config,
  applySnowLayerAnimation
} from './atmosphereSnowHelper.ts'

import { WEATHER_TILE_HAIL_L1_PX, WEATHER_TILE_HAIL_L2_PX } from '@/logic/constants/visuals'

type GsapTimeline = ReturnType<typeof import('gsap').gsap.timeline>

const SNOW_ATMOSPHERE_WEATHER_IDS_SET: ReadonlySet<WeatherId> = new Set<WeatherId>(['snow', 'blizzard', 'hail']) // runtime-set: Fast O(1) membership lookup set

export function useAtmosphereSnowAnim(
  layer1Ref: Ref<HTMLElement | null>,
  layer2Ref: Ref<HTMLElement | null>,
  _applyParallaxLayer?: unknown
) {
  function handleSnowLayers(
    weatherTimeline: GsapTimeline,
    seed1: number,
    seed2: number,
    isBlizzard: boolean,
    isLowPower: boolean,
    speedVar: number
  ): void {
    if (layer1Ref.value) {
      const config1 = computeSnowLayer1Config(seed1, isBlizzard, speedVar)
      applySnowLayerAnimation(weatherTimeline, layer1Ref.value, config1, seed1)

      if (layer2Ref.value && !isLowPower) {
        const config2 = computeSnowLayer2Config(seed2, isBlizzard, speedVar)
        applySnowLayerAnimation(weatherTimeline, layer2Ref.value, config2, seed2)
      }
    }
  }

  function handleHailLayers(
    weatherTimeline: GsapTimeline,
    seed1: number,
    seed2: number,
    animSeed: number,
    isLowPower: boolean,
    speedVar: number
  ): void {
    if (layer1Ref.value) {
      const { duration: dur1 } = computeHailLayer1Config(seed1, speedVar)
      weatherTimeline.fromTo(
        layer1Ref.value,
        { x: 0, y: -WEATHER_TILE_HAIL_L1_PX },
        {
          x: 0,
          y: 0,
          duration: dur1,
          repeat: -1,
          ease: 'none'
        },
        0
      ).progress(seed1 % 1)
    }

    if (layer2Ref.value && !isLowPower) {
      const { duration: dur2 } = computeHailLayer2Config(seed2, animSeed)
      weatherTimeline.fromTo(
        layer2Ref.value,
        { x: 0, y: -WEATHER_TILE_HAIL_L2_PX },
        {
          x: 0,
          y: 0,
          duration: dur2,
          repeat: -1,
          ease: 'none'
        },
        0
      ).progress(seed2 % 1)
    }
  }

  const initSnowAnim = (
    w: WeatherId,
    seed1: number,
    seed2: number,
    animSeed: number,
    isLowPower: boolean,
    speedVar: number,
    weatherTimeline: GsapTimeline | null
  ) => {
    if (!SNOW_ATMOSPHERE_WEATHER_IDS_SET.has(w) || !weatherTimeline) return

    if (w !== 'hail') {
      handleSnowLayers(weatherTimeline, seed1, seed2, w === 'blizzard', isLowPower, speedVar)
    } else {
      handleHailLayers(weatherTimeline, seed1, seed2, animSeed, isLowPower, speedVar)
    }
  }

  return {
    initSnowAnim
  }
}
