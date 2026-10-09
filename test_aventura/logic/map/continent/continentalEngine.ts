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
import {
  sculptContinentFromGraph,
  compileGeologicalAutotiling,
  type ContinentGeneratorOptions,
  type ContinentMapResult
} from '../continentGenerator.ts';
import type { WaterTerrainKind } from '../waterAutotileEngine.ts';
import { enrichCorridorProperties } from '../corridorPropertyEngine.ts';
import {
  applyProgressionBarriers,
  type ProgressionResult
} from '../progressionBarrierEngine.ts';
import { exportPokemonTopologyToSvg } from './svgRouteAdapter.ts';
import type {
  PokemonTopologyGraph,
  EmbeddedTopologyGraph,
  EnrichedCorridorProperties
} from '../../../types/map/pokemonGraphTypes';
import type {
  POINode,
  SettlementLayoutResult,
  POIType,
  POITerrainPreference,
  CardinalDirection
} from '../../../types/map/poiTypes';
import { generateSettlementLayout, type SettlementTerrainContext } from '../cityLayoutEngine.ts';
import { computeTransitableGrid } from '../transitableGridEngine.ts';
import { generateWildernessLayer, type WildernessLayerResult } from '../wildernessVegetationEngine.ts';
import { computeOceanGrid, findPathAStar, getBestGateway } from '../routePathfinding.ts';
import { placeProceduralRouteGates } from './routeGatePlacementEngine.ts';
import { generateRouteLedges, type LedgeRun } from '../routeLedgeEngine.ts';
import { generateProgressionObstacles, type ProgressionObstacle } from '../progressionObstacleEngine.ts';
import { generateMicroVignettes, sweepStrayPathTiles, type MicroVignette } from '../microVignetteEngine.ts';
import { pruneRedundantStairs } from '../mountainAutotileEngine.ts';
import { resolvePortGateAsset } from '../canvasLandmarkRenderer.ts';


export const MIN_ISLAND_SETTLEMENT_AREA = 80;

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
  const seed = options?.seed ?? 42;
  const width = options?.width ?? 400;
  const height = options?.height ?? 400;

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
    tileScale: options?.tileScale ?? 16
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

  const CANONICAL_CAVE_NAMES = [
    'Cueva Mt. Moon',
    'Túnel Roca',
    'Cueva Diglett',
    'Cueva Celeste',
    'Islas Espuma',
    'Cueva Granito'
  ] as const;

  const CANONICAL_FOREST_NAMES = [
    'Bosque Verde',
    'Bosque Corona',
    'Encinar',
    'Bosque Petalia',
    'Bosque Vetusto'
  ] as const;

  const CANONICAL_LANDMARK_NAMES = [
    'Pueblo Lavanda',
    'Pueblo Caoba',
    'Pueblo Azalea',
    'Pueblo Sosiego',
    'Pueblo Oromar',
    'Pueblo Lavacalda'
  ] as const;

  let caveIndex = 0;
  let forestIndex = 0;
  let landmarkIndex = 0;

  const pois: POINode[] = [];
  const isOceanGrid = computeOceanGrid(continent);

  // Invariant: At least one urban settlement POI MUST be strictly adjacent to ocean water,
  // and EXACTLY ONE city POI has hasPort === true.
  const portNode = embedded.nodes.find((n) => n.hasPort) ?? embedded.nodes.find((n) => n.role === 'gym_city');
  const chosenPortNodeId = portNode?.id;

  for (const en of embedded.nodes) {
    let type: POIType = 'city';
    let name = 'Ciudad Pokémon';
    let terrainPreference: POITerrainPreference = 'flat_grass';
    let hasGym = false;
    const isPortCity = en.id === chosenPortNodeId;
    let hasPort = isPortCity;
    let elevation = 0;

    let poiGridX = en.gridX;
    let poiGridY = en.gridY;

    if (isPortCity) {
      terrainPreference = 'coast_water';
    }

    if (en.role === 'starter') {
      type = 'town';
      name = 'Pueblo Paleta';
      terrainPreference = isPortCity ? 'coast_water' : 'flat_grass';
    } else if (en.role === 'league') {
      type = 'pokemon_league';
      name = 'Meseta Añil (Liga Pokémon)';
      terrainPreference = 'mountain_plateau';
      elevation = 1;
    } else if (en.role === 'port_city') {
      type = 'city';
      name = 'Ciudad Carmín';
      terrainPreference = 'coast_water';
      hasGym = true;
      hasPort = true;
    } else if (en.role === 'gym_city') {
      hasGym = true;
      const gymNames: Record<number, { name: string; type: POIType; pref: POITerrainPreference }> = {
        1: { name: 'Ciudad Plateada', type: 'city', pref: 'mountain_plateau' },
        2: { name: 'Ciudad Celeste', type: 'city', pref: 'flat_grass' },
        3: { name: 'Ciudad Carmín', type: 'city', pref: 'coast_water' },
        4: { name: 'Ciudad Celadón', type: 'metropolis', pref: 'flat_grass' },
        5: { name: 'Ciudad Fucsia', type: 'city', pref: 'flat_grass' },
        6: { name: 'Ciudad Azafrán', type: 'city', pref: 'flat_grass' },
        7: { name: 'Isla Canela', type: 'city', pref: 'flat_grass' },
        8: { name: 'Ciudad Verde', type: 'city', pref: 'flat_grass' }
      };
      const def = en.gymNumber ? gymNames[en.gymNumber] : undefined;
      if (def) {
        name = def.name;
        type = def.type;
        terrainPreference = isPortCity ? 'coast_water' : def.pref;
      } else {
        name = `Ciudad Gimnasio ${en.gymNumber ?? ''}`;
      }
    } else if (en.role === 'secondary_dungeon') {
      type = 'dungeon_forest';
      name = CANONICAL_FOREST_NAMES[forestIndex++ % CANONICAL_FOREST_NAMES.length]!;
      terrainPreference = 'forest_clearing';
    } else if (en.role === 'secondary_cave') {
      type = 'cave_entrance';
      name = CANONICAL_CAVE_NAMES[caveIndex++ % CANONICAL_CAVE_NAMES.length]!;
      terrainPreference = 'mountain_wall';

      // Snap to nearest south cliff wall (edge_south_top) with transitable ground in front
      let bestX = en.gridX;
      let bestY = en.gridY;
      let minDst = Infinity;
      const searchRadius = 16;
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
          const cx = en.gridX + dx;
          const cy = en.gridY + dy;
          if (cx >= 1 && cx < width - 1 && cy >= 1 && cy < height - 2) {
            const mCell = continent.resolvedMountain.cellDetails[cy]?.[cx];
            const isSouthWall = mCell && (mCell.role.includes('edge_south') || mCell.role.includes('cliff'));
            const frontElev = continent.heightmap[cy + 1]?.[cx] ?? 0;
            const frontTerrain = continent.terrainMatrix[cy + 1]?.[cx];
            const frontIsGround = frontElev === 0 && frontTerrain !== 'water' && frontTerrain !== 'water_deep';
            if (isSouthWall && frontIsGround) {
              const dst = Math.hypot(dx, dy);
              if (dst < minDst) {
                minDst = dst;
                bestX = cx;
                bestY = cy;
              }
            }
          }
        }
      }
      if (minDst < Infinity) {
        poiGridX = bestX;
        poiGridY = bestY;
      }
    } else if (en.role === 'secondary_landmark') {
      type = 'town';
      name = CANONICAL_LANDMARK_NAMES[landmarkIndex++ % CANONICAL_LANDMARK_NAMES.length]!;
      terrainPreference = 'flat_grass';
    } else if (en.role === 'route_gate') {
      type = 'route_gate';
      name = 'Aduana de Control';
      terrainPreference = 'flat_grass';
    }

    const poiNode: POINode = {
      id: en.id,
      name,
      type,
      footprint: { width: en.width, height: en.height },
      terrainPreference,
      gridX: poiGridX,
      gridY: poiGridY,
      elevation,
      hasGym,
      hasPort,
      tier: en.role === 'starter' ? 0 : 1
    };


    if (type === 'metropolis' || type === 'city' || type === 'town' || type === 'pokemon_league' || type === 'route_gate') {
      let poiSeed = seed;
      for (let i = 0; i < poiNode.id.length; i++) {
        poiSeed = (Math.imul(poiSeed, 31) + poiNode.id.charCodeAt(i)) >>> 0;
      }
      const layout = generateSettlementLayout(poiNode, settlementContext, poiSeed);
      (poiNode as { urbanLayout?: SettlementLayoutResult }).urbanLayout = layout;
    }

    if (hasPort) {
      // Port City Integration: Instantiate Port Gate / Terminal building & pier projection
      const facing: CardinalDirection = 'south';
      const portGateFile = resolvePortGateAsset(facing);
      const gateW = 7;
      const gateH = 6;
      const gateX = poiGridX + Math.floor((en.width - gateW) / 2);
      const gateY = poiGridY + en.height - gateH;

      // Ensure dry land for terminal footprint and continuous beach promenade along harbor coast
      for (let dy = -2; dy < gateH; dy++) {
        for (let dx = -8; dx < gateW + 8; dx++) {
          const gy = gateY + dy;
          const gx = gateX + dx;
          if (gy >= 0 && gy < height && gx >= 0 && gx < width) {
            const t = continent.terrainMatrix[gy]?.[gx];
            if (t !== 'water' && t !== 'water_deep') {
              (continent.terrainMatrix as WaterTerrainKind[][])[gy]![gx] = 'sand';
              (continent.heightmap as number[][])[gy]![gx] = 0;
            }
          }
        }
      }

      // Filter out any standard residential building or props that overlap the port terminal footprint or its direct approach
      if (poiNode.urbanLayout?.buildings) {
        const reservedLeft = gateX;
        const reservedRight = gateX + gateW;
        const reservedTop = gateY - 2;
        const reservedBottom = gateY + gateH;
        (poiNode.urbanLayout as { buildings: typeof poiNode.urbanLayout.buildings }).buildings =
          poiNode.urbanLayout.buildings.filter((b) => {
            const overlaps = !(
              b.x + b.width <= reservedLeft ||
              b.x >= reservedRight ||
              b.y + b.height <= reservedTop ||
              b.y >= reservedBottom
            );
            return !overlaps;
          });
      }
      if (poiNode.urbanLayout?.props) {
        (poiNode.urbanLayout as { props: typeof poiNode.urbanLayout.props }).props =
          poiNode.urbanLayout.props.filter((p) => {
            return !(p.x >= gateX && p.x < gateX + gateW && p.y >= gateY - 2 && p.y < gateY + gateH);
          });
      }

      // Add distinct POI Node for port dock
      pois.push({
        id: `${poiNode.id}_port_gate`,
        name: `Terminal Portuaria de ${name}`,
        type: 'port_dock',
        footprint: { width: gateW, height: gateH },
        terrainPreference: 'coast_water',
        gridX: gateX,
        gridY: gateY,
        elevation: 0,
        facing,
        buildingFile: portGateFile,
        hasGym: false
      });
    }

    pois.push(poiNode);
  }

  // Pre-initialize bridge grid for pier fingers and maritime connections
  const bridgeGrid: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));

  // Phase 7b: Populate Archipelago Island Settlements (e.g. Isla Canela)
  if (continent.archipelagoIslands) {
    for (const island of continent.archipelagoIslands) {
      // Calculate contiguous land tile count of this island
      let landArea = 0;
      for (let y = island.bounds.minY; y <= island.bounds.maxY; y++) {
        for (let x = island.bounds.minX; x <= island.bounds.maxX; x++) {
          const t = continent.terrainMatrix[y]?.[x];
          if (t && t !== 'water' && t !== 'water_deep') {
            landArea++;
          }
        }
      }

      if (landArea >= MIN_ISLAND_SETTLEMENT_AREA && island.role === 'port_city') {
        const islandNode: POINode = {
          id: island.id,
          name: island.name,
          type: 'city',
          footprint: { width: 18, height: 16 },
          terrainPreference: 'coast_water',
          gridX: island.cx - 9,
          gridY: island.cy - 8,
          elevation: 0,
          hasGym: true,
          hasPort: false,
          tier: 1
        };
        const islandSeed = (seed + 777) >>> 0;
        const layout = generateSettlementLayout(islandNode, settlementContext, islandSeed);
        (islandNode as { urbanLayout?: SettlementLayoutResult }).urbanLayout = layout;
        pois.push(islandNode);
      } else {
        // Minor islet (< 80 tiles): Strict prohibition of settlements, cities, marts, centers, railways, streetlamps.
        // Deterministically assign 1 of 3 archetypes:
        const archetypeIdx = Math.abs(island.cx * 31 + island.cy * 17 + seed) % 3;
        if (archetypeIdx === 0) {
          // 1. Santuario / Mazmorra: rocky elevation h=1 with cave entrance / ancient ruin
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const rx = island.cx + dx;
              const ry = island.cy + dy;
              if (rx >= 0 && rx < width && ry >= 0 && ry < height && continent.terrainMatrix[ry]?.[rx] === 'grass') {
                (continent.heightmap as number[][])[ry]![rx] = 1;
              }
            }
          }
          pois.push({
            id: `islet_sanctuary_${island.id}`,
            name: island.name,
            type: 'water_landmark',
            footprint: { width: 2, height: 2 },
            terrainPreference: 'mountain_wall',
            gridX: island.cx - 1,
            gridY: island.cy - 1,
            elevation: 0,
            buildingFile: 'poke_cave_entrance_gray.png'
          });
        } else if (archetypeIdx === 1) {
          // 2. Atolón Desierto: perimeter beach with trees, tall grass and collectible item ball
          pois.push({
            id: `islet_atoll_${island.id}`,
            name: island.name,
            type: 'water_landmark',
            footprint: { width: 2, height: 2 },
            terrainPreference: 'flat_grass',
            gridX: island.cx - 1,
            gridY: island.cy - 1,
            elevation: 0,
            buildingFile: 'poke_item_ball.png'
          });
        } else {
          // 3. Isla Faro: lighthouse or fisherman cottage + 2-tile pier to deep water
          pois.push({
            id: `islet_lighthouse_${island.id}`,
            name: island.name,
            type: 'water_landmark',
            footprint: { width: 3, height: 4 },
            terrainPreference: 'flat_grass',
            gridX: island.cx - 1,
            gridY: island.cy - 2,
            elevation: 0,
            buildingFile: 'poke_lighthouse.png'
          });
          // 2-tile wooden pier extending toward adjacent water
          for (let dy = 2; dy <= 3; dy++) {
            const py = island.cy + dy;
            const px = island.cx;
            if (py >= 0 && py < height && px >= 0 && px < width) {
              bridgeGrid[py]![px] = true;
            }
          }
        }
      }
    }
  }

  const poiById = new Map<string, POINode>();
  for (const p of pois) poiById.set(p.id, p);

  // Phase 7: Procedural Route Gatehouse Checkpoints
  const { placedGates, activeCorridors } = placeProceduralRouteGates({
    continent,
    pois,
    poiById,
    corridors: embedded.corridors,
    settlementContext,
    seed,
    width,
    height
  });

  // Phase 8: Terrain-Aware Routes & Bridges Carving
  const pathGrid: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));

  // Project wooden harbor pier of width >= 3 extending 3-5 tiles into deep water
  for (const poi of pois) {
    if (poi.type === 'port_dock') {
      const pierW = 3;
      const pierLen = 4;
      const pierStartX = poi.gridX + (poi.footprint.width >= 7 ? Math.floor((poi.footprint.width - pierW) / 2) : 0);
      const pierStartY = poi.gridY + poi.footprint.height;

      for (let dy = 0; dy < pierLen; dy++) {
        const py = pierStartY + dy;
        if (py >= 0 && py < height) {
          for (let dx = 0; dx < pierW; dx++) {
            const px = pierStartX + dx;
            if (px >= 0 && px < width) {
              bridgeGrid[py]![px] = true;
              (continent.terrainMatrix as WaterTerrainKind[][])[py]![px] = 'water';
            }
          }
        }
      }

      // Reserve mooring cell adjacent to the pier for ferry vessel sprite
      const ferryX = pierStartX + pierW + 1;
      const ferryY = pierStartY;
      if (ferryY + 4 < height && ferryX + 6 < width) {
        for (let fdy = 0; fdy < 4; fdy++) {
          for (let fdx = 0; fdx < 6; fdx++) {
            (continent.terrainMatrix as WaterTerrainKind[][])[ferryY + fdy]![ferryX + fdx] = 'water';
          }
        }
      }
    }
  }

  for (const corridor of activeCorridors) {
    if (corridor.kind === 'wormhole_tunnel' || corridor.kind === 'surf_route') continue;
    const fromPoi = poiById.get(corridor.fromId);
    const toPoi = poiById.get(corridor.toId);

    let stamped = false;
    if (fromPoi && toPoi) {
      const startGw = (corridor as { customStartGw?: { x: number; y: number } }).customStartGw ?? getBestGateway(fromPoi, toPoi.gridX, toPoi.gridY);
      const goalGw = (corridor as { customGoalGw?: { x: number; y: number } }).customGoalGw ?? getBestGateway(toPoi, fromPoi.gridX, fromPoi.gridY);

      // Exclude third-party settlements and protect route gatehouses from being bypassed or clipped
      const otherZones: { x1: number; y1: number; x2: number; y2: number }[] = [];
      for (const p of pois) {
        if (p.id !== fromPoi.id && p.id !== toPoi.id) {
          if (p.type === 'route_gate') {
            // Third-party routes must not route through the gatehouse checkpoint zone or its flanks
            otherZones.push({
              x1: p.gridX - 12,
              y1: p.gridY - 4,
              x2: p.gridX + p.footprint.width + 12,
              y2: p.gridY + p.footprint.height + 4
            });
          } else if (p.type === 'port_dock') {
            // Exclude port terminal building, pier, and entire marine harbor basin from overland routing
            otherZones.push({
              x1: p.gridX - 10,
              y1: p.gridY - 2,
              x2: p.gridX + p.footprint.width + 10,
              y2: p.gridY + p.footprint.height + 15
            });
          } else {
            otherZones.push({
              x1: p.gridX + 1,
              y1: p.gridY + 1,
              x2: p.gridX + p.footprint.width - 2,
              y2: p.gridY + p.footprint.height - 2
            });
          }
        } else if (p.type === 'route_gate') {
          // Even for connecting corridor segments, the gatehouse building footprint itself is solid!
          const b = p.urbanLayout?.buildings[0];
          if (b) {
            otherZones.push({
              x1: b.x,
              y1: b.y,
              x2: b.x + b.width - 1,
              y2: b.y + b.height - 1
            });
          }
        } else if (p.type === 'port_dock') {
          // The port dock itself is a maritime terminal, never crossed by overland paths
          otherZones.push({
            x1: p.gridX - 10,
            y1: p.gridY - 2,
            x2: p.gridX + p.footprint.width + 10,
            y2: p.gridY + p.footprint.height + 15
          });
        }
      }

      const astarRes = findPathAStar(
        continent,
        startGw.x,
        startGw.y,
        goalGw.x,
        goalGw.y,
        pathGrid,
        true,
        otherZones,
        isOceanGrid
      );

      if (astarRes && astarRes.path.length > 0) {
        // Continuous water runs: bridgeGrid is only true if runLen <= 6
        let wStart = -1;
        for (let i = 0; i <= astarRes.path.length; i++) {
          const isW =
            i < astarRes.path.length &&
            (continent.terrainMatrix[astarRes.path[i]!.y]?.[astarRes.path[i]!.x] === 'water' ||
              continent.terrainMatrix[astarRes.path[i]!.y]?.[astarRes.path[i]!.x] === 'water_deep');
          if (isW && wStart === -1) {
            wStart = i;
          } else if (!isW && wStart !== -1) {
            const wEnd = i - 1;
            const runLen = wEnd - wStart + 1;
            if (runLen <= 6) {
              for (let k = wStart; k <= wEnd; k++) {
                const pt = astarRes.path[k]!;
                // Do not place any bridge within harbor basins
                let inHarbor = false;
                for (const p of pois) {
                  if (p.type === 'port_dock') {
                    if (
                      pt.x >= p.gridX - 10 &&
                      pt.x <= p.gridX + p.footprint.width + 10 &&
                      pt.y >= p.gridY - 2 &&
                      pt.y <= p.gridY + p.footprint.height + 15
                    ) {
                      inHarbor = true;
                      break;
                    }
                  }
                }
                if (!inHarbor) {
                  bridgeGrid[pt.y]![pt.x] = true;
                }
              }
            } else {
              (corridor as { kind: string }).kind = 'surf_route';
            }
            wStart = -1;
          }
        }

        for (const pt of astarRes.path) {
          if (pt.x >= 0 && pt.x < width && pt.y >= 0 && pt.y < height) {
            const t = continent.terrainMatrix[pt.y]?.[pt.x];
            if (t !== 'water' && t !== 'water_deep') {
              pathGrid[pt.y]![pt.x] = true;
            }
          }
        }
        (corridor as { pathCells: typeof corridor.pathCells }).pathCells = astarRes.path;
        stamped = true;
      }
    }

    if (!stamped) {
      console.warn(`[ContinentalEngine] Warning: Corridor ${corridor.id} (${corridor.fromId} -> ${corridor.toId}) failed A* pathfinding. Fallback path applied.`);
      let fwStart = -1;
      for (let i = 0; i <= corridor.pathCells.length; i++) {
        const isW =
          i < corridor.pathCells.length &&
          (continent.terrainMatrix[corridor.pathCells[i]!.y]?.[corridor.pathCells[i]!.x] === 'water' ||
            continent.terrainMatrix[corridor.pathCells[i]!.y]?.[corridor.pathCells[i]!.x] === 'water_deep');
        if (isW && fwStart === -1) {
          fwStart = i;
        } else if (!isW && fwStart !== -1) {
          const fwEnd = i - 1;
          const runLen = fwEnd - fwStart + 1;
          if (runLen <= 6) {
            for (let k = fwStart; k <= fwEnd; k++) {
              const pt = corridor.pathCells[k]!;
              let inHarbor = false;
              for (const p of pois) {
                if (p.type === 'port_dock') {
                  if (
                    pt.x >= p.gridX - 10 &&
                    pt.x <= p.gridX + p.footprint.width + 10 &&
                    pt.y >= p.gridY - 2 &&
                    pt.y <= p.gridY + p.footprint.height + 15
                  ) {
                    inHarbor = true;
                    break;
                  }
                }
              }
              if (!inHarbor) {
                bridgeGrid[pt.y]![pt.x] = true;
              }
            }
          } else {
            (corridor as { kind: string }).kind = 'surf_route';
          }
          fwStart = -1;
        }
      }

      for (const pt of corridor.pathCells) {
        if (pt.x >= 0 && pt.x < width && pt.y >= 0 && pt.y < height) {
          const cell = continent.cells[pt.y]?.[pt.x];
          if (cell && (cell.isWalkable || cell.isStair)) {
            const t = continent.terrainMatrix[pt.y]?.[pt.x];
            if (t !== 'water' && t !== 'water_deep') {
              pathGrid[pt.y]![pt.x] = true;
            }
          }
        }
      }
    }
  }

  // Ensure harbor basins around port docks are 100% free of stray bridge pieces
  for (const port of pois) {
    if (port.type === 'port_dock') {
      const pierStartX = port.gridX + (port.footprint.width >= 7 ? Math.floor((port.footprint.width - 3) / 2) : 0);
      const pierEndX = pierStartX + 2;
      const pierStartY = port.gridY + port.footprint.height;

      for (let y = port.gridY - 2; y <= port.gridY + port.footprint.height + 15; y++) {
        for (let x = port.gridX - 10; x <= port.gridX + port.footprint.width + 10; x++) {
          if (y >= 0 && y < height && x >= 0 && x < width) {
            const isPartOfPier = x >= pierStartX && x <= pierEndX && y >= pierStartY;
            if (!isPartOfPier && bridgeGrid[y]?.[x]) {
              bridgeGrid[y]![x] = false;
            }
          }
        }
      }
    }
  }

  // Ensure doorsteps in front of cave entrances connect to the route network
  for (const poi of pois) {
    if (poi.type === 'cave_entrance') {
      const doorY = poi.gridY + 1;
      const doorX = poi.gridX;
      if (doorY >= 0 && doorY < height && doorX >= 0 && doorX < width) {
        pathGrid[doorY]![doorX] = true;
      }
    }
  }

  // Procedural cave entrances on south cliff faces intersecting or adjacent to routes
  let proceduralTunnelIndex = 1;
  for (let cy = 2; cy < height - 3; cy++) {
    for (let cx = 2; cx < width - 3; cx++) {
      const mCell = continent.resolvedMountain?.cellDetails?.[cy]?.[cx];
      const isSouthCliffWall =
        Boolean(mCell && (mCell.role.includes('edge_south') || mCell.role.includes('cliff'))) &&
        (continent.heightmap[cy]?.[cx] ?? 0) >= 1 &&
        (continent.heightmap[cy + 1]?.[cx] ?? 0) === 0 &&
        continent.terrainMatrix[cy + 1]?.[cx] !== 'water' &&
        continent.terrainMatrix[cy + 1]?.[cx] !== 'water_deep';

      if (isSouthCliffWall && pathGrid[cy + 1]?.[cx]) {
        const hasNearbyCave = pois.some(
          (p) => p.type === 'cave_entrance' && Math.hypot(p.gridX - cx, p.gridY - cy) < 15
        );
        if (!hasNearbyCave) {
          const hasBacking = (continent.heightmap[cy - 1]?.[cx] ?? 0) >= 1 && (continent.heightmap[cy - 2]?.[cx] ?? 0) >= 1;
          if (hasBacking) {
            const mtnPal = continent.geologicalClusters?.paletteMatrix?.[cy]?.[cx] ?? continent.mountainPalette ?? 'brown';
            const caveFile = mtnPal === 'gray' ? 'poke_cave_entrance_gray.png' : 'poke_cave_entrance_brown.png';
            pois.push({
              id: `cave_tunnel_${cx}_${cy}`,
              name: `Túnel de Paso ${proceduralTunnelIndex++}`,
              type: 'cave_entrance',
              footprint: { width: 2, height: 2 },
              terrainPreference: 'mountain_wall',
              gridX: cx,
              gridY: cy,
              elevation: 0,
              buildingFile: caveFile
            });
            pathGrid[cy + 1]![cx] = true;
            if (cx + 1 < width) pathGrid[cy + 1]![cx + 1] = true;
          }
        }
      }
    }
  }

  // Ensure the central through-road passing through route gatehouses is stamped onto pathGrid
  for (const gate of placedGates) {
    if (gate.urbanLayout?.internalStreets) {
      for (const pt of gate.urbanLayout.internalStreets) {
        if (pt.x >= 0 && pt.x < width && pt.y >= 0 && pt.y < height) {
          pathGrid[pt.y]![pt.x] = true;
        }
      }
    }
  }

  // Prune redundant stairs within Manhattan distance < 4
  const prunedStairs = pruneRedundantStairs(continent.placedStairs, pathGrid);
  (continent as { placedStairs: typeof continent.placedStairs }).placedStairs = prunedStairs;

  // Ensure all land bordering harbor water or port docks has a continuous sand beach transition
  for (const port of pois) {
    if (port.type === 'port_dock') {
      const minX = Math.max(0, port.gridX - 12);
      const maxX = Math.min(width - 1, port.gridX + port.footprint.width + 16);
      const minY = Math.max(0, port.gridY - 6);
      const maxY = Math.min(height - 1, port.gridY + port.footprint.height + 16);

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (continent.terrainMatrix[y]?.[x] === 'grass') {
            let nearWater = false;
            for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                const ny = y + dy;
                const nx = x + dx;
                const t = continent.terrainMatrix[ny]?.[nx];
                if (t === 'water' || t === 'water_deep') {
                  nearWater = true;
                  break;
                }
              }
              if (nearWater) break;
            }
            if (nearWater) {
              (continent.terrainMatrix as WaterTerrainKind[][])[y]![x] = 'sand';
            }
          }
        }
      }
    }
  }

  // Phase 8b: Unified Geological Autotiling (Coasts, Cliffs, Deep Water, Macro-Biomes)
  // Re-evaluates and autotiles the entire continent after all destructive carving
  // (harbors, docks, routes, doorsteps), eliminating raw edges and broken cliff seams.
  if (continent.macroBiomes) {
    const geoPass = compileGeologicalAutotiling(
      continent.terrainMatrix,
      continent.heightmap,
      continent.macroBiomes,
      {
        seed,
        mountainPalette: continent.mountainPalette,
        paletteMatrix: continent.geologicalClusters?.paletteMatrix,
        placedStairs: prunedStairs,
        riverDrainage: continent.riverDrainage
      }
    );

    (continent as { terrainMatrix: typeof continent.terrainMatrix }).terrainMatrix = geoPass.sanitizedWaterMatrix;
    (continent as { resolvedWater: typeof continent.resolvedWater }).resolvedWater = geoPass.resolvedWater;
    (continent as { resolvedMountain: typeof continent.resolvedMountain }).resolvedMountain = geoPass.resolvedMountain;
    (continent as { resolvedMacroBiomes?: typeof continent.resolvedMacroBiomes }).resolvedMacroBiomes = geoPass.resolvedMacroBiomes;
    (continent as { cells: typeof continent.cells }).cells = geoPass.cells;
  }

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
  (continent as { transitableGrid?: readonly (readonly boolean[])[] }).transitableGrid = transitableGrid;
  const wilderness = generateWildernessLayer(continent, pois, pathGrid, {
    seed,
    transitableGrid,
    reservedEntityCells
  });

  return {
    continent,
    graph,
    embedded: {
      ...embedded,
      corridors: activeCorridors
    },
    corridorProperties,
    progression,
    svgMarkup,
    pois,
    pathGrid,
    bridgeGrid,
    wilderness,
    ledges,
    progressionObstacles,
    microVignettes
  };
}
