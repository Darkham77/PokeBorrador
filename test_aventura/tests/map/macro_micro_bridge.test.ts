/**
 * tests/node/map/macro_micro_bridge.test.ts
 *
 * Tier 1 Unit Test: Macro-Graph ↔ Local Map Bidirectional Bridge
 * Validates:
 * 1. Storing, retrieving, and persisting localMap on adventure graph nodes.
 * 2. Full-fidelity JSON project export and import roundtrip containing localMaps.
 * 3. Deterministic procedural local map generation tailored to node types.
 * 4. Bidirectional mode switching between macro-graph and tile editor with store synchronization.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMapAdventureStudioStore } from '../../../src/stores/mapAdventureStudio.ts';
import { useMapStudioStore } from '../../../src/stores/mapStudio.ts';
import { generateLocalMapForNode } from '../../../src/logic/map/nodeLocalMapGenerator.ts';

describe('Macro-Graph ↔ Local Map Bidirectional Bridge', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('saves and retrieves localMap for a specific project node', () => {
    const macroStore = useMapAdventureStudioStore();
    const palletNode = macroStore.nodes['pallet'];
    expect(palletNode).toBeDefined();
    expect(macroStore.getLocalMapForNode('pallet')).toBeNull();

    // Generate local map for Pallet Town (Hamlet scale: 36x28)
    const localMap = generateLocalMapForNode(palletNode!, 42);
    expect(localMap).toBeDefined();
    expect(localMap.width).toBe(36);
    expect(localMap.height).toBe(28);
    expect(localMap.type).toBe('town');

    // Save to node
    macroStore.saveLocalMapForNode('pallet', localMap);

    // Retrieve and verify
    const retrieved = macroStore.getLocalMapForNode('pallet');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.width).toBe(36);
    expect(retrieved?.height).toBe(28);
    expect(retrieved?.layers.ground.length).toBe(28);
    expect(retrieved?.layers.ground[0]?.length).toBe(36);
    expect(retrieved?.collisionMatrix.length).toBe(28);
  });

  it('exports and imports project JSON preserving embedded localMaps with 100% fidelity', () => {
    const macroStore = useMapAdventureStudioStore();
    const pewterNode = macroStore.nodes['pewter'];
    expect(pewterNode).toBeDefined();

    const localMap = generateLocalMapForNode(pewterNode!, 123);
    macroStore.saveLocalMapForNode('pewter', localMap);

    // Export JSON
    const exportedJson = macroStore.exportProjectJSON();
    expect(exportedJson).toContain('"pewter"');
    expect(exportedJson).toContain('"localMap"');

    // Create fresh store and import
    setActivePinia(createPinia());
    const freshStore = useMapAdventureStudioStore();
    const importSuccess = freshStore.importProjectJSON(exportedJson);
    expect(importSuccess).toBe(true);

    // Verify imported localMap
    const importedMap = freshStore.getLocalMapForNode('pewter');
    expect(importedMap).not.toBeNull();
    expect(importedMap?.seed).toBe(localMap.seed);
    expect(importedMap?.type).toBe(localMap.type);
    expect(importedMap?.layers.ground[0]?.[0]?.tileId).toBe(localMap.layers.ground[0]?.[0]?.tileId);
    expect(importedMap?.collisionMatrix[5]?.[5]).toBe(localMap.collisionMatrix[5]?.[5]);
  });

  it('generates coherent procedural local maps according to node archetype and geography', () => {
    const macroStore = useMapAdventureStudioStore();

    // 1. City / Town -> type 'town', urban buildings (Town scale: 48x36)
    const viridianNode = macroStore.nodes['viridian']!;
    const viridianMap = generateLocalMapForNode(viridianNode, 42);
    expect(viridianMap.type).toBe('town');
    expect(viridianMap.width).toBe(48);
    expect(viridianMap.height).toBe(36);

    // 2. Terrestrial Route -> type 'route', not town
    const route1Node = macroStore.nodes['route1'] || macroStore.nodes['route3']!;
    const routeMap = generateLocalMapForNode(route1Node, 42);
    expect(routeMap.type).toBe('route');

    // 3. POI Mountain / Cave -> hills included
    const mtMoonNode = macroStore.nodes['mtmoon']!;
    const mtMoonMap = generateLocalMapForNode(mtMoonNode, 42);
    expect(mtMoonMap.type).toBe('route');

    // 4. Water route / coastal -> water elements
    const vermilionNode = macroStore.nodes['vermilion']!;
    const vermilionMap = generateLocalMapForNode(vermilionNode, 42);
    expect(vermilionMap.type).toBe('town');
  });

  it('synchronizes edits between useMapStudioStore and useMapAdventureStudioStore seamlessly', () => {
    const macroStore = useMapAdventureStudioStore();
    const tileStore = useMapStudioStore();

    const ceruleanNode = macroStore.nodes['cerulean']!;
    const initialMap = generateLocalMapForNode(ceruleanNode, 999);
    macroStore.saveLocalMapForNode('cerulean', initialMap);

    // Simulate opening node in tile mode
    macroStore.activeEditingNodeId = 'cerulean';
    macroStore.activeMode = 'tile';
    tileStore.setMap(macroStore.getLocalMapForNode('cerulean')!);

    expect(tileStore.currentMap).not.toBeNull();
    expect(tileStore.currentMap?.type).toBe('town');

    // Mutate tile map in tileStore (e.g. paint collision at 10, 10)
    tileStore.paintCollision(10, 10, 1);
    expect(tileStore.currentMap?.collisionMatrix[10]?.[10]).toBe(1);

    // Save and return to macro graph
    macroStore.saveLocalMapForNode(macroStore.activeEditingNodeId, tileStore.currentMap!);
    macroStore.activeEditingNodeId = null;
    macroStore.activeMode = 'graph';

    // Verify macro store retained the edited collision cell
    const persistedMap = macroStore.getLocalMapForNode('cerulean');
    expect(persistedMap?.collisionMatrix[10]?.[10]).toBe(1);
    expect(macroStore.activeMode).toBe('graph');
    expect(macroStore.activeEditingNodeId).toBeNull();
  });
});
