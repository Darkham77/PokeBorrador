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
import {
  DEFAULT_CONTINENTAL_WORLD_WIDTH,
  DEFAULT_CONTINENTAL_WORLD_HEIGHT
} from '../../../config/continentalEngineConfig.ts';
import {
  DEFAULT_PROCEDURAL_SEED,
  STANDARD_GBA_TILE_SIZE
} from '../../../config/proceduralMapConfig.ts';
import type { POINode } from '../../../types/map/poiTypes.ts';
import type {
  PokemonTopologyGraph,
  EmbeddedTopologyGraph,
  EnrichedCorridorProperties,
  GraphEdgeKind
} from '../../../types/map/pokemonGraphTypes.ts';
import { healAllContinentDefects } from '../autotileHealingEngine.ts';
import type { SettlementTerrainContext } from '../cityLayoutEngine.ts';
import { type ContinentGeneratorOptions, type ContinentMapResult } from '../continentGenerator.ts';
import { sculptContinentFromGraph } from '../continentSculptingEngine.ts';
import { enrichCorridorProperties } from '../corridorPropertyEngine.ts';
import {
  generateMicroVignettes,
  sweepStrayPathTiles,
  type MicroVignette
} from '../microVignetteEngine.ts';
import { embedPokemonTopology } from '../orthogonalGraphEmbedding.ts';
import { generatePokemonTopology } from '../pokemonGraphTopology.ts';
import { applyProgressionBarriers, type ProgressionResult } from '../progressionBarrierEngine.ts';
import {
  generateProgressionObstacles,
  type ProgressionObstacle
} from '../progressionObstacleEngine.ts';
import { generateRouteLedges, type LedgeRun } from '../routeLedgeEngine.ts';
import type { MaritimeRockObstacle } from '../routeNetworkEngine.ts';
import { computeTransitableGrid } from '../transitableGridEngine.ts';
import {
  anchorUrbanPropsToStreetsAndYards,
  filterIsolatedUrbanFences,
  sanitizeContinentalUrbanFences
} from '../urbanPavingEngine.ts';
import { IMPASSABLE_WILDERNESS_PROP_TYPES } from '../wildernessBoundarySealing.ts';
import {
  generateWildernessLayer,
  type WildernessLayerResult
} from '../wildernessVegetationEngine.ts';
import { carveContinentalCorridorsAndPaths } from './continentalCorridorCarver.ts';
import { compileContinentalSettlementPois } from './continentalSettlementCompiler.ts';
import { stampCorridorSignatureTerrainFeatures } from './corridorSignatureFeatures.ts';
import { resolveRegionalScaleProfile } from './regionalScaleProfile.ts';
import { exportPokemonTopologyToSvg } from './svgRouteAdapter.ts';

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
  readonly maritimeRockObstacles?: readonly MaritimeRockObstacle[];
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

export interface GridCoordPoint {
  readonly x: number;
  readonly y: number;
}

interface CorridorPathRef {
  readonly kind: GraphEdgeKind;
  readonly pathCells?: readonly GridCoordPoint[];
}

export interface WildernessLayerOptions {
  readonly continent: ContinentMapResult;
  readonly pois: readonly POINode[];
  readonly pathGrid: boolean[][];
  readonly bridgeGrid: boolean[][];
  readonly sandApproachCells?: readonly GridCoordPoint[];
  readonly seed: number;
  readonly corridorRadius?: number;
}

function reserveFlankingPropsCells(
  flankingProps: readonly GridCoordPoint[],
  transitableGrid: readonly (readonly boolean[])[],
  reservedCells: Set<string>
): void {
  for (const fp of flankingProps) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = fp.x + dx;
        const ny = fp.y + dy;
        if (transitableGrid[ny]?.[nx]) {
          reservedCells.add(`${nx},${ny}`);
        }
      }
    }
  }
}

function reserveAreaWithMargin(
  x: number,
  y: number,
  w: number,
  h: number,
  transitableGrid: readonly (readonly boolean[])[],
  reservedCells: Set<string>
): void {
  for (let dy = -1; dy <= h; dy++) {
    for (let dx = -1; dx <= w; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (transitableGrid[ny]?.[nx]) {
        reservedCells.add(`${nx},${ny}`);
      }
    }
  }
}

function markSandApproachesOnTransitableGrid(
  continent: ContinentMapResult,
  transitableGrid: boolean[][],
  sandApproachCells: readonly GridCoordPoint[],
  approachRadius: number
): void {
  const width = continent.width;
  const height = continent.height;
  for (const pt of sandApproachCells) {
    for (let dy = -approachRadius; dy <= approachRadius; dy++) {
      const cy = pt.y + dy;
      if (cy < 1 || cy >= height - 1) continue;
      for (let dx = -approachRadius; dx <= approachRadius; dx++) {
        const cx = pt.x + dx;
        if (cx < 1 || cx >= width - 1) continue;
        const terrain = continent.terrainMatrix[cy]?.[cx];
        if (terrain === 'water' || terrain === 'water_deep') continue;
        const role = continent.resolvedMountain.cellDetails[cy]?.[cx]?.role;
        const isCliff =
          Boolean(continent.resolvedMountain.occupiedFootCells[cy]?.[cx]) ||
          Boolean(role && role !== 'floor_center');
        const row = transitableGrid[cy];
        if (!isCliff && row) {
          row[cx] = true;
        }
      }
    }
  }
}

function clearBlockingSettlementPropsOnPaths(
  pois: readonly POINode[],
  pathGrid: readonly (readonly boolean[])[],
  activeCorridors: readonly CorridorPathRef[]
): POINode[] {
  const corridorCellKeys = new Set<string>();
  for (const corridor of activeCorridors) {
    if (corridor.kind === 'wormhole_tunnel') continue;
    for (const pt of corridor.pathCells ?? []) {
      corridorCellKeys.add(`${pt.x}_${pt.y}`);
    }
  }

  return pois.map((poi) => {
    const layout = poi.urbanLayout;
    if (!layout || layout.props.length === 0) return poi;
    const filtered = layout.props.filter((prop) => {
      if (!pathGrid[prop.y]?.[prop.x] && !corridorCellKeys.has(`${prop.x}_${prop.y}`)) {
        return true;
      }
      const isBlocking =
        IMPASSABLE_WILDERNESS_PROP_TYPES.has(prop.type) || prop.prefabFile.includes('fence');
      return !isBlocking;
    });
    if (filtered.length === layout.props.length) return poi;
    const finalProps = poi.type === 'route_gate' ? filtered : filterIsolatedUrbanFences(filtered);
    return {
      ...poi,
      urbanLayout: {
        ...layout,
        props: finalProps
      }
    };
  });
}

export function compileWildernessAndFramingLayer(
  options: WildernessLayerOptions
): WildernessAndFramingLayerResult {
  const { continent, pois, pathGrid, bridgeGrid, seed } = options;
  const corridorRadius = options.corridorRadius ?? 2;
  const sandApproachCells = options.sandApproachCells ?? [];
  sweepStrayPathTiles(pathGrid);

  const transitableGrid = computeTransitableGrid(
    continent,
    pathGrid,
    bridgeGrid,
    pois,
    corridorRadius
  );
  markSandApproachesOnTransitableGrid(continent, transitableGrid, sandApproachCells, 1);
  (continent as { transitableGrid?: readonly (readonly boolean[])[] }).transitableGrid =
    transitableGrid;

  // Phase 9a: Procedural 1-Way Ledges, HM Progression Obstacles & Vignettes within transitable corridors
  const ledges = generateRouteLedges({ continent, pathGrid, pois, seed, transitableGrid });
  const progressionObstacles = generateProgressionObstacles({ continent, pathGrid, pois, seed });
  const microVignettes = generateMicroVignettes({ continent, pathGrid, pois, seed });

  // Phase 9c: Wilderness Vegetation & Framing
  // Compile reserved entity cells so wilderness trees, tall grass, and boundary seals never bury them
  const reservedEntityCells = new Set<string>();

  for (const ledge of ledges) {
    for (const tile of ledge.tiles) {
      for (let dy = -1; dy <= 1; dy++) {
        const ny = tile.y + dy;
        if (transitableGrid[ny]?.[tile.x]) {
          reservedEntityCells.add(`${tile.x},${ny}`);
        }
      }
    }
  }

  for (const obs of progressionObstacles) {
    reserveAreaWithMargin(
      obs.x,
      obs.y,
      obs.width,
      obs.height,
      transitableGrid,
      reservedEntityCells
    );
    if (obs.flankingProps) {
      reserveFlankingPropsCells(obs.flankingProps, transitableGrid, reservedEntityCells);
    }
  }

  for (const vig of microVignettes) {
    reserveAreaWithMargin(
      vig.bounds.x,
      vig.bounds.y,
      vig.bounds.w,
      vig.bounds.h,
      transitableGrid,
      reservedEntityCells
    );
  }

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
  const scaleProfile = resolveRegionalScaleProfile(width, height);

  // Phase 1: Abstract Graph
  const graph = generatePokemonTopology({
    seed,
    macroArchetype: options?.macroArchetype,
    gymCount: scaleProfile.gymCount,
    minCycles: scaleProfile.minCycles,
    maxCycles: scaleProfile.maxCycles,
    minSecondaryNodes: scaleProfile.minSecondaryNodes,
    maxSecondaryNodes: scaleProfile.maxSecondaryNodes
  });

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

  // Phase 7b: Pre-heal raw terrain slivers, coastal pinches, and thin ridges before A* routing
  const emptyPrePathGrid: boolean[][] = Array.from({ length: height }, () =>
    Array<boolean>(width).fill(false)
  );
  const preHealed = healAllContinentDefects(continent, emptyPrePathGrid, {
    pois: settlementPois.pois
  });
  const preHealedContinent = preHealed.continent;

  // Phase 8: Terrain-Aware Routes & Bridges Carving
  const carvedCorridors = carveContinentalCorridorsAndPaths(
    preHealedContinent,
    settlementPois,
    seed,
    width,
    height
  );
  const { maritimeRockObstacles } = carvedCorridors;

  // Capture carved corridor cells before Phase 8b strips dirt paths off sand tiles or thins 1-tile spurs,
  // so wilderness boundary sealing never places bushes or boulders across valid route approaches.
  const preHealCorridorCells: { readonly x: number; readonly y: number }[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const terrain = preHealedContinent.terrainMatrix[y]?.[x];
      if (carvedCorridors.pathGrid[y]?.[x] && terrain !== 'water' && terrain !== 'water_deep') {
        preHealCorridorCells.push({ x, y });
      }
    }
  }

  // Phase 8a: Stamp active corridor design signature terrain features (wetland puddles & gorge pools)
  const signatureCorridorProperties = enrichCorridorProperties(
    { ...embedded, corridors: settlementPois.activeCorridors },
    preHealedContinent
  );
  const signatureContinent = stampCorridorSignatureTerrainFeatures({
    continent: preHealedContinent,
    corridors: settlementPois.activeCorridors,
    corridorProperties: signatureCorridorProperties,
    pois: settlementPois.pois,
    pathGrid: carvedCorridors.pathGrid,
    bridgeGrid: settlementPois.bridgeGrid,
    seed
  });

  // Phase 8b: Heal any residual biome slivers or diagonal pinches while widening/preserving route bridges
  const healed = healAllContinentDefects(signatureContinent, carvedCorridors.pathGrid, {
    pois: settlementPois.pois,
    bridgeGrid: settlementPois.bridgeGrid,
    preserveRouteBridges: true
  });
  const finalContinent = healed.continent;
  const pathGrid = healed.pathGrid;
  const finalBridgeGrid = healed.bridgeGrid ?? settlementPois.bridgeGrid;
  const sandApproachCells = preHealCorridorCells.filter(
    (pt) =>
      finalContinent.terrainMatrix[pt.y]?.[pt.x] === 'sand' &&
      !pathGrid[pt.y]?.[pt.x] &&
      !finalBridgeGrid[pt.y]?.[pt.x]
  );

  const cleanedPois = clearBlockingSettlementPropsOnPaths(
    settlementPois.pois,
    pathGrid,
    settlementPois.activeCorridors
  );

  // Phase 9: Wilderness Vegetation & Framing
  const framing = compileWildernessAndFramingLayer({
    continent: finalContinent,
    pois: cleanedPois,
    pathGrid,
    bridgeGrid: finalBridgeGrid,
    sandApproachCells,
    seed,
    corridorRadius: scaleProfile.corridorRadius
  });

  // Never leave decorative roadside bushes blocking carved corridor cells whose dirt overlay was thinned by Phase 8b,
  // while preserving bushes that hermetically seal non-transitable boundary tiles.
  const prunedGrassKeys = new Set<string>();
  for (const pt of preHealCorridorCells) {
    prunedGrassKeys.add(`${pt.x}_${pt.y}`);
  }
  const transitableMask = finalContinent.transitableGrid;
  const prunedProps = framing.wilderness.props.filter(
    (p) =>
      !(
        p.type === 'bush' &&
        prunedGrassKeys.has(`${p.x}_${p.y}`) &&
        (!transitableMask || transitableMask[p.y]?.[p.x])
      )
  );
  const { pois: fenceSanitizedPois, wildernessProps: finalProps } = sanitizeContinentalUrbanFences(
    cleanedPois,
    finalContinent,
    prunedProps
  );
  const finalPois = anchorUrbanPropsToStreetsAndYards(fenceSanitizedPois);
  const cleanWilderness = {
    ...framing.wilderness,
    props: finalProps
  };

  // Flood-fill true connected ocean water from outer perimeter so inland freshwater lakes stay 100% rock-free
  const oceanMask: boolean[][] = Array.from({ length: height }, () =>
    Array<boolean>(width).fill(false)
  );
  const oceanQueue: { x: number; y: number }[] = [];
  const isOceanCell = (t: string | undefined): boolean => t === 'water' || t === 'water_deep';
  for (let x = 0; x < width; x++) {
    if (isOceanCell(finalContinent.terrainMatrix[0]?.[x])) {
      oceanMask[0]![x] = true;
      oceanQueue.push({ x, y: 0 });
    }
    if (isOceanCell(finalContinent.terrainMatrix[height - 1]?.[x])) {
      oceanMask[height - 1]![x] = true;
      oceanQueue.push({ x, y: height - 1 });
    }
  }
  for (let y = 1; y < height - 1; y++) {
    if (isOceanCell(finalContinent.terrainMatrix[y]?.[0])) {
      oceanMask[y]![0] = true;
      oceanQueue.push({ x: 0, y });
    }
    if (isOceanCell(finalContinent.terrainMatrix[y]?.[width - 1])) {
      oceanMask[y]![width - 1] = true;
      oceanQueue.push({ x: width - 1, y });
    }
  }
  for (let head = 0; head < oceanQueue.length; head++) {
    const cur = oceanQueue[head]!;
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0]
    ] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height || oceanMask[ny]![nx]) continue;
      if (isOceanCell(finalContinent.terrainMatrix[ny]?.[nx])) {
        oceanMask[ny]![nx] = true;
        oceanQueue.push({ x: nx, y: ny });
      }
    }
  }

  const filteredMaritimeRocks = maritimeRockObstacles.filter((rock) => {
    if (finalBridgeGrid[rock.y]?.[rock.x] || pathGrid[rock.y]?.[rock.x]) {
      return false;
    }
    if (!oceanMask[rock.y]?.[rock.x]) {
      return false;
    }
    const terrain = finalContinent.terrainMatrix[rock.y]?.[rock.x];
    return terrain === 'water' || terrain === 'water_deep';
  });

  const finalCorridorProperties = enrichCorridorProperties(
    { ...embedded, corridors: settlementPois.activeCorridors },
    finalContinent
  );

  return {
    continent: finalContinent,
    graph,
    embedded: {
      ...embedded,
      corridors: settlementPois.activeCorridors
    },
    corridorProperties: finalCorridorProperties,
    progression,
    svgMarkup,
    pois: finalPois,
    pathGrid,
    bridgeGrid: finalBridgeGrid,
    wilderness: cleanWilderness,
    ledges: framing.ledges,
    progressionObstacles: framing.progressionObstacles,
    microVignettes: framing.microVignettes,
    maritimeRockObstacles: filteredMaritimeRocks
  };
}
