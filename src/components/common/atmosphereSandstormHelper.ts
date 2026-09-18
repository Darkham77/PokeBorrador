/**
 * src/components/common/atmosphereSandstormHelper.ts
 *
 * Kinematic calculations and helpers for sandstorm and strong winds atmosphere layers.
 */

import { gsap } from 'gsap';
import type { WeatherId } from '@/logic/weather/weatherRegistry';

import { WEATHER_TILE_SANDSTORM_PX } from '@/logic/constants/visuals';

export const DUST_LAYER_ONE_DRIFT_X_PX = -WEATHER_TILE_SANDSTORM_PX;
export const DUST_LAYER_TWO_DRIFT_X_PX = -WEATHER_TILE_SANDSTORM_PX;

const DUST_L1_SEED_X_MULT = 1200;
const DUST_L1_SEED_Y_MULT = 3400;
const DUST_L1_MOD = 64;

const DUST_L2_SEED_X_MULT = 2400;
const DUST_L2_SEED_Y_MULT = 4800;
const DUST_L2_MOD = 128;

export interface SandstormKinematics {
  s1X: number;
  s1Y: number;
  s2X: number;
  s2Y: number;
}

export function computeSandstormKinematics(animSeed: number): SandstormKinematics {
  return {
    s1X: (animSeed * DUST_L1_SEED_X_MULT) % DUST_L1_MOD,
    s1Y: (animSeed * DUST_L1_SEED_Y_MULT) % DUST_L1_MOD,
    s2X: (animSeed * DUST_L2_SEED_X_MULT) % DUST_L2_MOD,
    s2Y: (animSeed * DUST_L2_SEED_Y_MULT) % DUST_L2_MOD
  };
}

function resolveSandstormWeatherMultiplier(w: WeatherId, layer: 1 | 2): number {
  if (w === 'strong_winds') {
    return layer === 1 ? 1.0 : 0.9;
  }
  if (w === 'dust_storm') {
    return layer === 1 ? 1.2 : 1.0;
  }
  return layer === 1 ? 0.8 : 0.7;
}

export function computeSandstormSpeed(
  animSeed: number,
  w: WeatherId,
  speedVar: number,
  layer: 1 | 2
): number {
  const baseFactor = layer === 1 ? (1.0 + animSeed * 0.4) : (0.7 + animSeed * 0.3);
  const weatherMult = resolveSandstormWeatherMultiplier(w, layer);
  const safeSpeedVar = speedVar > 0 ? speedVar : 1.0;
  return (baseFactor * weatherMult) / safeSpeedVar;
}

export function applyStrongWindSizes(layer1: HTMLElement, layer2: HTMLElement): void {
  gsap.set(layer1, { backgroundSize: '128px 128px' });
  gsap.set(layer2, { backgroundSize: '256px 256px' });
}
