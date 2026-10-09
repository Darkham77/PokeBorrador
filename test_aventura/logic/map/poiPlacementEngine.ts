/**
 * src/logic/map/poiPlacementEngine.ts
 *
 * INTELLIGENT REGIONAL POI & SETTLEMENT PLACEMENT ENGINE
 *
 * Distributes 15 to 22+ heterogeneous Points of Interest across procedural regional maps:
 *   - 'metropolis': Major commercial hubs on vast flat plains (8x8 to 10x10).
 *   - 'city': Gym cities on strategic plains or plateaus (6x6 to 7x7).
 *   - 'town': Smaller hamlets, starting towns, or villages (4x4 to 5x5).
 *   - 'dungeon_forest': Dense transitable forests with clearings (10x10 to 14x14).
 *   - 'cave_entrance': Anchored strictly on south-facing mountain cliff walls.
 *   - 'port_dock': Anchored at the sand beach-to-ocean interface.
 *   - 'route_gate': Border checkpoints and valley choke points.
 *   - 'water_landmark': Shrines or lighthouses on lakes or coastal lagoons.
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type {
  POINode,
  POIGateway
} from '../../types/map/poiTypes.ts';
import { generateSettlementLayout, type SettlementTerrainContext } from './cityLayoutEngine.ts';
import { resolveWaterCoastGrid, type ResolvedWaterMapResult, type WaterTerrainKind } from './waterAutotileEngine.ts';
import {
  resolveMountainMapGrid,
  type MountainStairLocation,
  type ResolvedMountainMapResult
} from './mountainAutotileEngine.ts';
import { clusterMountainMassifs, type GeologicalClusterResult } from './geologicalClusterEngine.ts';
import { computeOceanGrid } from './routeNetworkEngine.ts';

export interface POIPlacementOptions {
  readonly seed?: number;
  readonly targetCount?: number; // default: 18
  readonly minSettlementDistance?: number; // default: 8
  readonly generationMode?: 'preset' | 'procedural'; // default: 'preset'
  readonly targetUrbanSettlements?: number;
}

export {
  PORT_DOCK_BUILDINGS,
  type PortBuildingOption
} from './coastalHarborPlacementEngine.ts';
import { placeCoastalHarborDocks } from './coastalHarborPlacementEngine.ts';

const REGIONAL_MIN_SCALE_LEAGUE = 128 as const;
const REGIONAL_MASSIVE_DIMENSION = 200 as const;
const REGIONAL_LARGE_DIMENSION = 128 as const;
const MAX_SHORE_SEARCH_RADIUS = 16;
const CHOKE_SEARCH_MIN_Y_RATIO = 0.25 as const;
const CHOKE_SEARCH_MAX_Y_RATIO = 0.65 as const;
const CHOKE_SEARCH_MIN_X_RATIO = 0.20 as const;
const CHOKE_SEARCH_MAX_X_RATIO = 0.80 as const;
const CHOKE_SEARCH_STEP = 3 as const;

import {
  REGIONAL_POI_CATALOG,
  generateProceduralPOICatalog
} from './regionalPoiCatalog.ts';

/**
 * Places heterogeneous POIs onto the continent map respecting strict terrain and clearance constraints.
 */
export function placeRegionalPOIs(
  continentMap: ContinentMapResult,
  options?: POIPlacementOptions
): readonly POINode[] {
  const generationMode = options?.generationMode ?? 'preset';
  const targetCount = options?.targetCount ?? 18;
  const activeCatalog = generationMode === 'procedural' ? generateProceduralPOICatalog(targetCount) : REGIONAL_POI_CATALOG;
  const W = continentMap.width;
  const H = continentMap.height;
  const baseMinSettlementDist = options?.minSettlementDistance ?? 6;
  const placedNodes: POINode[] = [];

  let lcgSeed = options?.seed ?? 42;
  const nextRng = (): number => {
    lcgSeed = (lcgSeed * 1664525 + 1013904223) | 0;
    return (lcgSeed >>> 0) / 4294967296;
  };

  // Reserved occupancy grid to prevent POI footprints from overlapping
  const occupied = Array.from({ length: H }, () => Array(W).fill(false));

  // Helper to check if a bounding box is free of existing POIs
  const isAreaFree = (bx: number, by: number, bw: number, bh: number, buffer = 2): boolean => {
    const minX = Math.max(0, bx - buffer);
    const maxX = Math.min(W - 1, bx + bw - 1 + buffer);
    const minY = Math.max(0, by - buffer);
    const maxY = Math.min(H - 1, by + bh - 1 + buffer);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (occupied[y]![x]) return false;
      }
    }
    return true;
  };

  // Helper to mark a bounding box as occupied
  const markAreaOccupied = (bx: number, by: number, bw: number, bh: number): void => {
    for (let y = by; y < by + bh; y++) {
      for (let x = bx; x < bx + bw; x++) {
        if (y >= 0 && y < H && x >= 0 && x < W) {
          occupied[y]![x] = true;
        }
      }
    }
  };

  // Helper to find minimum distance to all previously placed settlements (center-to-center)
  const getMinDistanceToPlaced = (x: number, y: number): number => {
    if (placedNodes.length === 0) return Infinity;
    let minD = Infinity;
    for (const node of placedNodes) {
      const nodeCx = node.gridX + Math.floor(node.footprint.width / 2);
      const nodeCy = node.gridY + Math.floor(node.footprint.height / 2);
      const d = Math.hypot(nodeCx - x, nodeCy - y);
      if (d < minD) minD = d;
    }
    return minD;
  };

  const getSettlementContext = (): SettlementTerrainContext => ({
    heightmap: continentMap.heightmap,
    terrainMatrix: continentMap.terrainMatrix,
    occupiedFootCells: continentMap.resolvedMountain.occupiedFootCells,
    width: W,
    height: H
  });

  // Helper to compute perimeter gateways for a settlement aligned with internal avenues
  const computeNodeGateways = (
    gx: number,
    gy: number,
    w: number,
    h: number,
    type?: string
  ): POIGateway[] => {
    let northX = gx + Math.floor(w / 2);
    let southX = gx + Math.floor(w / 2);
    let westY = gy + Math.floor(h / 2);
    let eastY = gy + Math.floor(h / 2);

    if (type === 'metropolis') {
      northX = gx + 10;
      southX = gx + 10;
      westY = gy + 10;
      eastY = gy + 10;
    } else if (type === 'city') {
      northX = gx + 7;
      southX = gx + 7;
      westY = gy + 6;
      eastY = gy + 6;
    } else if (type === 'town') {
      const midAvenueX = gx + Math.floor(w / 2) - 1;
      const midAvenueY = gy + Math.floor(h / 2);
      northX = midAvenueX;
      southX = midAvenueX;
      westY = midAvenueY;
      eastY = midAvenueY;
    } else if (type === 'dungeon_forest') {
      const midX = gx + Math.floor(w / 2);
      return [
        { x: midX, y: gy, direction: 'north' },
        { x: midX, y: gy + h - 1, direction: 'south' }
      ];
    } else if (type === 'route_gate') {
      const midX = gx + Math.floor(w / 2);
      return [
        { x: midX, y: gy, direction: 'north' },
        { x: midX, y: gy + h - 1, direction: 'south' }
      ];
    }

    return [
      { x: northX, y: gy, direction: 'north' },
      { x: southX, y: gy + h - 1, direction: 'south' },
      { x: gx + w - 1, y: eastY, direction: 'east' },
      { x: gx, y: westY, direction: 'west' }
    ];
  };

  // 0. PLACE REGIONAL POKÉMON LEAGUE (Meseta Añil) FIRST (Northern Mountain Massif Anchor)
  const leagueTemplate = activeCatalog.find((t) => t.type === 'pokemon_league');
  if (leagueTemplate && Math.min(W, H) >= REGIONAL_MIN_SCALE_LEAGUE) {
    let bestLeagueX = -1;
    let bestLeagueY = -1;
    let bestLeagueElev = 1;
    let bestScore = -Infinity;

    const lW = leagueTemplate.width;
    const lH = leagueTemplate.height;

    // Search strictly in the northern sector (y <= 0.38 * H)
    const maxLeagueY = Math.round(H * 0.38) - lH;
    for (let y = 6; y <= maxLeagueY; y += 2) {
      for (let x = 6; x < W - lW - 6; x += 2) {
        if (!isAreaFree(x, y, lW, lH, 2)) continue;

        // Check mountain plateau clearance
        let totalElev = 0;
        let validPlateau = true;
        for (let dy = 0; dy < lH; dy++) {
          for (let dx = 0; dx < lW; dx++) {
            const elev = continentMap.heightmap[y + dy]?.[x + dx] ?? 0;
            const terr = continentMap.terrainMatrix[y + dy]?.[x + dx];
            if (terr === 'water' || terr === 'sand') {
              validPlateau = false;
              break;
            }
            totalElev += elev;
          }
          if (!validPlateau) break;
        }

        if (validPlateau) {
          // Score prioritizes higher elevation and central northern location
          const distToNorthCenter = Math.hypot(x + lW / 2 - W / 2, y + lH / 2 - H * 0.20);
          const score = totalElev * 10 - distToNorthCenter;
          if (score > bestScore) {
            bestScore = score;
            bestLeagueX = x;
            bestLeagueY = y;
            bestLeagueElev = Math.max(1, continentMap.heightmap[y]![x] ?? 1);
          }
        }
      }
    }

    if (bestLeagueX !== -1) {
      const midAvenueX = bestLeagueX + Math.floor(lW / 2);
      // Plateau holds the Palace and Ceremonial Avenue (dy = 0..13) at elevation >= 1
      // Base holds the Lower Plaza and Checkpoint Gatehouse (dy = 14..25) at elevation 0
      const plateauH = lH - 12;
      for (let dy = 0; dy < lH; dy++) {
        for (let dx = 0; dx < lW; dx++) {
          const elev = dy < plateauH ? bestLeagueElev : 0;
          (continentMap.heightmap as number[][])[bestLeagueY + dy]![bestLeagueX + dx] = elev;
          const c = continentMap.cells[bestLeagueY + dy]?.[bestLeagueX + dx];
          if (c) (c as { elevation: number }).elevation = elev;
        }
      }

      // Monumental central staircase linking elevation 1 plateau to elevation 0 plain
      const stairX = midAvenueX - 1;
      const stairY = bestLeagueY + plateauH - 1;

      // Hermetic League Climax: Prune all secondary stairs within distance <= 30
      // ensuring the Checkpoint Gatehouse + Monumental Stair is the 100% exclusive access path
      const currentStairs = (continentMap.placedStairs as MountainStairLocation[]).filter(
        (s) => Math.hypot(s.x - midAvenueX, s.y - (bestLeagueY + plateauH)) > 30
      );
      currentStairs.push({ x: stairX, y: stairY });
      (continentMap as { placedStairs: readonly MountainStairLocation[] }).placedStairs = currentStairs;

      // Re-run geological clustering so the entire contiguous League massif shares a single homogeneous palette
      const updatedClusters = clusterMountainMassifs({
        elevationMatrix: continentMap.heightmap,
        seed: options?.seed,
        defaultPalette: continentMap.mountainPalette
      });
      (continentMap as { geologicalClusters: GeologicalClusterResult }).geologicalClusters = updatedClusters;

      const mapH = continentMap.height;
      const mapW = continentMap.width;
      for (let y = 0; y < mapH; y++) {
        for (let x = 0; x < mapW; x++) {
          const c = continentMap.cells[y]?.[x];
          if (c) {
            (c as { mountainPalette?: string }).mountainPalette = updatedClusters.paletteMatrix[y]![x]!;
          }
        }
      }

      // Re-resolve mountain autotile grid so the entire League massif forms a solid unscalable cliff face
      const pal = updatedClusters.paletteMatrix[bestLeagueY]?.[bestLeagueX] ?? continentMap.mountainPalette ?? 'brown';
      (continentMap as { resolvedMountain: ResolvedMountainMapResult }).resolvedMountain = resolveMountainMapGrid(
        continentMap.heightmap,
        {
          palette: pal,
          paletteMatrix: updatedClusters.paletteMatrix,
          stairs: currentStairs
        }
      );

      const leagueGateways: POIGateway[] = [
        { x: midAvenueX, y: bestLeagueY + lH - 1, direction: 'south' }
      ];

      const node: POINode = {
        id: leagueTemplate.id,
        name: leagueTemplate.name,
        type: leagueTemplate.type,
        footprint: { width: lW, height: lH },
        terrainPreference: leagueTemplate.preference,
        gridX: bestLeagueX,
        gridY: bestLeagueY,
        elevation: bestLeagueElev,
        facing: 'south',
        gateways: leagueGateways,
        hasGym: false
      };

      const layout = generateSettlementLayout(node, getSettlementContext());
      (node as { urbanLayout?: typeof layout }).urbanLayout = layout;

      placedNodes.push(node);
      markAreaOccupied(bestLeagueX, bestLeagueY, lW, lH);
    }
  }

  // 1. PLACE METROPOLIS, CITIES & TOWNS (Primary Regional Anchors)
  const settlementTemplates = activeCatalog.filter(
    (t) =>
      t.type === 'metropolis' ||
      t.type === 'city' ||
      t.type === 'town'
  );

  const gymSettlementsCount = () =>
    placedNodes.filter((p) => p.hasGym).length;

  for (const tmpl of settlementTemplates) {
    if (placedNodes.length >= targetCount && gymSettlementsCount() >= 8) break;

    // Strict Archipelago Island Anchor: Cinnabar Island MUST be placed on an offshore island
    if (tmpl.id === 'cinnabar_island_city' && continentMap.archipelagoIslands && continentMap.archipelagoIslands.length > 0) {
      const island = continentMap.archipelagoIslands.find((i) => i.role === 'port_city') ?? continentMap.archipelagoIslands[0]!;
      const iW = 14;
      const iH = 12;
      const posX = island.cx - Math.floor(iW / 2);
      const posY = island.cy - Math.floor(iH / 2);

      for (let dy = 0; dy < iH; dy++) {
        for (let dx = 0; dx < iW; dx++) {
          const cy = posY + dy;
          const cx = posX + dx;
          if (cy >= 0 && cy < H && cx >= 0 && cx < W) {
            (continentMap.terrainMatrix as WaterTerrainKind[][])[cy]![cx] = 'grass';
            (continentMap.heightmap as number[][])[cy]![cx] = 0;
          }
        }
      }

      const gateways = computeNodeGateways(posX, posY, iW, iH, tmpl.type);
      const node: POINode = {
        id: tmpl.id,
        name: tmpl.name,
        type: tmpl.type,
        footprint: { width: iW, height: iH },
        terrainPreference: 'flat_grass',
        gridX: posX,
        gridY: posY,
        elevation: 0,
        facing: 'south',
        gateways,
        hasGym: true
      };
      const layout = generateSettlementLayout(node, getSettlementContext());
      (node as { urbanLayout?: typeof layout }).urbanLayout = layout;

      placedNodes.push(node);
      markAreaOccupied(posX, posY, iW, iH);

      // Populate secondary archipelago islands (Sea Cave, Lighthouse, Fisherman's Cottage / Shrine)
      for (const secIsland of continentMap.archipelagoIslands) {
        if (secIsland.role === 'lighthouse') {
          const lhW = 6;
          const lhH = 7;
          const lx = secIsland.cx - Math.floor(lhW / 2);
          const ly = secIsland.cy - Math.floor(lhH / 2);
          if (isAreaFree(lx, ly, lhW, lhH, 1)) {
            placedNodes.push({
              id: 'archipelago_lighthouse',
              name: 'Faro Marino Insular',
              type: 'water_landmark',
              footprint: { width: lhW, height: lhH },
              terrainPreference: 'coast_water',
              gridX: lx,
              gridY: ly,
              elevation: 0,
              facing: 'south',
              buildingFile: 'poke_port_lighthouse_beacon.png'
            });
            markAreaOccupied(lx, ly, lhW, lhH);
          }
        } else if (secIsland.role === 'sea_cave') {
          const scW = 2;
          const scH = 2;
          const sx = secIsland.cx - Math.floor(scW / 2);
          const sy = secIsland.cy - Math.floor(scH / 2);
          if (isAreaFree(sx, sy, scW, scH, 1)) {
            placedNodes.push({
              id: 'archipelago_sea_cave',
              name: 'Cueva Marina Insular',
              type: 'cave_entrance',
              footprint: { width: scW, height: scH },
              terrainPreference: 'mountain_wall',
              gridX: sx,
              gridY: sy,
              elevation: 0,
              facing: 'south',
              buildingFile: 'poke_cave_entrance_gray.png'
            });
            markAreaOccupied(sx, sy, scW, scH);
          }
        } else if (secIsland.role === 'shrine') {
          const shW = 4;
          const shH = 4;
          const rx = secIsland.cx - Math.floor(shW / 2);
          const ry = secIsland.cy - Math.floor(shH / 2);
          if (isAreaFree(rx, ry, shW, shH, 1)) {
            placedNodes.push({
              id: 'archipelago_fisherman_cottage',
              name: 'Cabaña del Pescador Insular',
              type: 'water_landmark',
              footprint: { width: shW, height: shH },
              terrainPreference: 'coast_water',
              gridX: rx,
              gridY: ry,
              elevation: 0,
              facing: 'south',
              buildingFile: 'house_vermilion_ranch.png'
            });
            markAreaOccupied(rx, ry, shW, shH);
          }
        }
      }

      continue;
    }

    const isCompact = Math.min(W, H) <= 64;
    const baseDist = isCompact
      ? (tmpl.type === 'metropolis' ? 8 : tmpl.type === 'city' ? 6 : tmpl.type === 'town' ? 4 : 3)
      : (tmpl.type === 'metropolis' ? 16 : tmpl.type === 'city' ? 12 : tmpl.type === 'town' ? 7 : 5);
    let effMinDist = Math.max(baseMinSettlementDist, baseDist);

    interface PlainCand {
      readonly x: number;
      readonly y: number;
      readonly distToCenter: number;
      readonly distToPlaced: number;
    }

    let currentWidth = tmpl.width;
    let currentHeight = tmpl.height;

    const findCandidatesWithBuffer = (
      curW: number,
      curH: number,
      reqBuffer: number,
      reqMinDist: number
    ): PlainCand[] => {
      const candidates: PlainCand[] = [];
      for (let y = 4; y < H - curH - 4; y++) {
        for (let x = 4; x < W - curW - 4; x++) {
          if (!isAreaFree(x, y, curW, curH, 2)) continue;

          // Check that footprint and perimeter buffer are strictly flat grass plain (elevation 0)
          let allFlatPlain = true;
          for (let dy = -reqBuffer; dy < curH + reqBuffer; dy++) {
            for (let dx = -reqBuffer; dx < curW + reqBuffer; dx++) {
              const cx = x + dx;
              const cy = y + dy;
              if (
                cy < 0 ||
                cy >= H ||
                cx < 0 ||
                cx >= W ||
                continentMap.terrainMatrix[cy]?.[cx] !== 'grass' ||
                continentMap.heightmap[cy]?.[cx] !== 0 ||
                continentMap.resolvedMountain.occupiedFootCells[cy]?.[cx]
              ) {
                allFlatPlain = false;
                break;
              }
            }
            if (!allFlatPlain) break;
          }

          if (allFlatPlain) {
            const cx = x + Math.floor(curW / 2);
            const cy = y + Math.floor(curH / 2);
            const distToCenter = Math.hypot(cx - W / 2, cy - H / 2);
            const distToPlaced = getMinDistanceToPlaced(cx, cy);

            if (distToPlaced >= reqMinDist) {
              candidates.push({ x, y, distToCenter, distToPlaced });
            }
          }
        }
      }
      return candidates;
    };

    const preferredBuffer = tmpl.type === 'metropolis' ? 2 : 1;
    let plainCandidates = findCandidatesWithBuffer(currentWidth, currentHeight, preferredBuffer, effMinDist);
    if (plainCandidates.length === 0 && preferredBuffer > 0) {
      plainCandidates = findCandidatesWithBuffer(currentWidth, currentHeight, 0, effMinDist);
    }
    if (plainCandidates.length === 0 && tmpl.type === 'metropolis') {
      const fallbackSizes = [
        { w: 22, h: 20 },
        { w: 20, h: 18 },
        { w: 18, h: 16 }
      ];
      for (const size of fallbackSizes) {
        currentWidth = size.w;
        currentHeight = size.h;
        plainCandidates = findCandidatesWithBuffer(currentWidth, currentHeight, 0, effMinDist);
        if (plainCandidates.length > 0) break;
      }
    }
    if (plainCandidates.length === 0 && effMinDist > (isCompact ? 4 : 8)) {
      effMinDist = isCompact ? 4 : 8;
      plainCandidates = findCandidatesWithBuffer(currentWidth, currentHeight, 0, effMinDist);
    }
    if (plainCandidates.length === 0 && effMinDist > 3) {
      effMinDist = 3;
      plainCandidates = findCandidatesWithBuffer(currentWidth, currentHeight, 0, effMinDist);
    }

    if (plainCandidates.length > 0) {
      let chosen: PlainCand;
      if (tmpl.type === 'metropolis') {
        // Metropolis prefers prime central valley position
        plainCandidates.sort((a, b) => a.distToCenter - b.distToCenter);
        chosen = plainCandidates[0]!;
      } else {
        // Other cities, towns and gates use Farthest Point Sampling for maximum regional dispersion
        plainCandidates.sort((a, b) => b.distToPlaced - a.distToPlaced);
        chosen = plainCandidates[0]!;
      }

      // Cinnabar Island City (Isla Canela): anchor specifically on port_city archipelago island when present
      if (tmpl.id === 'cinnabar_island_city' && continentMap.archipelagoIslands?.length) {
        const portIsland = continentMap.archipelagoIslands.find(
          (isl) => isl.role === 'port_city' || isl.id === 'island_port_main'
        );
        if (portIsland) {
          const islandCand = plainCandidates.find(
            (c) =>
              c.x >= portIsland.bounds.minX - 2 &&
              c.x + currentWidth <= portIsland.bounds.maxX + 2 &&
              c.y >= portIsland.bounds.minY - 2 &&
              c.y + currentHeight <= portIsland.bounds.maxY + 2
          );
          if (islandCand) {
            chosen = islandCand;
          }
        }
      }

      const gateways = computeNodeGateways(chosen.x, chosen.y, currentWidth, currentHeight, tmpl.type);
      const node: POINode = {
        id: tmpl.id,
        name: tmpl.name,
        type: tmpl.type,
        footprint: { width: currentWidth, height: currentHeight },
        terrainPreference: tmpl.preference,
        gridX: chosen.x,
        gridY: chosen.y,
        elevation: 0,
        gateways,
        hasGym: tmpl.hasGym ?? false
      };

      // Generate urban layout and attach
      const layout = generateSettlementLayout(node, getSettlementContext());
      (node as { urbanLayout?: typeof layout }).urbanLayout = layout;

      placedNodes.push(node);
      markAreaOccupied(chosen.x, chosen.y, currentWidth, currentHeight);
    }
  }

  // 1.5 PLACE ROUTE GATE CHECKPOINTS (Dedicated active route checkpoints)
  const routeGateTemplates = activeCatalog.filter((t) => t.type === 'route_gate');
  for (const gateTmpl of routeGateTemplates) {
    const gW = gateTmpl.width;
    const gH = gateTmpl.height;
    let gatePlaced = false;

    // Anchor primary gate on active approach corridor south of Metropolis
    const metroNode = placedNodes.find((n) => n.type === 'metropolis');
    if (metroNode && !placedNodes.some((n) => n.type === 'route_gate')) {
      const southGw = metroNode.gateways?.find((g) => g.direction === 'south');
      if (southGw) {
        const candX = southGw.x - Math.floor(gW / 2);
        const candY = southGw.y + 6;
        if (candY + gH < H - 4 && candX >= 4 && candX + gW < W - 4 && isAreaFree(candX, candY, gW, gH, 1)) {
          let flatGrass = true;
          for (let dy = 0; dy < gH; dy++) {
            for (let dx = 0; dx < gW; dx++) {
              if (
                continentMap.terrainMatrix[candY + dy]?.[candX + dx] !== 'grass' ||
                (continentMap.heightmap[candY + dy]?.[candX + dx] ?? 0) !== 0 ||
                continentMap.resolvedMountain.occupiedFootCells[candY + dy]?.[candX + dx]
              ) {
                flatGrass = false;
                break;
              }
            }
            if (!flatGrass) break;
          }
          if (flatGrass) {
            const midX = candX + Math.floor(gW / 2);
            const gateways: POIGateway[] = [
              { x: midX, y: candY, direction: 'north' },
              { x: midX, y: candY + gH - 1, direction: 'south' }
            ];
            const node: POINode = {
              id: gateTmpl.id,
              name: gateTmpl.name,
              type: gateTmpl.type,
              footprint: { width: gW, height: gH },
              terrainPreference: gateTmpl.preference,
              gridX: candX,
              gridY: candY,
              elevation: 0,
              facing: 'south',
              gateways
            };
            const layout = generateSettlementLayout(node, getSettlementContext());
            (node as { urbanLayout?: typeof layout }).urbanLayout = layout;
            placedNodes.push(node);
            markAreaOccupied(candX, candY, gW, gH);
            gatePlaced = true;
          }
        }
      }
    }

    if (!gatePlaced) {
      // General choke point placement in corridor between settlements
      for (let y = Math.floor(H * CHOKE_SEARCH_MIN_Y_RATIO); y < Math.floor(H * CHOKE_SEARCH_MAX_Y_RATIO); y += CHOKE_SEARCH_STEP) {
        for (let x = Math.floor(W * CHOKE_SEARCH_MIN_X_RATIO); x < Math.floor(W * CHOKE_SEARCH_MAX_X_RATIO); x += CHOKE_SEARCH_STEP) {
          if (!isAreaFree(x, y, gW, gH, 1)) continue;
          let flatGrass = true;
          for (let dy = 0; dy < gH; dy++) {
            for (let dx = 0; dx < gW; dx++) {
              if (
                continentMap.terrainMatrix[y + dy]?.[x + dx] !== 'grass' ||
                (continentMap.heightmap[y + dy]?.[x + dx] ?? 0) !== 0 ||
                continentMap.resolvedMountain.occupiedFootCells[y + dy]?.[x + dx]
              ) {
                flatGrass = false;
                break;
              }
            }
            if (!flatGrass) break;
          }
          if (flatGrass && getMinDistanceToPlaced(x + Math.floor(gW / 2), y + Math.floor(gH / 2)) >= 8) {
            const midX = x + Math.floor(gW / 2);
            const gateways: POIGateway[] = [
              { x: midX, y, direction: 'north' },
              { x: midX, y: y + gH - 1, direction: 'south' }
            ];
            const node: POINode = {
              id: gateTmpl.id,
              name: gateTmpl.name,
              type: gateTmpl.type,
              footprint: { width: gW, height: gH },
              terrainPreference: gateTmpl.preference,
              gridX: x,
              gridY: y,
              elevation: 0,
              facing: 'south',
              gateways
            };
            const layout = generateSettlementLayout(node, getSettlementContext());
            (node as { urbanLayout?: typeof layout }).urbanLayout = layout;
            placedNodes.push(node);
            markAreaOccupied(x, y, gW, gH);
            gatePlaced = true;
            break;
          }
        }
        if (gatePlaced) break;
      }
    }
  }

  // 2. PLACE DUNGEON FORESTS (needs large flat grass plain in wilderness clearings)
  const forestTemplates = activeCatalog.filter((t) => t.type === 'dungeon_forest');
  for (const tmpl of forestTemplates) {
    const candidateSizes = Math.min(W, H) >= REGIONAL_MASSIVE_DIMENSION
      ? [{ w: 26, h: 34 }, { w: 24, h: 30 }, { w: 20, h: 26 }, { w: 16, h: 16 }, { w: tmpl.width, h: tmpl.height }]
      : Math.min(W, H) >= REGIONAL_LARGE_DIMENSION
        ? [{ w: 20, h: 26 }, { w: 16, h: 16 }, { w: tmpl.width, h: tmpl.height }]
        : [{ w: tmpl.width, h: tmpl.height }];

    interface ForestBox {
      readonly x: number;
      readonly y: number;
      readonly w: number;
      readonly h: number;
    }

    const findBestForest = (): ForestBox | null => {
      let candidate: ForestBox | null = null;
      let maxDist = -1;

      for (const size of candidateSizes) {
        const curW = size.w;
        const curH = size.h;

        for (let y = 8; y < H - curH - 8; y += 2) {
          for (let x = 8; x < W - curW - 8; x += 2) {
            let valid = true;
            for (let dy = 0; dy < curH; dy++) {
              for (let dx = 0; dx < curW; dx++) {
                const cx = x + dx;
                const cy = y + dy;
                if (
                  continentMap.terrainMatrix[cy]?.[cx] !== 'grass' ||
                  continentMap.heightmap[cy]?.[cx] !== 0 ||
                  continentMap.resolvedMountain.occupiedFootCells[cy]?.[cx]
                ) {
                  valid = false;
                  break;
                }
              }
              if (!valid) break;
            }

            if (valid && isAreaFree(x, y, curW, curH, 2)) {
              const centerX = x + Math.floor(curW / 2);
              const centerY = y + Math.floor(curH / 2);
              const d = getMinDistanceToPlaced(centerX, centerY);
              const minForestDist = Math.min(W, H) <= 64 ? 4 : 8;
              if (d >= minForestDist && d > maxDist) {
                maxDist = d;
                candidate = { x, y, w: curW, h: curH };
              }
            }
          }
        }
        if (candidate !== null) return candidate;
      }
      return candidate;
    };

    const bestForest = findBestForest();

    if (bestForest) {
      const gateways = computeNodeGateways(bestForest.x, bestForest.y, bestForest.w, bestForest.h, tmpl.type);
      const node: POINode = {
        id: tmpl.id,
        name: tmpl.name,
        type: tmpl.type,
        footprint: { width: bestForest.w, height: bestForest.h },
        terrainPreference: tmpl.preference,
        gridX: bestForest.x,
        gridY: bestForest.y,
        elevation: 0,
        gateways
      };
      if (bestForest.w >= 16 && bestForest.h >= 16) {
        const layout = generateSettlementLayout(node, getSettlementContext());
        (node as { urbanLayout?: typeof layout }).urbanLayout = layout;
      }
      placedNodes.push(node);
      markAreaOccupied(bestForest.x, bestForest.y, bestForest.w, bestForest.h);
    }
  }

  // 3. PLACE CAVE ENTRANCES (must anchor strictly on south cliff wall faces)
  const caveTemplates = activeCatalog.filter((t) => t.type === 'cave_entrance');
  const caveCandidates: { x: number; y: number; elev: number }[] = [];

  for (let y = 4; y < H - 6; y++) {
    for (let x = 4; x < W - 6; x++) {
      const cell = continentMap.resolvedMountain.cellDetails[y]?.[x];

      if (
        cell &&
        cell.role === 'edge_south_top' &&
        cell.elevation >= 1 &&
        !cell.projectedFoot?.occupiesCell === false && // Not stairs
        isAreaFree(x, y, 1, 2, 2)
      ) {
        // Landing tile at y + 1 must be on flat walkable ground grass (elevation 0)
        const leftCell = continentMap.resolvedMountain.cellDetails[y]?.[x - 1];
        const rightCell = continentMap.resolvedMountain.cellDetails[y]?.[x + 1];
        const hasFlanks = leftCell?.role === 'edge_south_top' && rightCell?.role === 'edge_south_top';

        // Ground across foot and flanks must be flat grass at elevation 0
        let flatFoot = true;
        for (let dx = -1; dx <= 1; dx++) {
          if (continentMap.terrainMatrix[y + 1]?.[x + dx] !== 'grass') flatFoot = false;
          if ((continentMap.heightmap[y + 1]?.[x + dx] ?? 0) !== 0) flatFoot = false;
        }

        // Avoid placing caves right next to a jutting south cliff corner (x +- 2)
        const noJuttingCorner =
          (continentMap.heightmap[y + 1]?.[x - 2] ?? 0) === 0 &&
          (continentMap.heightmap[y + 1]?.[x + 2] ?? 0) === 0;

        // Deep solid mountain backing behind entrance (depth >= 3 tiles into massif)
        let hasDeepBacking = true;
        for (let dy = 1; dy <= 3; dy++) {
          if ((continentMap.heightmap[y - dy]?.[x] ?? 0) < cell.elevation) {
            hasDeepBacking = false;
            break;
          }
        }

        if (flatFoot && hasFlanks && noJuttingCorner && hasDeepBacking) {
          caveCandidates.push({ x, y, elev: cell.elevation });
        }
      }
    }
  }

  for (const tmpl of caveTemplates) {
    let bestCand: { x: number; y: number; elev: number } | null = null;
    let bestDist = -1;

    for (const cand of caveCandidates) {
      if (!isAreaFree(cand.x, cand.y, 1, 2, 2)) continue;
      const d = getMinDistanceToPlaced(cand.x, cand.y);
      const minCaveDist = Math.min(W, H) <= 64 ? 4 : 8;
      if (d >= minCaveDist && d > bestDist) {
        bestDist = d;
        bestCand = cand;
      }
    }

    if (bestCand) {
      const node: POINode = {
        id: tmpl.id,
        name: tmpl.name,
        type: tmpl.type,
        footprint: { width: tmpl.width, height: tmpl.height },
        terrainPreference: tmpl.preference,
        gridX: bestCand.x,
        gridY: bestCand.y,
        elevation: bestCand.elev,
        facing: 'south',
        gateways: [{ x: bestCand.x, y: bestCand.y + 1, direction: 'south' }]
      };
      placedNodes.push(node);
      markAreaOccupied(bestCand.x, bestCand.y, 1, 2);
    }
  }

  // 4. PLACE COASTAL HARBOR DOCKS & FERRY PIERS
  placeCoastalHarborDocks({
    continentMap,
    placedNodes,
    isAreaFree,
    markAreaOccupied,
    getMinDistanceToPlaced,
    nextRng
  });

  // 5. PLACE WATER LANDMARKS (Shrines in lakes, Lighthouses in coastal bays)
  const isOcean = computeOceanGrid(continentMap);
  const waterTemplates = activeCatalog.filter((t) => t.type === 'water_landmark');
  for (const tmpl of waterTemplates) {
    let bestWater: { x: number; y: number } | null = null;
    let bestDist = -Infinity;
    const isLakeLandmark = tmpl.id === 'lake_shrine' || tmpl.name.toLowerCase().includes('lago');
    const isletMargin = isLakeLandmark ? 1 : 2;

    for (let y = isletMargin + 3; y < H - tmpl.height - isletMargin - 3; y += 1) {
      for (let x = isletMargin + 3; x < W - tmpl.width - isletMargin - 3; x += 1) {
        if (!isAreaFree(x - isletMargin, y - isletMargin, tmpl.width + isletMargin * 2, tmpl.height + isletMargin * 2, 1)) continue;

        let allWater = true;
        for (let dy = -isletMargin; dy < tmpl.height + isletMargin; dy++) {
          for (let dx = -isletMargin; dx < tmpl.width + isletMargin; dx++) {
            if (continentMap.terrainMatrix[y + dy]?.[x + dx] !== 'water') {
              allWater = false;
              break;
            }
          }
          if (!allWater) break;
        }

        if (allWater) {
          const cx = x + Math.floor(tmpl.width / 2);
          const cy = y + Math.floor(tmpl.height / 2);
          const isCandidateOcean = Boolean(isOcean[cy]?.[cx]);
          if (isLakeLandmark && isCandidateOcean) continue;
          if (!isLakeLandmark && !isCandidateOcean) continue;

          // Measure distance from candidate perimeter to nearest continental shore (grass or sand)
          let edgeDistToShore = Infinity;
          for (let dy = -MAX_SHORE_SEARCH_RADIUS; dy <= tmpl.height + MAX_SHORE_SEARCH_RADIUS; dy++) {
            for (let dx = -MAX_SHORE_SEARCH_RADIUS; dx <= tmpl.width + MAX_SHORE_SEARCH_RADIUS; dx++) {
              const ny = y + dy;
              const nx = x + dx;
              if (ny >= 0 && ny < H && nx >= 0 && nx < W) {
                const terr = continentMap.terrainMatrix[ny]![nx]!;
                if (terr === 'grass' || terr === 'sand') {
                  const cdx = nx < x - isletMargin ? (x - isletMargin) - nx : nx > x + tmpl.width - 1 + isletMargin ? nx - (x + tmpl.width - 1 + isletMargin) : 0;
                  const cdy = ny < y - isletMargin ? (y - isletMargin) - ny : ny > y + tmpl.height - 1 + isletMargin ? ny - (y + tmpl.height - 1 + isletMargin) : 0;
                  const dist = Math.hypot(cdx, cdy);
                  if (dist < edgeDistToShore) edgeDistToShore = dist;
                }
              }
            }
          }

          const d = getMinDistanceToPlaced(cx, cy);

          // For lake landmarks: prefer inland freshwater lakes with 1 to 10 cells of water to shore
          const minShoreDist = isLakeLandmark ? 1 : 2;
          const maxShoreDist = isLakeLandmark ? 10 : 16;
          const idealDist = isLakeLandmark ? 2.0 : 6.0;
          const minLandmarkDist = W <= 64 ? 6 : 8;

          if (edgeDistToShore >= minShoreDist && edgeDistToShore <= maxShoreDist && d >= minLandmarkDist) {
            let score = -Math.abs(edgeDistToShore - idealDist) * 3.0 + Math.min(d, 24);
            if (isLakeLandmark && !isCandidateOcean) {
              score += 1000;
            } else if (!isLakeLandmark && isCandidateOcean) {
              score += 1000;
            }
            if (score > bestDist) {
              bestDist = score;
              bestWater = { x, y };
            }
          }
        }
      }
    }

    if (bestWater) {
      // Sculpt natural grassy/sandy islet (Route 12 guru house / lighthouse canonical style)
      // Lake landmarks in forests/plains: 100% pure grass islet without sand.
      // Coastal/ocean landmarks: central grass lawn surrounded by continuous 2-cell wide sand beach.
      const grassMargin = 1;
      const grassX1 = Math.max(1, bestWater.x - grassMargin);
      const grassX2 = Math.min(W - 2, bestWater.x + tmpl.width + (grassMargin - 1));
      const grassY1 = Math.max(1, bestWater.y - grassMargin);
      const grassY2 = Math.min(H - 2, bestWater.y + tmpl.height + (grassMargin - 1));

      const beachMargin = isLakeLandmark ? 0 : 2;
      const isletX1 = Math.max(1, grassX1 - beachMargin);
      const isletX2 = Math.min(W - 2, grassX2 + beachMargin);
      const isletY1 = Math.max(1, grassY1 - beachMargin);
      const isletY2 = Math.min(H - 2, grassY2 + beachMargin);

      for (let iy = isletY1; iy <= isletY2; iy++) {
        for (let ix = isletX1; ix <= isletX2; ix++) {
          const isOuterCorner =
            (ix === isletX1 && iy === isletY1) ||
            (ix === isletX2 && iy === isletY1) ||
            (ix === isletX1 && iy === isletY2) ||
            (ix === isletX2 && iy === isletY2);

          if (isLakeLandmark) {
            if (isOuterCorner) continue;
          } else {
            // For ocean islets, round outer sand corners so island is naturally curved
            if (isOuterCorner) continue;
          }

          // Round the grass core at corners into sand so no grass cell touches ocean water
          const isGrassCorner =
            !isLakeLandmark &&
            ((ix === grassX1 && iy === grassY1) ||
             (ix === grassX2 && iy === grassY1) ||
             (ix === grassX1 && iy === grassY2) ||
             (ix === grassX2 && iy === grassY2));

          const isGrass = isLakeLandmark || (!isGrassCorner && ix >= grassX1 && ix <= grassX2 && iy >= grassY1 && iy <= grassY2);
          const terr: WaterTerrainKind = isGrass ? 'grass' : 'sand';
          (continentMap.terrainMatrix as WaterTerrainKind[][])[iy]![ix] = terr;
          const cell = continentMap.cells[iy]![ix]!;
          (cell as { terrain: string }).terrain = terr;
          (cell as { isWalkable: boolean }).isWalkable = true;
          (cell as { elevation: number }).elevation = 0;
        }
      }

      // Re-resolve water & coast autotiles so the new islet and surrounding water have canonical shore autotiles
      (continentMap as { resolvedWater: ResolvedWaterMapResult }).resolvedWater = resolveWaterCoastGrid(
        continentMap.terrainMatrix
      );
      for (let iy = Math.max(0, isletY1 - 2); iy <= Math.min(H - 1, isletY2 + 2); iy++) {
        for (let ix = Math.max(0, isletX1 - 2); ix <= Math.min(W - 1, isletX2 + 2); ix++) {
          const cell = continentMap.cells[iy]![ix]!;
          const wCell = continentMap.resolvedWater.cellDetails[iy]?.[ix];
          (cell as { terrain: string }).terrain = continentMap.terrainMatrix[iy]![ix]!;
          (cell as { waterRole: string | undefined }).waterRole = wCell?.role;
        }
      }

      // Directional perimeter gateways:
      // For lake shrines, a single scenic southern gateway prevents artificial 4-way cross bridges
      const midIsletX = Math.floor((isletX1 + isletX2) / 2);
      const midIsletY = Math.floor((isletY1 + isletY2) / 2);
      const isletGateways: POIGateway[] = isLakeLandmark
        ? [{ x: midIsletX, y: isletY2, direction: 'south' }]
        : [
            { x: midIsletX, y: isletY1, direction: 'north' },
            { x: midIsletX, y: isletY2, direction: 'south' },
            { x: isletX2, y: midIsletY, direction: 'east' },
            { x: isletX1, y: midIsletY, direction: 'west' }
          ];

      const buildingFile = isLakeLandmark
        ? 'house_wood_flowers.png'
        : 'poke_port_lighthouse_beacon.png';

      const node: POINode = {
        id: tmpl.id,
        name: tmpl.name,
        type: tmpl.type,
        footprint: { width: tmpl.width, height: tmpl.height },
        terrainPreference: tmpl.preference,
        gridX: bestWater.x,
        gridY: bestWater.y,
        elevation: 0,
        gateways: isletGateways,
        buildingFile
      };
      placedNodes.push(node);
      markAreaOccupied(bestWater.x, bestWater.y, tmpl.width, tmpl.height);
    }
  }

  return placedNodes;
}
