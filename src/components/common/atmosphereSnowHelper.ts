/**
 * src/components/common/atmosphereSnowHelper.ts
 * 
 * Kinematic calculations and configuration helpers for atmospheric snow, blizzard, and hail effects.
 */


import {
  WEATHER_TILE_SNOW_L1_PX,
  WEATHER_TILE_SNOW_L2_PX
} from '@/logic/constants/visuals';

const SNOW_L1_SEED_X_MULT = 1500;
const SNOW_L1_SEED_Y_MULT = 2500;
const SNOW_L1_MOD = 256;
export const SNOW_L1_BLIZZARD_DRIFT_X = -WEATHER_TILE_SNOW_L1_PX;
export const SNOW_L1_BLIZZARD_DUR_SEC = 0.75;
export const SNOW_L1_NORMAL_DUR_SEC = 4.5;

const SNOW_L2_SEED_X_MULT = 3500;
const SNOW_L2_SEED_Y_MULT = 4500;
const SNOW_L2_MOD = 128;
export const SNOW_L2_BLIZZARD_DRIFT_X = -WEATHER_TILE_SNOW_L2_PX;
export const SNOW_L2_BLIZZARD_DUR_SEC = 0.85;
const SNOW_L2_NORMAL_DUR_SEC = 5.0;

const HAIL_L1_SEED_X_MULT = 1200;
const HAIL_L1_SEED_Y_MULT = 2200;
const HAIL_L1_MOD = 128;
export const HAIL_L1_BASE_DUR_SEC = 0.35;

const HAIL_L2_SEED_X_MULT = 2800;
const HAIL_L2_SEED_Y_MULT = 3800;
const HAIL_L2_MOD = 64;
const HAIL_L2_BASE_DUR_SEC = 0.45;
const HAIL_L2_SPEED_BASE = 0.9;
const HAIL_L2_SPEED_ANIM_FACTOR = 0.2;

export interface SnowLayerConfig {
  sX: number;
  sY: number;
  driftX: number;
  driftY: number;
  duration: number;
  boundary: number;
}

export function computeSnowLayer1Config(seed1: number, isBlizzard: boolean, speedVar: number): SnowLayerConfig {
  const sX = (seed1 * SNOW_L1_SEED_X_MULT) % SNOW_L1_MOD;
  const sY = (seed1 * SNOW_L1_SEED_Y_MULT) % SNOW_L1_MOD;
  const driftX = isBlizzard ? SNOW_L1_BLIZZARD_DRIFT_X : 0;
  const baseDur = isBlizzard ? SNOW_L1_BLIZZARD_DUR_SEC : SNOW_L1_NORMAL_DUR_SEC;
  const duration = baseDur / speedVar;

  return {
    sX,
    sY,
    driftX,
    driftY: WEATHER_TILE_SNOW_L1_PX,
    duration,
    boundary: WEATHER_TILE_SNOW_L1_PX
  };
}

export function computeSnowLayer2Config(seed2: number, isBlizzard: boolean, speedVar: number): SnowLayerConfig {
  const sX = (seed2 * SNOW_L2_SEED_X_MULT) % SNOW_L2_MOD;
  const sY = (seed2 * SNOW_L2_SEED_Y_MULT) % SNOW_L2_MOD;
  const driftX = isBlizzard ? SNOW_L2_BLIZZARD_DRIFT_X : 0;
  const baseDur = isBlizzard ? SNOW_L2_BLIZZARD_DUR_SEC : SNOW_L2_NORMAL_DUR_SEC;
  const duration = baseDur / speedVar;

  return {
    sX,
    sY,
    driftX,
    driftY: WEATHER_TILE_SNOW_L2_PX,
    duration,
    boundary: WEATHER_TILE_SNOW_L2_PX
  };
}

export function computeHailLayer1Config(seed1: number, speedVar: number): { sX: number; sY: number; duration: number } {
  return {
    sX: (seed1 * HAIL_L1_SEED_X_MULT) % HAIL_L1_MOD,
    sY: (seed1 * HAIL_L1_SEED_Y_MULT) % HAIL_L1_MOD,
    duration: HAIL_L1_BASE_DUR_SEC / speedVar
  };
}

export function computeHailLayer2Config(seed2: number, animSeed: number): { sX: number; sY: number; duration: number } {
  const speedVar2 = HAIL_L2_SPEED_BASE + (animSeed * HAIL_L2_SPEED_ANIM_FACTOR);
  return {
    sX: (seed2 * HAIL_L2_SEED_X_MULT) % HAIL_L2_MOD,
    sY: (seed2 * HAIL_L2_SEED_Y_MULT) % HAIL_L2_MOD,
    duration: HAIL_L2_BASE_DUR_SEC / speedVar2
  };
}

export function applySnowLayerAnimation(
  weatherTimeline: gsap.core.Timeline,
  layerEl: HTMLElement,
  config: SnowLayerConfig,
  seed: number = 0
): void {
  weatherTimeline.fromTo(
    layerEl,
    { x: 0, y: -config.driftY },
    {
      x: config.driftX,
      y: 0,
      duration: config.duration,
      repeat: -1,
      ease: 'none'
    },
    0
  ).progress(seed % 1);
}
