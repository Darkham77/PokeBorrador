/**
 * tests/node/map/map_adventure_studio_store.test.ts
 *
 * Tier 1 Unit Test: Validates the Map Adventure Studio Pinia store:
 * node creation, movement, data mutation, connection toggling, orphan connection cleanup,
 * Dijkstra GPS route testing, undo/redo history, and TypeScript code export.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMapAdventureStudioStore } from '../../../src/stores/mapAdventureStudio.ts';

describe('Map Adventure Studio Store (useMapAdventureStudioStore)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with default Kanto nodes, connections, and official mappings', () => {
    const store = useMapAdventureStudioStore();
    expect(Object.keys(store.nodes).length).toBeGreaterThan(20);
    expect(store.connections.length).toBeGreaterThan(20);
    expect(store.nodes['pallet']).toBeDefined();
    expect(store.nodes['pallet']?.name).toBe('Pueblo Paleta');
    expect(store.officialMapMapping['pallet']).toBe('pallet_town');
    expect(store.activeTool).toBe('pointer');
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);
  });

  it('adds a new node with unique ID and default properties', () => {
    const store = useMapAdventureStudioStore();
    const initialCount = Object.keys(store.nodes).length;

    const newId = store.addNode(1500, 2200, { name: 'Ruta Nueva', type: 'route' });

    expect(newId).toMatch(/^node_/);
    expect(Object.keys(store.nodes).length).toBe(initialCount + 1);
    expect(store.nodes[newId]).toBeDefined();
    expect(store.nodes[newId]?.x).toBe(1500);
    expect(store.nodes[newId]?.y).toBe(2200);
    expect(store.nodes[newId]?.name).toBe('Ruta Nueva');
    expect(store.selectedNodeId).toBe(newId);
    expect(store.canUndo).toBe(true);
  });

  it('moves an existing node to new coordinates', () => {
    const store = useMapAdventureStudioStore();
    store.moveNode('pallet', 550, 1450);

    expect(store.nodes['pallet']?.x).toBe(550);
    expect(store.nodes['pallet']?.y).toBe(1450);
  });

  it('updates node properties cleanly', () => {
    const store = useMapAdventureStudioStore();
    store.updateNodeData('pallet', {
      hasCenter: false,
      requiresMO: 'Corte',
      blockMsg: 'Árbol bloqueando.'
    });

    expect(store.nodes['pallet']?.hasCenter).toBe(false);
    expect(store.nodes['pallet']?.requiresMO).toBe('Corte');
    expect(store.nodes['pallet']?.blockMsg).toBe('Árbol bloqueando.');
  });

  it('toggles connections between two nodes', () => {
    const store = useMapAdventureStudioStore();
    const initialConnections = store.connections.length;

    // Connect pallet and pewter directly
    store.toggleConnection('pallet', 'pewter');
    expect(store.connections.length).toBe(initialConnections + 1);
    expect(store.connections.some(([a, b]) => (a === 'pallet' && b === 'pewter') || (a === 'pewter' && b === 'pallet'))).toBe(true);

    // Toggle again removes the connection
    store.toggleConnection('pallet', 'pewter');
    expect(store.connections.length).toBe(initialConnections);
  });

  it('deletes a node and cascades removal of all associated connections', () => {
    const store = useMapAdventureStudioStore();
    expect(store.nodes['pallet']).toBeDefined();

    // Pallet connects to route1 and route21
    const palletConnectionsBefore = store.connections.filter(([a, b]) => a === 'pallet' || b === 'pallet');
    expect(palletConnectionsBefore.length).toBeGreaterThan(0);

    store.deleteNode('pallet');

    expect(store.nodes['pallet']).toBeUndefined();
    expect(store.officialMapMapping['pallet']).toBeUndefined();
    const palletConnectionsAfter = store.connections.filter(([a, b]) => a === 'pallet' || b === 'pallet');
    expect(palletConnectionsAfter.length).toBe(0);
  });

  it('tests GPS shortest path using Dijkstra algorithm', () => {
    const store = useMapAdventureStudioStore();

    store.testGPS('pallet', 'viridian');
    expect(store.previewDijkstraNodes).toEqual(['pallet', 'route1', 'viridian']);

    store.clearGPS();
    expect(store.gpsStartNodeId).toBeNull();
    expect(store.previewDijkstraNodes).toEqual([]);
  });

  it('supports undo and redo operations across mutations', () => {
    const store = useMapAdventureStudioStore();
    const initialCount = Object.keys(store.nodes).length;

    const newId = store.addNode(1000, 1000);
    expect(Object.keys(store.nodes).length).toBe(initialCount + 1);
    expect(store.canUndo).toBe(true);

    store.undo();
    expect(Object.keys(store.nodes).length).toBe(initialCount);
    expect(store.nodes[newId]).toBeUndefined();
    expect(store.canRedo).toBe(true);

    store.redo();
    expect(Object.keys(store.nodes).length).toBe(initialCount + 1);
    expect(store.nodes[newId]).toBeDefined();
  });

  it('generates valid TypeScript formatted code ready for adventureMapData.ts', () => {
    const store = useMapAdventureStudioStore();
    const tsCode = store.generateTypeScriptCode();

    expect(tsCode).toContain('export const rawNodes: Record<string, MapNode> =');
    expect(tsCode).toContain('export const connections: [string, string][] =');
    expect(tsCode).toContain('export const officialMapIdMap: Record<string, string> =');
    expect(tsCode).toContain('"pallet"');
    expect(tsCode).toContain('"pallet_town"');
  });

  it('resets to default Kanto configuration', () => {
    const store = useMapAdventureStudioStore();
    store.addNode(500, 500);
    store.deleteNode('indigo');

    expect(store.nodes['indigo']).toBeUndefined();

    store.resetToDefault();
    expect(store.nodes['indigo']).toBeDefined();
    expect(store.nodes['pallet']).toBeDefined();
  });

  it('updates node urban scale and adjusts node type accordingly', () => {
    const store = useMapAdventureStudioStore();
    expect(store.nodes['pallet']).toBeDefined();

    store.setNodeUrbanScale('pallet', 'metropolis');
    expect(store.nodes['pallet']?.urbanScale).toBe('metropolis');
    expect(store.nodes['pallet']?.type).toBe('league');

    store.setNodeUrbanScale('pallet', 'hamlet');
    expect(store.nodes['pallet']?.urbanScale).toBe('hamlet');
    expect(store.nodes['pallet']?.type).toBe('city');
  });

  it('generates a full procedural continent and creates routes bundle', () => {
    const store = useMapAdventureStudioStore();
    store.generateProceduralContinent();

    expect(Object.keys(store.nodes).length).toBeGreaterThanOrEqual(4);
    expect(store.connections.length).toBeGreaterThan(0);
    expect(Object.keys(store.customTerrain).length).toBeGreaterThan(0);

    const bundle = store.exportRoutesBundle();
    expect(bundle.version).toBe('1.0.0');
    expect(bundle.nodes).toBeDefined();
    expect(bundle.connections.length).toBeGreaterThan(0);
    expect(bundle.svgPathData).toContain('M ');
  });
});
