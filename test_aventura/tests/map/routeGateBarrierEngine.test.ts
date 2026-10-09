/**
 * tests/node/map/routeGateBarrierEngine.test.ts
 *
 * TIER 1 & TIER 2 UNIT TESTS: ROUTE GATE BARRIER & ANTI-BYPASS ENGINE
 *
 * Validates:
 *   1. Procedural generation places 2 to 5 route gatehouses distributed across the continent.
 *   2. The approach and exit road corridors through the gatehouse are 100% free of obstructing fences, logs, or trees.
 *   3. Lateral flanks are sealed with authentic fences and dense trees.
 *   4. Anti-bypass flood-fill verification guarantees that the player cannot bypass the gatehouse through open grass.
 */

import { describe, it, expect } from 'vitest';
import { generatePokemonContinentalWorld } from '../../../src/logic/map/continent/continentalEngine.ts';
import { verifyRouteGateAntiBypass } from '../../../src/logic/map/routeGateBarrierEngine.ts';

describe('routeGateBarrierEngine', () => {
  it('guarantees 2 to 5 route gatehouses are placed randomly across diverse seeds', () => {
    const seeds = [7741, 42, 100, 2026, 9999];
    const counts: number[] = [];

    for (const seed of seeds) {
      const world = generatePokemonContinentalWorld({ seed, width: 400, height: 400 });
      const gatePois = world.pois.filter((p) => p.type === 'route_gate');
      expect(gatePois.length, `Expected between 2 and 5 gates for seed ${seed}`).toBeGreaterThanOrEqual(2);
      expect(gatePois.length, `Expected between 2 and 5 gates for seed ${seed}`).toBeLessThanOrEqual(5);
      counts.push(gatePois.length);
    }

    // Verify there is variation (not hardcoded to a single constant)
    const uniqueCounts = new Set(counts);
    expect(uniqueCounts.size).toBeGreaterThan(1);
  });

  it('guarantees the central road corridor through the gatehouse is 100% clear of obstacles', () => {
    const world = generatePokemonContinentalWorld({ seed: 7741, width: 400, height: 400 });
    const gatePois = world.pois.filter((p) => p.type === 'route_gate');

    for (const gate of gatePois) {
      const isHorizontal = gate.facing === 'east' || gate.facing === 'west';
      const clearCells: { x: number; y: number }[] = [];

      if (isHorizontal) {
        const doorY = gate.gridY + 2 + 4; // gy + 6
        for (let x = gate.gridX - 6; x <= gate.gridX + gate.footprint.width + 6; x++) {
          clearCells.push({ x, y: doorY - 1 });
          clearCells.push({ x, y: doorY });
        }
      } else {
        const midX = gate.gridX + Math.floor(gate.footprint.width / 2);
        for (let y = gate.gridY - 6; y <= gate.gridY + gate.footprint.height + 6; y++) {
          clearCells.push({ x: midX - 1, y });
          clearCells.push({ x: midX, y });
        }
      }

      // Check no props (fences, logs, boulders) occupy the road corridor outside the building
      const b = gate.urbanLayout?.buildings[0];
      const bx = b?.x ?? gate.gridX;
      const by = b?.y ?? gate.gridY;
      const bw = b?.width ?? 6;
      const bh = b?.height ?? 7;

      for (const cell of clearCells) {
        // Skip building footprint
        if (cell.x >= bx && cell.x < bx + bw && cell.y >= by && cell.y < by + bh) {
          continue;
        }

        const propOnRoad = world.wilderness.props.find((p) => p.x === cell.x && p.y === cell.y);
        expect(
          propOnRoad,
          `Prop ${propOnRoad?.prefabFile} found blocking road corridor at (${cell.x}, ${cell.y}) for gate ${gate.id}`
        ).toBeUndefined();

        const treeOnRoad = world.wilderness.trees.find((t) => {
          const footLeft = t.x + Math.floor((t.width - 1) / 2);
          const footRight = footLeft + 1;
          const footTop = t.y + t.height - 2;
          const footBottom = t.y + t.height;
          return cell.x >= footLeft && cell.x <= footRight && cell.y >= footTop && cell.y < footBottom;
        });
        expect(
          treeOnRoad,
          `Tree found blocking road corridor at (${cell.x}, ${cell.y}) for gate ${gate.id}`
        ).toBeUndefined();
      }
    }
  });

  it('guarantees both horizontal and vertical gatehouses are placed with matching building prefabs', () => {
    // Generate over multiple seeds to encounter both horizontal and vertical route sections
    let foundHorizontal = false;
    let foundVertical = false;

    for (const seed of [7741, 42, 100, 2026, 9999, 12345]) {
      const world = generatePokemonContinentalWorld({ seed, width: 400, height: 400 });
      const gatePois = world.pois.filter((p) => p.type === 'route_gate');

      for (const gate of gatePois) {
        const isHorizontal = gate.facing === 'east' || gate.facing === 'west';
        const b = gate.urbanLayout?.buildings[0];
        expect(b, `Gate ${gate.id} must have a building placement`).toBeDefined();

        if (isHorizontal) {
          foundHorizontal = true;
          expect(b?.prefabFile).toBe('gatehouse_route_horizontal.png');
          expect(b?.width).toBe(8);
          expect(b?.height).toBe(5);
        } else {
          foundVertical = true;
          expect(b?.prefabFile).toBe('gatehouse_route.png');
          expect(b?.width).toBe(6);
          expect(b?.height).toBe(7);
        }
      }
      if (foundHorizontal && foundVertical) break;
    }

    expect(foundHorizontal, 'Continental engine must place horizontal route gatehouses for East-West routes').toBe(true);
    expect(foundVertical, 'Continental engine must place vertical route gatehouses for North-South routes').toBe(true);
  });

  it('guarantees the anti-bypass verification confirms no open grass bypass exists around gate flanks', () => {
    for (const seed of [7741, 42, 100]) {
      const world = generatePokemonContinentalWorld({ seed, width: 400, height: 400 });
      const gatePois = world.pois.filter((p) => p.type === 'route_gate');

      for (const gate of gatePois) {
        const isHermetic = verifyRouteGateAntiBypass({
          continent: world.continent,
          gate,
          trees: world.wilderness.trees,
          props: world.wilderness.props,
          pathGrid: world.pathGrid
        });
        expect(isHermetic, `Seed ${seed} Gate ${gate.id} has an open unsealed bypass around its flanks`).toBe(true);
      }
    }
  });
});
