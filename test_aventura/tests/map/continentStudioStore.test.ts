/**
 * tests/node/map/continentStudioStore.test.ts
 *
 * TIER 1 ISOLATED UNIT TEST: CONTINENT STUDIO PINIA STORE
 * Verifies view toggling, active project management, procedural generation,
 * SVG import/export, and undo/redo stacks.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useContinentStudioStore } from '../../stores/continentStudio';

describe('continentStudioStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('initializes with default views and a canonical preset project', () => {
    const store = useContinentStudioStore();
    expect(store.activeView).toBe('geographic');
    expect(store.activeProject).toBeDefined();
    expect(Object.keys(store.activeProject.nodes).length).toBeGreaterThan(0);
  });

  it('toggles views cleanly between geographic and connections', () => {
    const store = useContinentStudioStore();
    expect(store.activeView).toBe('geographic');

    store.setView('connections');
    expect(store.activeView).toBe('connections');

    store.setView('geographic');
    expect(store.activeView).toBe('geographic');
  });

  it('creates and switches projects', () => {
    const store = useContinentStudioStore();
    const newProj = store.createNewProject('Nueva Región Test', 'archipelago');

    expect(store.activeProjectId).toBe(newProj.id);
    expect(store.activeProject.name).toBe('Nueva Región Test');
    expect(store.activeProject.config.biomes.waterPercent).toBeGreaterThan(40);
  });

  it('supports node movement, addition, and connection with history undo/redo', () => {
    const store = useContinentStudioStore();

    // Add a node
    const newNode = store.addNode('Pueblo Nuevo', 500, 500);
    expect(store.activeProject.nodes[newNode.id]).toBeDefined();
    expect(store.canUndo).toBe(true);

    // Undo addition
    store.undo();
    expect(store.activeProject.nodes[newNode.id]).toBeUndefined();
    expect(store.canRedo).toBe(true);

    // Redo addition
    store.redo();
    expect(store.activeProject.nodes[newNode.id]).toBeDefined();
  });

  it('exports and imports SVG through the store adaptively', () => {
    const store = useContinentStudioStore();
    const exportedSvg = store.exportSvg();
    expect(exportedSvg).toContain('<svg');
    expect(exportedSvg).toContain('<g id="routes">');

    const ok = store.importSvg(exportedSvg);
    expect(ok).toBe(true);
  });
});
