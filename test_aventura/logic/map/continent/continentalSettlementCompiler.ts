// Phase 7: Procedural POI & Urban Settlement Compiler for Parametric Continents

import {
  CAVE_SNAP_SEARCH_RADIUS,
  ISLAND_SEED_OFFSET,
  ARCHETYPE_PRIME_X,
  ARCHETYPE_PRIME_Y,
  PORT_TERMINAL_NORTH_PADDING,
  PORT_TERMINAL_LATERAL_FLANK_RADIUS,
  MIN_ISLAND_SETTLEMENT_AREA
} from '../../../config/continentalEngineConfig.ts';
import { HASH_PRIME_FACTOR } from '../../../config/graphEmbeddingConfig.ts';
import type {
  POINode,
  POIType,
  POITerrainPreference,
  CardinalDirection,
  SettlementLayoutResult
} from '../../../types/map/poiTypes.ts';
import type {
  EmbeddedTopologyGraph,
  EmbeddedCorridor
} from '../../../types/map/pokemonGraphTypes.ts';
import { resolvePortGateAsset } from '../canvasLandmarkRenderer.ts';
import { generateSettlementLayout, type SettlementTerrainContext } from '../cityLayoutEngine.ts';
import type { ContinentMapResult } from '../continentGenerator.ts';
import type { WaterTerrainKind } from '../waterAutotileEngine.ts';
import { placeProceduralRouteGates } from './routeGatePlacementEngine.ts';

export interface ContinentalSettlementPoisResult {
  readonly pois: POINode[];
  readonly poiById: Map<string, POINode>;
  readonly bridgeGrid: boolean[][];
  readonly placedGates: readonly POINode[];
  readonly activeCorridors: readonly EmbeddedCorridor[];
}

const URBAN_POI_TYPE_LIST = ['metropolis', 'city', 'town', 'pokemon_league', 'route_gate'] as const;
type UrbanPoiType = (typeof URBAN_POI_TYPE_LIST)[number];
const URBAN_POI_TYPES: ReadonlySet<UrbanPoiType> = new Set<UrbanPoiType>(URBAN_POI_TYPE_LIST);

function snapCaveEntranceToSouthCliffWall(
  originX: number,
  originY: number,
  width: number,
  height: number,
  continent: ContinentMapResult,
  searchRadius: number
): { bestX: number; bestY: number } {
  const radii = [searchRadius, Math.max(width, height)];
  for (const radius of radii) {
    let bestX = originX;
    let bestY = originY;
    let minDst = Infinity;

    const minY = Math.max(1, originY - radius);
    const maxY = Math.min(height - 3, originY + radius);
    const minX = Math.max(1, originX - radius);
    const maxX = Math.min(width - 2, originX + radius);

    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const mCell = continent.resolvedMountain.cellDetails[cy]?.[cx];
        const isSouthWall =
          mCell && (mCell.role.includes('edge_south') || mCell.role.includes('cliff'));
        const frontElev = continent.heightmap[cy + 1]?.[cx] ?? 0;
        const frontTerrain = continent.terrainMatrix[cy + 1]?.[cx];
        const frontIsGround =
          frontElev === 0 && frontTerrain !== 'water' && frontTerrain !== 'water_deep';
        if (!isSouthWall || !frontIsGround) continue;

        const dst = Math.hypot(cx - originX, cy - originY);
        if (dst < minDst) {
          minDst = dst;
          bestX = cx;
          bestY = cy;
        }
      }
    }
    if (minDst < Infinity) return { bestX, bestY };
  }
  return { bestX: originX, bestY: originY };
}

function pavePortTerminalFootprint(
  gateX: number,
  gateY: number,
  gateW: number,
  gateH: number,
  width: number,
  height: number,
  terrainMatrix: WaterTerrainKind[][],
  heightmap: number[][]
): void {
  for (let dy = -PORT_TERMINAL_NORTH_PADDING; dy < gateH; dy++) {
    for (
      let dx = -PORT_TERMINAL_LATERAL_FLANK_RADIUS;
      dx < gateW + PORT_TERMINAL_LATERAL_FLANK_RADIUS;
      dx++
    ) {
      const gy = gateY + dy;
      const gx = gateX + dx;
      if (gy < 0 || gy >= height || gx < 0 || gx >= width) continue;

      const t = terrainMatrix[gy]?.[gx];
      if (t !== 'water' && t !== 'water_deep') {
        terrainMatrix[gy]![gx] = 'sand';
        heightmap[gy]![gx] = 0;
      }
    }
  }
}

export interface IslandBounds {
  minY: number;
  maxY: number;
  minX: number;
  maxX: number;
}

function countIslandLandArea(
  bounds: IslandBounds,
  terrainMatrix: readonly (readonly (string | undefined)[])[]
): number {
  let landArea = 0;
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const t = terrainMatrix[y]?.[x];
      if (t && t !== 'water' && t !== 'water_deep') {
        landArea++;
      }
    }
  }
  return landArea;
}

export function compileContinentalSettlementPois(
  embedded: EmbeddedTopologyGraph,
  continent: ContinentMapResult,
  settlementContext: SettlementTerrainContext,
  seed: number,
  width: number,
  height: number
): ContinentalSettlementPoisResult {
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

  // Invariant: At least one urban settlement POI MUST be strictly adjacent to ocean water,
  // and EXACTLY ONE city POI has hasPort === true.
  const portNode =
    embedded.nodes.find((n) => n.hasPort) ?? embedded.nodes.find((n) => n.role === 'gym_city');
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
      const gymNames: Record<number, { name: string; type: POIType; pref: POITerrainPreference }> =
        {
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
      const snapped = snapCaveEntranceToSouthCliffWall(
        en.gridX,
        en.gridY,
        width,
        height,
        continent,
        CAVE_SNAP_SEARCH_RADIUS
      );
      poiGridX = snapped.bestX;
      poiGridY = snapped.bestY;
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

    if (URBAN_POI_TYPES.has(type as UrbanPoiType)) {
      let poiSeed = seed;
      for (let i = 0; i < poiNode.id.length; i++) {
        poiSeed = (Math.imul(poiSeed, HASH_PRIME_FACTOR) + poiNode.id.charCodeAt(i)) >>> 0;
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
      pavePortTerminalFootprint(
        gateX,
        gateY,
        gateW,
        gateH,
        width,
        height,
        continent.terrainMatrix as WaterTerrainKind[][],
        continent.heightmap as number[][]
      );

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
            return !(
              p.x >= gateX &&
              p.x < gateX + gateW &&
              p.y >= gateY - 2 &&
              p.y < gateY + gateH
            );
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

  // Phase 7b: Populate Archipelago Island Settlements ONLY when linked by a maritime corridor
  if (continent.archipelagoIslands) {
    for (const island of continent.archipelagoIslands) {
      // Calculate contiguous land tile count of this island
      const landArea = countIslandLandArea(island.bounds, continent.terrainMatrix);
      const hasSeaRouteToIsland = embedded.corridors.some(
        (c) =>
          c.kind === 'surf_route' &&
          c.pathCells.some(
            (cell) =>
              cell.x >= island.bounds.minX - 2 &&
              cell.x <= island.bounds.maxX + 2 &&
              cell.y >= island.bounds.minY - 2 &&
              cell.y <= island.bounds.maxY + 2
          )
      );

      if (
        hasSeaRouteToIsland &&
        landArea >= MIN_ISLAND_SETTLEMENT_AREA &&
        island.role === 'port_city'
      ) {
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
        const islandSeed = (seed + ISLAND_SEED_OFFSET) >>> 0;
        const layout = generateSettlementLayout(islandNode, settlementContext, islandSeed);
        (islandNode as { urbanLayout?: SettlementLayoutResult }).urbanLayout = layout;
        pois.push(islandNode);
      } else {
        const configureMinorIslet = (): void => {
          const archetypeIdx =
            Math.abs(island.cx * ARCHETYPE_PRIME_X + island.cy * ARCHETYPE_PRIME_Y + seed) % 3;
          if (archetypeIdx === 0) {
            // 1. Santuario / Mazmorra: rocky elevation h=1 only on cells forming >=2x2 grass blocks
            const isValidGrass = (gx: number, gy: number): boolean =>
              gx >= 0 &&
              gx < width &&
              gy >= 0 &&
              gy < height &&
              continent.terrainMatrix[gy]?.[gx] === 'grass';
            for (const qx of [island.cx - 1, island.cx]) {
              for (const qy of [island.cy - 1, island.cy]) {
                if (
                  isValidGrass(qx, qy) &&
                  isValidGrass(qx + 1, qy) &&
                  isValidGrass(qx, qy + 1) &&
                  isValidGrass(qx + 1, qy + 1)
                ) {
                  (continent.heightmap as number[][])[qy]![qx] = 1;
                  (continent.heightmap as number[][])[qy]![qx + 1] = 1;
                  (continent.heightmap as number[][])[qy + 1]![qx] = 1;
                  (continent.heightmap as number[][])[qy + 1]![qx + 1] = 1;
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
            return;
          }

          if (archetypeIdx === 1) {
            // 2. Deserted sandy atoll: keep clean without orphan signposts or buildings
            return;
          }

          // 3. Isla Faro: lighthouse or fisherman cottage + 2-tile pier to deep water
          pois.push({
            id: `islet_lighthouse_${island.id}`,
            name: island.name,
            type: 'water_landmark',
            footprint: { width: 2, height: 4 },
            terrainPreference: 'flat_grass',
            gridX: island.cx - 1,
            gridY: island.cy - 2,
            elevation: 0,
            buildingFile: 'poke_port_lighthouse_beacon.png'
          });
          // 2-tile wooden pier extending toward adjacent water
          for (let dy = 2; dy <= 3; dy++) {
            const py = island.cy + dy;
            const px = island.cx;
            if (py >= 0 && py < height && px >= 0 && px < width) {
              bridgeGrid[py]![px] = true;
            }
          }
        };

        configureMinorIslet();
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

  return {
    pois,
    poiById,
    bridgeGrid,
    placedGates,
    activeCorridors
  };
}
