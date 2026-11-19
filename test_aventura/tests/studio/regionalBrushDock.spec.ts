/**
 * test_aventura/tests/studio/regionalBrushDock.spec.ts
 *
 * TIER 1 COMPONENT TESTS FOR REGIONAL BRUSH STUDIO DOCK
 *
 * Validates:
 *   1. Switching across all 5 brush modes (`heal`, `paint`, `line`, `fill`, `eyedropper`).
 *   2. Switching category tabs, selecting paint targets across 19 options, and auto-syncing
 *      the active tab when Eyedropper updates `store.paintTarget`.
 *   3. Brush size presets, shape toggle (`square`/`circle`), `Auto-sanar borde`, mountain
 *      policy (`erode`/`fill`), and mountain rock palette controls.
 *   4. Autotile Defect Inspector filter dropdown, Prev/Next navigation, and focus emission.
 *
 * @vitest-environment jsdom
 */

import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

import RegionalBrushDock from '../../components/studio/RegionalBrushDock.vue';
import RegionalNetworkSvgOverlay from '../../components/studio/RegionalNetworkSvgOverlay.vue';
import type { ContinentMapResult } from '../../logic/map/continentGenerator.ts';
import { compileGeologicalAutotiling } from '../../logic/map/geologicalAutotilingEngine.ts';
import type { MacroBiome } from '../../logic/map/macroBiomeSynthesizer.ts';
import type { WaterTerrainKind } from '../../logic/map/waterAutotileEngine.ts';
import { useRegionalContinentStudioStore } from '../../stores/continentStudioStore.ts';

function buildMinimalContinent(width = 16, height = 16): ContinentMapResult {
  const terrainMatrix: WaterTerrainKind[][] = Array.from({ length: height }, () =>
    Array<WaterTerrainKind>(width).fill('grass')
  );
  const heightmap: number[][] = Array.from({ length: height }, () => Array<number>(width).fill(0));
  const biomeGrid: MacroBiome[][] = Array.from({ length: height }, () =>
    Array<MacroBiome>(width).fill('temperate_meadow')
  );
  const macroBiomes = {
    biomeGrid,
    transitionBufferGrid: Array.from({ length: height }, () => Array<boolean>(width).fill(false)),
    temperatureMap: new Float32Array(width * height),
    moistureMap: new Float32Array(width * height),
    stats: {
      temperate_meadow: width * height,
      mint_highland: 0,
      viridian_forest: 0,
      arid_desert: 0,
      volcanic_plateau: 0
    }
  };
  const geo = compileGeologicalAutotiling(terrainMatrix, heightmap, macroBiomes, {
    mountainPalette: 'brown'
  });

  return {
    width,
    height,
    seed: 1,
    mountainPalette: 'brown',
    terrainMatrix,
    heightmap,
    macroBiomes,
    resolvedWater: geo.resolvedWater,
    resolvedMountain: geo.resolvedMountain,
    resolvedMacroBiomes: geo.resolvedMacroBiomes,
    geologicalClusters: {
      massifs: [],
      paletteMatrix: Array.from({ length: height }, () =>
        Array<'brown' | 'gray' | 'volcanic'>(width).fill('brown')
      ),
      massifIdMatrix: Array.from({ length: height }, () => Array<string | null>(width).fill(null))
    },
    cells: geo.cells,
    placedStairs: []
  };
}

describe('RegionalBrushDock.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('switches brush modes and shows heal domain controls exclusively in heal mode', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useRegionalContinentStudioStore();
    store.isHealingBrushActive = true;

    const wrapper = mount(RegionalBrushDock, {
      global: { plugins: [pinia] }
    });

    expect(wrapper.find('#btn-heal-domain-mountain').exists()).toBe(true);
    await wrapper.get('#btn-heal-domain-water').trigger('click');
    expect(store.healingBrushDomain).toBe('water');

    await wrapper.get('#btn-brush-mode-paint').trigger('click');
    expect(store.brushMode).toBe('paint');
    expect(wrapper.find('#btn-heal-domain-mountain').exists()).toBe(false);
    expect(wrapper.find('#btn-brush-cat-terrain').exists()).toBe(true);

    await wrapper.get('#btn-brush-mode-line').trigger('click');
    expect(store.brushMode).toBe('line');

    await wrapper.get('#btn-brush-mode-fill').trigger('click');
    expect(store.brushMode).toBe('fill');

    await wrapper.get('#btn-brush-mode-eyedropper').trigger('click');
    expect(store.brushMode).toBe('eyedropper');
  });

  it('switches category tabs, applies target parameters, and auto-syncs category when Eyedropper updates target', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useRegionalContinentStudioStore();
    store.isHealingBrushActive = true;
    store.setBrushMode('paint');

    const wrapper = mount(RegionalBrushDock, {
      global: { plugins: [pinia] }
    });

    await wrapper.get('#btn-brush-cat-mountain').trigger('click');
    await wrapper.get('#btn-paint-target-elevation_raise').trigger('click');
    expect(store.paintTarget).toBe('elevation_raise');
    expect(wrapper.find('#btn-mountain-palette-gray').exists()).toBe(true);
    expect(wrapper.find('#btn-mountain-palette-volcanic').exists()).toBe(false);

    await wrapper.get('#btn-mountain-palette-gray').trigger('click');
    expect(store.mountainPalette).toBe('gray');

    await wrapper.get('#btn-brush-size-9').trigger('click');
    expect(store.brushSize).toBe(9);

    await wrapper.get('#btn-brush-shape-circle').trigger('click');
    expect(store.brushShape).toBe('circle');

    await wrapper.get('#btn-mountain-policy-fill').trigger('click');
    expect(store.mountainPolicy).toBe('fill');

    const checkbox = wrapper.get('#chk-auto-heal-paint');
    await checkbox.setValue(false);
    expect(store.autoHealOnPaint).toBe(false);

    // Eyedropper update should auto-switch active tab to match target category ('route')
    store.setPaintTarget('bridge_wood');
    await nextTick();
    expect(wrapper.get('#btn-brush-cat-route').classes()).toContain('active');
    expect(wrapper.get('#btn-paint-target-bridge_wood').classes()).toContain('active');

    await wrapper.get('#btn-close-brush-dock').trigger('click');
    expect(store.isHealingBrushActive).toBe(false);
  });

  it('filters defects by domain and steps Prev/Next updating activeDefect and camera focus', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useRegionalContinentStudioStore();
    const continent = buildMinimalContinent(16, 16);
    const mutableTerrain = continent.terrainMatrix.map((row) => [...row]);
    mutableTerrain[4]![4] = 'water';
    const mutableHeight = continent.heightmap.map((row) => [...row]);
    mutableHeight[10]![10] = 1;
    store.continentMap = {
      ...continent,
      terrainMatrix: mutableTerrain,
      heightmap: mutableHeight
    };
    store.pathGrid = Array.from({ length: 16 }, () => Array<boolean>(16).fill(false));
    store.manualPathGrid = Array.from({ length: 16 }, () => Array<boolean>(16).fill(false));
    store.bridgeGrid = Array.from({ length: 16 }, () => Array<boolean>(16).fill(false));
    store.refreshDetectedDefects();

    const wrapper = mount(RegionalBrushDock, {
      global: { plugins: [pinia] }
    });

    expect(store.detectedDefectCount).toBeGreaterThan(0);

    await wrapper.get('#select-defect-filter-domain').setValue('water');
    expect(store.defectFilterDomain).toBe('water');
    expect(store.filteredDefectRecords.every((d) => d.domain === 'water')).toBe(true);

    await wrapper.get('#btn-defect-next').trigger('click');
    expect(store.activeDefectIndex).toBe(0);
    expect(store.cameraFocusRequest?.gridX).toBe(store.filteredDefectRecords[0]?.x);

    await wrapper.get('#btn-defect-prev').trigger('click');
    expect(store.activeDefectIndex).toBe(store.filteredDefectRecords.length - 1);
  });

  it('focuses defect markers only when brush is inactive and lets active brush clicks pass through', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useRegionalContinentStudioStore();
    const continent = buildMinimalContinent(16, 16);
    const mutableTerrain = continent.terrainMatrix.map((row) => [...row]);
    mutableTerrain[4]![4] = 'water';
    store.continentMap = {
      ...continent,
      terrainMatrix: mutableTerrain
    };
    store.pathGrid = Array.from({ length: 16 }, () => Array<boolean>(16).fill(false));
    store.manualPathGrid = Array.from({ length: 16 }, () => Array<boolean>(16).fill(false));
    store.bridgeGrid = Array.from({ length: 16 }, () => Array<boolean>(16).fill(false));
    store.refreshDetectedDefects();
    expect(store.filteredDefectRecords.length).toBeGreaterThan(0);

    store.isHealingBrushActive = false;
    store.setDefectFilterDomain('water');
    const wrapper = mount(RegionalNetworkSvgOverlay, {
      global: {
        plugins: [pinia],
        directives: { 'gsap-loop': {} }
      }
    });

    const markers = wrapper.findAll('.defect-marker-item');
    expect(markers.length).toBeGreaterThan(0);
    await markers[0]!.trigger('click');
    expect(store.activeDefectIndex).toBe(0);

    // Active brush mode: markers become passthrough so clicks directly on '!' heal/paint the tile
    store.activeDefectIndex = -1;
    store.isHealingBrushActive = true;
    await nextTick();
    expect(wrapper.get('.autotile-defect-markers').classes()).toContain('is-brush-passthrough');
    await markers[0]!.trigger('click');
    expect(store.activeDefectIndex).toBe(-1);
  });
});
