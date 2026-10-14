// Phase 7: Procedural POI & Urban Settlement Compiler for Parametric Continents

import type {
  EmbeddedTopologyGraph,
  EmbeddedCorridor
} from '../../../types/map/pokemonGraphTypes.ts';
import type {
  POINode,
  POIType,
  POITerrainPreference,
  CardinalDirection,
  SettlementLayoutResult
} from '../../../types/map/poiTypes.ts';
import type { ContinentMapResult } from '../continentGenerator.ts';
import type { WaterTerrainKind } from '../waterAutotileEngine.ts';
import { generateSettlementLayout, type SettlementTerrainContext } from '../cityLayoutEngine.ts';
import { placeProceduralRouteGates } from './routeGatePlacementEngine.ts';
import { resolvePortGateAsset } from '../canvasLandmarkRenderer.ts';
import { HASH_PRIME_FACTOR } from '../../../config/graphEmbeddingConfig.ts';
import {
  CAVE_SNAP_SEARCH_RADIUS,
  ISLAND_SEED_OFFSET,
  ARCHETYPE_PRIME_X,
  ARCHETYPE_PRIME_Y,
  PORT_TERMINAL_NORTH_PADDING,
  PORT_TERMINAL_LATERAL_FLANK_RADIUS,
  MIN_ISLAND_SETTLEMENT_AREA
} from '../../../config/continentalEngineConfig.ts';

export interface ContinentalSettlementPoisResult {
  readonly pois: POINode[];
  readonly poiById: Map<string, POINode>;
  readonly bridgeGrid: boolean[][];
  readonly placedGates: readonly POINode[];
  readonly activeCorridors: readonly EmbeddedCorridor[];
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
      const searchRadius = CAVE_SNAP_SEARCH_RADIUS;
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
          const cx = en.gridX + dx;
          const cy = en.gridY + dy;
          if (cx < 1 || cx >= width - 1 || cy < 1 || cy >= height - 2) continue;

          const mCell = continent.resolvedMountain.cellDetails[cy]?.[cx];
          const isSouthWall = mCell && (mCell.role.includes('edge_south') || mCell.role.includes('cliff'));
          const frontElev = continent.heightmap[cy + 1]?.[cx] ?? 0;
          const frontTerrain = continent.terrainMatrix[cy + 1]?.[cx];
          const frontIsGround = frontElev === 0 && frontTerrain !== 'water' && frontTerrain !== 'water_deep';
          if (!isSouthWall || !frontIsGround) continue;

          const dst = Math.hypot(dx, dy);
          if (dst < minDst) {
            minDst = dst;
            bestX = cx;
            bestY = cy;
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
      for (let dy = -PORT_TERMINAL_NORTH_PADDING; dy < gateH; dy++) {
        for (let dx = -PORT_TERMINAL_LATERAL_FLANK_RADIUS; dx < gateW + PORT_TERMINAL_LATERAL_FLANK_RADIUS; dx++) {
          const gy = gateY + dy;
          const gx = gateX + dx;
          if (gy < 0 || gy >= height || gx < 0 || gx >= width) continue;

          const t = continent.terrainMatrix[gy]?.[gx];
          if (t !== 'water' && t !== 'water_deep') {
            (continent.terrainMatrix as WaterTerrainKind[][])[gy]![gx] = 'sand';
            (continent.heightmap as number[][])[gy]![gx] = 0;
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
        const islandSeed = (seed + ISLAND_SEED_OFFSET) >>> 0;
        const layout = generateSettlementLayout(islandNode, settlementContext, islandSeed);
        (islandNode as { urbanLayout?: SettlementLayoutResult }).urbanLayout = layout;
        pois.push(islandNode);
      } else {
        const configureMinorIslet = () => {
          const archetypeIdx = Math.abs(island.cx * ARCHETYPE_PRIME_X + island.cy * ARCHETYPE_PRIME_Y + seed) % 3;
          if (archetypeIdx === 0) {
            // 1. Santuario / Mazmorra: rocky elevation h=1 with cave entrance / ancient ruin
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const rx = island.cx + dx;
                const ry = island.cy + dy;
                if (rx < 0 || rx >= width || ry < 0 || ry >= height || continent.terrainMatrix[ry]?.[rx] !== 'grass') continue;
                (continent.heightmap as number[][])[ry]![rx] = 1;
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
              buildingFile: 'poke_signpost.png'
            });
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


