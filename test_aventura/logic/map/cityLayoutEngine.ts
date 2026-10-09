/**
 * src/logic/map/cityLayoutEngine.ts
 *
 * HYBRID URBAN SETTLEMENT & CITY LAYOUT ENGINE
 *
 * Implements architectural compositions adhering to official GBA standards and user contracts:
 *   - 'metropolis' (16x14): Orthogonal street grid with paved avenues, street lamps,
 *     Gym, Pokémon Center, PokéMart, and residences with 100% door-to-street connectivity.
 *   - 'city' (12x10): Inward-facing central paved plaza with Pokémon Center, PokéMart,
 *     and residential buildings with perimeter lamp and fence adornments.
 *   - 'town' (8x8): Rural organic clusters on natural grass ground with dirt paths,
 *     rustic houses, picket fences, and flower gardens.
 *   - Doorstep Clearance Invariant: Front doorstep cells (doorX, doorY + 1) are guaranteed
 *     to be 100% free of obstacles, lamps, fences, or tree trunks.
 */

import type {
  POINode,
  UrbanBuildingType,
  UrbanBuildingPlacement,
  UrbanPropType,
  UrbanPropPlacement,
  SettlementLayoutResult,
  SettlementCurbPlacement
} from '../../types/map/poiTypes.ts';
import {
  getBuildingPrefabMeta,
  getAssetFilename,
  type BuildingPrefabMeta
} from './canonicalAssetsRegistry.ts';
import { computeUrbanCurbs } from './urbanPavingEngine.ts';
import { generateProceduralCityLayout } from './proceduralCityEngine.ts';

export type { BuildingPrefabMeta, SettlementCurbPlacement };

export interface SettlementTerrainContext {
  readonly heightmap?: readonly (readonly number[])[];
  readonly terrainMatrix?: readonly (readonly string[])[];
  readonly occupiedFootCells?: readonly (readonly boolean[])[];
  readonly mountainCellRoles?: readonly (readonly (string | undefined)[])[];
  readonly width?: number;
  readonly height?: number;
}

const CANONICAL_SETTLEMENT_LAYOUT_SEED = 1337;
const LEAGUE_UPPER_LAMP_ROW = 9;
const LEAGUE_UPPER_FLOWER_ROW = 10;
const LEAGUE_APPROACH_LAMP_ROW = 15;
const LEAGUE_APPROACH_FLOWER_ROW = 16;

/**
 * Generates the interior architectural layout for a single regional settlement node.
 * Strictly adheres to GBA standards:
 *   - 'metropolis': 4 distinct blocks separated by 2-cell asphalt avenues, sidewalks with curbs,
 *     central civic plaza with fountain, benches, lamps, and flowers, 8 macro-buildings.
 *   - 'city': 2-cell avenues, sidewalks, Gym with statues, Center, Mart, Condos, benches.
 *   - 'town': 0 paved/concrete cells (pavedPlazaCells: []), 100% natural grass with dirt paths,
 *     rustic houses, picket/log fences, signpost, and flowers.
 *   - Doorstep Clearance Invariant: Front doorstep cells (doorX, doorY + 1) are guaranteed
 *     to be 100% free of obstacles, lamps, fences, statues, or trees.
 */
export function generateSettlementLayout(
  node: POINode,
  context?: SettlementTerrainContext,
  seed = CANONICAL_SETTLEMENT_LAYOUT_SEED
): SettlementLayoutResult {
  if (node.type === 'metropolis' || node.type === 'city' || node.type === 'town') {
    return generateProceduralCityLayout(node, seed, context);
  }

  const bx = node.gridX;
  const by = node.gridY;
  const W = node.footprint.width;
  const H = node.footprint.height;

  const buildings: UrbanBuildingPlacement[] = [];
  const props: UrbanPropPlacement[] = [];
  const internalStreets: { x: number; y: number }[] = [];
  const pavedPlazaCells: { x: number; y: number }[] = [];

  // Doorstep reserve set to guarantee front entrance clearance
  const reservedDoorsteps = new Set<string>();
  const reserveDoor = (x: number, y: number): void => {
    reservedDoorsteps.add(`${x}_${y}`);
  };

  const isPassableFenceCell = (x: number, y: number): boolean => {
    if (!context) return true;
    if (context.width !== undefined && (x < 0 || x >= context.width)) return false;
    if (context.height !== undefined && (y < 0 || y >= context.height)) return false;
    if (context.heightmap && (context.heightmap[y]?.[x] ?? node.elevation) !== node.elevation) return false;
    if (context.terrainMatrix && (context.terrainMatrix[y]?.[x] ?? 'grass') !== 'grass') return false;
    if (context.occupiedFootCells && (context.occupiedFootCells[y]?.[x] ?? false)) return false;
    return true;
  };

  const placeBuilding = (
    bId: string,
    type: UrbanBuildingType,
    x: number,
    y: number,
    meta: BuildingPrefabMeta,
    pixelOffsetX?: number,
    pixelOffsetY?: number
  ): void => {
    // Zero Error Suppression Mandate: Enforce minimum 1-tile clearance between distinct buildings
    for (const existing of buildings) {
      const overlapX = x < existing.x + existing.width && x + meta.width > existing.x;
      const overlapY = y < existing.y + existing.height && y + meta.height > existing.y;
      if (overlapX && overlapY) {
        throw new Error(
          `[CityLayoutEngine] Collision detected: ${bId} (${meta.prefabFile}) [${x},${y} ${meta.width}x${meta.height}] overlaps with ${existing.id} (${existing.prefabFile}) [${existing.x},${existing.y} ${existing.width}x${existing.height}]`
        );
      }
      const touchHoriz =
        (x + meta.width === existing.x || existing.x + existing.width === x) &&
        !(y + meta.height <= existing.y || existing.y + existing.height <= y);
      const touchVert =
        (y + meta.height === existing.y || existing.y + existing.height === y) &&
        !(x + meta.width <= existing.x || existing.x + existing.width <= x);
      if (touchHoriz || touchVert) {
        throw new Error(
          `[CityLayoutEngine] Zero clearance detected: ${bId} (${meta.prefabFile}) touches ${existing.id} (${existing.prefabFile}) with 0-tile gap`
        );
      }
    }

    const primaryDoor = meta.doorOffsets[0]!;
    const doorX = x + primaryDoor.dx;
    const doorY = y + primaryDoor.dy;

    for (const offset of meta.doorOffsets) {
      const curDoorX = x + offset.dx;
      const curDoorY = y + offset.dy;
      reserveDoor(curDoorX, curDoorY + 1);
      reserveDoor(curDoorX, curDoorY - 1);
    }

    buildings.push({
      id: bId,
      type,
      x,
      y,
      width: meta.width,
      height: meta.height,
      doorX,
      doorY,
      prefabFile: meta.prefabFile,
      ...(pixelOffsetX !== undefined ? { pixelOffsetX } : {}),
      ...(pixelOffsetY !== undefined ? { pixelOffsetY } : {})
    });
  };

  const addProp = (type: UrbanPropType, x: number, y: number, prefabFile: string): void => {
    // Never place props inside building bounding boxes
    for (const b of buildings) {
      if (x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height) {
        return;
      }
    }
    // Prevent prop stacking / duplicate placement on same tile
    if (props.some((p) => p.x === x && p.y === y)) {
      return;
    }
    if (!reservedDoorsteps.has(`${x}_${y}`)) {
      props.push({ type, x, y, prefabFile });
    }
  };

  const addContinuousFenceRun = (y: number, startX: number, endX: number): void => {
    if (startX > endX) return;
    for (let x = startX; x <= endX; x++) {
      addProp('fence_h', x, y, 'poke_fence_white_h_mid.png');
    }
  };

  if (node.type === 'pokemon_league') {
    // ------------------------------------------------------------------------
    // POKÉMON LEAGUE (Meseta Añil): 22x20 Cells
    // Ceremonial Central Avenue, Paved Concourse, Guardian Statues
    // ------------------------------------------------------------------------
    const palaceMeta = getBuildingPrefabMeta('pokemon_league');

    // 1. Buildings:
    // Grand Palace centered at the northern edge (11x8 tiles)
    // When centered inside an even-width plateau (e.g. W=22 or 28), apply a half-tile (+16px) sub-pixel shift
    // so the palace entrance door seam aligns 100% coaxially with the 2-cell ceremonial avenue.
    const palaceX = bx + Math.floor((W - palaceMeta.width) / 2);
    const palaceY = by + 1;
    const palacePixelOffsetX = (W % 2 === 0 && palaceMeta.width % 2 !== 0) ? 16 : 0;
    placeBuilding(`${node.id}_palace`, 'pokemon_league', palaceX, palaceY, palaceMeta, palacePixelOffsetX);

    // 2. Central 2-Cell Wide Ceremonial Avenue & Paved Concourse:
    // Centered at midX - 1 and midX, running down the plateau to the south edge
    const midX = Math.floor(W / 2);
    for (let y = 7; y < H; y++) {
      for (const x of [midX - 1, midX]) {
        internalStreets.push({ x: bx + x, y: by + y });
      }
    }

    // 4. Symmetrical Ceremonial Street Lamps & Planters dynamically flanking the ceremonial avenue:
    // Upper Plateau:
    addProp('lamp', bx + midX - 2, by + LEAGUE_UPPER_LAMP_ROW, getAssetFilename('poke_street_lamp'));
    addProp('lamp', bx + midX + 1, by + LEAGUE_UPPER_LAMP_ROW, getAssetFilename('poke_street_lamp_left'));
    addProp('flower', bx + midX - 3, by + LEAGUE_UPPER_FLOWER_ROW, getAssetFilename('poke_flower_pot_circular'));
    addProp('flower', bx + midX + 2, by + LEAGUE_UPPER_FLOWER_ROW, getAssetFilename('poke_flower_pot_circular'));

    // Mid Plateau / Approach:
    addProp('lamp', bx + midX - 2, by + LEAGUE_APPROACH_LAMP_ROW, getAssetFilename('poke_street_lamp'));
    addProp('lamp', bx + midX + 1, by + LEAGUE_APPROACH_LAMP_ROW, getAssetFilename('poke_street_lamp_left'));
    addProp('flower', bx + midX - 3, by + LEAGUE_APPROACH_FLOWER_ROW, getAssetFilename('poke_flower_pot_circular'));
    addProp('flower', bx + midX + 2, by + LEAGUE_APPROACH_FLOWER_ROW, getAssetFilename('poke_flower_pot_circular'));
  } else if (node.type === 'route_gate') {
    // ------------------------------------------------------------------------
    // ROUTE GATE CHECKPOINT: 6x6 to 8x8 Cells
    // Centered 2-Story Checkpoint Gate (7x7 tiles or 4x4 tiles)
    // 2-cell path running through gate, flanked by wooden barrier fences
    // ------------------------------------------------------------------------
    const isHorizontal = node.facing === 'east' || node.facing === 'west';
    const gateMeta = getBuildingPrefabMeta(isHorizontal ? 'gatehouse_route_horizontal' : 'gatehouse_route');
    const midX = Math.floor(W / 2);
    const gx = bx + Math.floor((W - gateMeta.width) / 2);
    const gy = by + Math.floor((H - gateMeta.height) / 2);

    placeBuilding(`${node.id}_gate`, 'checkpoint_gate', gx, gy, gateMeta);

    if (isHorizontal) {
      // 2-cell wide avenue passing straight through the gate from West to East (rows gy + 3 and gy + 4)
      const relDoorY = Math.floor((H - gateMeta.height) / 2) + gateMeta.height - 2;
      for (let x = 0; x < W; x++) {
        for (const y of [relDoorY, relDoorY + 1]) {
          internalStreets.push({ x: bx + x, y: by + y });
        }
      }
    } else {
      // 2-cell wide avenue passing straight through the gate from North to South
      for (let y = 0; y < H; y++) {
        for (const x of [midX - 1, midX]) {
          internalStreets.push({ x: bx + x, y: by + y });
        }
      }
    }

    // Biome-aware lateral barrier fences and scenery props:
    const isMountain = node.terrainPreference === 'mountain_plateau' || /mountain|desfiladero|rock|pass/i.test(node.id);
    const isMetropolis = /metro|frontera|city/i.test(node.id);

    const fenceAsset = getAssetFilename(isMountain ? 'poke_fence_wood_h' : 'poke_fence_white_h_mid');
    const lateralReach = 8;
    const isPassableFenceCell = (x: number, y: number): boolean => {
      const Wmax = context?.width ?? 9999;
      const Hmax = context?.height ?? 9999;
      if (x < 0 || x >= Wmax || y < 0 || y >= Hmax) return false;
      if (context?.heightmap && (context.heightmap[y]?.[x] ?? 0) !== 0) return false;
      if (context?.occupiedFootCells?.[y]?.[x]) return false;
      if (context?.terrainMatrix) {
        const t = context.terrainMatrix[y]?.[x];
        if (t === 'water' || t === 'water_deep') return false;
      }
      // Strict 2.5D clearance: fences must never be placed adjacent to mountain cliffs, feet, or stairs
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || ny >= Hmax || nx < 0 || nx >= Wmax) continue;
          if (context?.heightmap && (context.heightmap[ny]?.[nx] ?? 0) > 0) return false;
          if (context?.occupiedFootCells?.[ny]?.[nx]) return false;
          const role = context?.mountainCellRoles?.[ny]?.[nx];
          if (role && (role.includes('stairs') || role.includes('cliff') || role.includes('edge_south'))) return false;
        }
      }
      return true;
    };

    if (isHorizontal) {
      const fenceMinY = by - lateralReach;
      const fenceMaxY = by + H + lateralReach;
      for (let y = gy - 1; y >= fenceMinY; y--) {
        if (!isPassableFenceCell(gx + 2, y) || !isPassableFenceCell(gx + 3, y)) break;
        addProp('fence_v', gx + 2, y, getAssetFilename('poke_fence_white_v_left'));
      }
      for (let y = gy + gateMeta.height; y < fenceMaxY; y++) {
        if (!isPassableFenceCell(gx + 2, y) || !isPassableFenceCell(gx + 3, y)) break;
        addProp('fence_v', gx + 2, y, getAssetFilename('poke_fence_white_v_left'));
      }
    } else {
      const fenceMinX = bx - lateralReach;
      const fenceMaxX = bx + W + lateralReach;
      for (let x = gx - 1; x >= fenceMinX; x--) {
        if (!isPassableFenceCell(x, gy + 2) || !isPassableFenceCell(x, gy + 3)) break;
        addProp('fence_h', x, gy + 2, fenceAsset);
        addProp('fence_h', x, gy + 3, fenceAsset);
      }
      for (let x = gx + gateMeta.width; x < fenceMaxX; x++) {
        if (!isPassableFenceCell(x, gy + 2) || !isPassableFenceCell(x, gy + 3)) break;
        addProp('fence_h', x, gy + 2, fenceAsset);
        addProp('fence_h', x, gy + 3, fenceAsset);
      }
    }

    if (isMountain) {
      // Mountain Gorge: Boulders reinforcing the choke point
      if (isHorizontal) {
        addProp('rock', gx + Math.floor(gateMeta.width / 2), gy - 1 >= by ? gy - 1 : by, getAssetFilename('poke_cave_boulder_rock'));
      } else {
        addProp('rock', gx - 1 >= bx ? gx - 1 : bx, gy + gateMeta.height - 1, getAssetFilename('poke_cave_boulder_rock'));
        addProp('rock', gx + gateMeta.width < bx + W ? gx + gateMeta.width : bx + W - 1, gy + gateMeta.height - 1, getAssetFilename('poke_cave_rubble_stones'));
      }
    } else if (isMetropolis) {
      // Symmetrical street lamps north for vertical gatehouses
      if (!isHorizontal && gy - 2 >= by) {
        addProp('lamp', gx, gy - 2, getAssetFilename('poke_street_lamp'));
        addProp('lamp', gx + gateMeta.width - 1, gy - 2, getAssetFilename('poke_street_lamp_left'));
      }
    }

    // Official route signpost and flowers outside gate entrance
    if (isHorizontal) {
      addProp('signpost', gx + 2, gy + gateMeta.height, getAssetFilename('poke_signpost'));
      addProp('flower', gx + 6, gy + gateMeta.height, getAssetFilename('poke_flowers_red'));
    } else {
      addProp('signpost', gx - 1 >= bx ? gx - 1 : gx + gateMeta.width, gy + gateMeta.height, getAssetFilename('poke_signpost'));
      addProp('flower', gx, gy + gateMeta.height, getAssetFilename('poke_flowers_red'));
    }
  } else if (node.type === 'dungeon_forest') {
    // ------------------------------------------------------------------------
    // DUNGEON FOREST (Viridian Forest Labyrinth):
    // South and North Checkpoint Gates, 2-cell winding trail
    // ------------------------------------------------------------------------
    if (W >= 16 && H >= 16) {
      const gateMeta = getBuildingPrefabMeta('poke_league_checkpoint_gate');
      const midX = Math.floor(W / 2);

      // North Gate at northern perimeter centered
      const northGateX = bx + midX - Math.floor(gateMeta.width / 2);
      const northGateY = by + 0;
      placeBuilding(`${node.id}_north_gate`, 'checkpoint_gate', northGateX, northGateY, gateMeta);

      // South Gate at southern perimeter centered
      const southGateX = bx + midX - Math.floor(gateMeta.width / 2);
      const southGateY = by + H - gateMeta.height;
      placeBuilding(`${node.id}_south_gate`, 'checkpoint_gate', southGateX, southGateY, gateMeta);

      // Sinuous trail connecting south and north gates across expanded dungeon height
      const trailPts: { x: number; y: number }[] = [];
      const midY = Math.floor(H / 2);

      // Segment 1: Exit South Gate going north
      for (let y = H - gateMeta.height; y >= Math.max(midY + 2, H - gateMeta.height - 4); y--) {
        trailPts.push({ x: midX - 1, y }, { x: midX, y });
      }
      // Segment 2: Loop East
      const eastX = Math.min(W - 4, midX + 6);
      const southTurnY = Math.max(midY + 2, H - gateMeta.height - 4);
      for (let x = midX - 1; x <= eastX; x++) {
        trailPts.push({ x, y: southTurnY }, { x, y: southTurnY + 1 });
      }
      // Segment 3: North along East clearing
      for (let y = southTurnY; y >= midY; y--) {
        trailPts.push({ x: eastX - 1, y }, { x: eastX, y });
      }
      // Segment 4: Loop West across center
      const westX = Math.max(3, midX - 7);
      for (let x = eastX; x >= westX; x--) {
        trailPts.push({ x, y: midY }, { x, y: midY + 1 });
      }
      // Segment 5: North along West clearing
      const northTurnY = Math.min(midY, gateMeta.height + 3);
      for (let y = midY; y >= northTurnY; y--) {
        trailPts.push({ x: westX, y }, { x: westX + 1, y });
      }
      // Segment 6: Loop East to center
      for (let x = westX; x <= midX; x++) {
        trailPts.push({ x, y: northTurnY }, { x, y: northTurnY + 1 });
      }
      // Segment 7: North directly into North Gate
      for (let y = northTurnY; y >= gateMeta.height; y--) {
        trailPts.push({ x: midX - 1, y }, { x: midX, y });
      }

      for (const pt of trailPts) {
        if (pt.x >= 0 && pt.x < W && pt.y >= 0 && pt.y < H) {
          internalStreets.push({ x: bx + pt.x, y: by + pt.y });
        }
      }

      // Flanking barrier fences sealing off both sides of North Gate
      const nGateRelX = northGateX - bx;
      let actualNLeft = bx + nGateRelX - 1;
      for (let x = nGateRelX - 1; x >= 0; x--) {
        const absX = bx + x;
        if (!isPassableFenceCell(absX, northGateY + 2)) break;
        actualNLeft = absX;
      }
      addContinuousFenceRun(northGateY + 2, actualNLeft, northGateX - 1);

      let actualNRight = northGateX + gateMeta.width;
      for (let x = nGateRelX + gateMeta.width; x < W; x++) {
        const absX = bx + x;
        if (!isPassableFenceCell(absX, northGateY + 2)) break;
        actualNRight = absX;
      }
      addContinuousFenceRun(northGateY + 2, northGateX + gateMeta.width, actualNRight);

      // Flanking barrier fences sealing off both sides of South Gate
      const sGateRelX = southGateX - bx;
      let actualSLeft = bx + sGateRelX - 1;
      for (let x = sGateRelX - 1; x >= 0; x--) {
        const absX = bx + x;
        if (!isPassableFenceCell(absX, southGateY + 2)) break;
        actualSLeft = absX;
      }
      addContinuousFenceRun(southGateY + 2, actualSLeft, southGateX - 1);

      let actualSRight = southGateX + gateMeta.width;
      for (let x = sGateRelX + gateMeta.width; x < W; x++) {
        const absX = bx + x;
        if (!isPassableFenceCell(absX, southGateY + 2)) break;
        actualSRight = absX;
      }
      addContinuousFenceRun(southGateY + 2, southGateX + gateMeta.width, actualSRight);

      // Forest Props: Trainer tips sign outside south and north gates
      addProp('signpost', bx + midX + 2, southGateY - 1, getAssetFilename('poke_trainer_tips_sign'));
      addProp('signpost', bx + midX + 2, northGateY + gateMeta.height + 1, getAssetFilename('poke_signpost'));

      // Natural mossy boulders in the trail elbows justifying directional turns
      addProp('flower', bx + midX + 2, by + southTurnY - 2, getAssetFilename('poke_rock_boulder_mossy_1'));
      addProp('flower', bx + westX + 2, by + northTurnY + 2, getAssetFilename('poke_rock_boulder_mossy_2'));
    }
  }

  // Strict Building Footprint Mask: Ensure no streets, plazas, or props overlap building bounding boxes
  const buildingMask = new Set<string>();
  for (const b of buildings) {
    if (b.type === 'pokemon_league') {
      for (let dy = 0; dy < b.height; dy++) {
        for (let dx = 0; dx < b.width; dx++) {
          // Allow 2-cell ceremonial avenue to tuck 2 tiles under palace (dy=6, 7 at dx=5, 6)
          const isEntrancePortal = dy >= 6 && (dx === 5 || dx === 6);
          if (!isEntrancePortal) {
            buildingMask.add(`${b.x + dx}_${b.y + dy}`);
          }
        }
      }
    } else {
      for (let dy = 0; dy < b.height; dy++) {
        for (let dx = 0; dx < b.width; dx++) {
          buildingMask.add(`${b.x + dx}_${b.y + dy}`);
        }
      }
    }
  }

  // Runtime Collision-Free Invariant: fail loudly if any buildings overlap
  for (let i = 0; i < buildings.length; i++) {
    for (let j = i + 1; j < buildings.length; j++) {
      const a = buildings[i]!;
      const b = buildings[j]!;
      const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
      const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
      if (overlapX && overlapY) {
        throw new Error(
          `[cityLayoutEngine] Destructive building collision in settlement '${node.id}': ` +
          `'${a.id}' (${a.width}x${a.height} at ${a.x},${a.y}) overlaps '${b.id}' (${b.width}x${b.height} at ${b.x},${b.y})`
        );
      }
    }
  }

  // Route gates are walkthrough checkpoint buildings: their central 2-cell corridor passes directly
  // through the archway and must be preserved as internal streets rather than filtered out by buildingMask.
  const safeInternalStreets = node.type === 'route_gate'
    ? internalStreets
    : internalStreets.filter((s) => !buildingMask.has(`${s.x}_${s.y}`));
  const safePavedPlazaCells = pavedPlazaCells.filter((p) => !buildingMask.has(`${p.x}_${p.y}`));
  const safeProps = props.filter((p) => !buildingMask.has(`${p.x}_${p.y}`));

  const curbs = computeUrbanCurbs({
    pavedPlazaCells: safePavedPlazaCells,
    internalStreets: safeInternalStreets,
    reservedClearance: reservedDoorsteps
  });

  return {
    nodeId: node.id,
    buildings,
    props: safeProps,
    internalStreets: safeInternalStreets,
    pavedPlazaCells: safePavedPlazaCells,
    curbs
  };
}

/**
 * Generates urban layout results for all settlements in a regional network.
 */
export function generateAllSettlementLayouts(
  nodes: readonly POINode[]
): Map<string, SettlementLayoutResult> {
  const layouts = new Map<string, SettlementLayoutResult>();
  for (const node of nodes) {
    if (
      node.type === 'metropolis' ||
      node.type === 'city' ||
      node.type === 'town' ||
      node.type === 'pokemon_league' ||
      node.type === 'route_gate' ||
      node.type === 'dungeon_forest'
    ) {
      const res = generateSettlementLayout(node);
      layouts.set(node.id, res);
      // Attach to node
      (node as { urbanLayout?: SettlementLayoutResult }).urbanLayout = res;
    }
  }
  return layouts;
}
