/**
 * test_aventura/config/continentPersistenceConfig.ts
 *
 * CONTINENTAL PERSISTENCE & CANONICAL PRESETS CONFIGURATION (SSoT)
 * Centralizes canonical regional presets (Kanto, Johto, Archipelago, Glacial)
 * and blank project default parameters for continentPersistence.ts.
 */

import type {
  CanonicalPresetId,
  ContinentDimensions,
  BiomeDistributionConfig
} from '../types/map/continentTypes.ts';

export const CANONICAL_PRESETS: Record<
  CanonicalPresetId,
  {
    readonly name: string;
    readonly dimensions: ContinentDimensions;
    readonly cityCount: number;
    readonly biomes: BiomeDistributionConfig;
    readonly seed: number;
  }
> = {
  kanto: {
    name: 'Región de Kanto (Canónica)',
    dimensions: { width: 3600, height: 4600, tileSize: 32 },
    cityCount: 10,
    biomes: {
      waterPercent: 20,
      forestPercent: 30,
      mountainPercent: 15,
      snowPercent: 5,
      beachPercent: 10
    },
    seed: 151
  },
  johto: {
    name: 'Región de Johto (Canónica)',
    dimensions: { width: 3600, height: 4600, tileSize: 32 },
    cityCount: 10,
    biomes: {
      waterPercent: 15,
      forestPercent: 35,
      mountainPercent: 25,
      snowPercent: 10,
      beachPercent: 5
    },
    seed: 251
  },
  archipelago: {
    name: 'Archipiélago Tropical (Islas)',
    dimensions: { width: 3200, height: 3200, tileSize: 32 },
    cityCount: 8,
    biomes: {
      waterPercent: 55,
      forestPercent: 15,
      mountainPercent: 5,
      snowPercent: 0,
      beachPercent: 25
    },
    seed: 384
  },
  glacial: {
    name: 'Tierras Glaciares (Nieve y Cumbres)',
    dimensions: { width: 3200, height: 3200, tileSize: 32 },
    cityCount: 8,
    biomes: {
      waterPercent: 10,
      forestPercent: 15,
      mountainPercent: 25,
      snowPercent: 45,
      beachPercent: 5
    },
    seed: 493
  }
};

export const BLANK_PROJECT_MAX_RANDOM_SEED = 999999 as const;

export const DEFAULT_BLANK_PROJECT_BIOMES: BiomeDistributionConfig = {
  waterPercent: 20,
  forestPercent: 25,
  mountainPercent: 15,
  snowPercent: 5,
  beachPercent: 10
} as const;
