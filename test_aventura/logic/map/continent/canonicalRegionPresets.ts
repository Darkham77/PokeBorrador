/**
 * src/logic/map/continent/canonicalRegionPresets.ts
 *
 * CANONICAL POKÉMON REGIONAL PRESET GENERATOR (KANTO & JOHTO)
 *
 * Generates 100% authentic regional geography, canonical settlements in exact
 * geographic coordinates, authentic route network (including sea crossings for Surf),
 * autotiled coastlines/mountains, and full GBA urban layouts.
 */

import type {
  ContinentMapResult,
  ContinentCellDetails
} from '../continentGenerator.ts';
import {
  resolveWaterCoastGrid,
  type WaterTerrainKind,
  type WaterTerrainMatrix
} from '../waterAutotileEngine.ts';
import {
  resolveMountainMapGrid,
  type MountainPalette,
  type MountainStairLocation
} from '../mountainAutotileEngine.ts';
import { clusterMountainMassifs } from '../geologicalClusterEngine.ts';
import { synthesizeMacroBiomes } from '../macroBiomeSynthesizer.ts';
import { resolveMacroBiomeAutotile } from '../macroBiomeAutotileEngine.ts';
import { generateSettlementLayout } from '../cityLayoutEngine.ts';
import { computeTransitableGrid } from '../transitableGridEngine.ts';
import { generateWildernessLayer } from '../wildernessVegetationEngine.ts';
import {
  buildZeroCopyPreviewBuffer,
  type RegionalGenerationPipelineResult
} from '../continentGenerator.worker.ts';
import type {
  POINode,
  RouteEdge,
  RouteWaypoint,
  RouteType
} from '../../../types/map/poiTypes.ts';
import {
  sculptOrganicIsland,
  sculptArchipelagoChain,
  applyNaturalBeaches,
  sampleCoastalDisplacement
} from './coastalFractalEngine.ts';
import {
  carveOrganicLake,
  carveRiverSystem,
  stampBridgesOnWaterIntersections
} from './riverHydrographyEngine.ts';
import { findPathAStar, computeOceanGrid } from '../routePathfinding.ts';
import { SimplexNoise, fbm2D } from '../noise/simplexNoise.ts';
import type { ResolvedRouteNetworkResult } from '../routeNetworkEngine.ts';

// ---------------------------------------------------------------------------
// 1. Canonical POI Node Blueprints
// ---------------------------------------------------------------------------

interface CanonicalNodeBlueprint {
  readonly id: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly name: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly type: POINode['type'];
  readonly urbanScale: NonNullable<POINode['urbanScale']>;
  readonly gridX: number;
  readonly gridY: number;
  readonly width: number;
  readonly height: number;
  readonly hasGym: boolean;
  readonly elevation?: number;
  readonly facing?: POINode['facing'];
  readonly buildingFile?: string;
  readonly roadMaterial?: 'dirt' | 'paved';
}

const KANTO_BLUEPRINTS: readonly CanonicalNodeBlueprint[] = [
  // 1. Pallet Town (Pueblo Paleta) - 14x12 Rural Town
  { id: 'pallet', name: 'Pueblo Paleta', type: 'town', urbanScale: 'town', gridX: 67, gridY: 166, width: 14, height: 12, hasGym: false },

  // 2. Viridian City (Ciudad Verde) - 20x16 Gym City
  { id: 'viridian', name: 'Ciudad Verde', type: 'city', urbanScale: 'city', gridX: 64, gridY: 120, width: 20, height: 16, hasGym: true },

  // 3. Viridian Forest (Bosque Verde) - 16x16 Dungeon Forest
  { id: 'viridianforest', name: 'Bosque Verde', type: 'dungeon_forest', urbanScale: 'hamlet', gridX: 66, gridY: 78, width: 16, height: 16, hasGym: false },

  // 4. Pewter City (Ciudad Plateada) - 20x16 Gym City
  { id: 'pewter', name: 'Ciudad Plateada', type: 'city', urbanScale: 'city', gridX: 64, gridY: 36, width: 20, height: 16, hasGym: true },

  // 5. Indigo Plateau (Meseta Añil) - 32x20 Pokemon League
  { id: 'indigo', name: 'Meseta Añil (Liga Pokémon)', type: 'pokemon_league', urbanScale: 'city', gridX: 26, gridY: 22, width: 32, height: 20, hasGym: false, elevation: 1 },

  // 5a. Victory Road Lower Entrance (Calle Victoria Entrada Sur) - Route 23 terminus at mountain base
  { id: 'victory_road_entrance', name: 'Calle Victoria (Entrada Sur)', type: 'cave_entrance', urbanScale: 'hamlet', gridX: 42, gridY: 54, width: 4, height: 4, hasGym: false, elevation: 0 },

  // 5b. Victory Road Upper Exit (Calle Victoria Salida Norte) - Mountain pass egress onto Indigo Plateau
  { id: 'victory_road_exit', name: 'Calle Victoria (Salida Norte)', type: 'cave_entrance', urbanScale: 'hamlet', gridX: 36, gridY: 40, width: 4, height: 4, hasGym: false, elevation: 1 },

  // 6a. Mt. Moon West Entrance (Monte Moon Oeste) - Route 3 terminus at western cliff base
  { id: 'mtmoon_west', name: 'Monte Moon (Oeste)', type: 'cave_entrance', urbanScale: 'hamlet', gridX: 100, gridY: 44, width: 4, height: 4, hasGym: false, elevation: 0 },

  // 6b. Mt. Moon East Entrance (Monte Moon Este) - Route 4 origin at eastern cliff base
  { id: 'mtmoon_east', name: 'Monte Moon (Este)', type: 'cave_entrance', urbanScale: 'hamlet', gridX: 134, gridY: 44, width: 4, height: 4, hasGym: false, elevation: 0 },

  // 7. Cerulean City (Ciudad Celeste) - 20x16 Gym City
  { id: 'cerulean', name: 'Ciudad Celeste', type: 'city', urbanScale: 'city', gridX: 156, gridY: 46, width: 20, height: 16, hasGym: true },

  // 8. Bill's Sea Cottage (Casa de Bill) - 6x6 Cape Landmark
  { id: 'billshouse', name: 'Casa de Bill (Cabo Celeste)', type: 'town', urbanScale: 'hamlet', gridX: 196, gridY: 26, width: 6, height: 6, hasGym: false, buildingFile: 'house_wood_brown.png' },

  // 9a. Rock Tunnel North Entrance (Túnel Roca Norte) - Route 9 terminus at northern cliff base
  { id: 'rocktunnel_north', name: 'Túnel Roca (Norte)', type: 'cave_entrance', urbanScale: 'hamlet', gridX: 194, gridY: 55, width: 4, height: 4, hasGym: false, elevation: 0 },

  // 9b. Rock Tunnel South Entrance (Túnel Roca Sur) - Route 10 South origin at southern cliff base
  { id: 'rocktunnel_south', name: 'Túnel Roca (Sur)', type: 'cave_entrance', urbanScale: 'hamlet', gridX: 204, gridY: 90, width: 4, height: 4, hasGym: false, elevation: 0 },

  // 10. Power Plant (Central de Energía) - 6x6 Isolated Landmark
  { id: 'powerplant', name: 'Central Energía', type: 'town', urbanScale: 'hamlet', gridX: 224, gridY: 72, width: 6, height: 6, hasGym: false, buildingFile: 'house_celadon_brick_2story.png' },

  // 11. Lavender Town (Pueblo Lavanda) - 14x12 Spiritual Town
  { id: 'lavender', name: 'Pueblo Lavanda', type: 'town', urbanScale: 'town', gridX: 202, gridY: 108, width: 14, height: 12, hasGym: false },

  // 12. Celadon City (Ciudad Azulona) - 28x24 Metropolis
  { id: 'celadon', name: 'Ciudad Azulona', type: 'metropolis', urbanScale: 'metropolis', gridX: 104, gridY: 102, width: 28, height: 24, hasGym: true },

  // 13. Saffron City (Ciudad Azafrán) - 28x24 Central Metropolis
  { id: 'saffron', name: 'Ciudad Azafrán', type: 'metropolis', urbanScale: 'metropolis', gridX: 152, gridY: 102, width: 28, height: 24, hasGym: true },

  // 14. Vermilion City (Ciudad Carmín) - 20x16 Port City
  { id: 'vermilion', name: 'Ciudad Carmín', type: 'city', urbanScale: 'city', gridX: 156, gridY: 152, width: 20, height: 16, hasGym: true },

  // 15. Diglett's Cave (Cueva Diglett) - 4x4 Shortcut Cave
  { id: 'diglettcave', name: 'Cueva Diglett', type: 'cave_entrance', urbanScale: 'hamlet', gridX: 126, gridY: 153, width: 4, height: 4, hasGym: false, elevation: 0 },

  // 16. Fuchsia City (Ciudad Fucsia) - 20x16 Safari City
  { id: 'fuchsia', name: 'Ciudad Fucsia', type: 'city', urbanScale: 'city', gridX: 168, gridY: 196, width: 20, height: 16, hasGym: true },

  // 17. Seafoam Islands (Islas Espuma) - 10x8 Sea Cave Island
  { id: 'seafoam', name: 'Islas Espuma', type: 'cave_entrance', urbanScale: 'hamlet', gridX: 114, gridY: 216, width: 10, height: 8, hasGym: false, elevation: 0 },

  // 18. Cinnabar Island (Isla Canela) - 14x12 Volcanic Town with dirt roads
  { id: 'cinnabar', name: 'Isla Canela', type: 'town', urbanScale: 'town', gridX: 48, gridY: 216, width: 14, height: 12, hasGym: true, roadMaterial: 'dirt' },

  // 19. Vermilion Port (Puerto Carmín) - 7x6 Port Dock facing south into Vermilion Bay
  { id: 'vermilion_port', name: 'Puerto Carmín', type: 'port_dock', urbanScale: 'hamlet', gridX: 160, gridY: 166, width: 7, height: 6, hasGym: false, facing: 'south', buildingFile: 'poke_port_vermilion_gate.png' }
];

const JOHTO_BLUEPRINTS: readonly CanonicalNodeBlueprint[] = [
  { id: 'newbark', name: 'Pueblo Primavera', type: 'town', urbanScale: 'village', gridX: 106, gridY: 88, width: 8, height: 8, hasGym: false },
  { id: 'cherrygrove', name: 'Ciudad Cerezo', type: 'town', urbanScale: 'town', gridX: 88, gridY: 88, width: 8, height: 8, hasGym: false },
  { id: 'violet', name: 'Ciudad Malvalona', type: 'city', urbanScale: 'city', gridX: 72, gridY: 64, width: 12, height: 10, hasGym: true },
  { id: 'azalea', name: 'Pueblo Azalea', type: 'town', urbanScale: 'town', gridX: 56, gridY: 106, width: 8, height: 8, hasGym: true },
  { id: 'goldenrod', name: 'Ciudad Trigal', type: 'metropolis', urbanScale: 'metropolis', gridX: 38, gridY: 76, width: 16, height: 14, hasGym: true },
  { id: 'ecruteak', name: 'Ciudad Iris', type: 'city', urbanScale: 'city', gridX: 56, gridY: 44, width: 12, height: 10, hasGym: true },
  { id: 'olivine', name: 'Ciudad Olivo', type: 'city', urbanScale: 'city', gridX: 32, gridY: 48, width: 12, height: 10, hasGym: true },
  { id: 'cianwood', name: 'Ciudad Orquídea', type: 'town', urbanScale: 'town', gridX: 14, gridY: 86, width: 10, height: 8, hasGym: true },
  { id: 'mahogany', name: 'Pueblo Caoba', type: 'town', urbanScale: 'town', gridX: 84, gridY: 44, width: 8, height: 8, hasGym: true },
  { id: 'lakeofrage', name: 'Lago de la Furia', type: 'water_landmark', urbanScale: 'hamlet', gridX: 84, gridY: 24, width: 8, height: 8, hasGym: false },
  { id: 'blackthorn', name: 'Ciudad Endrino', type: 'city', urbanScale: 'city', gridX: 108, gridY: 44, width: 12, height: 10, hasGym: true },
  { id: 'mtsilver', name: 'Monte Plateado', type: 'pokemon_league', urbanScale: 'city', gridX: 104, gridY: 58, width: 22, height: 20, hasGym: false, elevation: 1 }
];

// ---------------------------------------------------------------------------
// 2. Canonical Route Edge Blueprints
// ---------------------------------------------------------------------------

interface CanonicalRouteBlueprint {
  readonly id: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly from: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly to: string; // domain-ok: Identificador o estructura procedural de aventura
  readonly routeType: RouteType;
  readonly isWaterCrossing?: boolean;
}

const KANTO_ROUTES: readonly CanonicalRouteBlueprint[] = [
  { id: 'kanto_r1', from: 'pallet', to: 'viridian', routeType: 'road' },
  { id: 'kanto_r2_s', from: 'viridian', to: 'viridianforest', routeType: 'road' },
  { id: 'kanto_r2_n', from: 'viridianforest', to: 'pewter', routeType: 'forest_path' },
  { id: 'kanto_r22_23', from: 'viridian', to: 'victory_road_entrance', routeType: 'mountain_pass' },
  { id: 'kanto_victory_road', from: 'victory_road_entrance', to: 'victory_road_exit', routeType: 'mountain_pass' },
  { id: 'kanto_indigo_avenue', from: 'victory_road_exit', to: 'indigo', routeType: 'road' },
  { id: 'kanto_r3', from: 'pewter', to: 'mtmoon_west', routeType: 'mountain_pass' },
  { id: 'kanto_r4', from: 'mtmoon_east', to: 'cerulean', routeType: 'mountain_pass' },
  { id: 'kanto_r24_25', from: 'cerulean', to: 'billshouse', routeType: 'road' },
  { id: 'kanto_r5', from: 'cerulean', to: 'saffron', routeType: 'road' },
  { id: 'kanto_r7', from: 'celadon', to: 'saffron', routeType: 'road' },
  { id: 'kanto_r8', from: 'saffron', to: 'lavender', routeType: 'road' },
  { id: 'kanto_r9_10', from: 'cerulean', to: 'rocktunnel_north', routeType: 'road' },
  { id: 'kanto_r10_powerplant', from: 'rocktunnel_north', to: 'powerplant', routeType: 'road' },
  { id: 'kanto_r10_s', from: 'rocktunnel_south', to: 'lavender', routeType: 'mountain_pass' },
  { id: 'kanto_r6', from: 'saffron', to: 'vermilion', routeType: 'road' },
  { id: 'kanto_diglett', from: 'vermilion', to: 'diglettcave', routeType: 'mountain_pass' },
  { id: 'kanto_r11_15', from: 'vermilion', to: 'fuchsia', routeType: 'road' },
  { id: 'kanto_r12', from: 'lavender', to: 'fuchsia', routeType: 'road' },
  { id: 'kanto_r16_18', from: 'celadon', to: 'fuchsia', routeType: 'road' },
  { id: 'kanto_r19', from: 'fuchsia', to: 'seafoam', routeType: 'water_crossing', isWaterCrossing: true },
  { id: 'kanto_r20', from: 'seafoam', to: 'cinnabar', routeType: 'water_crossing', isWaterCrossing: true },
  { id: 'kanto_r21', from: 'cinnabar', to: 'pallet', routeType: 'water_crossing', isWaterCrossing: true },
  { id: 'kanto_vermilion_port', from: 'vermilion', to: 'vermilion_port', routeType: 'road' }
];

const JOHTO_ROUTES: readonly CanonicalRouteBlueprint[] = [
  { id: 'johto_r29', from: 'newbark', to: 'cherrygrove', routeType: 'road' },
  { id: 'johto_r30_31', from: 'cherrygrove', to: 'violet', routeType: 'road' },
  { id: 'johto_r32_33', from: 'violet', to: 'azalea', routeType: 'road' },
  { id: 'johto_r34', from: 'azalea', to: 'goldenrod', routeType: 'forest_path' },
  { id: 'johto_r35_37', from: 'goldenrod', to: 'ecruteak', routeType: 'road' },
  { id: 'johto_r36', from: 'violet', to: 'ecruteak', routeType: 'road' },
  { id: 'johto_r38_39', from: 'ecruteak', to: 'olivine', routeType: 'road' },
  { id: 'johto_r40_41', from: 'olivine', to: 'cianwood', routeType: 'water_crossing', isWaterCrossing: true },
  { id: 'johto_r42', from: 'ecruteak', to: 'mahogany', routeType: 'mountain_pass' },
  { id: 'johto_r43', from: 'mahogany', to: 'lakeofrage', routeType: 'road' },
  { id: 'johto_r44', from: 'mahogany', to: 'blackthorn', routeType: 'mountain_pass' },
  { id: 'johto_r45_46', from: 'blackthorn', to: 'newbark', routeType: 'mountain_pass' },
  { id: 'johto_r27_28', from: 'newbark', to: 'mtsilver', routeType: 'mountain_pass' }
];

// ---------------------------------------------------------------------------
// 3. Terrain Sculptors
// ---------------------------------------------------------------------------

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

function sculptKantoTerrain(
  W: number,
  H: number
): { readonly terrainMatrix: WaterTerrainMatrix; readonly heightmap: number[][] } {
  const terrain: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('water'));
  const heightmap: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
  const noise = new SimplexNoise(151);

  // 1. Continental Mainland with Organic, Naturally Sculpted Geography:
  for (let y = 16; y <= 212; y++) {
    // A) Define baseline west coast based on latitude y
    let baseWestX = 40;
    if (y <= 55) {
      // Northwest Indigo Plateau bastion jutting west
      baseWestX = 22;
    } else if (y <= 118) {
      // Western sea gulf curving gently inward (safely west of Route 23 corridor)
      const t = (y - 55) / 63;
      baseWestX = 22 + Math.sin(t * Math.PI) * 14; // sweeps from 22 to 36
    } else if (y <= 126) {
      // Route 22 corridor to Victory Road gate
      baseWestX = 32;
    } else if (y <= 178) {
      // Viridian and Pallet western woods (dense forest wall along western sea)
      baseWestX = 58;
    } else {
      // South of Pallet: Southwest ocean opens up (Route 21)
      baseWestX = 92;
    }

    // B) Define baseline east coast based on latitude y
    let baseEastX = 220;
    if (y <= 42) {
      // Cerulean Cape peninsula (narrow jutting tongue in northeast)
      baseEastX = 212;
    } else if (y <= 95) {
      // Rock Tunnel & Power Plant eastern coastline
      baseEastX = 236;
    } else if (y <= 125) {
      // Lavender Town coast
      baseEastX = 222;
    } else if (y <= 195) {
      // Eastern coastal route 12/13/14 tapering gracefully towards Fuchsia
      const t = (y - 125) / 70;
      baseEastX = 222 - t * 14; // sweeps from 222 to 208
    } else {
      // Southern coast of Fuchsia
      baseEastX = 192;
    }

    // Multi-octave fractal displacement
    const westOffset = sampleCoastalDisplacement(noise, baseWestX, y, { amplitude: 6, scale: 0.045 });
    const eastOffset = sampleCoastalDisplacement(noise, baseEastX, y, { amplitude: 6, scale: 0.045 });

    const westX = Math.max(14, Math.round(baseWestX + westOffset));
    const eastX = Math.min(W - 14, Math.round(baseEastX + eastOffset));

    for (let x = westX; x <= eastX; x++) {
      // 0. Northern ocean undulating falloff
      const northDisplacement = sampleCoastalDisplacement(noise, x, 18, { amplitude: 4, scale: 0.06 });
      if (y < 16 + northDisplacement) continue;

      // 1. Northwest ocean falloff (north of Indigo)
      if (y < 22 && x < 45) {
        if (Math.hypot(x - 45, y - 22) > 20) continue;
      }

      // 2. Cerulean Bay (ocean west of Cerulean Cape, north of Cerulean)
      if (y < 42 && x < 156) {
        const capeDist = Math.hypot((x - 114) / 36, (y - 20) / 16);
        if (capeDist > 1.0 && y < 32 && x > 84) continue;
      }

      // 3. Cerulean Cape eastern ocean
      if (y < 42 && x > 212) continue;

      // 4. Vermilion Bay & Harbor: natural coastal bay south of Vermilion City opening directly into the southern ocean
      if (y >= 172 && x >= 148 && x <= 168) {
        const bayNoise = fbm2D(noise, x * 0.08, y * 0.08, { octaves: 2 }) * 2;
        const leftShore = 150 + Math.sin((y - 172) * 0.12) * 2 + bayNoise;
        const rightShore = 168 - Math.sin((y - 172) * 0.1) * 2 - bayNoise;
        if (x >= leftShore && x <= rightShore) continue; // open marine water connecting to southern ocean
      }

      // 5. Cycling Road Marine Sound: western marine sound connecting southward into the ocean
      if (y >= 128 && y <= 182 && x >= 84 && x <= 102) {
        const soundDist = Math.hypot((x - 93) / 7, (y - 152) / 24);
        const soundNoise = fbm2D(noise, x * 0.09, y * 0.09, { octaves: 2 }) * 0.2;
        if (soundDist + soundNoise < 1.0 || (y >= 174 && x <= 92)) continue;
      }

      // 6. South Sea Channel: Route 19 corridor leading south from Fuchsia to Seafoam Islands
      if (y >= 212 && x >= 96 && x <= 196) {
        continue;
      }

      // 7. Route 21 Open Ocean: south of Pallet Town (Pallet sits at y=166..178, x=67..81)
      if (y > 182 && x <= 86) {
        continue;
      }

      terrain[y]![x] = 'grass';
    }
  }

  // 1b. Route 23 Inland Valley Corridor: preserve solid grass terrain between Viridian and Indigo Plateau
  for (let y = 55; y <= 124; y++) {
    for (let x = 46; x <= 52; x++) {
      terrain[y]![x] = 'grass';
    }
  }

  // 2. Cerulean Cape Peninsula (Route 24/25 & Bill's Sea Cottage at 196, 26)
  for (let y = 16; y <= 40; y++) {
    for (let x = 160; x <= 212; x++) {
      const capeDisplacement = sampleCoastalDisplacement(noise, x, y, { amplitude: 3, scale: 0.08 });
      if (y >= 18 + capeDisplacement && y <= 38) {
        terrain[y]![x] = 'grass';
      }
    }
  }

  // 3. Cinnabar Island: Organic volcanic island in the southwest (around 54, 220)
  sculptOrganicIsland(
    terrain,
    54,
    220,
    { radiusX: 18, radiusY: 15, roughness: 0.35, angleRad: -0.1 },
    151
  );

  // Ensure Cinnabar town footprint and margin are solid dry land grass
  for (let y = 214; y <= 228; y++) {
    for (let x = 46; x <= 62; x++) {
      terrain[y]![x] = 'grass';
    }
  }

  // Volcanic caldera plateau in northern half of Cinnabar town (holding elevated buildings)
  // Clean flat rectangular plateau for northern buildings (x: 46..60, y: 214..221)
  for (let y = 214; y <= 221; y++) {
    for (let x = 46; x <= 60; x++) {
      heightmap[y]![x] = 1;
    }
  }
  // Clear southern ground level at elevation 0 for lower buildings, streets and harbour (y: 222..228)
  for (let y = 222; y <= 228; y++) {
    for (let x = 46; x <= 62; x++) {
      heightmap[y]![x] = 0;
    }
  }

  // 4. Seafoam Islands: Organic 3-islet archipelago in the south sea channel (around 110, 220)
  sculptArchipelagoChain(
    terrain,
    [
      { cx: 104, cy: 220, radius: 7 },
      { cx: 118, cy: 218, radius: 8 },
      { cx: 128, cy: 222, radius: 5 }
    ],
    202
  );

  // 5. Global Hydrography: Cerulean River System & Inland Lakes
  carveRiverSystem(
    terrain,
    {
      id: 'cerulean_river',
      name: 'Río Celeste',
      points: [
        { x: 184, y: 14 },
        { x: 178, y: 32 },
        { x: 182, y: 44 },
        { x: 206, y: 50 },
        { x: 220, y: 64 },
        { x: 236, y: 72 }
      ],
      width: 3,
      meanderRoughness: 0.25
    },
    777
  );

  // Inland ponds and lakes
  carveOrganicLake(terrain, 52, 126, 4, 0.25, 404); // Viridian Pond
  carveOrganicLake(terrain, 38, 78, 3, 0.25, 505); // Route 22/23 Scenic West Pond

  // 6. Natural Sand Beaches (Invariant: no grass cell touches ocean or lake directly)
  applyNaturalBeaches(terrain);

  // 7. Continuous Mountain Cordilleras: Northern & Western Frontier Spines
  // Defined by continuous ridge curves connecting key regional passes:
  const NORTHERN_SPINE: readonly { x: number; y: number }[] = [
    { x: 22, y: 26 },   // Indigo bastion
    { x: 48, y: 20 },   // North Victory Pass
    { x: 78, y: 18 },   // North Pewter Massif
    { x: 114, y: 24 },  // Mt. Moon North Ridge
    { x: 148, y: 26 },  // Cerulean Mountain Barrier
    { x: 180, y: 34 },  // Route 9 Mountain Pass
    { x: 206, y: 68 }   // Rock Tunnel Canyon Gorge
  ];

  const WESTERN_SPINE: readonly { x: number; y: number }[] = [
    { x: 22, y: 26 },   // Indigo bastion
    { x: 24, y: 55 },   // Victory Road high cliffs
    { x: 26, y: 85 },   // Johto border mountain wall
    { x: 30, y: 110 }   // Western frontier ridge
  ];

  // Flat reserves around settlements so cities/towns never get clipped by cliffs
  const FLAT_RESERVES = [
    { x1: 58, y1: 30, x2: 90, y2: 56 },  // Pewter City
    { x1: 150, y1: 40, x2: 182, y2: 66 }, // Cerulean City
    { x1: 190, y1: 20, x2: 214, y2: 40 }, // Bill's Cottage
    { x1: 218, y1: 66, x2: 238, y2: 86 }, // Power Plant
    { x1: 196, y1: 102, x2: 222, y2: 124 }, // Lavender Town
    { x1: 98, y1: 96, x2: 136, y2: 130 },  // Celadon City
    { x1: 146, y1: 96, x2: 184, y2: 130 }, // Saffron City
    { x1: 150, y1: 146, x2: 180, y2: 172 }, // Vermilion City
    { x1: 60, y1: 72, x2: 86, y2: 98 },   // Viridian Forest
    { x1: 60, y1: 114, x2: 90, y2: 140 },  // Viridian City
    { x1: 60, y1: 160, x2: 86, y2: 182 },  // Pallet Town
    { x1: 162, y1: 190, x2: 192, y2: 216 }, // Fuchsia City
    { x1: 42, y1: 210, x2: 66, y2: 232 }  // Cinnabar Town
  ];

  for (let y = 14; y < H - 14; y++) {
    for (let x = 14; x < W - 14; x++) {
      if (terrain[y]![x] !== 'grass') continue;

      // Invariant: Never elevate inside flat city reserves
      if (FLAT_RESERVES.some((r) => x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2)) {
        continue;
      }

      // Check distance to Northern Cordillera Spine
      let minDistNorth = Infinity;
      for (let i = 0; i < NORTHERN_SPINE.length - 1; i++) {
        const p1 = NORTHERN_SPINE[i]!;
        const p2 = NORTHERN_SPINE[i + 1]!;
        const d = distToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
        if (d < minDistNorth) minDistNorth = d;
      }

      // Check distance to Western Cordillera Spine
      let minDistWest = Infinity;
      for (let i = 0; i < WESTERN_SPINE.length - 1; i++) {
        const p1 = WESTERN_SPINE[i]!;
        const p2 = WESTERN_SPINE[i + 1]!;
        const d = distToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
        if (d < minDistWest) minDistWest = d;
      }

      // Mountain thickness modulated by FBM noise
      const mNoise = fbm2D(noise, x * 0.065, y * 0.065, { octaves: 2 }) * 3.2;

      // 1. Continuous Northern Ridge (width 7-10 tiles)
      if (minDistNorth + mNoise < 8.0) {
        heightmap[y]![x] = 1;
      }

      // 2. Continuous Western Ridge (width 8-10 tiles)
      if (minDistWest + mNoise < 8.5) {
        heightmap[y]![x] = 1;
      }

      // 3. Indigo Plateau Core Massif (elevation for Pokemon League)
      if (Math.hypot((x - 42) / 18, (y - 38) / 16) + mNoise * 0.15 < 1.0) {
        heightmap[y]![x] = 1;
      }

      // 4. Mt. Moon Heart Massif (widening into the great mountain cave)
      if (Math.hypot((x - 118) / 18, (y - 40) / 14) + mNoise * 0.15 < 1.0) {
        heightmap[y]![x] = 1;
      }

      // 5. Rock Tunnel Gorge Massif (coastal mountain pass)
      if (Math.hypot((x - 208) / 15, (y - 74) / 15) + mNoise * 0.15 < 1.0) {
        heightmap[y]![x] = 1;
      }
    }
  }

  // 8. Authentic South-Facing Cave Niches:
  // Invariant: Cave entrances require a south-facing cliff face (elevation 1 at y, elevation 0 at y+1).
  // 8a. Mt. Moon West Cave Niche (Route 3 terminus):
  for (let y = 42; y <= 44; y++) {
    for (let x = 97; x <= 103; x++) {
      if (terrain[y]?.[x] === 'grass') heightmap[y]![x] = 1;
    }
  }
  for (let y = 45; y <= 48; y++) {
    for (let x = 96; x <= 104; x++) {
      heightmap[y]![x] = 0;
    }
  }

  // 8b. Mt. Moon East Cave Niche (Route 4 origin):
  for (let y = 42; y <= 44; y++) {
    for (let x = 131; x <= 137; x++) {
      if (terrain[y]?.[x] === 'grass') heightmap[y]![x] = 1;
    }
  }
  for (let y = 45; y <= 48; y++) {
    for (let x = 130; x <= 138; x++) {
      heightmap[y]![x] = 0;
    }
  }

  // 8c. Rock Tunnel North Cave Niche (Route 9 terminus):
  for (let y = 52; y <= 55; y++) {
    for (let x = 191; x <= 197; x++) {
      terrain[y]![x] = 'grass';
      heightmap[y]![x] = 1;
    }
  }
  for (let y = 56; y <= 59; y++) {
    for (let x = 190; x <= 198; x++) {
      if (terrain[y]?.[x] === 'grass') heightmap[y]![x] = 0;
    }
  }

  // 8d. Diglett's Cave Rocky Outcrop (elevation 1 cliff wall backing the cave entrance):
  for (let y = 151; y <= 153; y++) {
    for (let x = 122; x <= 134; x++) {
      if (terrain[y]?.[x] === 'grass') heightmap[y]![x] = 1;
    }
  }
  for (let y = 154; y <= 158; y++) {
    for (let x = 122; x <= 134; x++) {
      heightmap[y]![x] = 0;
    }
  }

  // 8e. Victory Road Lower Entrance Niche (Route 23 terminus at mountain base):
  // Facing south: elevation 1 cliff wall at y = 52..54, ground level elevation 0 at y >= 55
  for (let y = 52; y <= 54; y++) {
    for (let x = 39; x <= 45; x++) {
      if (terrain[y]?.[x] === 'grass') heightmap[y]![x] = 1;
    }
  }
  for (let y = 55; y <= 59; y++) {
    for (let x = 38; x <= 46; x++) {
      if (terrain[y]?.[x] === 'grass') heightmap[y]![x] = 0;
    }
  }

  // 8f. Victory Road Upper Exit Niche (Plateau egress connecting to Indigo League Palace):
  // Facing south on plateau: elevation 2 rock ridge at x = 33..39, y = 37..40, plateau elevation 1 around it
  for (let y = 37; y <= 40; y++) {
    for (let x = 33; x <= 39; x++) {
      if (terrain[y]?.[x] === 'grass') heightmap[y]![x] = 2;
    }
  }
  for (let y = 41; y <= 46; y++) {
    for (let x = 33; x <= 46; x++) {
      if (terrain[y]?.[x] === 'grass') heightmap[y]![x] = 1;
    }
  }

  // 9. Power Plant River Channel Widening (ensures 4-cell minimum river width so bridge has open water on both sides):
  for (let y = 65; y <= 72; y++) {
    for (let x = 224; x <= 229; x++) {
      terrain[y]![x] = 'water';
    }
  }

  return { terrainMatrix: terrain as WaterTerrainMatrix, heightmap };
}

function sculptJohtoTerrain(
  W: number,
  H: number
): { readonly terrainMatrix: WaterTerrainMatrix; readonly heightmap: number[][] } {
  const terrain: WaterTerrainKind[][] = Array.from({ length: H }, () => Array(W).fill('water'));
  const heightmap: number[][] = Array.from({ length: H }, () => Array(W).fill(0));

  // 1. Continental Mainland: grass from x: 28..120, y: 16..114
  for (let y = 16; y <= 114; y++) {
    for (let x = 28; x <= 120; x++) {
      terrain[y]![x] = 'grass';
    }
  }

  // 2. West Sea: ocean already covers x: 0..27

  // 3. Cianwood Island in the west sea
  for (let y = 80; y <= 94; y++) {
    for (let x = 8; x <= 20; x++) {
      terrain[y]![x] = 'grass';
    }
  }

  // 4. Whirl Islands
  for (let y = 82; y <= 90; y++) {
    for (let x = 22; x <= 27; x++) {
      terrain[y]![x] = 'grass';
    }
  }

  // 5. Lake of Rage: inland water lake north of Mahogany
  for (let y = 18; y <= 30; y++) {
    for (let x = 78; x <= 92; x++) {
      terrain[y]![x] = 'water';
    }
  }

  // 6. Sand beaches
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (terrain[y]![x] === 'grass') {
        const touchesWater =
          terrain[y - 1]![x] === 'water' ||
          terrain[y + 1]![x] === 'water' ||
          terrain[y]![x - 1] === 'water' ||
          terrain[y]![x + 1] === 'water';
        if (touchesWater) {
          terrain[y]![x] = 'sand';
        }
      }
    }
  }

  // 7. Eastern & Northern Mountains:
  // Mt. Silver
  for (let y = 56; y <= 80; y++) {
    for (let x = 102; x <= 126; x++) {
      heightmap[y]![x] = 1;
      terrain[y]![x] = 'grass';
    }
  }
  // Mt. Mortar
  for (let y = 38; y <= 48; y++) {
    for (let x = 66; x <= 78; x++) {
      heightmap[y]![x] = 1;
      terrain[y]![x] = 'grass';
    }
  }

  return { terrainMatrix: terrain as WaterTerrainMatrix, heightmap };
}

// ---------------------------------------------------------------------------
// 4. Master Canonical Region Pipeline Builder
// ---------------------------------------------------------------------------

export function buildCanonicalRegionMap(
  presetId: 'kanto' | 'johto'
): RegionalGenerationPipelineResult {
  const W = presetId === 'kanto' ? 256 : 128;
  const H = presetId === 'kanto' ? 256 : 128;
  const seed = presetId === 'kanto' ? 151 : 251;
  const blueprints = presetId === 'kanto' ? KANTO_BLUEPRINTS : JOHTO_BLUEPRINTS;
  const routeBlueprints = presetId === 'kanto' ? KANTO_ROUTES : JOHTO_ROUTES;

  // 1. Sculpt authentic terrain & heightmap
  const { terrainMatrix, heightmap } =
    presetId === 'kanto' ? sculptKantoTerrain(W, H) : sculptJohtoTerrain(W, H);

  // 2. Autotile water and mountains
  const resolvedWater = resolveWaterCoastGrid(terrainMatrix);
  const macroBiomes = synthesizeMacroBiomes({ width: W, height: H, seed, terrainMatrix });
  const geologicalClusters = clusterMountainMassifs({
    elevationMatrix: heightmap,
    macroBiomeGrid: macroBiomes.biomeGrid,
    seed,
    defaultPalette: 'brown'
  });
  const placedStairs: MountainStairLocation[] =
    presetId === 'kanto'
      ? [
          // South-facing stairs connecting Cinnabar Island upper volcanic plateau to lower town street
          { x: 53, y: 221 }
        ]
      : [];
  const mountainResult = resolveMountainMapGrid(heightmap, {
    palette: 'brown',
    paletteMatrix: geologicalClusters.paletteMatrix,
    stairs: placedStairs
  });
  const resolvedMacroBiomes = resolveMacroBiomeAutotile(
    macroBiomes.biomeGrid,
    terrainMatrix,
    heightmap
  );

  // 3. Assemble cell details
  const cells: ContinentCellDetails[][] = Array.from({ length: H }, () => Array(W));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const terrain = terrainMatrix[y]![x]!;
      const elev = heightmap[y]![x]!;
      const waterCell = resolvedWater.cellDetails[y]![x];
      const mtnCell = mountainResult.cellDetails[y]![x];
      const layerStack: string[] = []; // no-domain: Estructura o identificador procedural de aventura

      let isWalkable = true;
      if (terrain === 'water' && waterCell?.role === 'center') {
        isWalkable = false;
      }

      if (elev > 0) {
        layerStack.push('poke_cliff_brown_plateau_rock.png');
      } else if (waterCell && waterCell.terrain !== 'grass') {
        layerStack.push(...waterCell.layerStack);
      } else if (terrain === 'water') {
        layerStack.push('poke_water_ocean_center.png');
      } else {
        const mCell = resolvedMacroBiomes.cellDetails[y]?.[x];
        layerStack.push(...(mCell ? mCell.layerStack : ['poke_grass_plain.png']));
      }

      if (mtnCell && elev > 0) {
        layerStack.push(mtnCell.primaryTile);
        if (mtnCell.overlayTiles) layerStack.push(...mtnCell.overlayTiles);
        if (
          mtnCell.role === 'peak_isolated' ||
          mtnCell.role.startsWith('edge_') ||
          mtnCell.role.startsWith('corner_outer_')
        ) {
          isWalkable = false;
        }
      }

      cells[y]![x] = {
        x,
        y,
        terrain,
        elevation: elev,
        macroBiome: macroBiomes.biomeGrid[y]?.[x],
        mountainPalette: 'brown' as MountainPalette,
        waterRole: waterCell?.role,
        mountainRole: mtnCell?.role,
        isStair: false,
        isWalkable,
        layerStack
      };
    }
  }

  const continent: ContinentMapResult = {
    width: W,
    height: H,
    seed,
    terrainMatrix,
    heightmap,
    resolvedWater,
    resolvedMountain: mountainResult,
    placedStairs,
    cells,
    mountainPalette: 'brown',
    macroBiomes,
    resolvedMacroBiomes,
    geologicalClusters
  };

  // 4. Construct POI nodes with official GBA urban layouts
  const pois: POINode[] = blueprints.map((bp) => {
    const node: POINode = {
      id: bp.id,
      name: bp.name,
      type: bp.type,
      urbanScale: bp.urbanScale,
      footprint: { width: bp.width, height: bp.height },
      terrainPreference: bp.type === 'cave_entrance' ? 'mountain_wall' : bp.type === 'port_dock' ? 'coast_water' : 'flat_grass',
      gridX: bp.gridX,
      gridY: bp.gridY,
      elevation: bp.elevation ?? 0,
      hasGym: bp.hasGym,
      facing: bp.facing,
      buildingFile: bp.buildingFile,
      roadMaterial: bp.roadMaterial,
      gateways: [
        { x: bp.gridX + Math.floor(bp.width / 2), y: bp.gridY - 1, direction: 'north' },
        { x: bp.gridX + Math.floor(bp.width / 2), y: bp.gridY + bp.height, direction: 'south' },
        { x: bp.gridX - 1, y: bp.gridY + Math.floor(bp.height / 2), direction: 'west' },
        { x: bp.gridX + bp.width, y: bp.gridY + Math.floor(bp.height / 2), direction: 'east' }
      ]
    };
    const layout = generateSettlementLayout(node);
    if (bp.id === 'indigo' && layout) {
      // Extend ceremonial avenue south to y=42 and west to Victory Road upper exit doorstep at (36, 42)
      const extendedStreets = [...layout.internalStreets];
      for (let y = 38; y <= 42; y++) {
        extendedStreets.push({ x: 41, y }, { x: 42, y });
      }
      for (let x = 36; x <= 40; x++) {
        extendedStreets.push({ x, y: 41 }, { x, y: 42 });
      }
      return { ...node, urbanLayout: { ...layout, internalStreets: extendedStreets } };
    }
    return { ...node, urbanLayout: layout };
  });

  // 5. Construct Authentic Routes with A* Pathfinding and Bridges
  const pathGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const nodeMap = new Map<string, POINode>(pois.map((p) => [p.id, p]));

  const excludedNodeZones = pois.map((p) => ({
    x1: p.gridX,
    y1: p.gridY,
    x2: p.gridX + p.footprint.width - 1,
    y2: p.gridY + p.footprint.height - 1
  }));

  const isOceanGrid = computeOceanGrid(continent);

  const edges: RouteEdge[] = routeBlueprints.map((rb) => {
    const fromNode = nodeMap.get(rb.from);
    const toNode = nodeMap.get(rb.to);
    if (!fromNode || !toNode) {
      return {
        id: rb.id,
        fromNodeId: rb.from,
        toNodeId: rb.to,
        routeType: rb.routeType,
        distance: 10,
        waypoints: [],
        isWaterCrossing: rb.isWaterCrossing
      };
    }

    const startX = fromNode.gridX + Math.floor(fromNode.footprint.width / 2);
    const startY = fromNode.gridY + Math.floor(fromNode.footprint.height / 2);
    const endX = toNode.gridX + Math.floor(toNode.footprint.width / 2);
    const endY = toNode.gridY + Math.floor(toNode.footprint.height / 2);

    let waypoints: RouteWaypoint[] = [];

    if (rb.isWaterCrossing) {
      if (rb.id === 'kanto_r19') {
        waypoints = [
          { x: startX, y: startY },
          { x: startX, y: 220 },
          { x: endX + 8, y: 220 },
          { x: endX, y: endY }
        ];
      } else if (rb.id === 'kanto_r20') {
        waypoints = [
          { x: startX, y: startY },
          { x: Math.round((startX + endX) / 2), y: 220 },
          { x: endX, y: endY }
        ];
      } else if (rb.id === 'kanto_r21') {
        waypoints = [
          { x: startX, y: startY },
          { x: startX, y: 170 },
          { x: endX, y: 170 },
          { x: endX, y: endY }
        ];
      } else {
        waypoints = [
          { x: startX, y: startY },
          { x: endX, y: endY }
        ];
      }
    } else if (rb.id === 'kanto_r16_18') {
      // Cycling Road: authentic elevated highway bridge crossing the marine sound from Celadon to Fuchsia
      waypoints = [
        { x: startX, y: startY },
        { x: 94, y: 124 },
        { x: 94, y: 178 },
        { x: 124, y: 188 },
        { x: 154, y: 196 },
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_r11_15') {
      // Route 11 & Route 15: Wraps east around Vermilion Bay to preserve the pristine harbor
      waypoints = [
        { x: startX, y: startY },
        { x: 196, y: 160 },
        { x: 202, y: 184 },
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_r3') {
      // Route 3: Valley road from Pewter eastward along mountain base to Mt. Moon entrance (approaching from South)
      waypoints = [
        { x: startX, y: startY },
        { x: 92, y: 47 },
        { x: 100, y: 47 },
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_r4') {
      // Route 4: Valley road exiting Mt. Moon southward then eastward along mountain base to Cerulean
      waypoints = [
        { x: startX, y: startY },
        { x: 134, y: 47 },
        { x: 142, y: 48 },
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_r9_10') {
      // Route 9: Valley road running east from Cerulean to Rock Tunnel North entrance (approaching from South)
      waypoints = [
        { x: startX, y: startY },
        { x: 184, y: 58 },
        { x: 194, y: 58 },
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_r10_powerplant') {
      // Route 10 Power Plant: Scenic river path branching east from Rock Tunnel North to Power Plant
      waypoints = [
        { x: startX, y: startY },
        { x: 212, y: 64 },
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_r10_s') {
      // Route 10 South: Valley road south along coastal cliffs to Lavender Town
      waypoints = [
        { x: startX, y: startY },
        { x: 204, y: 92 },
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_diglett') {
      // Route to Diglett's Cave: Direct approach from Vermilion straight to cave doorstep
      waypoints = [
        { x: startX, y: startY },
        { x: 134, y: 156 },
        { x: 126, y: 156 },
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_r24_25') {
      // Route 24 & 25: Nugget bridge north across Cerulean River then east along Cape to Bill's Cottage
      waypoints = [
        { x: startX, y: startY },
        { x: 166, y: 28 },
        { x: 192, y: 28 },
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_r22_23') {
      // Route 22 & 23: Road west along valley, then north corridor inland along x: 48 (safe from coastline) to Victory Road lower entrance
      waypoints = [
        { x: startX, y: startY },
        { x: 48, y: 124 },
        { x: 48, y: 58 },
        { x: 42, y: 58 },
        { x: 42, y: 55 }
      ];
    } else if (rb.id === 'kanto_victory_road') {
      // Victory Road subterranean link from lower entrance to upper exit
      waypoints = [
        { x: startX, y: startY },
        { x: endX, y: endY }
      ];
    } else if (rb.id === 'kanto_indigo_avenue') {
      // Paved ceremonial avenue connecting Victory Road upper exit to Indigo League Palace
      waypoints = [
        { x: 36, y: 42 },
        { x: 42, y: 42 },
        { x: 42, y: 37 }
      ];
    } else {
      const astar = findPathAStar(
        continent,
        startX,
        startY,
        endX,
        endY,
        pathGrid,
        true,
        excludedNodeZones,
        isOceanGrid
      );

      if (astar && astar.path.length > 0) {
        waypoints = astar.path;
      } else {
        const midX = Math.round((startX + endX) / 2);
        waypoints = [
          { x: startX, y: startY },
          { x: midX, y: startY },
          { x: midX, y: endY },
          { x: endX, y: endY }
        ];
      }
    }

    // Stamp 2-cell wide path on pathGrid with continuous segment interpolation (skip open water surfing routes and subterranean links)
    if (!rb.isWaterCrossing && rb.id !== 'kanto_victory_road') {
      for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i]!;
        for (let py = wp.y; py <= wp.y + 1; py++) {
          for (let px = wp.x; px <= wp.x + 1; px++) {
            if (py >= 0 && py < H && px >= 0 && px < W) {
              pathGrid[py]![px] = true;
            }
          }
        }
        if (i < waypoints.length - 1) {
          const nextWp = waypoints[i + 1]!;
          let curX = wp.x;
          let curY = wp.y;
          const stepX = nextWp.x >= curX ? 1 : -1;
          while (curX !== nextWp.x) {
            for (let py = curY; py <= curY + 1; py++) {
              for (let px = curX; px <= curX + 1; px++) {
                if (py >= 0 && py < H && px >= 0 && px < W) pathGrid[py]![px] = true;
              }
            }
            curX += stepX;
          }
          const stepY = nextWp.y >= curY ? 1 : -1;
          while (curY !== nextWp.y) {
            for (let py = curY; py <= curY + 1; py++) {
              for (let px = curX; px <= curX + 1; px++) {
                if (py >= 0 && py < H && px >= 0 && px < W) pathGrid[py]![px] = true;
              }
            }
            curY += stepY;
          }
        }
      }
    }

    const dist = waypoints.length > 1 ? waypoints.length : Math.hypot(endX - startX, endY - startY);

    return {
      id: rb.id,
      fromNodeId: rb.from,
      toNodeId: rb.to,
      routeType: rb.routeType,
      distance: Math.round(dist),
      waypoints,
      isWaterCrossing: rb.isWaterCrossing
    };
  });

  stampBridgesOnWaterIntersections(terrainMatrix, pathGrid, bridgeGrid);

  const portDockBridgeKeys = new Set<string>();

  // Stamp canonical 3-cell wide stone pier across water for port dock POIs
  for (const node of pois) {
    if (node.type === 'port_dock') {
      const facing = node.facing ?? 'south';
      const pierLength = Math.max(8, Math.max(node.footprint.width, node.footprint.height) + 2);
      if (facing === 'south') {
        const startY = node.gridY + node.footprint.height;
        const px = node.gridX + 2;
        for (let dy = 0; dy < pierLength; dy++) {
          const py = startY + dy;
          if (py >= 0 && py < H && px >= 0 && px + 2 < W) {
            if (
              terrainMatrix[py]?.[px] === 'water' &&
              terrainMatrix[py]?.[px + 1] === 'water' &&
              terrainMatrix[py]?.[px + 2] === 'water'
            ) {
              bridgeGrid[py]![px] = true;
              bridgeGrid[py]![px + 1] = true;
              bridgeGrid[py]![px + 2] = true;
              portDockBridgeKeys.add(`${px}_${py}`);
              portDockBridgeKeys.add(`${px + 1}_${py}`);
              portDockBridgeKeys.add(`${px + 2}_${py}`);
            } else {
              break;
            }
          }
        }
      }
    }
  }

  const bridgeShoreLandings = new Set<string>();

  // Detect 1-tile bridgehead landings on dry land shores adjacent to water bridges
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (pathGrid[y]?.[x] && terrainMatrix[y]?.[x] !== 'water') {
        const hasWaterBridgeNeighbor = [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 }
        ].some((n) => {
          const ny = y + n.dy;
          const nx = x + n.dx;
          return (
            ny >= 0 &&
            ny < H &&
            nx >= 0 &&
            nx < W &&
            terrainMatrix[ny]?.[nx] === 'water' &&
            bridgeGrid[ny]?.[nx]
          );
        });

        if (hasWaterBridgeNeighbor) {
          bridgeGrid[y]![x] = true;
          bridgeShoreLandings.add(`${x}_${y}`);
        }
      }
    }
  }

  const routeNetwork: ResolvedRouteNetworkResult = {
    nodes: pois,
    edges,
    pathGrid,
    bridgeGrid,
    bridgeShoreLandings,
    portDockBridgeKeys
  };

  const transitableGrid = computeTransitableGrid(continent, pathGrid, bridgeGrid, pois);
  (continent as { transitableGrid?: readonly (readonly boolean[])[] }).transitableGrid = transitableGrid;

  const wilderness = generateWildernessLayer(continent, pois, pathGrid, {
    seed,
    transitableGrid
  });

  const rawBuffer = buildZeroCopyPreviewBuffer(continent, pathGrid);

  return {
    continent,
    pois,
    routeNetwork,
    wilderness,
    rawBuffer
  };
}
