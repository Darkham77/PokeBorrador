/**
 * src/logic/map/cityVignetteRegistry.ts
 *
 * CANONICAL ENVIRONMENTAL VIGNETTE REGISTRY
 *
 * Provides a modular, extensible catalog of environmental vignettes (micro-scenes)
 * inspired by GBA Pokémon level design (FireRed, Emerald, HeartGold).
 *
 * Strict Domain-Type-First governance:
 *   - All vignette types derived from finite const tuples.
 *   - O(1) typed registry lookup for instant spatial instantiation.
 *   - Zero-any, zero-unknown, zero runtime fallbacks.
 */

import type {
  UrbanBuildingPlacement,
  UrbanPropPlacement
} from '../../types/map/poiTypes.ts';
import { getAssetFilename, getBuildingPrefabMeta } from './canonicalAssetsRegistry.ts';

// ---------------------------------------------------------------------------
// 1. Domain Types
// ---------------------------------------------------------------------------

export const CITY_VIGNETTE_TYPES = [
  'fisherman_wharf',
  'berry_orchard',
  'cliff_lookout',
  'street_bazaar',
  'civic_fountain_square',
  'harbor_pier_dock',
  'residential_culdesac',
  'sacred_shrine',
  'cargo_depot',
  'botanical_garden'
] as const;
export type CityVignetteType = (typeof CITY_VIGNETTE_TYPES)[number];

export const VIGNETTE_SETTLEMENT_SCALES = ['town', 'city', 'metropolis'] as const;
export type VignetteSettlementScale = (typeof VIGNETTE_SETTLEMENT_SCALES)[number];

export interface VignettePrerequisites {
  readonly minScale: VignetteSettlementScale;
  readonly requiresWater?: boolean;
  readonly requiresElevation?: boolean;
  readonly requiresVegetation?: boolean;
}

export interface VignetteBlueprint {
  readonly id: CityVignetteType;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly prerequisites: VignettePrerequisites;
  readonly build: (originX: number, originY: number, seed: number) => {
    readonly buildings: readonly UrbanBuildingPlacement[];
    readonly props: readonly UrbanPropPlacement[];
    readonly internalStreets: readonly { readonly x: number; readonly y: number }[];
    readonly pavedPlazaCells: readonly { readonly x: number; readonly y: number }[];
  };
}

// ---------------------------------------------------------------------------
// 2. Blueprint Implementations
// ---------------------------------------------------------------------------

/** Deterministic pseudo-random helper */
function createLcg(seed: number): () => number {
  let s = (seed >>> 0) || 1337;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

const BLUEPRINTS: readonly VignetteBlueprint[] = [
  // 1. Fisherman's Wharf & House by the Pond (6x6)
  {
    id: 'fisherman_wharf',
    name: 'La Finca Ribereña del Pescador',
    width: 6,
    height: 6,
    prerequisites: { minScale: 'town', requiresWater: true },
    build: (ox, oy, seed) => {
      const rng = createLcg(seed);
      const houseKeys = ['house_wood_brown', 'house_orange', 'house_gray_small'] as const;
      const houseKey = houseKeys[Math.floor(rng() * houseKeys.length)]!;
      const meta = getBuildingPrefabMeta(houseKey);

      const buildings: UrbanBuildingPlacement[] = [
        {
          id: `wharf_cottage_${ox}_${oy}`,
          type: 'house',
          x: ox,
          y: oy,
          width: meta.width,
          height: meta.height,
          doorX: ox + meta.doorOffsets[0]!.dx,
          doorY: oy + meta.doorOffsets[0]!.dy,
          prefabFile: meta.prefabFile
        }
      ];

      const props: UrbanPropPlacement[] = [
        { type: 'fence_h', x: ox + 4, y: oy + 1, prefabFile: getAssetFilename('poke_fence_wood_h') },
        { type: 'fence_h', x: ox + 4, y: oy + 2, prefabFile: getAssetFilename('poke_fence_wood_h') },
        { type: 'signpost', x: ox + 4, y: oy + 3, prefabFile: getAssetFilename('poke_signpost_wood') },
        { type: 'bench', x: ox + 5, y: oy + 4, prefabFile: getAssetFilename('poke_bench') }
      ];

      const internalStreets = [
        { x: ox + meta.doorOffsets[0]!.dx, y: oy + meta.height },
        { x: ox + meta.doorOffsets[0]!.dx, y: oy + meta.height + 1 }
      ];

      return { buildings, props, internalStreets, pavedPlazaCells: [] };
    }
  },

  // 2. Berry Orchard / Fenced Ranch (6x5)
  {
    id: 'berry_orchard',
    name: 'El Huerto de Bayas y Criadero',
    width: 6,
    height: 5,
    prerequisites: { minScale: 'town' },
    build: (ox, oy) => {
      const props: UrbanPropPlacement[] = [
        // Picket fence perimeter
        { type: 'fence_h', x: ox, y: oy, prefabFile: getAssetFilename('poke_fence_picket') },
        { type: 'fence_h', x: ox + 1, y: oy, prefabFile: getAssetFilename('poke_fence_picket') },
        { type: 'fence_h', x: ox + 2, y: oy, prefabFile: getAssetFilename('poke_fence_picket') },
        { type: 'fence_h', x: ox + 3, y: oy, prefabFile: getAssetFilename('poke_fence_picket') },
        { type: 'mailbox', x: ox + 4, y: oy, prefabFile: getAssetFilename('poke_mailbox') },
        // Flower beds in inner garden
        { type: 'flower', x: ox + 1, y: oy + 1, prefabFile: getAssetFilename('poke_flowers_red') },
        { type: 'flower', x: ox + 2, y: oy + 1, prefabFile: getAssetFilename('poke_flowers_red') },
        { type: 'flower', x: ox + 1, y: oy + 2, prefabFile: getAssetFilename('poke_flowers_red') },
        { type: 'flower', x: ox + 2, y: oy + 2, prefabFile: getAssetFilename('poke_flowers_red') },
        { type: 'signpost', x: ox, y: oy + 3, prefabFile: getAssetFilename('poke_signpost') }
      ];

      const internalStreets = [
        { x: ox + 4, y: oy + 1 },
        { x: ox + 4, y: oy + 2 },
        { x: ox + 4, y: oy + 3 }
      ];

      return { buildings: [], props, internalStreets, pavedPlazaCells: [] };
    }
  },

  // 3. Cliff Lookout Terrace (5x4)
  {
    id: 'cliff_lookout',
    name: 'El Mirador del Risco',
    width: 5,
    height: 4,
    prerequisites: { minScale: 'town', requiresElevation: true },
    build: (ox, oy) => {
      const props: UrbanPropPlacement[] = [
        { type: 'bench', x: ox + 1, y: oy + 1, prefabFile: getAssetFilename('poke_bench') },
        { type: 'lamp', x: ox + 3, y: oy + 1, prefabFile: getAssetFilename('poke_street_lamp') },
        { type: 'fence_h', x: ox, y: oy, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
        { type: 'fence_h', x: ox + 1, y: oy, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
        { type: 'fence_h', x: ox + 2, y: oy, prefabFile: getAssetFilename('poke_fence_white_h_mid') },
        { type: 'fence_h', x: ox + 3, y: oy, prefabFile: getAssetFilename('poke_fence_white_h_mid') }
      ];

      const pavedPlazaCells: { x: number; y: number }[] = [];
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 5; dx++) {
          pavedPlazaCells.push({ x: ox + dx, y: oy + dy });
        }
      }

      const internalStreets = [
        { x: ox + 2, y: oy + 2 },
        { x: ox + 2, y: oy + 3 }
      ];

      return { buildings: [], props, internalStreets, pavedPlazaCells };
    }
  },

  // 4. Street Bazaar & Market Stalls (7x5)
  {
    id: 'street_bazaar',
    name: 'El Bazar y Mercado Callejero',
    width: 7,
    height: 5,
    prerequisites: { minScale: 'city' },
    build: (ox, oy) => {
      const props: UrbanPropPlacement[] = [
        { type: 'crates', x: ox, y: oy, prefabFile: getAssetFilename('poke_port_cargo_crates_double') },
        { type: 'crates', x: ox + 2, y: oy, prefabFile: getAssetFilename('poke_port_cargo_crates_stack') },
        { type: 'bench', x: ox + 5, y: oy, prefabFile: getAssetFilename('poke_bench') },
        { type: 'lamp', x: ox + 6, y: oy + 2, prefabFile: getAssetFilename('poke_street_lamp') },
        { type: 'signpost', x: ox, y: oy + 3, prefabFile: getAssetFilename('poke_sign_blue_metal') }
      ];

      const pavedPlazaCells: { x: number; y: number }[] = [];
      for (let dy = 0; dy < 5; dy++) {
        for (let dx = 0; dx < 7; dx++) {
          pavedPlazaCells.push({ x: ox + dx, y: oy + dy });
        }
      }

      const internalStreets = [
        { x: ox + 1, y: oy + 2 },
        { x: ox + 2, y: oy + 2 },
        { x: ox + 3, y: oy + 2 },
        { x: ox + 4, y: oy + 2 }
      ];

      return { buildings: [], props, internalStreets, pavedPlazaCells };
    }
  },

  // 5. Civic Fountain Square (6x6)
  {
    id: 'civic_fountain_square',
    name: 'La Plazoleta de la Fuente Central',
    width: 6,
    height: 6,
    prerequisites: { minScale: 'city' },
    build: (ox, oy) => {
      const props: UrbanPropPlacement[] = [
        // Central Fountain (3x3 footprint at ox + 1, oy + 1)
        { type: 'fountain', x: ox + 1, y: oy + 1, prefabFile: getAssetFilename('poke_fountain') },
        // Flanking rest bench on the east side (clearance >= 1 tile from fountain)
        { type: 'bench', x: ox + 4, y: oy + 2, prefabFile: getAssetFilename('poke_bench') },
        // Perimeter flower pots
        { type: 'flower', x: ox, y: oy, prefabFile: getAssetFilename('poke_flower_pot_circular') },
        { type: 'flower', x: ox + 5, y: oy, prefabFile: getAssetFilename('poke_flower_pot_circular') },
        { type: 'flower', x: ox, y: oy + 5, prefabFile: getAssetFilename('poke_flower_pot_circular') },
        { type: 'flower', x: ox + 5, y: oy + 5, prefabFile: getAssetFilename('poke_flower_pot_circular') },
        // Street lamp
        { type: 'lamp', x: ox + 5, y: oy + 1, prefabFile: getAssetFilename('poke_street_lamp') }
      ];

      const pavedPlazaCells: { x: number; y: number }[] = [];
      for (let dy = 0; dy < 6; dy++) {
        for (let dx = 0; dx < 6; dx++) {
          pavedPlazaCells.push({ x: ox + dx, y: oy + dy });
        }
      }

      const internalStreets = [
        { x: ox + 2, y: oy + 4 },
        { x: ox + 3, y: oy + 4 },
        { x: ox + 2, y: oy + 5 },
        { x: ox + 3, y: oy + 5 }
      ];

      return { buildings: [], props, internalStreets, pavedPlazaCells };
    }
  },

  // 6. Harbor Pier & Dock Promenade (7x6)
  {
    id: 'harbor_pier_dock',
    name: 'La Dársena Portuaria y Paseo Marítimo',
    width: 7,
    height: 6,
    prerequisites: { minScale: 'city', requiresWater: true },
    build: (ox, oy) => {
      const props: UrbanPropPlacement[] = [
        { type: 'crates', x: ox + 1, y: oy, prefabFile: getAssetFilename('poke_port_cargo_crates_double') },
        { type: 'bench', x: ox + 4, y: oy, prefabFile: getAssetFilename('poke_bench') },
        { type: 'lamp', x: ox, y: oy + 1, prefabFile: getAssetFilename('poke_street_lamp') },
        { type: 'lamp', x: ox + 6, y: oy + 1, prefabFile: getAssetFilename('poke_street_lamp_left') }
      ];

      const pavedPlazaCells: { x: number; y: number }[] = [];
      for (let dy = 0; dy < 6; dy++) {
        for (let dx = 0; dx < 7; dx++) {
          pavedPlazaCells.push({ x: ox + dx, y: oy + dy });
        }
      }

      const internalStreets = [
        { x: ox + 3, y: oy },
        { x: ox + 3, y: oy + 1 },
        { x: ox + 3, y: oy + 2 },
        { x: ox + 3, y: oy + 3 }
      ];

      return { buildings: [], props, internalStreets, pavedPlazaCells };
    }
  },

  // 7. Residential Cul-de-sac (10x7)
  {
    id: 'residential_culdesac',
    name: 'El Callejón Residencial Cerrado',
    width: 10,
    height: 7,
    prerequisites: { minScale: 'town' },
    build: (ox, oy, seed) => {
      const rng = createLcg(seed);
      const roofs = ['house_pallet_blue', 'house_cerulean_orange', 'house_green_plain', 'house_purple'] as const;
      const roofA = roofs[Math.floor(rng() * roofs.length)]!;
      const roofB = roofs[(Math.floor(rng() * roofs.length) + 1) % roofs.length]!;

      const metaA = getBuildingPrefabMeta(roofA);
      const metaB = getBuildingPrefabMeta(roofB);

      const buildings: UrbanBuildingPlacement[] = [
        {
          id: `culdesac_house_a_${ox}_${oy}`,
          type: 'house',
          x: ox,
          y: oy,
          width: metaA.width,
          height: metaA.height,
          doorX: ox + metaA.doorOffsets[0]!.dx,
          doorY: oy + metaA.doorOffsets[0]!.dy,
          prefabFile: metaA.prefabFile
        },
        {
          id: `culdesac_house_b_${ox}_${oy}`,
          type: 'house',
          x: ox + 5,
          y: oy,
          width: metaB.width,
          height: metaB.height,
          doorX: ox + 5 + metaB.doorOffsets[0]!.dx,
          doorY: oy + metaB.doorOffsets[0]!.dy,
          prefabFile: metaB.prefabFile
        }
      ];

      const props: UrbanPropPlacement[] = [
        { type: 'flower', x: ox + 4, y: oy + 2, prefabFile: getAssetFilename('poke_flowers_red') },
        { type: 'mailbox', x: ox + metaA.doorOffsets[0]!.dx + 1, y: oy + metaA.height, prefabFile: getAssetFilename('poke_mailbox') },
        { type: 'mailbox', x: ox + 5 + metaB.doorOffsets[0]!.dx - 1, y: oy + metaB.height, prefabFile: getAssetFilename('poke_mailbox') },
        { type: 'flower', x: ox, y: oy + metaA.height + 1, prefabFile: getAssetFilename('poke_flowers_red') },
        { type: 'flower', x: ox + 9, y: oy + metaB.height + 1, prefabFile: getAssetFilename('poke_flowers_red') }
      ];

      const internalStreets = [
        { x: ox + 4, y: oy + 4 },
        { x: ox + 5, y: oy + 4 },
        { x: ox + 4, y: oy + 5 },
        { x: ox + 5, y: oy + 5 },
        { x: ox + 4, y: oy + 6 },
        { x: ox + 5, y: oy + 6 }
      ];

      return { buildings, props, internalStreets, pavedPlazaCells: [] };
    }
  },

  // 8. Sacred Shrine & Monument Ground (6x6)
  {
    id: 'sacred_shrine',
    name: 'El Santuario Silvestre de los Guardianes',
    width: 6,
    height: 6,
    prerequisites: { minScale: 'city' },
    build: (ox, oy) => {
      const props: UrbanPropPlacement[] = [
        // Dual Guardian Statues flanking the portico
        { type: 'statue', x: ox + 1, y: oy + 1, prefabFile: getAssetFilename('poke_statue_gym') },
        { type: 'statue', x: ox + 4, y: oy + 1, prefabFile: getAssetFilename('poke_statue_gym') },
        // Formal round hedges framing the plaza
        { type: 'flower', x: ox, y: oy, prefabFile: getAssetFilename('poke_bush_round') },
        { type: 'flower', x: ox + 5, y: oy, prefabFile: getAssetFilename('poke_bush_round') },
        { type: 'flower', x: ox, y: oy + 3, prefabFile: getAssetFilename('poke_bush_round') },
        { type: 'flower', x: ox + 5, y: oy + 3, prefabFile: getAssetFilename('poke_bush_round') },
        // Central signpost
        { type: 'signpost', x: ox + 2, y: oy + 2, prefabFile: getAssetFilename('poke_signpost') }
      ];

      const pavedPlazaCells: { x: number; y: number }[] = [];
      for (let dy = 0; dy < 6; dy++) {
        for (let dx = 0; dx < 6; dx++) {
          pavedPlazaCells.push({ x: ox + dx, y: oy + dy });
        }
      }

      const internalStreets = [
        { x: ox + 2, y: oy + 4 },
        { x: ox + 3, y: oy + 4 },
        { x: ox + 2, y: oy + 5 },
        { x: ox + 3, y: oy + 5 }
      ];

      return { buildings: [], props, internalStreets, pavedPlazaCells };
    }
  },

  // 9. Cargo & Logistics Depot (6x5)
  {
    id: 'cargo_depot',
    name: 'El Taller y Depósito de Carga',
    width: 6,
    height: 5,
    prerequisites: { minScale: 'city' },
    build: (ox, oy) => {
      const props: UrbanPropPlacement[] = [
        { type: 'crates', x: ox, y: oy, prefabFile: getAssetFilename('poke_port_cargo_crates_double') },
        { type: 'crates', x: ox + 2, y: oy, prefabFile: getAssetFilename('poke_port_cargo_crates_stack') },
        { type: 'fence_h', x: ox + 4, y: oy, prefabFile: getAssetFilename('poke_fence_wood_h') },
        { type: 'fence_h', x: ox + 5, y: oy, prefabFile: getAssetFilename('poke_fence_wood_h') },
        { type: 'lamp', x: ox + 5, y: oy + 2, prefabFile: getAssetFilename('poke_street_lamp') }
      ];

      const internalStreets = [
        { x: ox + 1, y: oy + 2 },
        { x: ox + 2, y: oy + 2 },
        { x: ox + 1, y: oy + 3 },
        { x: ox + 2, y: oy + 3 }
      ];

      return { buildings: [], props, internalStreets, pavedPlazaCells: [] };
    }
  },

  // 10. Botanical Garden & Conservatory (7x6)
  {
    id: 'botanical_garden',
    name: 'El Jardín Botánico y Paseo Floral',
    width: 7,
    height: 6,
    prerequisites: { minScale: 'town', requiresVegetation: true },
    build: (ox, oy) => {
      const props: UrbanPropPlacement[] = [
        { type: 'flower', x: ox + 1, y: oy + 1, prefabFile: getAssetFilename('poke_flowers_red') },
        { type: 'flower', x: ox + 2, y: oy + 1, prefabFile: getAssetFilename('poke_flowers_red') },
        { type: 'flower', x: ox + 4, y: oy + 1, prefabFile: getAssetFilename('poke_flowers_red') },
        { type: 'flower', x: ox + 5, y: oy + 1, prefabFile: getAssetFilename('poke_flowers_red') },
        { type: 'flower', x: ox + 1, y: oy + 2, prefabFile: getAssetFilename('poke_bush_round') },
        { type: 'flower', x: ox + 5, y: oy + 2, prefabFile: getAssetFilename('poke_bush_round') },
        { type: 'bench', x: ox + 3, y: oy + 1, prefabFile: getAssetFilename('poke_bench') },
        { type: 'signpost', x: ox + 3, y: oy + 3, prefabFile: getAssetFilename('poke_signpost') }
      ];

      const internalStreets = [
        { x: ox + 3, y: oy + 4 },
        { x: ox + 3, y: oy + 5 }
      ];

      return { buildings: [], props, internalStreets, pavedPlazaCells: [] };
    }
  }
];

// O(1) typed lookup dictionary
const initialRegistry: Record<string, VignetteBlueprint> = {};
export const VIGNETTE_BLUEPRINTS_BY_ID: Record<CityVignetteType, VignetteBlueprint> = Object.freeze(
  BLUEPRINTS.reduce<Record<CityVignetteType, VignetteBlueprint>>((acc, bp) => {
    acc[bp.id] = bp;
    return acc;
  }, initialRegistry as Record<CityVignetteType, VignetteBlueprint>)
);

/**
 * Filters compatible vignettes for a given settlement scale and geographic context.
 */
export function getCompatibleVignettes(
  scale: VignetteSettlementScale,
  context: { hasWater: boolean; hasElevation: boolean; hasVegetation: boolean }
): readonly VignetteBlueprint[] {
  const scaleHierarchy: Record<VignetteSettlementScale, number> = {
    town: 1,
    city: 2,
    metropolis: 3
  };
  const currentLevel = scaleHierarchy[scale];

  return BLUEPRINTS.filter((bp) => {
    if (scaleHierarchy[bp.prerequisites.minScale] > currentLevel) return false;
    if (bp.prerequisites.requiresWater && !context.hasWater) return false;
    if (bp.prerequisites.requiresElevation && !context.hasElevation) return false;
    if (bp.prerequisites.requiresVegetation && !context.hasVegetation) return false;
    return true;
  });
}
