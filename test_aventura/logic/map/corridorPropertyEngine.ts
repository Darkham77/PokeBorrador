/**
 * src/logic/map/corridorPropertyEngine.ts
 *
 * EMERGENT CORRIDOR PROPERTY ASSIGNMENT ENGINE
 *
 * Implements Phase 4 of the Graph-First Pipeline:
 *   1. Computes continuous, emergent corridor properties (Rule 4: no hardcoded archetypes).
 *   2. Derives width inversely proportional to progression (early = wide, late = narrow & challenging).
 *   3. Samples surrounding terrain to determine dominant ecological influence (plains, mountain, coastal, forest).
 *   4. Enforces the No-Repeat Variety Constraint across consecutive main-path corridors.
 *   5. Places Route Gate Checkpoints (gatehouses) at corridor transitions.
 */

import type {
  EmbeddedTopologyGraph,
  EmbeddedCorridor,
  EnrichedCorridorProperties,
  TerrainInfluence
} from '../../types/map/pokemonGraphTypes.ts';
import type { ContinentMapResult } from './continentGenerator.ts';

// ---------------------------------------------------------------------------
// Terrain Sampling Helper
// ---------------------------------------------------------------------------

function sampleSurroundingTerrain(
  corridor: EmbeddedCorridor,
  continent: ContinentMapResult
): { influence: TerrainInfluence; nearWater: boolean } {
  if (corridor.kind === 'surf_route') {
    return { influence: 'coastal', nearWater: true };
  }

  const W = continent.width;
  const H = continent.height;
  let mountainCount = 0;
  let waterCount = 0;
  let forestCount = 0;
  let sampleCount = 0;

  for (const cell of corridor.pathCells) {
    const rad = 3;
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        const x = cell.x + dx;
        const y = cell.y + dy;
        if (x >= 0 && x < W && y >= 0 && y < H) {
          sampleCount++;
          const terrain = continent.terrainMatrix[y]?.[x];
          const elev = continent.heightmap[y]?.[x] ?? 0;
          const biome = continent.macroBiomes?.biomeGrid[y]?.[x];

          if (elev > 0) {
            mountainCount++;
          } else if (terrain === 'water' || terrain === 'water_deep') {
            waterCount++;
          } else if (biome === 'viridian_forest') {
            forestCount++;
          }
        }
      }
    }
  }

  const nearWater = waterCount > 5;
  const mRatio = mountainCount / Math.max(1, sampleCount);
  const wRatio = waterCount / Math.max(1, sampleCount);
  const fRatio = forestCount / Math.max(1, sampleCount);

  if (mRatio >= 0.15) {
    return { influence: 'mountain', nearWater };
  }
  if (wRatio >= 0.15) {
    return { influence: 'coastal', nearWater: true };
  }
  if (fRatio >= 0.12) {
    return { influence: 'forest', nearWater };
  }

  return { influence: 'plains', nearWater };
}

// ---------------------------------------------------------------------------
// Gatehouse Checkpoint Placement Helper
// ---------------------------------------------------------------------------

function computeGatehouseLocations(
  corridor: EmbeddedCorridor
): { x: number; y: number }[] {
  // Wormholes and short stubs don't need surface gatehouses
  if (corridor.kind === 'wormhole_tunnel' || corridor.pathCells.length < 12) {
    return [];
  }

  // Surf routes don't have gatehouses in the open water
  if (corridor.kind === 'surf_route') {
    return [];
  }

  // Place gatehouse near the entry transition (approx 1/4 or 3/4 along corridor)
  const gatehouses: { x: number; y: number }[] = [];
  const idx = Math.floor(corridor.pathCells.length * 0.25);
  const cell = corridor.pathCells[idx];
  if (cell) {
    gatehouses.push({ x: cell.x, y: cell.y });
  }

  return gatehouses;
}

// ---------------------------------------------------------------------------
// Public API: Enrich Corridor Properties (T4.1 - T4.3)
// ---------------------------------------------------------------------------

export function enrichCorridorProperties(
  embedded: EmbeddedTopologyGraph,
  continent: ContinentMapResult
): readonly EnrichedCorridorProperties[] {
  const result: EnrichedCorridorProperties[] = [];
  const mainChainSet = new Set<string>(embedded.mainChainOrder);

  let prevMainInfluence: TerrainInfluence | undefined;
  let prevMainWidth: number | undefined;

  for (let cIdx = 0; cIdx < embedded.corridors.length; cIdx++) {
    const corridor = embedded.corridors[cIdx]!;

    // 1. Terrain Sampling
    const { influence: rawInfluence, nearWater } = sampleSurroundingTerrain(corridor, continent);
    const influence = rawInfluence;

    // 2. Progression & Difficulty Metric
    const toChainIdx = embedded.mainChainOrder.indexOf(corridor.toId);
    const fromChainIdx = embedded.mainChainOrder.indexOf(corridor.fromId);
    const isMainChain =
      corridor.kind === 'main_chain' ||
      (mainChainSet.has(corridor.fromId) && mainChainSet.has(corridor.toId) && Math.abs(toChainIdx - fromChainIdx) === 1);

    const maxProgressionIdx = Math.max(0, toChainIdx, fromChainIdx);
    const difficulty = Number(
      Math.min(1.0, Math.max(0.1, maxProgressionIdx / Math.max(1, embedded.mainChainOrder.length - 1))).toFixed(2)
    );

    // 3. Emergent Width (earlier routes are wide and inviting, late routes are narrow & challenging)
    let width = Math.max(3, Math.min(9, Math.round(8 - difficulty * 4.5)));

    // Surf routes have wide water channels
    if (corridor.kind === 'surf_route') {
      width = 8;
    }

    // 4. No-Repeat Variety Constraint for consecutive main-path corridors (T4.2)
    if (isMainChain) {
      if (prevMainInfluence === influence && prevMainWidth === width) {
        // Adjust width slightly to preserve variety
        width = width > 4 ? width - 1 : width + 1;
      }
      prevMainInfluence = influence;
      prevMainWidth = width;
    }

    // 5. Emerging Props
    const isShortcutLoop = corridor.kind === 'cycle' || corridor.kind === 'surf_route';
    const hasOneWayLedges = isShortcutLoop || (influence === 'mountain' && difficulty >= 0.4);
    const tallGrassDensity = Number(Math.max(0.2, Math.min(0.9, 0.85 - difficulty * 0.45)).toFixed(2));

    // 6. Gatehouse Checkpoint Placement (T4.3)
    const gatehouses = computeGatehouseLocations(corridor);

    result.push({
      corridorId: corridor.id,
      fromId: corridor.fromId,
      toId: corridor.toId,
      width,
      difficulty,
      terrainInfluence: influence,
      tallGrassDensity,
      hasOneWayLedges,
      waterSideAccess: nearWater,
      isShortcutLoop,
      gatehouses
    });
  }

  return result;
}
