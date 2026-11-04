/**
 * test_aventura/logic/map/settlementPlainPlacementEngine.ts
 *
 * REGIONAL URBAN SETTLEMENT PLAIN PLACEMENT ENGINE
 *
 * Distributes Metropolis, Gym Cities, Towns and Route Gate Checkpoints
 * across regional flat grass plains with clearance buffers and gateways.
 */

import {
  COMPACT_MAP_THRESHOLD,
  COMPACT_METROPOLIS_MIN_DIST,
  COMPACT_CITY_MIN_DIST,
  COMPACT_TOWN_MIN_DIST,
  COMPACT_DEFAULT_MIN_DIST,
  STANDARD_METROPOLIS_MIN_DIST,
  STANDARD_CITY_MIN_DIST,
  STANDARD_TOWN_MIN_DIST,
  STANDARD_DEFAULT_MIN_DIST,
  METROPOLIS_FALLBACK_SIZES,
  CINNABAR_ISLAND_FOOTPRINT_WIDTH,
  CINNABAR_ISLAND_FOOTPRINT_HEIGHT,
  GATE_MIN_DISTANCE_TO_SETTLEMENT,
  FALLBACK_MIN_DISTANCE_COMPACT,
  FALLBACK_MIN_DISTANCE_DEFAULT
} from '../../config/poiPlacementConfig.ts';
import {
  GEO_CARDINAL_DIRECTIONS,
  type POINode,
  type POIGateway
} from '../../types/map/poiTypes.ts';
import { generateSettlementLayout, type SettlementTerrainContext } from './cityLayoutEngine.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import type { RegionalPOITemplate } from './regionalPoiCatalog.ts';
import type { WaterTerrainKind } from './waterAutotileEngine.ts';

const CHOKE_SEARCH_MIN_Y_RATIO = 0.25 as const;
const CHOKE_SEARCH_MAX_Y_RATIO = 0.65 as const;
const CHOKE_SEARCH_MIN_X_RATIO = 0.2 as const;
const CHOKE_SEARCH_MAX_X_RATIO = 0.8 as const;
const CHOKE_SEARCH_STEP = 3 as const;

const PLAIN_SETTLEMENT_TYPE_LIST = ['metropolis', 'city', 'town'] as const;
type PlainSettlementType = (typeof PLAIN_SETTLEMENT_TYPE_LIST)[number];
const PLAIN_SETTLEMENT_TYPES: ReadonlySet<PlainSettlementType> = new Set<PlainSettlementType>(
  PLAIN_SETTLEMENT_TYPE_LIST
);

export interface PlainSettlementsContext {
  readonly continentMap: ContinentMapResult;
  readonly activeCatalog: readonly RegionalPOITemplate[];
  readonly placedNodes: POINode[];
  readonly isAreaFree: (x: number, y: number, w: number, h: number, margin?: number) => boolean;
  readonly markAreaOccupied: (x: number, y: number, w: number, h: number) => void;
  readonly getMinDistanceToPlaced: (x: number, y: number) => number;
  readonly computeNodeGateways: (
    x: number,
    y: number,
    w: number,
    h: number,
    type: POINode['type']
  ) => POIGateway[];
  readonly getSettlementContext: () => SettlementTerrainContext;
  readonly baseMinSettlementDist: number;
}

interface PlainCand {
  readonly x: number;
  readonly y: number;
  readonly distToCenter: number;
  readonly distToPlaced: number;
}

function isBufferAreaFlatPlain(
  x: number,
  y: number,
  curW: number,
  curH: number,
  reqBuffer: number,
  W: number,
  H: number,
  continentMap: ContinentMapResult
): boolean {
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
        return false;
      }
    }
  }
  return true;
}

function findCandidatesWithBuffer(
  continentMap: ContinentMapResult,
  curW: number,
  curH: number,
  reqBuffer: number,
  reqMinDist: number,
  isAreaFree: (x: number, y: number, w: number, h: number, margin?: number) => boolean,
  getMinDistanceToPlaced: (x: number, y: number) => number,
  W: number,
  H: number
): PlainCand[] {
  const candidates: PlainCand[] = [];
  for (let y = 4; y < H - curH - 4; y++) {
    for (let x = 4; x < W - curW - 4; x++) {
      if (!isAreaFree(x, y, curW, curH, 2)) continue;

      if (!isBufferAreaFlatPlain(x, y, curW, curH, reqBuffer, W, H, continentMap)) continue;

      const cx = x + Math.floor(curW / 2);
      const cy = y + Math.floor(curH / 2);
      const distToCenter = Math.hypot(cx - W / 2, cy - H / 2);
      const distToPlaced = getMinDistanceToPlaced(cx, cy);

      if (distToPlaced >= reqMinDist) {
        candidates.push({ x, y, distToCenter, distToPlaced });
      }
    }
  }
  return candidates;
}

function isAreaFlatGrass(
  continentMap: ContinentMapResult,
  startX: number,
  startY: number,
  width: number,
  height: number
): boolean {
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const cx = startX + dx;
      const cy = startY + dy;
      if (
        continentMap.terrainMatrix[cy]?.[cx] !== 'grass' ||
        (continentMap.heightmap[cy]?.[cx] ?? 0) !== 0 ||
        continentMap.resolvedMountain.occupiedFootCells[cy]?.[cx]
      ) {
        return false;
      }
    }
  }
  return true;
}

function placeArchipelagoSecondaryLandmark(
  secIsland: NonNullable<ContinentMapResult['archipelagoIslands']>[number],
  placedNodes: POINode[],
  isAreaFree: (x: number, y: number, w: number, h: number, margin?: number) => boolean,
  markAreaOccupied: (x: number, y: number, w: number, h: number) => void
): void {
  if (secIsland.role === 'lighthouse') {
    const lhW = 6;
    const lhH = 7;
    const lx = secIsland.cx - Math.floor(lhW / 2);
    const ly = secIsland.cy - Math.floor(lhH / 2);
    if (!isAreaFree(lx, ly, lhW, lhH, 1)) return;
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
    return;
  }

  if (secIsland.role === 'sea_cave') {
    const scW = 2;
    const scH = 2;
    const sx = secIsland.cx - Math.floor(scW / 2);
    const sy = secIsland.cy - Math.floor(scH / 2);
    if (!isAreaFree(sx, sy, scW, scH, 1)) return;
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
    return;
  }

  if (secIsland.role === 'shrine') {
    const shW = 4;
    const shH = 4;
    const rx = secIsland.cx - Math.floor(shW / 2);
    const ry = secIsland.cy - Math.floor(shH / 2);
    if (!isAreaFree(rx, ry, shW, shH, 1)) return;
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

function flattenIslandArea(
  posX: number,
  posY: number,
  width: number,
  height: number,
  W: number,
  H: number,
  continentMap: ContinentMapResult
): void {
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const cy = posY + dy;
      const cx = posX + dx;
      if (cy >= 0 && cy < H && cx >= 0 && cx < W) {
        (continentMap.terrainMatrix as WaterTerrainKind[][])[cy]![cx] = 'grass';
        (continentMap.heightmap as number[][])[cy]![cx] = 0;
      }
    }
  }
}

/**
 * Places plain settlements (Metropolis, City, Town).
 */
export function placePlainSettlements(ctx: PlainSettlementsContext): void {
  const {
    continentMap,
    activeCatalog,
    placedNodes,
    isAreaFree,
    markAreaOccupied,
    getMinDistanceToPlaced,
    computeNodeGateways,
    getSettlementContext,
    baseMinSettlementDist
  } = ctx;
  const W = continentMap.width;
  const H = continentMap.height;

  const plainTemplates = activeCatalog.filter((t) =>
    PLAIN_SETTLEMENT_TYPES.has(t.type as PlainSettlementType)
  );

  for (const tmpl of plainTemplates) {
    if (placedNodes.some((n) => n.id === tmpl.id)) continue;

    if (
      tmpl.id === 'cinnabar_island_city' &&
      continentMap.archipelagoIslands &&
      continentMap.archipelagoIslands.length > 0
    ) {
      const island =
        continentMap.archipelagoIslands.find((i) => i.role === 'port_city') ??
        continentMap.archipelagoIslands[0]!;
      const iW = CINNABAR_ISLAND_FOOTPRINT_WIDTH;
      const iH = CINNABAR_ISLAND_FOOTPRINT_HEIGHT;
      const posX = island.cx - Math.floor(iW / 2);
      const posY = island.cy - Math.floor(iH / 2);

      flattenIslandArea(posX, posY, iW, iH, W, H, continentMap);

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
        placeArchipelagoSecondaryLandmark(secIsland, placedNodes, isAreaFree, markAreaOccupied);
      }

      continue;
    }

    const isCompact = Math.min(W, H) <= COMPACT_MAP_THRESHOLD;
    const baseDist = isCompact
      ? tmpl.type === 'metropolis'
        ? COMPACT_METROPOLIS_MIN_DIST
        : tmpl.type === 'city'
          ? COMPACT_CITY_MIN_DIST
          : tmpl.type === 'town'
            ? COMPACT_TOWN_MIN_DIST
            : COMPACT_DEFAULT_MIN_DIST
      : tmpl.type === 'metropolis'
        ? STANDARD_METROPOLIS_MIN_DIST
        : tmpl.type === 'city'
          ? STANDARD_CITY_MIN_DIST
          : tmpl.type === 'town'
            ? STANDARD_TOWN_MIN_DIST
            : STANDARD_DEFAULT_MIN_DIST;
    let effMinDist = Math.max(baseMinSettlementDist, baseDist);

    let currentWidth = tmpl.width;
    let currentHeight = tmpl.height;

    const preferredBuffer = tmpl.type === 'metropolis' ? 2 : 1;
    let plainCandidates = findCandidatesWithBuffer(
      continentMap,
      currentWidth,
      currentHeight,
      preferredBuffer,
      effMinDist,
      isAreaFree,
      getMinDistanceToPlaced,
      W,
      H
    );
    if (plainCandidates.length === 0 && preferredBuffer > 0) {
      plainCandidates = findCandidatesWithBuffer(
        continentMap,
        currentWidth,
        currentHeight,
        0,
        effMinDist,
        isAreaFree,
        getMinDistanceToPlaced,
        W,
        H
      );
    }
    if (plainCandidates.length === 0 && tmpl.type === 'metropolis') {
      for (const size of METROPOLIS_FALLBACK_SIZES) {
        currentWidth = size.w;
        currentHeight = size.h;
        plainCandidates = findCandidatesWithBuffer(
          continentMap,
          currentWidth,
          currentHeight,
          0,
          effMinDist,
          isAreaFree,
          getMinDistanceToPlaced,
          W,
          H
        );
        if (plainCandidates.length > 0) break;
      }
    }
    if (
      plainCandidates.length === 0 &&
      effMinDist > (isCompact ? FALLBACK_MIN_DISTANCE_COMPACT : FALLBACK_MIN_DISTANCE_DEFAULT)
    ) {
      effMinDist = isCompact ? FALLBACK_MIN_DISTANCE_COMPACT : FALLBACK_MIN_DISTANCE_DEFAULT;
      plainCandidates = findCandidatesWithBuffer(
        continentMap,
        currentWidth,
        currentHeight,
        0,
        effMinDist,
        isAreaFree,
        getMinDistanceToPlaced,
        W,
        H
      );
    }
    if (plainCandidates.length === 0 && effMinDist > 3) {
      effMinDist = 3;
      plainCandidates = findCandidatesWithBuffer(
        continentMap,
        currentWidth,
        currentHeight,
        0,
        effMinDist,
        isAreaFree,
        getMinDistanceToPlaced,
        W,
        H
      );
    }

    if (plainCandidates.length > 0) {
      let chosen: PlainCand;
      if (tmpl.type === 'metropolis') {
        plainCandidates.sort((a, b) => a.distToCenter - b.distToCenter);
        chosen = plainCandidates[0]!;
      } else {
        plainCandidates.sort((a, b) => b.distToPlaced - a.distToPlaced);
        chosen = plainCandidates[0]!;
      }

      if (tmpl.id === 'cinnabar_island_city' && continentMap.archipelagoIslands?.length) {
        const portIsland = continentMap.archipelagoIslands.find(
          (isl) => isl.role === 'port_city' || isl.id === 'island_port_main'
        );
        const islandCand = portIsland
          ? plainCandidates.find(
              (c) =>
                c.x >= portIsland.bounds.minX - 2 &&
                c.x + currentWidth <= portIsland.bounds.maxX + 2 &&
                c.y >= portIsland.bounds.minY - 2 &&
                c.y + currentHeight <= portIsland.bounds.maxY + 2
            )
          : undefined;
        if (islandCand) {
          chosen = islandCand;
        }
      }

      const gateways = computeNodeGateways(
        chosen.x,
        chosen.y,
        currentWidth,
        currentHeight,
        tmpl.type
      );
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

      const layout = generateSettlementLayout(node, getSettlementContext());
      (node as { urbanLayout?: typeof layout }).urbanLayout = layout;

      placedNodes.push(node);
      markAreaOccupied(chosen.x, chosen.y, currentWidth, currentHeight);
    }
  }
}

function tryPlaceFallbackGate(
  gateTmpl: RegionalPOITemplate,
  gW: number,
  gH: number,
  W: number,
  H: number,
  continentMap: ContinentMapResult,
  ctx: PlainSettlementsContext
): boolean {
  const isCompact = Math.min(W, H) <= COMPACT_MAP_THRESHOLD;
  const minGateDist = isCompact ? 4 : GATE_MIN_DISTANCE_TO_SETTLEMENT;
  const minYRatio = isCompact ? 0.12 : CHOKE_SEARCH_MIN_Y_RATIO;
  const maxYRatio = isCompact ? 0.88 : CHOKE_SEARCH_MAX_Y_RATIO;
  const minXRatio = isCompact ? 0.12 : CHOKE_SEARCH_MIN_X_RATIO;
  const maxXRatio = isCompact ? 0.88 : CHOKE_SEARCH_MAX_X_RATIO;
  const step = isCompact ? 2 : CHOKE_SEARCH_STEP;

  for (let y = Math.floor(H * minYRatio); y < Math.floor(H * maxYRatio); y += step) {
    for (let x = Math.floor(W * minXRatio); x < Math.floor(W * maxXRatio); x += step) {
      if (!ctx.isAreaFree(x, y, gW, gH, 1)) continue;
      if (!isAreaFlatGrass(continentMap, x, y, gW, gH)) continue;
      if (
        ctx.getMinDistanceToPlaced(x + Math.floor(gW / 2), y + Math.floor(gH / 2)) < minGateDist
      ) {
        continue;
      }

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
      const layout = generateSettlementLayout(node, ctx.getSettlementContext());
      (node as { urbanLayout?: typeof layout }).urbanLayout = layout;
      ctx.placedNodes.push(node);
      ctx.markAreaOccupied(x, y, gW, gH);
      return true;
    }
  }
  return false;
}

/**
 * Places route gate checkpoints between settlements and around metropolis corridors.
 */
export function placeRouteGateCheckpoints(ctx: PlainSettlementsContext): void {
  const {
    continentMap,
    activeCatalog,
    placedNodes,
    isAreaFree,
    markAreaOccupied,
    getSettlementContext
  } = ctx;
  const W = continentMap.width;
  const H = continentMap.height;
  const seed = continentMap.seed;

  const routeGateTemplates = activeCatalog.filter((t) => t.type === 'route_gate');
  const isCompactMap = Math.min(W, H) <= COMPACT_MAP_THRESHOLD;

  for (let gateIdx = 0; gateIdx < routeGateTemplates.length; gateIdx++) {
    const gateTmpl = routeGateTemplates[gateIdx]!;
    const gW = gateTmpl.width;
    const gH = gateTmpl.height;
    let gatePlaced = false;

    // Gate 0: Procedural settlement anchor selection across diverse seeds and directions.
    if (gateIdx === 0) {
      const metroNode = placedNodes.find((n) => n.type === 'metropolis');
      if (metroNode?.gateways && metroNode.gateways.length > 0) {
        const preferredDir = GEO_CARDINAL_DIRECTIONS[(seed + 3) % GEO_CARDINAL_DIRECTIONS.length];

        const chosenGw =
          metroNode.gateways.find((g) => g.direction === preferredDir) ??
          metroNode.gateways.find((g) => g.direction === 'south') ??
          metroNode.gateways[0]!;

        const isHorizontal = chosenGw.direction === 'east' || chosenGw.direction === 'west';
        const offset = isCompactMap ? 4 : 6 + (seed % 3 === 0 ? 0 : (seed % 3) * 2);

        let candX = chosenGw.x;
        let candY = chosenGw.y;
        if (chosenGw.direction === 'south') {
          candX = chosenGw.x - Math.floor(gW / 2);
          candY = chosenGw.y + offset;
        } else if (chosenGw.direction === 'north') {
          candX = chosenGw.x - Math.floor(gW / 2);
          candY = chosenGw.y - offset - gH;
        } else if (chosenGw.direction === 'east') {
          candX = chosenGw.x + offset;
          candY = chosenGw.y - Math.floor(gH / 2);
        } else if (chosenGw.direction === 'west') {
          candX = chosenGw.x - offset - gW;
          candY = chosenGw.y - Math.floor(gH / 2);
        }

        const margin = isCompactMap ? 2 : 4;
        const inBounds =
          candY >= margin && candY + gH < H - margin && candX >= margin && candX + gW < W - margin;

        if (
          inBounds &&
          isAreaFree(candX, candY, gW, gH, 1) &&
          isAreaFlatGrass(continentMap, candX, candY, gW, gH)
        ) {
          const midX = candX + Math.floor(gW / 2);
          const midY = candY + Math.floor(gH / 2);
          const gateways: POIGateway[] = isHorizontal
            ? [
                { x: candX, y: midY, direction: 'west' },
                { x: candX + gW - 1, y: midY, direction: 'east' }
              ]
            : [
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
            facing: chosenGw.direction,
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

    if (!gatePlaced) {
      tryPlaceFallbackGate(gateTmpl, gW, gH, W, H, continentMap, ctx);
    }
  }
}
