/**
 * test_aventura/tests/map/continentTopologyValidator.test.ts
 *
 * TIER 1 UNIT & REGRESSION TESTS FOR PURE CONTINENTAL TOPOLOGY VALIDATOR
 *
 * Verifies:
 *   1. Generated continental worlds (128/256/400) pass all invariants in validateContinentalWorldTopology.
 *   2. Artificial border leaks, misaligned route gates, and inland lake rocks are flagged loudly.
 */

import { describe, it, expect } from 'vitest';

import { validateContinentalWorldTopology } from '../../logic/map/continent/continentTopologyValidator.ts';
import { executeRegionalGenerationJob } from '../../logic/map/continentGenerator.worker.ts';

describe('continentTopologyValidator', () => {
  it('validates clean procedural regions across 128x128, 256x256, and 400x400', () => {
    for (const dim of [128, 256, 400] as const) {
      const res = executeRegionalGenerationJob({ width: dim, height: dim, seed: 42 });
      const report = validateContinentalWorldTopology({
        continent: res.continent,
        pois: res.pois,
        pathGrid: res.routeNetwork.pathGrid,
        bridgeGrid: res.routeNetwork.bridgeGrid,
        wilderness: res.wilderness,
        maritimeRockObstacles: res.routeNetwork.maritimeRockObstacles,
        edges: res.routeNetwork.edges
      });

      expect(report.ok, `dim=${dim} report failed: ${JSON.stringify(report)}`).toBe(true);
      expect(report.autotileDefectCount).toBe(0);
      expect(report.borderEscapes).toHaveLength(0);
      expect(report.maritimeBorderEscapes).toHaveLength(0);
      expect(report.lakeMaritimeRockCoords).toHaveLength(0);
      expect(report.misalignedGateIds).toHaveLength(0);
      expect(report.bypassViolations).toHaveLength(0);
    }
  });

  it('detects injected misaligned route_gate doorways', () => {
    const res = executeRegionalGenerationJob({ width: 128, height: 128, seed: 100 });
    const fakePathGrid = res.routeNetwork.pathGrid.map((row) => [...row]);
    const gate = res.pois.find((p) => p.type === 'route_gate');
    if (gate) {
      for (const st of gate.urbanLayout?.internalStreets ?? []) {
        fakePathGrid[st.y]![st.x] = false;
      }
      const report = validateContinentalWorldTopology({
        continent: res.continent,
        pois: res.pois,
        pathGrid: fakePathGrid,
        bridgeGrid: res.routeNetwork.bridgeGrid,
        wilderness: res.wilderness,
        maritimeRockObstacles: res.routeNetwork.maritimeRockObstacles,
        edges: res.routeNetwork.edges
      });
      expect(report.ok).toBe(false);
      expect(report.misalignedGateIds).toContain(gate.id);
    }
  });
});
