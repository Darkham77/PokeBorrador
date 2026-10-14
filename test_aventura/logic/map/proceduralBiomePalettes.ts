// Canonical Biome & Theme Palettes for Procedural Map Generation

import type { CanonicalThemeSource } from '../../types/map/adventureWorldTypes.ts';
import type { TileCollision } from './tilesRegistry.ts';

export interface Autotile9Slice {
  readonly center: string;
  readonly top: string;
  readonly bottom: string;
  readonly left: string;
  readonly right: string;
  readonly topLeft: string;
  readonly topRight: string;
  readonly bottomLeft: string;
  readonly bottomRight: string;
}

export interface MultitileTemplate {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly (readonly string[])[];
  readonly collision: readonly (readonly TileCollision[])[];
}

export interface ThemeBiomePalette {
  readonly grass: string;
  readonly grassAccents: readonly string[];
  readonly path: Autotile9Slice;
  readonly urbanPavement?: string;
  readonly water: Autotile9Slice;
  readonly ledge?: {
    readonly center: string;
    readonly centerAlt?: string;
  };
  readonly cliff?: {
    readonly top: string;
    readonly face: string;
    readonly left?: string;
    readonly right?: string;
  };
  readonly tree2x3: MultitileTemplate;
  readonly tree2x2: MultitileTemplate;
  readonly standaloneTree?: MultitileTemplate;
  readonly mountainCone2x3: MultitileTemplate;
  readonly props: {
    readonly flowers: readonly string[];
    readonly tallGrass: string;
    readonly bush: string;
    readonly rock?: string;
  };
}

const HOENN_GEN3_BASE_PALETTE = {
  grassAccents: ['tile_vegetation_13f0a9ea38'],
  path: {
    center: 'tile_terrain_4756bdfd4e',
    top: 'tile_terrain_b3840e05af',
    bottom: 'tile_terrain_35acffed79',
    left: 'tile_terrain_b07ce4bfe6',
    right: 'tile_terrain_554fe90459',
    topLeft: 'tile_terrain_aeed0bb8ac',
    topRight: 'tile_terrain_93efbc410a',
    bottomLeft: 'tile_terrain_b8d7bb69ce',
    bottomRight: 'tile_terrain_3928852ac2'
  },
  urbanPavement: 'tile_terrain_4756bdfd4e',
  water: {
    center: 'tile_water_5e550af5c2',
    top: 'tile_water_b2b02a5e0e',
    bottom: 'tile_water_f3cf81311b',
    left: 'tile_water_34d262e7f2',
    right: 'tile_water_e780c4f413',
    topLeft: 'tile_water_bbae919e5f',
    topRight: 'tile_water_2610e35f18',
    bottomLeft: 'tile_water_1da2cf6c52',
    bottomRight: 'tile_water_577cd9fb73'
  },
  ledge: {
    center: 'tile_terrain_120d7decae',
    centerAlt: 'tile_terrain_1938e75eaa'
  },
  tree2x3: {
    width: 2,
    height: 3,
    tiles: [
      ['tile_vegetation_afed389c7f', 'tile_vegetation_3d3a41c32d'],
      ['tile_vegetation_3e24e0f99d', 'tile_vegetation_a88df6ec45'],
      ['tile_vegetation_6be35c9857', 'tile_vegetation_1e7ae8dbad']
    ],
    collision: [
      [true, true],
      [true, true],
      [true, true]
    ]
  },
  tree2x2: {
    width: 2,
    height: 2,
    tiles: [
      ['tile_vegetation_821ff1bb4d', 'tile_vegetation_d27ee608ad'],
      ['tile_vegetation_31defe8241', 'tile_vegetation_32124203a1']
    ],
    collision: [
      [true, true],
      [true, true]
    ]
  },
  mountainCone2x3: {
    width: 2,
    height: 3,
    tiles: [
      ['tile_vegetation_bf0a3c7024', 'tile_elevation_7eccbe22e5'],
      ['tile_elevation_10dccf3c52', 'tile_elevation_e5a5b972eb'],
      ['tile_elevation_e8e8f562ef', 'tile_elevation_84c75dc969']
    ],
    collision: [
      [true, true],
      [true, true],
      [true, true]
    ]
  },
  props: {
    flowers: ['tile_vegetation_6d432cbe6d'],
    tallGrass: 'tile_vegetation_6b1605d4cf',
    bush: 'tile_vegetation_77ac70f502'
  }
} as const;

export const CANONICAL_PALETTES: Record<CanonicalThemeSource, ThemeBiomePalette> = {
  firered: {
    grass: 'tile_vegetation_184ee2f2ca',
    grassAccents: ['tile_vegetation_13f0a9ea38'],
    path: {
      center: 'tile_terrain_4756bdfd4e',
      top: 'tile_terrain_b3840e05af',
      bottom: 'tile_terrain_35acffed79',
      left: 'tile_terrain_b07ce4bfe6',
      right: 'tile_terrain_554fe90459',
      topLeft: 'tile_terrain_aeed0bb8ac',
      topRight: 'tile_terrain_93efbc410a',
      bottomLeft: 'tile_terrain_b8d7bb69ce',
      bottomRight: 'tile_terrain_3928852ac2'
    },
    urbanPavement: 'tile_terrain_4756bdfd4e',
    water: {
      center: 'tile_water_5e550af5c2',
      top: 'tile_water_b2b02a5e0e',
      bottom: 'tile_water_f3cf81311b',
      left: 'tile_water_34d262e7f2',
      right: 'tile_water_e780c4f413',
      topLeft: 'tile_water_bbae919e5f',
      topRight: 'tile_water_2610e35f18',
      bottomLeft: 'tile_water_1da2cf6c52',
      bottomRight: 'tile_water_577cd9fb73'
    },
    ledge: {
      center: 'tile_terrain_120d7decae',
      centerAlt: 'tile_terrain_1938e75eaa'
    },
    cliff: {
      top: 'tile_elevation_top',
      face: 'tile_elevation_face',
      left: 'tile_elevation_left',
      right: 'tile_elevation_right'
    },
    tree2x3: {
      width: 2,
      height: 3,
      tiles: [
        ['tile_vegetation_9cf406a0d5', 'tile_vegetation_493a154ab0'],
        ['tile_vegetation_9668f2a496', 'tile_vegetation_3978273469'],
        ['tile_vegetation_8e73525ab6', 'tile_vegetation_f4e0a51729']
      ],
      collision: [
        [true, true],
        [true, true],
        [true, true]
      ]
    },
    tree2x2: {
      width: 2,
      height: 2,
      tiles: [
        ['tile_vegetation_9cf406a0d5', 'tile_vegetation_493a154ab0'],
        ['tile_vegetation_8e73525ab6', 'tile_vegetation_f4e0a51729']
      ],
      collision: [
        [true, true],
        [true, true]
      ]
    },
    mountainCone2x3: {
      width: 2,
      height: 3,
      tiles: [
        ['tile_vegetation_bf0a3c7024', 'tile_elevation_7eccbe22e5'],
        ['tile_elevation_10dccf3c52', 'tile_elevation_e5a5b972eb'],
        ['tile_elevation_e8e8f562ef', 'tile_elevation_84c75dc969']
      ],
      collision: [
        [true, true],
        [true, true],
        [true, true]
      ]
    },
    props: {
      flowers: ['tile_vegetation_6d432cbe6d'],
      tallGrass: 'tile_vegetation_6b1605d4cf',
      bush: 'tile_vegetation_77ac70f502'
    }
  },
  emerald: {
    ...HOENN_GEN3_BASE_PALETTE,
    grass: 'tile_vegetation_184ee2f2ca'
  },
  ruby_sapphire: {
    ...HOENN_GEN3_BASE_PALETTE,
    grass: 'tile_vegetation_0036b62873'
  }
};

export function getBiomePalette(theme: CanonicalThemeSource = 'firered'): ThemeBiomePalette {
  return CANONICAL_PALETTES[theme] ?? CANONICAL_PALETTES.firered;
}
