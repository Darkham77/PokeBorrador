/**
 * tests/node/map/svgRouteAdapter.test.ts
 *
 * TIER 1 ISOLATED UNIT TEST: SVG ROUTE ADAPTER
 * Verifies clean SVG export, lossless SVG import (roundtrip),
 * and adaptive geography regeneration from vector graph anchors.
 */

import { describe, it, expect } from 'vitest';
import {
  exportRoutesToSvg,
  importRoutesFromSvg,
  regenerateGeographyFromGraph
} from '../../logic/map/continent/svgRouteAdapter';
import type {
  ContinentNode,
  ContinentConnection,
  ContinentGenConfig
} from '../../types/map/continentTypes';

describe('svgRouteAdapter', () => {
  const sampleNodes: Record<string, ContinentNode> = {
    city_1: {
      id: 'city_1',
      name: 'Pueblo Paleta',
      x: 320,
      y: 480,
      scale: 'town',
      amenities: ['center', 'lab']
    },
    city_2: {
      id: 'city_2',
      name: 'Ciudad Verde',
      x: 320,
      y: 300,
      scale: 'city',
      amenities: ['center', 'mart', 'gym']
    },
    city_3: {
      id: 'city_3',
      name: 'Ciudad Plateada',
      x: 320,
      y: 120,
      scale: 'city',
      amenities: ['center', 'mart', 'gym']
    }
  };

  const sampleConnections: readonly ContinentConnection[] = [
    ['city_1', 'city_2'],
    ['city_2', 'city_3']
  ];

  const baseConfig: ContinentGenConfig = {
    seed: 42,
    dimensions: { width: 1600, height: 1200, tileSize: 32 },
    cityCount: 3,
    biomes: {
      waterPercent: 20,
      forestPercent: 25,
      mountainPercent: 15,
      snowPercent: 10,
      beachPercent: 10
    },
    roadWidth: 1
  };

  it('exports a clean, structured SVG vector document', () => {
    const svg = exportRoutesToSvg({
      width: 1600,
      height: 1200,
      nodes: sampleNodes,
      connections: sampleConnections
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 1600 1200"');
    expect(svg).toContain('<g id="routes">');
    expect(svg).toContain('<g id="cities">');
    expect(svg).toContain('Pueblo Paleta');
    expect(svg).toContain('Ciudad Verde');
    expect(svg).toContain('Ciudad Plateada');
    expect(svg).toContain('data-from="city_1"');
    expect(svg).toContain('data-to="city_2"');
  });

  it('imports and perfectly restores nodes and connections from exported SVG (Roundtrip)', () => {
    const exportedSvg = exportRoutesToSvg({
      width: 1600,
      height: 1200,
      nodes: sampleNodes,
      connections: sampleConnections
    });

    const imported = importRoutesFromSvg(exportedSvg);

    expect(imported.dimensions?.width).toBe(1600);
    expect(imported.dimensions?.height).toBe(1200);

    const importedIds = Object.keys(imported.nodes);
    expect(importedIds.length).toBe(3);
    expect(imported.nodes.city_1?.name).toBe('Pueblo Paleta');
    expect(imported.nodes.city_1?.x).toBe(320);
    expect(imported.nodes.city_1?.y).toBe(480);
    expect(imported.nodes.city_2?.name).toBe('Ciudad Verde');
    expect(imported.nodes.city_3?.name).toBe('Ciudad Plateada');

    expect(imported.connections.length).toBe(2);
    expect(imported.connections).toEqual([
      ['city_1', 'city_2'],
      ['city_2', 'city_3']
    ]);
  });

  it('parses generic SVG markup without data attributes by geometric proximity', () => {
    // Simulate an SVG created or edited in an external vector tool
    const rawExternalSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="800" viewBox="0 0 1000 800">
        <line x1="100" y1="100" x2="500" y2="100" stroke="#000" stroke-width="4" />
        <circle id="nodeA" cx="100" cy="100" r="12" />
        <circle id="nodeB" cx="500" cy="100" r="12" />
      </svg>
    `;

    const result = importRoutesFromSvg(rawExternalSvg);
    const nodeKeys = Object.keys(result.nodes);

    expect(nodeKeys.length).toBe(2);
    expect(result.connections.length).toBe(1);
  });

  it('regenerates continental geography placing land and roads around imported nodes', () => {
    const importedGraph = {
      nodes: sampleNodes,
      connections: sampleConnections,
      dimensions: { width: 1600, height: 1200 }
    };

    const regenResult = regenerateGeographyFromGraph(importedGraph, baseConfig);

    expect(regenResult.nodes).toEqual(sampleNodes);
    expect(regenResult.connections).toEqual(sampleConnections);

    // City positions must be habitable land (not ocean)
    for (const node of Object.values(regenResult.nodes)) {
      const gx = Math.floor(node.x / baseConfig.dimensions.tileSize);
      const gy = Math.floor(node.y / baseConfig.dimensions.tileSize);
      expect(regenResult.biomeGrid[gy]?.[gx]).not.toBe('ocean');
    }

    // Roads must have carved paths
    expect(regenResult.roads.size).toBeGreaterThan(0);
  });
});
