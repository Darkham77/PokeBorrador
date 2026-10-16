/**
 * src/logic/map/continent/continentalEngine.ts
 *
 * PARAMETRIC CONTINENTAL GENERATION ENGINE
 * Generates continuous full-scale Pokémon regions and continents:
 * 1. Multi-octave Simplex Noise with radial falloff for natural coastlines.
 * 2. Biome distribution (ocean, beach, grass, forest, mountain, snow).
 * 3. Poisson-dispersed urban settlement placement on habitable land.
 * 4. 100% connected road network graph via Minimum Spanning Tree (MST).
 * 5. Road carving across terrain.
 */

export {
  generateContinent,
  type GeneratedContinentResult
} from './parametricContinentGenerator.ts';
import { generatePokemonTopology } from '../pokemonGraphTopology.ts';
import { embedPokemonTopology } from '../orthogonalGraphEmbedding.ts';
import { type ContinentGeneratorOptions, type ContinentMapResult } from '../continentGenerator.ts';
import { sculptContinentFromGraph } from '../continentSculptingEngine.ts';
import { enrichCorridorProperties } from '../corridorPropertyEngine.ts';
import { applyProgressionBarriers, type ProgressionResult } from '../progressionBarrierEngine.ts';
import { exportPokemonTopologyToSvg } from './svgRouteAdapter.ts';
import type {
  PokemonTopologyGraph,
  EmbeddedTopologyGraph,
  EnrichedCorridorProperties
} from '../../../types/map/pokemonGraphTypes.ts';
import type { POINode } from '../../../types/map/poiTypes.ts';
import type { SettlementTerrainContext } from '../cityLayoutEngine.ts';
import { computeTransitableGrid } from '../transitableGridEngine.ts';
import {
  generateWildernessLayer,
  type WildernessLayerResult
} from '../wildernessVegetationEngine.ts';
import { generateRouteLedges, type LedgeRun } from '../routeLedgeEngine.ts';
import {
  generateProgressionObstacles,
  type ProgressionObstacle
} from '../progressionObstacleEngine.ts';
import {
  generateMicroVignettes,
  sweepStrayPathTiles,
  type MicroVignette
} from '../microVignetteEngine.ts';
import {
  DEFAULT_PROCEDURAL_SEED,
  STANDARD_GBA_TILE_SIZE
} from '../../../config/proceduralMapConfig.ts';
import {
  DEFAULT_CONTINENTAL_WORLD_WIDTH,
  DEFAULT_CONTINENTAL_WORLD_HEIGHT
} from '../../../config/continentalEngineConfig.ts';
import { compileContinentalSettlementPois } from './continentalSettlementCompiler.ts';
import { carveContinentalCorridorsAndPaths } from './continentalCorridorCarver.ts';

// ---------------------------------------------------------------------------
// Master Graph-First Pipeline Integration (T6.1)
// ---------------------------------------------------------------------------

export interface PokemonContinentalWorldResult {
  readonly continent: ContinentMapResult;
  readonly graph: PokemonTopologyGraph;
  readonly embedded: EmbeddedTopologyGraph;
  readonly corridorProperties: readonly EnrichedCorridorProperties[];
  readonly progression: ProgressionResult;
  readonly svgMarkup: string;
  readonly pois: readonly POINode[];
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly bridgeGrid: readonly (readonly boolean[])[];
  readonly wilderness: WildernessLayerResult;
  readonly ledges?: readonly LedgeRun[];
  readonly progressionObstacles?: readonly ProgressionObstacle[];
  readonly microVignettes?: readonly MicroVignette[];
}

export interface PokemonContinentalOptions extends ContinentGeneratorOptions {
  readonly tileScale?: number; // for SVG rendering (default: 16)
}

interface WildernessAndFramingLayerResult {
  readonly wilderness: WildernessLayerResult;
  readonly ledges: readonly LedgeRun[];
  readonly progressionObstacles: readonly ProgressionObstacle[];
  readonly microVignettes: readonly MicroVignette[];
}

interface WildernessLayerOptions {
  continent: ContinentMapResult;
  pois: readonly POINode[];
  pathGrid: boolean[][];
  bridgeGrid: boolean[][];
  seed: number;
}

function compileWildernessAndFramingLayer(
  options: WildernessLayerOptions
): WildernessAndFramingLayerResult {
  const { continent, pois, pathGrid, bridgeGrid, seed } = options;
  // Phase 9a: Procedural 1-Way Ledges & HM Progression Obstacles (Phase 4)
  const ledges = generateRouteLedges({ continent, pathGrid, pois, seed });
  const progressionObstacles = generateProgressionObstacles({ continent, pathGrid, pois, seed });

  // Phase 9b: Environmental Micro-Vignettes & Stray Tile Sweep (Phase 5)
  sweepStrayPathTiles(pathGrid);
  const microVignettes = generateMicroVignettes({ continent, pathGrid, pois, seed });

  // Phase 9c: Wilderness Vegetation & Framing
  // Compile reserved entity cells so wilderness trees and tall grass never bury them
  const reservedEntityCells = new Set<string>();

  for (const ledge of ledges) {
    for (const tile of ledge.tiles) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          reservedEntityCells.add(`${tile.x + dx},${tile.y + dy}`);
        }
      }
    }
  }

  for (const obs of progressionObstacles) {
    for (let dy = -1; dy <= obs.height; dy++) {
      for (let dx = -1; dx <= obs.width; dx++) {
        reservedEntityCells.add(`${obs.x + dx},${obs.y + dy}`);
      }
    }
    if (obs.flankingProps) {
      for (const fp of obs.flankingProps) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            reservedEntityCells.add(`${fp.x + dx},${fp.y + dy}`);
          }
        }
      }
    }
  }

  for (const vig of microVignettes) {
    for (let dy = -1; dy <= vig.bounds.h; dy++) {
      for (let dx = -1; dx <= vig.bounds.w; dx++) {
        reservedEntityCells.add(`${vig.bounds.x + dx},${vig.bounds.y + dy}`);
      }
    }
  }

  const transitableGrid = computeTransitableGrid(continent, pathGrid, bridgeGrid, pois);
  (continent as { transitableGrid?: readonly (readonly boolean[])[] }).transitableGrid =
    transitableGrid;
  const wilderness = generateWildernessLayer(continent, pois, pathGrid, {
    seed,
    transitableGrid,
    reservedEntityCells
  });

  return {
    wilderness,
    ledges,
    progressionObstacles,
    microVignettes
  };
}

/**
 * Master orchestrator for the 5-Phase Pokémon Graph-First Pipeline:
 *
 * 1. Phase 1: Abstract Graph Generation (7 Pokémon Rules: cycles, hubs, dead-ends, 8 gyms, port).
 * 2. Phase 2: Orthogonal Spatial Embedding (Band grid + bounded jitter, 100% orthogonal corridors).
 * 3. Phase 3: Continental Sculpting (Rule 7: land envelope wraps graph, surf water channels).
 * 4. Phase 4: Emergent Corridor Properties (Width scaling, terrain influence, variety, gatehouses).
 * 5. Phase 5: Progression Barriers & Anti-Softlock Simulation (Mathematical solvability guarantee).
 * 6. Phase 6: Semantic SVG Vector Export (Complete overlay with nodes, corridors, barriers, wormholes).
 * 7. Phase 7: Rich Procedural POI & Urban Settlement Generation (10 GBA settlement archetypes).
 * 8. Phase 8: Orthogonal Routes & Bridges Carving.
 * 9. Phase 9: Wilderness Vegetation & Framing.
 */
export function generatePokemonContinentalWorld(
  options?: PokemonContinentalOptions
): PokemonContinentalWorldResult {
  const seed = options?.seed ?? DEFAULT_PROCEDURAL_SEED;
  const width = options?.width ?? DEFAULT_CONTINENTAL_WORLD_WIDTH;
  const height = options?.height ?? DEFAULT_CONTINENTAL_WORLD_HEIGHT;

  // Phase 1: Abstract Graph
  const graph = generatePokemonTopology({ seed });

  // Phase 2: Orthogonal Spatial Embedding
  const embedded = embedPokemonTopology(graph, { seed, width, height });

  // Phase 3: Continental Sculpting
  const continent = sculptContinentFromGraph(embedded, { ...options, seed, width, height });

  // Phase 4: Emergent Corridor Properties
  const corridorProperties = enrichCorridorProperties(embedded, continent);

  // Phase 5: Progression Barriers & Anti-Softlock Validation
  const progression = applyProgressionBarriers(graph);

  // Phase 6: Semantic SVG Export
  const svgMarkup = exportPokemonTopologyToSvg({
    embedded,
    properties: corridorProperties,
    progression,
    tileScale: options?.tileScale ?? STANDARD_GBA_TILE_SIZE
  });

  // Phase 7: Rich Procedural POI & Urban Settlement Generation
  const settlementContext: SettlementTerrainContext = {
    heightmap: continent.heightmap,
    terrainMatrix: continent.terrainMatrix,
    occupiedFootCells: continent.resolvedMountain.occupiedFootCells,
    mountainCellRoles: continent.resolvedMountain.cellDetails.map((row) => row.map((c) => c?.role)),
    width,
    height
  };

  const settlementPois = compileContinentalSettlementPois(
    embedded,
    continent,
    settlementContext,
    seed,
    width,
    height
  );

  // Phase 8: Terrain-Aware Routes & Bridges Carving
  const pathGrid = carveContinentalCorridorsAndPaths(
    continent,
    settlementPois,
    seed,
    width,
    height
  );

  // Phase 9: Wilderness Vegetation & Framing
  const framing = compileWildernessAndFramingLayer({
    continent,
    pois: settlementPois.pois,
    pathGrid,
    bridgeGrid: settlementPois.bridgeGrid,
    seed
  });

  return {
    continent,
    graph,
    embedded: {
      ...embedded,
      corridors: settlementPois.activeCorridors
    },
    corridorProperties,
    progression,
    svgMarkup,
    pois: settlementPois.pois,
    pathGrid,
    bridgeGrid: settlementPois.bridgeGrid,
    wilderness: framing.wilderness,
    ledges: framing.ledges,
    progressionObstacles: framing.progressionObstacles,
    microVignettes: framing.microVignettes
  };
}
