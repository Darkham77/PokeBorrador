/**
 * tests/node/map/continentGeneratorWorker.test.ts
 *
 * TIER 1 & TIER 2 TESTS FOR CONTINENT GENERATOR WORKER & ZERO-COPY PIPELINE
 *
 * Validates:
 *   1. Full regional generation pipeline execution (continent + POIs + routes + wilderness + buffer).
 *   2. Zero-Copy preview buffer generation (ArrayBuffer byteLength = W * H * 4).
 *   3. Targeted incident A* rerouting on POI drag-and-drop (updates ONLY incident edges).
 */

import { describe, it, expect } from 'vitest';
import {
  executeRegionalGenerationJob,
  executeRerouteJob,
  buildZeroCopyPreviewBuffer,
  type RegionalGenerationOptions
} from '../../../src/logic/map/continentGenerator.worker.ts';

describe('continentGenerator.worker pipeline', () => {
  const baseOptions: RegionalGenerationOptions = {
    width: 64,
    height: 64,
    seed: 42,
    oceanWaterPercentage: 0.35,
    beachWidth: 3,
    lakeCount: 2,
    mountainPercentage: 0.22,
    targetCount: 12,
    allowBridges: true,
    withStairs: true
  };

  it('executes full regional generation job and outputs structured data with zero-copy buffer', () => {
    const result = executeRegionalGenerationJob(baseOptions);

    expect(result.continent).toBeDefined();
    expect(result.continent.width).toBe(64);
    expect(result.continent.height).toBe(64);
    expect(result.pois.length).toBeGreaterThanOrEqual(5);
    expect(result.routeNetwork.edges.length).toBeGreaterThanOrEqual(result.pois.length - 1);
    expect(result.wilderness.trees.length).toBeGreaterThan(0);

    // Directiva 4: Zero-Copy ArrayBuffer verification
    expect(result.rawBuffer).toBeDefined();
    expect(result.rawBuffer!.byteLength).toBe(64 * 64 * 4);
  });

  it('generates zero-copy RGBA preview buffer with correct byte layout and dimensions', () => {
    const result = executeRegionalGenerationJob(baseOptions);
    const buffer = buildZeroCopyPreviewBuffer(result.continent, result.routeNetwork.pathGrid);

    expect(buffer.byteLength).toBe(64 * 64 * 4);

    const view = new Uint8ClampedArray(buffer);
    // Alpha channel must be 255 for all pixels
    for (let i = 3; i < view.length; i += 4) {
      expect(view[i]).toBe(255);
    }
  });

  it('recalculates A* strictly for incident edges when a POI is moved (Directive 3)', () => {
    const genResult = executeRegionalGenerationJob(baseOptions);
    // Find a node that has both incident and non-incident edges to verify isolation
    const targetNode = genResult.pois.find((node) => {
      const inc = genResult.routeNetwork.edges.some(
        (e) => e.fromNodeId === node.id || e.toNodeId === node.id
      );
      const nonInc = genResult.routeNetwork.edges.some(
        (e) => e.fromNodeId !== node.id && e.toNodeId !== node.id
      );
      return inc && nonInc;
    }) ?? genResult.pois[1]!;

    const incidentBefore = genResult.routeNetwork.edges.filter(
      (e) => e.fromNodeId === targetNode.id || e.toNodeId === targetNode.id
    );
    const nonIncidentBefore = genResult.routeNetwork.edges.filter(
      (e) => e.fromNodeId !== targetNode.id && e.toNodeId !== targetNode.id
    );

    expect(incidentBefore.length).toBeGreaterThan(0);
    expect(nonIncidentBefore.length).toBeGreaterThan(0);

    const newGridX = targetNode.gridX + 2;
    const newGridY = targetNode.gridY + 2;

    const rerouteResult = executeRerouteJob({
      jobId: 999,
      movedNodeId: targetNode.id,
      newGridX,
      newGridY,
      continent: genResult.continent,
      nodes: genResult.pois,
      edges: genResult.routeNetwork.edges,
      allowBridges: true
    });

    // Check that target node was updated
    const updatedNode = rerouteResult.updatedNodes.find((n) => n.id === targetNode.id);
    expect(updatedNode).toBeDefined();
    expect(updatedNode!.gridX).toBe(newGridX);
    expect(updatedNode!.gridY).toBe(newGridY);

    // Check that non-incident edges were preserved unchanged
    for (const nonInc of nonIncidentBefore) {
      const match = rerouteResult.updatedEdges.find((e) => e.id === nonInc.id);
      expect(match).toBeDefined();
      expect(match!.distance).toBe(nonInc.distance);
      expect(match!.waypoints).toEqual(nonInc.waypoints);
    }

    // Check that incident edges were recalculated
    const incidentAfter = rerouteResult.updatedEdges.filter(
      (e) => e.fromNodeId === targetNode.id || e.toNodeId === targetNode.id
    );
    expect(incidentAfter.length).toBe(incidentBefore.length);
  });
});
