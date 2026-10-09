/**
 * src/logic/map/continent/routeGatePlacementEngine.ts
 *
 * PROCEDURAL ROUTE GATEHOUSE CHECKPOINT PLACEMENT & CORRIDOR SPLICING
 *
 * Responsibilities:
 *   1. Scans corridor paths (main_chain and cycle) across the regional map.
 *   2. Identifies flat grass corridor segments with sufficient clearance away from
 *      regional settlements, mountains, and other gatehouses.
 *   3. Places 10x10 route_gate checkpoint POIs with generated settlement layouts.
 *   4. Splices incident corridors into two segments connecting cleanly via North
 *      and South archway doorway gateways.
 */

import type { CardinalDirection, POINode, SettlementLayoutResult } from '../../../types/map/poiTypes.ts';
import type { ContinentMapResult } from '../continentGenerator.ts';
import type { SettlementTerrainContext } from '../cityLayoutEngine.ts';
import { generateSettlementLayout } from '../cityLayoutEngine.ts';
import type { EmbeddedCorridor, EmbeddedCorridorWaypoint } from '../../../types/map/pokemonGraphTypes.ts';

export interface SplicedEmbeddedCorridor extends EmbeddedCorridor {
  readonly customStartGw?: EmbeddedCorridorWaypoint;
  readonly customGoalGw?: EmbeddedCorridorWaypoint;
}

export interface RouteGatePlacementOptions {
  readonly continent: ContinentMapResult;
  readonly pois: POINode[];
  readonly poiById: Map<string, POINode>;
  readonly corridors: readonly EmbeddedCorridor[];
  readonly settlementContext: SettlementTerrainContext;
  readonly seed: number;
  readonly width: number;
  readonly height: number;
}

export interface RouteGatePlacementResult {
  readonly placedGates: readonly POINode[];
  readonly activeCorridors: SplicedEmbeddedCorridor[];
}

const MIN_GATE_CORRIDOR_LENGTH = 25;
const MIN_GATE_PROXIMITY_DISTANCE = 25;
const GATE_SEARCH_START_RATIO = 0.25;
const GATE_SEARCH_END_RATIO = 0.75;
const GATE_BORDER_MARGIN = 10;
const GATE_CLEARANCE_EXTENT = 10;
const GATE_SEARCH_OFFSET = 5;
const GATE_DEFAULT_SIZE = 10;
const MIN_ROUTE_GATES = 2;
const RANDOM_ROUTE_GATES_RANGE = 4;
const GATE_RNG_XOR_MASK = 0x5a17e089;
const GATE_PRNG_MULTIPLIER = 1664525;
const GATE_PRNG_INCREMENT = 1013904223;
const GATE_PRNG_SHIFT = 16;
const GATE_PRNG_MODULO = 65536;
const GATE_SEED_MULTIPLIER = 31;

const PRIMARY_CORRIDOR_KINDS: ReadonlySet<string> = new Set(['main_chain', 'cycle']);
const FALLBACK_CORRIDOR_KINDS: ReadonlySet<string> = new Set(['main_chain', 'cycle', 'branch_stub']);
const PRIMARY_GATE_MIN_SEPARATION = 10;
const FALLBACK_GATE_CORRIDOR_LENGTH = 16;
const FALLBACK_GATE_SEARCH_START_RATIO = 0.15;
const FALLBACK_GATE_SEARCH_END_RATIO = 0.85;
const FALLBACK_GATE_PROXIMITY_DISTANCE = 18;
const FALLBACK_GATE_MIN_SEPARATION = 6;

/**
 * Places procedural route gatehouse checkpoints along candidate routes and splices corridors.
 */
export function placeProceduralRouteGates(
  options: RouteGatePlacementOptions
): RouteGatePlacementResult {
  const { continent, pois, poiById, corridors, settlementContext, seed, width, height } = options;

  const activeCorridors: SplicedEmbeddedCorridor[] = [...corridors];
  let gateIndex = 1;
  const placedGates: POINode[] = [];

  let gateRngState = (seed ^ GATE_RNG_XOR_MASK) >>> 0;
  const nextGateRng = (): number => {
    gateRngState = (Math.imul(gateRngState, GATE_PRNG_MULTIPLIER) + GATE_PRNG_INCREMENT) >>> 0;
    return (gateRngState >>> GATE_PRNG_SHIFT) / GATE_PRNG_MODULO;
  };
  const targetGateCount = MIN_ROUTE_GATES + Math.floor(nextGateRng() * RANDOM_ROUTE_GATES_RANGE); // 2, 3, 4, or 5

  const tryPlaceOnCorridors = (
    allowedKinds: ReadonlySet<string>,
    minLen: number,
    startRatio: number,
    endRatio: number,
    minProximity: number,
    minSep: number
  ): void => {
    for (let cIdx = 0; cIdx < activeCorridors.length; cIdx++) {
      if (placedGates.length >= targetGateCount) break;
      const corridor = activeCorridors[cIdx]!;
      if (!allowedKinds.has(corridor.kind)) continue;

      const fromPoi = poiById.get(corridor.fromId);
      const toPoi = poiById.get(corridor.toId);
      if (!fromPoi || !toPoi) continue;
      // Strictly forbid gatehouses approaching or inside Pokémon League
      if (fromPoi.type === 'pokemon_league' || toPoi.type === 'pokemon_league') continue;

      const len = corridor.pathCells.length;
      if (len < minLen) continue;

      let found: { i: number; pt: { x: number; y: number }; gx: number; gy: number } | null = null;
      const startIdx = Math.floor(len * startRatio);
      const endIdx = Math.floor(len * endRatio);

      for (let i = startIdx; i <= endIdx; i++) {
        const pt = corridor.pathCells[i]!;
        const gx = pt.x - GATE_SEARCH_OFFSET;
        const gy = pt.y - GATE_SEARCH_OFFSET;
        if (
          gx < GATE_BORDER_MARGIN ||
          gx + GATE_BORDER_MARGIN >= width - GATE_BORDER_MARGIN ||
          gy < GATE_BORDER_MARGIN ||
          gy + GATE_BORDER_MARGIN >= height - GATE_BORDER_MARGIN
        ) {
          continue;
        }

        let valid = true;
        for (let dy = -2; dy <= GATE_CLEARANCE_EXTENT + 1; dy++) {
          for (let dx = -2; dx <= GATE_CLEARANCE_EXTENT + 1; dx++) {
            const x = gx + dx;
            const y = gy + dy;
            if (
              x < 0 ||
              x >= width ||
              y < 0 ||
              y >= height ||
              continent.terrainMatrix[y]?.[x] === 'water' ||
              continent.terrainMatrix[y]?.[x] === 'water_deep' ||
              continent.terrainMatrix[y]?.[x] !== 'grass' ||
              (continent.heightmap[y]?.[x] ?? 0) !== 0 ||
              continent.resolvedMountain.occupiedFootCells[y]?.[x]
            ) {
              valid = false;
              break;
            }
          }
          if (!valid) break;
        }

        if (valid) {
          const cx = gx + GATE_SEARCH_OFFSET;
          const cy = gy + GATE_SEARCH_OFFSET;
          let tooClose = false;
          for (const p of pois) {
            const px = p.gridX + Math.floor(p.footprint.width / 2);
            const py = p.gridY + Math.floor(p.footprint.height / 2);
            if (Math.hypot(cx - px, cy - py) < minProximity) {
              tooClose = true;
              break;
            }
            // Edge-to-edge AABB clearance
            const sepX = Math.max(0, p.gridX - (gx + GATE_DEFAULT_SIZE), gx - (p.gridX + p.footprint.width));
            const sepY = Math.max(0, p.gridY - (gy + GATE_DEFAULT_SIZE), gy - (p.gridY + p.footprint.height));
            if (Math.hypot(sepX, sepY) < minSep) {
              tooClose = true;
              break;
            }
          }
          for (const g of placedGates) {
            const gx2 = g.gridX + GATE_SEARCH_OFFSET;
            const gy2 = g.gridY + GATE_SEARCH_OFFSET;
            if (Math.hypot(cx - gx2, cy - gy2) < minProximity) {
              tooClose = true;
              break;
            }
          }
          if (!tooClose) {
            found = { i, pt, gx, gy };
            break;
          }
        }
      }

      if (found) {
        const gateId = `route_gate_${gateIndex++}`;

        // Detect local tangent orientation of corridor path to choose horizontal vs vertical gatehouse
        const samplePrev = corridor.pathCells[Math.max(0, found.i - 3)]!;
        const sampleNext = corridor.pathCells[Math.min(corridor.pathCells.length - 1, found.i + 3)]!;
        const deltaX = Math.abs(sampleNext.x - samplePrev.x);
        const deltaY = Math.abs(sampleNext.y - samplePrev.y);
        const isHorizontalCorridor = deltaX > deltaY;
        const gateFacing: CardinalDirection = isHorizontalCorridor
          ? (sampleNext.x >= samplePrev.x ? 'east' : 'west')
          : (sampleNext.y >= samplePrev.y ? 'south' : 'north');

        const gatePoi: POINode = {
          id: gateId,
          name: `Aduana de Control ${gateIndex - 1}`,
          type: 'route_gate',
          footprint: { width: GATE_DEFAULT_SIZE, height: GATE_DEFAULT_SIZE },
          terrainPreference: 'flat_grass',
          gridX: found.gx,
          gridY: found.gy,
          elevation: 0,
          facing: gateFacing
        };
        let gateSeed = seed;
        for (let i = 0; i < gateId.length; i++) {
          gateSeed = (Math.imul(gateSeed, GATE_SEED_MULTIPLIER) + gateId.charCodeAt(i)) >>> 0;
        }
        const layout = generateSettlementLayout(gatePoi, settlementContext, gateSeed);
        (gatePoi as { urbanLayout?: SettlementLayoutResult }).urbanLayout = layout;

        pois.push(gatePoi);
        placedGates.push(gatePoi);
        poiById.set(gateId, gatePoi);

        // Determine complementary doorways for clean through-transit
        let c1Goal: { x: number; y: number };
        let c2Start: { x: number; y: number };

        if (isHorizontalCorridor) {
          // Horizontal gate: West and East archways at building doorway rows
          const bldGy = found.gy + Math.floor((GATE_DEFAULT_SIZE - 5) / 2);
          const doorY = bldGy + 3;
          const westDoor = { x: Math.max(0, found.gx - 1), y: doorY };
          const eastDoor = { x: Math.min(width - 1, found.gx + GATE_DEFAULT_SIZE), y: doorY };
          const distW1 = Math.hypot(fromPoi.gridX - westDoor.x, fromPoi.gridY - westDoor.y);
          const distE2 = Math.hypot(toPoi.gridX - eastDoor.x, toPoi.gridY - eastDoor.y);
          const distE1 = Math.hypot(fromPoi.gridX - eastDoor.x, fromPoi.gridY - eastDoor.y);
          const distW2 = Math.hypot(toPoi.gridX - westDoor.x, toPoi.gridY - westDoor.y);

          const westToEast = (distW1 + distE2) <= (distE1 + distW2);
          c1Goal = westToEast ? westDoor : eastDoor;
          c2Start = westToEast ? eastDoor : westDoor;
        } else {
          // Vertical gate: North and South archways
          const northDoor = { x: found.gx + GATE_SEARCH_OFFSET, y: Math.max(0, found.gy - 1) };
          const southDoor = { x: found.gx + GATE_SEARCH_OFFSET, y: Math.min(height - 1, found.gy + GATE_DEFAULT_SIZE) };
          const distN1 = Math.hypot(fromPoi.gridX - northDoor.x, fromPoi.gridY - northDoor.y);
          const distS2 = Math.hypot(toPoi.gridX - southDoor.x, toPoi.gridY - southDoor.y);
          const distS1 = Math.hypot(fromPoi.gridX - southDoor.x, fromPoi.gridY - southDoor.y);
          const distN2 = Math.hypot(toPoi.gridX - northDoor.x, toPoi.gridY - northDoor.y);

          const northToSouth = (distN1 + distS2) <= (distS1 + distN2);
          c1Goal = northToSouth ? northDoor : southDoor;
          c2Start = northToSouth ? southDoor : northDoor;
        }

        // Splice the corridor into two segments
        const c1: SplicedEmbeddedCorridor = {
          ...corridor,
          id: `${corridor.id}_part1`,
          toId: gateId,
          customGoalGw: c1Goal,
          pathCells: corridor.pathCells.slice(0, found.i + 1)
        };
        const c2: SplicedEmbeddedCorridor = {
          ...corridor,
          id: `${corridor.id}_part2`,
          fromId: gateId,
          customStartGw: c2Start,
          pathCells: corridor.pathCells.slice(found.i)
        };
        activeCorridors.splice(cIdx, 1, c1, c2);
        cIdx++; // skip past newly inserted segment
      }
    }
  };

  // Pass 1: standard placement along primary arterial corridors
  tryPlaceOnCorridors(
    PRIMARY_CORRIDOR_KINDS,
    MIN_GATE_CORRIDOR_LENGTH,
    GATE_SEARCH_START_RATIO,
    GATE_SEARCH_END_RATIO,
    MIN_GATE_PROXIMITY_DISTANCE,
    PRIMARY_GATE_MIN_SEPARATION
  );

  // Pass 2: fallback placement with relaxed length and proximity if under minimum count
  if (placedGates.length < MIN_ROUTE_GATES) {
    tryPlaceOnCorridors(
      FALLBACK_CORRIDOR_KINDS,
      FALLBACK_GATE_CORRIDOR_LENGTH,
      FALLBACK_GATE_SEARCH_START_RATIO,
      FALLBACK_GATE_SEARCH_END_RATIO,
      FALLBACK_GATE_PROXIMITY_DISTANCE,
      FALLBACK_GATE_MIN_SEPARATION
    );
  }

  return { placedGates, activeCorridors };
}
