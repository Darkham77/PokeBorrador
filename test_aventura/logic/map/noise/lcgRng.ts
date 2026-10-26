/**
 * test_aventura/logic/map/noise/lcgRng.ts
 *
 * Linear Congruential Generator (LCG) pseudo-random number generator helper.
 */
import {
  POI_LCG_DIVISOR,
  POI_LCG_INCREMENT,
  POI_LCG_MULTIPLIER
} from '../../../config/poiPlacementConfig.ts';

export function createLcgRng(seed: number): () => number {
  let rngSeed = Math.trunc(seed);
  return (): number => {
    rngSeed = Math.trunc(rngSeed * POI_LCG_MULTIPLIER + POI_LCG_INCREMENT);
    return (rngSeed >>> 0) / POI_LCG_DIVISOR;
  };
}
